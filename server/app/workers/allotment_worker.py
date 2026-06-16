"""
AllotmentWorker
===============
Entry-point for the background worker process.

Run with:
    python -m app.workers.allotment_worker

What it does
------------
1. Connects to RabbitMQ via BrokerConsumer.
2. For each message it receives:
   a. Parses the JSON payload: {ipo_id, pan_num, company_value}
   b. Calls CameoRegistrarClient.fetch_allotment(company_value, pan_num)
   c. Upserts the result into the Supabase `allotment_status` table.
   d. ACKs the message on success.
3. On retryable errors (captcha failure, HTTP error, timeout):
   - Reads x-retry-count from message headers.
   - If retry_count < MAX_RETRIES: re-publishes the message with
     retry_count+1 and an exponential delay (via a TTL delay queue),
     then ACKs the original (it's been replaced by the re-queued copy).
   - If retry_count >= MAX_RETRIES: NACKs (requeue=False) → message
     goes to allotment_tasks_dlq.
4. On hard/unrecoverable errors: NACKs immediately → DLQ.

"""
from __future__ import annotations

import asyncio
import json
import logging
import sys
from datetime import datetime, timezone

import pika

from app.broker.consumer import BrokerConsumer
from app.broker.publisher import DELAY_EXCHANGE, DLQ_QUEUE, MAIN_QUEUE, BrokerPublisher
from app.core.config import settings
from app.registrars.cameo import CameoRegistrarClient


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("allotment_worker")


MAX_RETRIES = 3  
RETRY_DELAYS_SECONDS = [10, 30, 60]



def get_supabase():
    from app.core.db import get_supabase_client
    return get_supabase_client()


def upsert_allotment(ipo_id: str, pan_num: str, status: str) -> None:
    db = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    db.table("allotment_status").upsert(
        {
            "ipo_id": ipo_id,
            "pan_num": pan_num,
            "status": status,
            "updated_at": now,
        },
        on_conflict="ipo_id,pan_num",
    ).execute()
    logger.info("Upserted allotment: ipo=%s pan=%s status=%s", ipo_id, pan_num, status)



def _declare_delay_queue(
    channel: pika.adapters.blocking_connection.BlockingChannel,
    delay_seconds: int,
) -> str:
    
    queue_name = f"allotment_delay_{delay_seconds}s"
    channel.queue_declare(
        queue=queue_name,
        durable=True,
        arguments={
            "x-message-ttl": delay_seconds * 1000,      # ms
            "x-dead-letter-exchange": "",                # default exchange
            "x-dead-letter-routing-key": MAIN_QUEUE,    # route back to main
            "x-expires": (delay_seconds + 60) * 1000,   # auto-delete if idle
        },
    )
    return queue_name


def _republish_with_delay(
    channel: pika.adapters.blocking_connection.BlockingChannel,
    payload: dict,
    retry_count: int,
) -> None:
    delay = RETRY_DELAYS_SECONDS[retry_count - 1]
    delay_queue = _declare_delay_queue(channel, delay)

    channel.basic_publish(
        exchange="",
        routing_key=delay_queue,
        body=json.dumps(payload),
        properties=pika.BasicProperties(
            delivery_mode=2,
            content_type="application/json",
            headers={"x-retry-count": retry_count},
        ),
    )
    logger.info(
        "Re-queued retry #%d for ipo=%s pan=%s (delay=%ds)",
        retry_count,
        payload.get("ipo_id"),
        payload.get("pan_num"),
        delay,
    )


async def _process_task(payload: dict) -> str:
    
    ipo_id: str = payload["ipo_id"]
    pan_num: str = payload["pan_num"]
    company_value: str = payload["company_value"]

    client = CameoRegistrarClient()
    try:
        result = await client.fetch_allotment(
            ipo_code=company_value,
            pan=pan_num,
        )
    finally:
        await client.close()

    raw_status = result.get("status", "ERROR")

    status_map = {
        "ALLOTTED": "Allotted",
        "NOT_ALLOTTED": "Not-Allotted",
        "NOT_APPLIED": "Not-Applied",
        "FOUND": "Allotted",
        "NOT_FOUND": "Not-Applied",
        "ERROR": "Awaited",   
    }

    db_status = status_map.get(raw_status, "Awaited")

    if raw_status == "ERROR":
        msg = result.get("message", "Unknown registrar error")
        raise RuntimeError(f"Registrar returned ERROR for pan={pan_num}: {msg}")

    upsert_allotment(ipo_id=ipo_id, pan_num=pan_num, status=db_status)

    return db_status



def on_message(
    channel: pika.adapters.blocking_connection.BlockingChannel,
    method: pika.spec.Basic.Deliver,
    properties: pika.spec.BasicProperties,
    body: bytes,
) -> None:
    """
    Main message handler. Runs synchronously (pika is blocking).
    The async scraping coroutine is driven via asyncio.run().
    """
    # ── Parse payload ───────────────────────────────────────────────
    try:
        payload = json.loads(body.decode())
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.error("Malformed message body — sending to DLQ: %s", exc)
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    ipo_id = payload.get("ipo_id", "?")
    pan_num = payload.get("pan_num", "?")

    headers = properties.headers or {}
    retry_count: int = int(headers.get("x-retry-count", 0))

    logger.info(
        "Processing: ipo=%s pan=%s attempt=%d/%d",
        ipo_id, pan_num, retry_count + 1, MAX_RETRIES + 1,
    )

    if not all(k in payload for k in ("ipo_id", "pan_num", "company_value")):
        logger.error("Missing required fields in payload %s — DLQ", payload)
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    try:
        status = asyncio.run(_process_task(payload))
        logger.info("Done: ipo=%s pan=%s → %s", ipo_id, pan_num, status)
        channel.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as exc:
        logger.warning(
            "✗ Failed (attempt %d): ipo=%s pan=%s — %s: %s",
            retry_count + 1,
            ipo_id,
            pan_num,
            type(exc).__name__,
            exc,
        )

        if retry_count < MAX_RETRIES:
            try:
                _republish_with_delay(
                    channel=channel,
                    payload=payload,
                    retry_count=retry_count + 1,
                )
                channel.basic_ack(delivery_tag=method.delivery_tag)
            except Exception as pub_exc:
                logger.error("Failed to re-publish retry — NACKing: %s", pub_exc)
                channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        else:
            logger.error(
                "Max retries (%d) exceeded for ipo=%s pan=%s — sending to DLQ.",
                MAX_RETRIES,
                ipo_id,
                pan_num,
            )
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def main() -> None:
    logger.info("=" * 60)
    logger.info("IPO Allotment Worker starting up")
    logger.info("  MAX_RETRIES     : %d", MAX_RETRIES)
    logger.info("  RETRY_DELAYS    : %s", RETRY_DELAYS_SECONDS)
    logger.info("  RABBITMQ_URL    : %s", settings.rabbitmq_url)
    logger.info("=" * 60)

    consumer = BrokerConsumer()
    consumer.start_consuming(on_message)


if __name__ == "__main__":
    main()
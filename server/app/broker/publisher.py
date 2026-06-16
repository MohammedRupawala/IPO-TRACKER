"""
BrokerPublisher
===============
Publishes allotment tasks to RabbitMQ.

Queue topology (declared once on first publish):

  allotment_dlx          ← dead-letter exchange (direct)
  allotment_tasks_dlq    ← DLQ bound to allotment_dlx

  allotment_tasks        ← main work queue
      x-dead-letter-exchange = allotment_dlx
      (messages nacked without requeue land here)

Messages are published as persistent JSON to the default exchange,
routing directly to `allotment_tasks`.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

import pika
import pika.exceptions

from app.core.config import settings

logger = logging.getLogger(__name__)

MAIN_QUEUE = "allotment_tasks"
DLX_EXCHANGE = "allotment_dlx"
DLQ_QUEUE = "allotment_tasks_dlq"
DELAY_EXCHANGE = "allotment_delay_ex"

@dataclass
class BrokerPublisher:
    _topology_ready: bool = field(default=False, init=False, repr=False)


    def _get_connection(self) -> pika.BlockingConnection:
        params = pika.URLParameters(settings.rabbitmq_url)
        return pika.BlockingConnection(params)

    def _declare_topology(self, channel: pika.adapters.blocking_connection.BlockingChannel) -> None:
        """Idempotent topology declaration. Safe to call multiple times."""
        # 1. Dead-letter exchange
        channel.exchange_declare(
            exchange=DLX_EXCHANGE,
            exchange_type="direct",
            durable=True,
        )

        # 2. DLQ bound to the dead-letter exchange
        channel.queue_declare(
            queue=DLQ_QUEUE,
            durable=True,
        )
        channel.queue_bind(
            queue=DLQ_QUEUE,
            exchange=DLX_EXCHANGE,
            routing_key=DLQ_QUEUE,
        )

        # 3. Delay exchange (fanout per queue, routes back to main after TTL)
        channel.exchange_declare(
            exchange=DELAY_EXCHANGE,
            exchange_type="direct",
            durable=True,
        )

        # 4. Main work queue with DLX pointer
        channel.queue_declare(
            queue=MAIN_QUEUE,
            durable=True,
            arguments={
                "x-dead-letter-exchange": DLX_EXCHANGE,
                "x-dead-letter-routing-key": DLQ_QUEUE,
            },
        )

        self._topology_ready = True
        logger.info("RabbitMQ topology declared successfully.")

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    async def publish_allotment_task(self, payload: dict) -> None:
        """
        Publish a single allotment task to the main queue.

        payload format: {"ipo_id": "...", "pan_num": "...", "company_value": "..."}
        """
        try:
            connection = self._get_connection()
            channel = connection.channel()

            if not self._topology_ready:
                self._declare_topology(channel)

            channel.basic_publish(
                exchange="",
                routing_key=MAIN_QUEUE,
                body=json.dumps(payload),
                properties=pika.BasicProperties(
                    delivery_mode=2,  
                    content_type="application/json",
                    headers={"x-retry-count": 0},
                ),
            )
            logger.info("Published task: ipo_id=%s pan=%s", payload.get("ipo_id"), payload.get("pan_num"))
        except pika.exceptions.AMQPConnectionError as exc:
            logger.error("Failed to connect to RabbitMQ: %s", exc)
            raise
        finally:
            try:
                connection.close()
            except Exception:
                pass

    def publish_allotment_task_sync(self, payload: dict, retry_count: int = 0) -> None:
        """
        Synchronous variant used by the worker when re-queueing retries.
        Uses an existing channel passed by the worker.
        """
        connection = self._get_connection()
        channel = connection.channel()

        if not self._topology_ready:
            self._declare_topology(channel)

        channel.basic_publish(
            exchange="",
            routing_key=MAIN_QUEUE,
            body=json.dumps(payload),
            properties=pika.BasicProperties(
                delivery_mode=2,
                content_type="application/json",
                headers={"x-retry-count": retry_count},
            ),
        )
        connection.close()

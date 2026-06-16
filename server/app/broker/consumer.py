"""
BrokerConsumer
==============
Starts a blocking RabbitMQ consumer loop and calls a callback for each
message.

Usage (called by the worker entry-point):
    consumer = BrokerConsumer()
    consumer.start_consuming(on_message_callback)

The callback signature:
    def on_message(channel, method, properties, body: bytes) -> None
        ...
        channel.basic_ack(method.delivery_tag)   # or basic_nack(...)
"""
from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

import pika
import pika.exceptions

from app.broker.publisher import MAIN_QUEUE, BrokerPublisher
from app.core.config import settings

logger = logging.getLogger(__name__)

# How many messages the worker prefetches at once.
# Keep at 1 so each task is fully processed before the next is taken —
# this prevents a single slow worker from hoarding the queue.
PREFETCH_COUNT = 1


class BrokerConsumer:
    def __init__(self) -> None:
        self._publisher = BrokerPublisher()

    def start_consuming(self, callback: Callable[[Any, Any, Any, bytes], None]) -> None:
        """
        Connect and start a blocking consume loop.
        Automatically reconnects on connection drops with exponential backoff.
        """
        import time

        backoff = 5
        while True:
            try:
                logger.info("Connecting to RabbitMQ at %s …", settings.rabbitmq_url)
                params = pika.URLParameters(settings.rabbitmq_url)
                connection = pika.BlockingConnection(params)
                channel = connection.channel()

                self._publisher._declare_topology(channel)

                channel.basic_qos(prefetch_count=PREFETCH_COUNT)

                channel.basic_consume(
                    queue=MAIN_QUEUE,
                    on_message_callback=callback,
                    auto_ack=False,
                )

                logger.info("Worker ready. Waiting for allotment tasks on '%s' …", MAIN_QUEUE)
                channel.start_consuming()

            except pika.exceptions.AMQPConnectionError as exc:
                logger.error("RabbitMQ connection lost: %s — retrying in %ds …", exc, backoff)
                time.sleep(backoff)
                backoff = min(backoff * 2, 120)

            except KeyboardInterrupt:
                logger.info("Worker shutting down (KeyboardInterrupt).")
                try:
                    connection.close()
                except Exception:
                    pass
                break

"""
WorkerCoordinator
Batch-dispatch helper used by the admin API to push multiple
allotment tasks to the broker in one call.

    tasks = [
        {"ipo_id": "...", "pan_num": "...", "company_value": "..."},
        ...
    ]
    await dispatch_allotments(tasks)
"""
from __future__ import annotations

import logging

from app.broker.publisher import BrokerPublisher

logger = logging.getLogger(__name__)

_publisher = BrokerPublisher()


async def dispatch_allotments(tasks: list[dict]) -> None:
    """
    Publish each task dict to the allotment queue.
    Called by the admin trigger endpoint after collecting all PANs.
    """
    if not tasks:
        logger.warning("dispatch_allotments called with empty task list — nothing to do.")
        return

    logger.info("Dispatching %d allotment tasks …", len(tasks))

    for task in tasks:
        await _publisher.publish_allotment_task(task)

    logger.info("All %d tasks queued successfully.", len(tasks))

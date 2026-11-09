import logging
from typing import Literal


logger = logging.getLogger(__name__)

ActionAuditResult = Literal["success", "failed"]


def audit_action(
    user_id: int,
    instance_id: int,
    action: str,
    result: ActionAuditResult,
) -> None:
    if result not in ("success", "failed"):
        raise ValueError("Action audit result must be 'success' or 'failed'.")

    logger.info(
        f"[ACTION_AUDIT] user_id={user_id} instance_id={instance_id} "
        f"action={action} result={result}"
    )

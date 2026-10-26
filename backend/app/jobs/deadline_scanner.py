import logging
from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal
from backend.app.services.sla_service import evaluate_deadlines_and_slas

logger = logging.getLogger("jobs")

def run_deadline_scan():
    """
    Idempotent deadline processing job.
    Evaluates active cases against SLA policies and emits deduplicated notifications.
    """
    db: Session = SessionLocal()
    try:
        logger.info("Executing scheduled deadline and SLA risk assessment scan...")
        results = evaluate_deadlines_and_slas(db)
        logger.info(
            f"Deadline scan complete: {results['overdue']} overdue, "
            f"{results['warning']} warning, {results['normal']} normal."
        )
        return results
    except Exception as e:
        logger.error(f"Error during deadline scan execution: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()

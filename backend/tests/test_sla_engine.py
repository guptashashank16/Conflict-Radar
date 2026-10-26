from backend.app.services.sla_service import evaluate_deadlines_and_slas
from backend.app.models.workflow import Notification

def test_sla_deadline_evaluation_and_deduplication(db):
    # Count notifications before scan
    count_before = db.query(Notification).count()

    # Run scan
    results_1 = evaluate_deadlines_and_slas(db)
    assert "overdue" in results_1
    assert "warning" in results_1
    count_after_1 = db.query(Notification).count()

    # Run scan a second time immediately
    results_2 = evaluate_deadlines_and_slas(db)
    count_after_2 = db.query(Notification).count()

    # Count must remain exactly equal due to dedup_key!
    assert count_after_1 == count_after_2, "Repeated SLA scans must not spam duplicate notifications!"

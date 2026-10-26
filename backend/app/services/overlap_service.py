import re
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from fastapi import HTTPException, status

from backend.app.models.case import Case, CaseLink, CaseAction
from backend.app.models.institution import Institution
from backend.app.models.overlap import OverlapCandidate
from backend.app.models.user import User
from backend.app.core.config import settings
from backend.app.core.audit import log_audit_event
from backend.app.core.permissions import is_case_in_scope

STOPWORDS = {
    "the", "and", "to", "of", "a", "in", "for", "is", "on", "that", "by", "this",
    "with", "i", "you", "it", "not", "or", "be", "are", "from", "at", "as", "your",
    "all", "have", "new", "more", "an", "was", "we", "will", "home", "can", "us",
    "about", "if", "page", "my", "has", "search", "free", "but", "our", "one",
    "other", "do", "no", "information", "time", "they", "site", "he", "up", "may",
    "what", "which", "their", "news", "out", "use", "any", "there", "see", "only",
    "so", "his", "when", "contact", "here", "business", "who", "web", "also", "now",
    "help", "get", "pm", "view", "online", "c", "e", "first", "am", "been", "would",
    "how", "were", "me", "s", "services", "some", "these", "click", "its", "like",
    "service", "x", "than", "find", "price", "date", "back", "top", "people", "had",
    "list", "name", "just", "over", "state", "year", "day", "into", "email", "two",
    "health", "n", "re", "next", "used", "go", "b", "work", "last", "most", "products",
    "music", "buy", "data", "make", "them", "should", "product", "system", "post",
    "her", "city", "t", "add", "policy", "number", "such", "please", "available"
}

def clean_tokens(text: str) -> set:
    if not text:
        return set()
    words = re.findall(r'[a-zA-Z0-9]+', text.lower())
    return {w for w in words if len(w) > 2 and w not in STOPWORDS}

def token_jaccard_similarity(text_a: str, text_b: str) -> float:
    tokens_a = clean_tokens(text_a)
    tokens_b = clean_tokens(text_b)
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a.intersection(tokens_b)
    union = tokens_a.union(tokens_b)
    return len(intersection) / len(union) if union else 0.0

def calculate_overlap_signals(case_a: Case, case_b: Case) -> Tuple[int, Dict[str, Any], str]:
    """
    Computes explainable matching signals between two cases.
    Returns: (composite_score, signals_dict, human_readable_explanation)
    """
    signals: Dict[str, Any] = {}
    explanation_parts = []
    total_score = 0

    # 1. Exact AICTE Permanent ID Signal (45 pts max)
    inst_a = case_a.institution
    inst_b = case_b.institution
    exact_id_match = False
    
    if inst_a and inst_b and inst_a.aicte_permanent_id and inst_b.aicte_permanent_id:
        if inst_a.aicte_permanent_id == inst_b.aicte_permanent_id:
            exact_id_match = True
            points = settings.RADAR_WEIGHT_EXACT_ID
            signals["exact_institution_id"] = {
                "score": points,
                "max": settings.RADAR_WEIGHT_EXACT_ID,
                "matched_id": inst_a.aicte_permanent_id,
                "note": "Exact AICTE Permanent ID match"
            }
            total_score += points
            explanation_parts.append(f"Exact AICTE ID match ('{inst_a.aicte_permanent_id}', +{points} pts)")
        else:
            signals["exact_institution_id"] = {"score": 0, "max": settings.RADAR_WEIGHT_EXACT_ID, "note": "Different AICTE Permanent IDs"}
    elif inst_a and inst_b and inst_a.id == inst_b.id:
        # Same internal institution record
        points = settings.RADAR_WEIGHT_EXACT_ID
        signals["exact_institution_id"] = {
            "score": points,
            "max": settings.RADAR_WEIGHT_EXACT_ID,
            "matched_id": inst_a.id,
            "note": "Same resolved institution profile"
        }
        total_score += points
        explanation_parts.append(f"Same resolved institution record (+{points} pts)")
    else:
        signals["exact_institution_id"] = {"score": 0, "max": settings.RADAR_WEIGHT_EXACT_ID, "note": "No direct ID match"}

    # 2. Institution Name / Address Similarity Signal (15 pts max)
    name_sim = 0.0
    if inst_a and inst_b:
        name_sim = token_jaccard_similarity(inst_a.canonical_name, inst_b.canonical_name)
        if inst_a.address and inst_b.address:
            addr_sim = token_jaccard_similarity(inst_a.address, inst_b.address)
            name_sim = max(name_sim, (name_sim * 0.7 + addr_sim * 0.3))
    
    name_points = int(round(name_sim * settings.RADAR_WEIGHT_NAME_ADDR))
    signals["name_address_similarity"] = {
        "score": name_points,
        "max": settings.RADAR_WEIGHT_NAME_ADDR,
        "ratio": round(name_sim, 2),
        "note": f"Name/address lexical overlap: {int(name_sim*100)}%"
    }
    if name_points > 0:
        total_score += name_points
        explanation_parts.append(f"Institution name/address similarity ({int(name_sim*100)}%, +{name_points} pts)")

    # 3. Category Similarity Signal (15 pts max)
    cat_points = 0
    if case_a.category.upper() == case_b.category.upper():
        cat_points = settings.RADAR_WEIGHT_CATEGORY
        signals["category_similarity"] = {
            "score": cat_points,
            "max": settings.RADAR_WEIGHT_CATEGORY,
            "category": case_a.category,
            "note": "Identical complaint category"
        }
        explanation_parts.append(f"Identical complaint category '{case_a.category}' (+{cat_points} pts)")
    else:
        # Related compliance categories
        related_groups = [
            {"FACULTY_NORMS", "GOVERNANCE", "SALARY_IRREGULARITY"},
            {"INFRASTRUCTURE_DEFICIT", "LAB_EQUIPMENT", "SAFETY_NORMS"},
            {"ADMISSION_FRAUD", "CAPITATION_FEE", "REFUND_DISPUTE"},
        ]
        is_related = any(case_a.category in g and case_b.category in g for g in related_groups)
        if is_related:
            cat_points = int(settings.RADAR_WEIGHT_CATEGORY * 0.5)
            signals["category_similarity"] = {
                "score": cat_points,
                "max": settings.RADAR_WEIGHT_CATEGORY,
                "note": f"Related compliance categories: {case_a.category} & {case_b.category}"
            }
            explanation_parts.append(f"Related categories: {case_a.category} & {case_b.category} (+{cat_points} pts)")
        else:
            signals["category_similarity"] = {
                "score": 0,
                "max": settings.RADAR_WEIGHT_CATEGORY,
                "note": "Different complaint categories"
            }
    total_score += cat_points

    # 4. Description & Subject Similarity Signal (15 pts max)
    full_text_a = f"{case_a.subject} {case_a.description}"
    full_text_b = f"{case_b.subject} {case_b.description}"
    desc_sim = token_jaccard_similarity(full_text_a, full_text_b)
    desc_points = int(round(desc_sim * settings.RADAR_WEIGHT_DESCRIPTION))
    signals["description_similarity"] = {
        "score": desc_points,
        "max": settings.RADAR_WEIGHT_DESCRIPTION,
        "ratio": round(desc_sim, 2),
        "note": f"Complaint narrative lexical overlap: {int(desc_sim*100)}%"
    }
    if desc_points > 0:
        total_score += desc_points
        explanation_parts.append(f"Narrative keyword match ({int(desc_sim*100)}%, +{desc_points} pts)")

    # 5. Cross-Bureau Active Workflow Signal (10 pts max)
    cross_bureau_points = 0
    active_statuses = {"PENDING", "UNDER_PROCESS", "ESCALATED"}
    if case_a.bureau != case_b.bureau and case_a.status in active_statuses and case_b.status in active_statuses:
        cross_bureau_points = settings.RADAR_WEIGHT_CROSS_BUREAU
        signals["cross_bureau_active"] = {
            "score": cross_bureau_points,
            "max": settings.RADAR_WEIGHT_CROSS_BUREAU,
            "bureaus": [case_a.bureau, case_b.bureau],
            "note": "Simultaneous active workflows across autonomous bureaus"
        }
        total_score += cross_bureau_points
        explanation_parts.append(f"Active cross-bureau coordination need ({case_a.bureau} vs {case_b.bureau}, +{cross_bureau_points} pts)")
    else:
        signals["cross_bureau_active"] = {
            "score": 0,
            "max": settings.RADAR_WEIGHT_CROSS_BUREAU,
            "note": "Same bureau or inactive cases"
        }

    # Synthesize human-readable explanation
    priority_level = "High" if total_score >= 70 else ("Medium" if total_score >= 50 else "Low")
    explanation = f"{priority_level} Priority Review Candidate (Score {total_score}/100): " + "; ".join(explanation_parts) + "."

    return total_score, signals, explanation

def evaluate_case_pair(db: Session, case_a: Case, case_b: Case) -> Optional[OverlapCandidate]:
    # Canonical ordering: case_a_id < case_b_id
    if case_a.id > case_b.id:
        case_a, case_b = case_b, case_a

    score, signals, explanation = calculate_overlap_signals(case_a, case_b)

    # Check if candidate already exists
    candidate = db.query(OverlapCandidate).filter(
        OverlapCandidate.case_a_id == case_a.id,
        OverlapCandidate.case_b_id == case_b.id
    ).first()

    if score >= settings.RADAR_CANDIDATE_THRESHOLD:
        if candidate:
            # If already dismissed or linked by a human reviewer, preserve their decision!
            if candidate.review_status in {"LINKED", "DISMISSED"}:
                candidate.composite_score = score
                candidate.signals_json = json.dumps(signals)
                # Keep existing review_status and review_reason
            else:
                candidate.composite_score = score
                candidate.signals_json = json.dumps(signals)
                candidate.explanation = explanation
        else:
            candidate = OverlapCandidate(
                case_a_id=case_a.id,
                case_b_id=case_b.id,
                composite_score=score,
                signals_json=json.dumps(signals),
                explanation=explanation,
                algorithm_version="v1.0",
                review_status="UNREVIEWED"
            )
            db.add(candidate)
        db.flush()
        return candidate
    elif candidate and candidate.review_status == "UNREVIEWED":
        # Score fell below threshold; remove unreviewed candidate
        db.delete(candidate)
        db.flush()
        return None

    return None

def scan_all_cases_for_overlaps(db: Session) -> int:
    """
    Evaluates all active/recent cases for potential overlaps.
    Returns count of raised candidates.
    """
    cases = db.query(Case).filter(Case.status != "DISPOSED").order_by(Case.created_at.desc()).limit(200).all()
    count = 0
    for i in range(len(cases)):
        for j in range(i + 1, len(cases)):
            # Fast filter: only evaluate if same institution OR related category OR cross-bureau
            c1, c2 = cases[i], cases[j]
            if c1.institution_id == c2.institution_id or c1.bureau != c2.bureau or c1.category == c2.category:
                res = evaluate_case_pair(db, c1, c2)
                if res:
                    count += 1
    db.commit()
    return count

def list_overlap_candidates(
    db: Session,
    current_user: User,
    review_status: Optional[str] = "UNREVIEWED",
    min_score: int = 0,
    skip: int = 0,
    limit: int = 50
) -> Dict[str, Any]:
    q = db.query(OverlapCandidate)

    if review_status and review_status != "ALL":
        q = q.filter(OverlapCandidate.review_status == review_status)

    if min_score > 0:
        q = q.filter(OverlapCandidate.composite_score >= min_score)

    # Filter according to user scope: user must have scope access to Case A OR Case B
    if current_user.bureau_scope != "ALL":
        q = q.join(Case, or_(OverlapCandidate.case_a_id == Case.id, OverlapCandidate.case_b_id == Case.id)).filter(
            Case.bureau == current_user.bureau_scope
        ).distinct()

    total = q.count()
    items = q.order_by(desc(OverlapCandidate.composite_score)).offset(skip).limit(limit).all()

    # Hydrate with details
    hydrated = []
    for item in items:
        signals = json.loads(item.signals_json) if item.signals_json else {}
        hydrated.append({
            "id": item.id,
            "case_a": {
                "id": item.case_a.id,
                "source_case_id": item.case_a.source_case_id,
                "bureau": item.case_a.bureau,
                "category": item.case_a.category,
                "subject": item.case_a.subject,
                "status": item.case_a.status,
                "institution_name": item.case_a.institution.canonical_name if item.case_a.institution else "Unknown",
                "aicte_id": item.case_a.institution.aicte_permanent_id if item.case_a.institution else "N/A"
            },
            "case_b": {
                "id": item.case_b.id,
                "source_case_id": item.case_b.source_case_id,
                "bureau": item.case_b.bureau,
                "category": item.case_b.category,
                "subject": item.case_b.subject,
                "status": item.case_b.status,
                "institution_name": item.case_b.institution.canonical_name if item.case_b.institution else "Unknown",
                "aicte_id": item.case_b.institution.aicte_permanent_id if item.case_b.institution else "N/A"
            },
            "composite_score": item.composite_score,
            "signals": signals,
            "explanation": item.explanation,
            "review_status": item.review_status,
            "review_reason": item.review_reason,
            "created_at": item.created_at
        })

    return {
        "total": total,
        "items": hydrated,
        "skip": skip,
        "limit": limit
    }

def process_overlap_decision(
    db: Session,
    candidate_id: str,
    current_user: User,
    decision: str,  # LINK, DISMISS, DEFER
    reason: str,
    relationship_type: Optional[str] = "CROSS_BUREAU_COORDINATION"
) -> OverlapCandidate:
    candidate = db.query(OverlapCandidate).filter(OverlapCandidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Overlap candidate not found")

    decision = decision.upper()
    if decision not in {"LINK", "DISMISS", "DEFER"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Decision must be LINK, DISMISS, or DEFER")

    now = datetime.now(timezone.utc)
    candidate.reviewed_by_id = current_user.id
    candidate.reviewed_at = now
    candidate.review_reason = reason

    if decision == "LINK":
        candidate.review_status = "LINKED"
        # Check if case_link already exists
        existing_link = db.query(CaseLink).filter(
            or_(
                and_(CaseLink.case_a_id == candidate.case_a_id, CaseLink.case_b_id == candidate.case_b_id),
                and_(CaseLink.case_a_id == candidate.case_b_id, CaseLink.case_b_id == candidate.case_a_id)
            )
        ).first()
        if not existing_link:
            link = CaseLink(
                case_a_id=candidate.case_a_id,
                case_b_id=candidate.case_b_id,
                relationship_type=relationship_type or "CROSS_BUREAU_COORDINATION",
                created_by_id=current_user.id,
                notes=reason,
                created_at=now
            )
            db.add(link)

        # Insert Timeline Actions on BOTH cases
        action_a = CaseAction(
            case_id=candidate.case_a_id,
            actor_id=current_user.id,
            action_type="OVERLAP_LINKED",
            from_status=candidate.case_a.status,
            to_status=candidate.case_a.status,
            remarks=f"Conflict Radar: Linked with case '{candidate.case_b.source_case_id}' ({candidate.case_b.bureau}). Rationale: {reason}"
        )
        action_b = CaseAction(
            case_id=candidate.case_b_id,
            actor_id=current_user.id,
            action_type="OVERLAP_LINKED",
            from_status=candidate.case_b.status,
            to_status=candidate.case_b.status,
            remarks=f"Conflict Radar: Linked with case '{candidate.case_a.source_case_id}' ({candidate.case_a.bureau}). Rationale: {reason}"
        )
        db.add(action_a)
        db.add(action_b)

        log_audit_event(
            db=db,
            event_category="BUSINESS",
            event_type="OVERLAP_LINKED",
            actor=current_user,
            object_type="overlap_candidate",
            object_id=candidate.id,
            details={"case_a": candidate.case_a_id, "case_b": candidate.case_b_id, "reason": reason}
        )

    elif decision == "DISMISS":
        candidate.review_status = "DISMISSED"
        log_audit_event(
            db=db,
            event_category="BUSINESS",
            event_type="OVERLAP_DISMISSED",
            actor=current_user,
            object_type="overlap_candidate",
            object_id=candidate.id,
            details={"case_a": candidate.case_a_id, "case_b": candidate.case_b_id, "reason": reason}
        )

    elif decision == "DEFER":
        candidate.review_status = "DEFERRED"
        log_audit_event(
            db=db,
            event_category="BUSINESS",
            event_type="OVERLAP_DEFERRED",
            actor=current_user,
            object_type="overlap_candidate",
            object_id=candidate.id,
            details={"reason": reason}
        )

    db.commit()
    db.refresh(candidate)
    return candidate

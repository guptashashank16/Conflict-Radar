export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  bureau_scope: string;
  region_scope: string;
  is_active: boolean;
}

export interface DemoPersona {
  email: string;
  full_name: string;
  role: string;
  bureau_scope: string;
  region_scope: string;
  description: string;
  category?: string;
  designation?: string;
  office?: string;
  demo_status?: string;
}

export interface Case {
  id: string;
  source_system: string;
  source_case_id: string;
  institution_id?: string;
  institution_name: string;
  institution_region?: string;
  aicte_permanent_id?: string;
  bureau: string;
  category: string;
  subject: string;
  description: string;
  status: 'PENDING' | 'UNDER_PROCESS' | 'TRANSFERRED' | 'ESCALATED' | 'DISPOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  current_assignee_id?: string;
  current_assignee_name?: string;
  due_at?: string;
  sla_status: 'NORMAL' | 'WARNING' | 'OVERDUE';
  disposition_summary?: string;
  disposed_at?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CaseAction {
  id: string;
  action_type: string;
  from_status?: string;
  to_status?: string;
  remarks: string;
  actor_name: string;
  created_at: string;
}

export interface Institution {
  id: string;
  aicte_permanent_id?: string;
  canonical_name: string;
  region?: string;
  state?: string;
  address?: string;
  approval_status: string;
  created_at: string;
  updated_at: string;
}

export interface InstitutionAlias {
  id: string;
  alias_name: string;
  source: string;
  review_status: string;
}

export interface Institution360 {
  institution: Institution;
  aliases: InstitutionAlias[];
  cases_by_bureau: Record<string, Case[]>;
  total_accessible_cases: number;
  redacted_cases_count: number;
  status_summary: Record<string, number>;
  sla_summary: {
    overdue: number;
    at_risk: number;
    normal: number;
  };
  active_overlaps: any[];
}

export interface OverlapSignal {
  score: number;
  max: number;
  matched_id?: string;
  ratio?: number;
  category?: string;
  bureaus?: string[];
  note: string;
}

export interface OverlapCandidate {
  id: string;
  case_a: {
    id: string;
    source_case_id: string;
    bureau: string;
    category: string;
    subject: string;
    status: string;
    institution_name: string;
    aicte_id?: string;
  };
  case_b: {
    id: string;
    source_case_id: string;
    bureau: string;
    category: string;
    subject: string;
    status: string;
    institution_name: string;
    aicte_id?: string;
  };
  composite_score: number;
  signals: {
    exact_institution_id?: OverlapSignal;
    name_address_similarity?: OverlapSignal;
    category_similarity?: OverlapSignal;
    description_similarity?: OverlapSignal;
    cross_bureau_active?: OverlapSignal;
  };
  explanation: string;
  review_status: 'UNREVIEWED' | 'LINKED' | 'DISMISSED' | 'DEFERRED';
  review_reason?: string;
  created_at: string;
}

export interface DashboardSummary {
  total_institutions: number;
  total_cases: number;
  total_active_cases: number;
  cases_at_risk_warning: number;
  cases_overdue: number;
  pending_coordination_requests: number;
  unreviewed_overlap_candidates: number;
  bureau_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  bureau_workload?: Record<string, {
    total: number;
    pending: number;
    under_process: number;
    transferred: number;
    escalated: number;
    disposed: number;
    overdue: number;
    at_risk: number;
  }>;
  trend_sparklines?: Record<string, number[]>;
  recent_actions: any[];
}

export interface AuditEvent {
  id: string;
  actor_email: string;
  event_category: string;
  event_type: string;
  object_type?: string;
  object_id?: string;
  details?: string;
  ip_address?: string;
  request_id?: string;
  created_at: string;
}

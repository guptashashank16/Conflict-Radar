import {
  User,
  DemoPersona,
  Case,
  CaseAction,
  Institution,
  Institution360,
  OverlapCandidate,
  DashboardSummary,
  AuditEvent
} from '../types';

const API_BASE = '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('aicte_radar_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('aicte_radar_token', token);
    } else {
      localStorage.removeItem('aicte_radar_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Clear token on unauthorized
      this.setToken(null);
    }

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.detail || errorMessage;
      } catch (e) {
        // use default
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  // Auth & Personas
  async login(email: string, password: string = 'demo123') {
    const res = await this.request<{ access_token: string; user: User } & User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async getDemoPersonas(): Promise<DemoPersona[]> {
    return this.request<DemoPersona[]>('/auth/demo-personas');
  }

  async switchDemoRole(role: string) {
    const res = await this.request<{ access_token: string } & User>('/auth/switch-demo-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    this.setToken(res.access_token);
    return res;
  }

  // Dashboard
  async getDashboardSummary(params: { region?: string; days?: number } = {}): Promise<DashboardSummary> {
    const query = new URLSearchParams();
    if (params.region && params.region !== 'ALL') query.append('region', params.region);
    if (params.days) query.append('days', String(params.days));
    const qStr = query.toString();
    return this.request<DashboardSummary>(`/dashboard/summary${qStr ? `?${qStr}` : ''}`);
  }

  // Cases
  async getCases(params: Record<string, any> = {}): Promise<{ total: number; items: Case[]; skip: number; limit: number }> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        query.append(k, String(v));
      }
    }
    return this.request(`/cases?${query.toString()}`);
  }

  async getCaseDetails(id: string): Promise<Case> {
    return this.request(`/cases/${id}`);
  }

  async getCaseTimeline(id: string): Promise<CaseAction[]> {
    return this.request(`/cases/${id}/timeline`);
  }

  async updateCaseStatus(id: string, to_status: string, expected_version: number, remarks: string, disposition_summary?: string): Promise<Case> {
    return this.request(`/cases/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ to_status, expected_version, remarks, disposition_summary }),
    });
  }

  async assignCase(id: string, assignee_id: string, expected_version: number, reason: string): Promise<Case> {
    return this.request(`/cases/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignee_id, expected_version, reason }),
    });
  }

  async transferCase(id: string, target_bureau: string, expected_version: number, reason: string): Promise<Case> {
    return this.request(`/cases/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ target_bureau, expected_version, reason }),
    });
  }

  async requestCoordination(id: string, target_bureau: string, subject: string, message: string) {
    return this.request(`/cases/${id}/coordination`, {
      method: 'POST',
      body: JSON.stringify({ target_bureau, subject, message }),
    });
  }

  // Institutions
  async getInstitutions(params: Record<string, any> = {}): Promise<{ total: number; items: Institution[]; skip: number; limit: number }> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        query.append(k, String(v));
      }
    }
    return this.request(`/institutions?${query.toString()}`);
  }

  async getInstitution360(id: string): Promise<Institution360> {
    return this.request(`/institutions/${id}`);
  }

  // Overlaps (Conflict Radar)
  async getOverlaps(params: Record<string, any> = {}): Promise<{ total: number; items: OverlapCandidate[]; skip: number; limit: number }> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        query.append(k, String(v));
      }
    }
    return this.request(`/overlaps?${query.toString()}`);
  }

  async submitOverlapDecision(candidate_id: string, decision: 'LINK' | 'DISMISS' | 'DEFER', reason: string, relationship_type?: string) {
    return this.request(`/overlaps/${candidate_id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason, relationship_type }),
    });
  }

  async triggerRadarScan(): Promise<{ status: string; message: string }> {
    return this.request('/overlaps/scan', {
      method: 'POST',
    });
  }

  logout() {
    this.setToken(null);
  }

  // Reports
  async getWorkloadReport(region?: string): Promise<any> {
    const q = region && region !== 'ALL' ? `?region=${encodeURIComponent(region)}` : '';
    return this.request(`/reports/workload${q}`);
  }

  async getAgeingReport(region?: string): Promise<any> {
    const q = region && region !== 'ALL' ? `?region=${encodeURIComponent(region)}` : '';
    return this.request(`/reports/ageing${q}`);
  }

  // CSV Import
  async uploadCSV(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/imports/csv', {
      method: 'POST',
      body: formData,
    });
  }

  async getImportJobs(): Promise<any[]> {
    return this.request('/imports');
  }

  // Audit
  async getAuditEvents(params: Record<string, any> = {}): Promise<{ total: number; items: AuditEvent[]; skip: number; limit: number }> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        query.append(k, String(v));
      }
    }
    return this.request(`/audit/events?${query.toString()}`);
  }
}

export const api = new ApiClient();

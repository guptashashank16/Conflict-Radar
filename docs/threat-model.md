# Threat Model & Security Posture — SIH26264

## 1. Security Architecture Principles

1. **Least-Privilege Authorization:** Roles grant permitted operations; scopes determine which records (by bureau or region) those operations may apply to.
2. **Defense-in-Depth:**
   - Identity boundary: JWT validation and active account check.
   - Endpoint dependency: `require_permission(permission_name)`.
   - Business service: `enforce_case_scope(user, case.bureau, case.institution.region)`.
   - Data layer: Foreign keys, constraints, and audit logging.
3. **No Frontend-Only Security:** UI buttons and navigation tabs are for convenience; every sensitive backend route verifies authorization server-side.
4. **Sanitized Telemetry:** Passwords, tokens, and unnecessary sensitive case contents are strictly excluded from audit logs and console outputs.

---

## 2. Threat Analysis (OWASP API Top 10 Mitigation)

| Threat / Risk | Attack Vector | System Defense |
|---|---|---|
| **API1: BOLA (Broken Object Level Authorization)** | Attacker changes case ID in URL (`/cases/{id}`) to view another bureau's case | Backend checks `enforce_case_scope()`. If case belongs to PGRC and user is scoped to RB, returns `403 Forbidden`. |
| **API2: Broken Authentication** | Token forgery, replay, expired sessions | Signed HS256 JWT tokens with expiration; invalid signatures return `401 Unauthorized`. |
| **API3: Broken Object Property Level Authorization (Mass Assignment)** | Client sends arbitrary fields (e.g. `is_admin: true`, `version: 99`) | Pydantic strict schemas only accept explicitly declared fields. Model fields cannot be mass-assigned. |
| **API4: Unrestricted Resource Consumption** | Rapid requests, massive CSV payloads | Bounded pagination (`limit <= 200`), file upload limit (10MB), and rate limit middleware. |
| **API5: Broken Function Level Authorization** | Regular officer calls administrative or audit endpoints (`/audit/events`) | `require_permission("audit.read")` blocks non-auditors with `403 Forbidden`. |
| **API7: Server-Side Request Forgery / Malicious CSV** | Attacker uploads corrupted CSV with formulas or exploit payloads | CSV parser strictly extracts text strings without shell execution; rows are validated against typed schemas. |
| **API8: Security Misconfiguration** | Leaking stack traces or database errors | Global exception handler catches all unhandled exceptions, logs internal traceback with Request ID, and returns sanitized generic error. |
| **Concurrent Mutation (Race Condition)** | Two officers update the same case simultaneously | Optimistic Concurrency Control (`expected_version` vs `case.version`) detects race and rejects stale edit with `409 Conflict`. |

---

## 3. Honest Security Disclosures
- For this prototype, authentication uses signed bearer tokens and demo persona switching to facilitate seamless evaluation of role-based scope enforcement.
- Production deployment should integrate with an enterprise OpenID Connect identity provider (such as Keycloak or Indian Government e-Pramaan) with WebAuthn/Passkey MFA.

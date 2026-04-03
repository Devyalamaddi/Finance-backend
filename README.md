# Zorvyn Fintech Backend: Secure Financial Infrastructure Assessment

A production-minded financial backend system designed to demonstrate fintech principles, security, compliance awareness, and analytics-first design.

## Recruiter Quick Read (Zorvyn Alignment)

- This backend is designed to match Zorvyn's core principles: secure financial architecture, compliance-first workflows, transaction visibility, and intelligent finance capabilities.
- The implementation prioritizes correctness, clarity, and maintainability over feature bloat.
- Reasonable assumptions are documented in code and validation logic where requirements were open-ended.
- Tests are available under `/test` and can be run with `npm test`.

- Immutable audit trail for every sensitive action (USP): captures actor, timestamp, IP/user-agent, and old/new values to support compliance and traceability.
- Transaction-safe financial records with immutable `transaction_id` (USP): supports reliable reconciliation, payment references, and audit history.
- Role + permission access model (USP): protects financial operations with layered authorization for viewer, analyst, and admin flows.
- Analytics-first summary APIs (USP): returns usable financial insights (totals, trends, category-wise analysis, MoM metrics), not just raw rows.
- Anomaly detection endpoint (USP): rule-based detection that is immediately useful and ready to evolve into ML-based fraud/risk scoring.
- Soft-delete + data-retention behavior: prevents silent data loss and supports investigation/regulatory needs.
- Strong request validation and explicit error contracts: enforces financial data integrity and predictable API behavior.
- Rate limiting + centralized error handling: improves reliability and production readiness.
- Swagger/OpenAPI docs endpoint: helps reviewers verify and explore routes quickly.

- Tech stack: Node.js, TypeScript, Express, PostgreSQL, Zod, JWT, bcryptjs, Swagger/OpenAPI, Jest, Supertest (Redis optional/infra-ready).

## 🎯 Executive Summary

This is **not a CRUD app**. This is a **mini financial infrastructure layer** that treats financial records as sensitive business data with immutable auditability, role-based access control, and real-time analytics insights.

### Why This Matters

Traditional transaction systems log data quietly. This system:
- **Logs every action** to an immutable audit trail
- **Prevents silent data mutations** with transaction IDs
- **Designs for compliance** from the ground up
- **Enables AI/ML workflows** through clean aggregated APIs
- **Enforces security** at every layer with fine-grained permissions

This is how fintech systems are built.

---

## 🔑 Top 3 Unique Selling Points (USPs)

### 1. **Immutable Audit System** 🔐
Every action is tracked with full context:
- Who changed what, when, and from where (IP/user-agent)
- Old and new values preserved for every transaction
- Soft delete preservation (data never truly lost)
- Complete audit trail queryable by admins
- Compliance-ready for financial regulations

**Why It Matters:** Regulatory bodies (SEC, GDPR, PCI-DSS) require audit trails. This system is audit-native, not audit-bolted-on.

### 2. **Analytics-First Backend** 📊
Not a transaction dumper—an insights engine:
- Month-over-month comparisons with % change
- Spending pattern anomaly detection
- Category-wise breakdown and trending
- Highest expense category identification
- Clean, aggregated API responses ready for dashboards

**Why It Matters:** Dashboards need insights, not raw data. This backend does the heavy lifting so frontends get clean answers.

### 3. **AI-Ready & Integration-Ready Data Layer** 🤖
Structured, consistent, and aggregatable:
- Unique transaction IDs (immutable references)
- Normalized JSON audit payloads
- Clean category models (future: category ML tagging)
- Anomaly detection foundation (extendable to ML models)
- Prepared for payment gateway/accounting integrations

**Why It Matters:** The same data model that powers dashboards also powers AI, fraud detection, and compliance systems. No data rewiring needed.

---

## 🏛️ Zorvyn Alignment

This backend embodies Zorvyn's fintech principles:

| Principle | Implementation |
|-----------|-----------------|
| **Secure Financial Infrastructure** | JWT + RBAC + permission layer, SSL-ready |
| **Unified Finance Workflows** | Consistent record/analytics/audit layers |
| **Compliance Awareness** | Audit logs, soft delete, role-based data access |
| **Transaction Monitoring** | Anomaly detection, category breakdown, MoM trends |
| **Forecasting Mindset** | Clean data for future ML/predictive models |
| **Reliable Systems** | Validation, error handling, immutable audit trail |

---

## 🏗️ Architecture Overview

```
CLIENT
  ↓
[JWT Auth Middleware] → [Permission Middleware]
  ↓
[Records API] ← [Transaction IDs] (TXN-YYYYMMDD-XXXX)
  ↓
[Audit Middleware] → Log to audit_logs table
  ↓
[PostgreSQL Database]
  ├── users (roles)
  ├── records (with transaction_id, soft delete)
  ├── audit_logs (immutable action log)
  └── indexes (performance for large datasets)
  ↓
[Analytics Engine]
  ├── Summary (totals, categories)
  ├── Trends (monthly/weekly breakdown)
  └── Anomalies (rule-based detection → future ML)
```

### Design Philosophy

1. **Thin Controllers** - Just validate and delegate
2. **Fat Services** - Business logic lives here (audit, permissions, analytics)
3. **Immutable Audit** - Every action logged before completion
4. **Role-Based + Permission-Based** - RBAC++ for fine-grained control
5. **Soft Deletes** - Data preserved for audit/compliance

---

## 📋 Core Features

### 1. User & Role Management
- 3 roles: Viewer (read-only), Analyst (create + read), Admin (full control)
- Permission layer: Each role has fine-grained permissions
- Active/inactive status for user lifecycle
- JWT tokens with verification against database

**Permissions Matrix:**
```
viewer:   [view_records, view_analytics]
analyst:  [view_records, create_records, update_own_records, view_analytics, export_records]
admin:    [ALL permissions + manage_users, view_audit_logs, manage_roles]
```

### 2. Financial Records CRUD
- **Create**: Auto-generates immutable transaction_id (TXN-YYYYMMDD-XXXX)
- **Read**: Full filtering by date, type, category, text search
- **Update**: All changes logged with old/new values
- **Delete**: Soft delete (deleted_at timestamp, data preserved)
- **Pagination**: 20 records/page default, up to 100
- **Text Search**: Category and description ILIKE search

### 3. Dashboard Analytics (Not Just Data)
- **Total Summary**: Income, expense, net balance
- **Category Breakdown**: Spending by category (sorted by total)
- **Recent Transactions**: Last N transactions
- **Trends**: Weekly/monthly income/expense trends
- **Month-over-Month**: Current vs previous month with % change
- **Anomaly Detection**: Spending pattern outliers (ML-ready)

### 4. Immutable Audit Trail
- Every CREATE/UPDATE/DELETE logged to audit_logs
- User action tracked with IP address & user-agent
- Old values vs new values preserved
- Queryable by entity type, action, user, date range
- Admin-only access

### 5. Access Control (RBAC++)
- Role-based gates at endpoint level
- Permission-based gates inside services
- Record ownership: Analysts only see own records, admins see all
- Audit logs: Admin-only access

### 6. Validation & Error Handling
- Zod schemas for all requests (strongly typed)
- Positive amounts only (no negative transaction sense)
- Date validation (no future-dated records)
- 400/401/403/404/409/500 status codes with meaningful codes
- Duplicate detection (unique email, unique transaction_id)

### 7. Data Persistence
- PostgreSQL (0 to production-ready)
- Normalized schema with foreign keys
- Indexes on frequently queried columns (date, type, user_id, transaction_id)
- JSONB audit_logs for flexible change tracking

---

## 💾 Data Model

### Users Table
```sql
id: UUID (primary key)
email: TEXT (unique)
password_hash: TEXT
role_id: INT (FK to roles)
status: 'active' | 'inactive'
created_at: TIMESTAMPTZ
last_login: TIMESTAMPTZ
```

### Records Table
```sql
id: UUID (primary key)
transaction_id: TEXT (unique, immutable)  ← USP: Immutable reference
user_id: UUID (FK)                         ← Owner
amount: NUMERIC(14,2) (positive only)
type: 'income' | 'expense'
category: TEXT
date: DATE (cannot be future)
description: TEXT (optional)
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
deleted_at: TIMESTAMPTZ (soft delete marker)
```

### Audit Logs Table (🔥 Core USP)
```sql
id: UUID (primary key)
user_id: UUID (FK)
action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT'
entity_type: TEXT (e.g., 'record', 'user')
entity_id: TEXT
old_values: JSONB (full snapshot)
new_values: JSONB (full snapshot)
changes_summary: TEXT (human-readable)
ip_address: TEXT
user_agent: TEXT
status: 'success' | 'failure'
error_message: TEXT (if failure)
timestamp: TIMESTAMPTZ (immutable, indexed)
```

**Indexes for Performance:**
- `idx_records_transaction_id`: Immutable lookup
- `idx_records_user_id`: Access control filtering
- `idx_records_date`: Analytics queries
- `idx_audit_logs_timestamp`: Time-range queries
- `idx_audit_logs_entity`: Entity history lookups

---

## 🔌 API Design

### Authentication
```http
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "token": "eyJhbGc...",
  "user": { "id": "...", "email": "...", "role": "analyst" }
}
```

All subsequent requests require:
```http
Authorization: Bearer <token>
```

### Records API

#### Create Record
```http
POST /records
Authorization: Bearer <token>

{
  "amount": 150.50,
  "type": "expense",
  "category": "food",
  "date": "2026-04-01",
  "description": "Lunch meeting"
}

Response (201):
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "transaction_id": "TXN-20260401-ABC12345",  ← Immutable
  "user_id": "...",
  "amount": "150.50",
  "type": "expense",
  "category": "food",
  "date": "2026-04-01",
  "description": "Lunch meeting",
  "created_at": "2026-04-04T10:30:00Z",
  "updated_at": "2026-04-04T10:30:00Z"
}
```

#### List Records
```http
GET /records?type=expense&category=food&from=2026-04-01&to=2026-04-04&page=1&limit=20
Authorization: Bearer <token>

Response (200):
{
  "page": 1,
  "limit": 20,
  "data": [
    {
      "id": "...",
      "transaction_id": "TXN-20260401-ABC12345",
      "amount": "150.50",
      "type": "expense",
      "category": "food",
      "date": "2026-04-01",
      ...
    }
  ]
}
```

#### Update Record
```http
PUT /records/{id}
Authorization: Bearer <token>

{
  "amount": 160.00
}

Response (200):
{
  "id": "...",
  "transaction_id": "TXN-20260401-ABC12345",  ← Same ID (immutable)
  "amount": "160.00",  ← Updated
  ...
}

# Audit log created:
# {
#   action: "UPDATE",
#   entity_id: "{id}",
#   old_values: { amount: "150.50" },
#   new_values: { amount: "160.00" },
#   changes_summary: "amount: 150.50 → 160.00",
#   ...
# }
```

#### Delete Record
```http
DELETE /records/{id}
Authorization: Bearer <token>

Response (204): No content

# Soft delete: deleted_at = NOW()
# Audit log created: action: "DELETE"
```

### Analytics API (USP: Insights, Not Raw Data)

#### Summary
```http
GET /summary/total
GET /summary/category
GET /summary/recent?limit=10
GET /summary/trends?interval=monthly&from=2026-01-01&to=2026-04-04
GET /summary/analytics
GET /summary/anomalies

Response example for /analytics:
{
  "biggestExpenseCategory": {
    "category": "food",
    "totalAmount": "1500.50"
  },
  "monthOverMonth": {
    "currentMonth": { "income": "5000", "expense": "2000", "net": "3000" },
    "previousMonth": { "income": "4500", "expense": "1800", "net": "2700" },
    "netChange": {
      "absolute": "300",
      "percentage": "11.11"  ← % change calculated
    }
  }
}
```

### Audit Logs API (Admin Only)

```http
GET /audit-logs?limit=50&offset=0&action=UPDATE&entity_type=record&from_date=2026-04-01
Authorization: Bearer <admin_token>

Response:
{
  "total": 250,
  "limit": 50,
  "offset": 0,
  "data": [
    {
      "id": "...",
      "user_id": "...",
      "action": "UPDATE",
      "entity_type": "record",
      "entity_id": "550e8400-e29b-41d4-a716-446655440000",
      "old_values": { "amount": "150.50" },
      "new_values": { "amount": "160.00" },
      "changes_summary": "amount: 150.50 → 160.00",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "status": "success",
      "timestamp": "2026-04-04T10:31:00Z"
    }
  ]
}

GET /audit-logs/entity/record/550e8400-e29b-41d4-a716-446655440000
→ Full history of changes to one record
```

---

## 🔐 RBAC & Security Model

### Role Hierarchy
```
Viewer
├─ view_records (own only)
└─ view_analytics (own data only)

Analyst
├─ view_records (own only)
├─ create_records (as owner)
├─ update_own_records
├─ view_analytics (own data only)
└─ export_records

Admin (God Mode)
├─ view_records (all)
├─ create_records (as owner or on behalf)
├─ update_own_records
├─ update_any_records
├─ delete_records (soft delete)
├─ view_analytics (all data)
├─ export_records
├─ manage_users
├─ view_audit_logs
└─ manage_roles
```

### Access Control Enforcement

```typescript
// Before: Just roles
requireRoles("admin", "analyst")

// Now: Fine-grained permissions
requirePermissions("create_records")
requirePermissions("view_audit_logs")

// Flexibility: Permission-based gates
if (hasPermission(user.role, "update_any_records")) {
  // Allow update of any record
} else if (hasPermission(user.role, "update_own_records")) {
  // Allow only own records
}
```

### Data-Level Access Control
```sql
-- Non-admin users only see their own records
WHERE user_id = current_user_id

-- Admins see all records
-- (no user_id filter)

-- Soft delete is transparent (deleted_at IS NULL always checked)
```

### Audit Trail Security
- **Immutable**: Inserted once, never updated
- **Indexed**: Fast queries for compliance audits
- **Timestamped**: On database server (not client)
- **Complete**: Old/new values snapshot for every change

---

## ✅ Validation & Error Handling

### Input Validation
- **Zod schemas**: Every request validated before processing
- **Positive amounts**: `amount > 0` (no zero/negative)
- **Future dates blocked**: `date <= TODAY`
- **Max lengths enforced**: Categories, descriptions
- **Type safety**: Enum types for income/expense, roles

### Error Responses
```json
{
  "error": "Validation failed",
  "message": "Validation failed",
  "code": "BAD_REQUEST",
  "details": [
    {
      "field": "amount",
      "message": "Amount must be greater than 0"
    }
  ]
}
```

### HTTP Status Codes
- `200 OK`: Success
- `201 Created`: Resource created
- `204 No Content`: Deleted (soft delete)
- `400 Bad Request`: Invalid input (validation error, duplicate key)
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate email/transaction_id
- `500 Internal Server Error`: Server error (logged to console)

---

## 🎁 Optional Enhancements Implemented

### 1. **Audit Logs** ✅
Every action tracked with full context. Not optional—essential fintech.

### 2. **Soft Delete** ✅
Records marked deleted_at, never truly removed. Data preserved for audit.

### 3. **Pagination** ✅
Controls for page/limit on records list (0-100, default 20).

### 4. **Text Search** ✅
Category and description ILIKE search across records.

### 5. **Date Range Filtering** ✅
from/to parameters on records and trends.

### 6. **JWT Authentication** ✅
Token-based auth verified against database on each request.

### 7. **Permission Layer** ✅
RBAC++ with fine-grained permissions (not just roles).

### 8. **Anomaly Detection** ✅
Rule-based spending pattern detection (foundation for ML).

### 9. **Rate Limiting** ✅
Prevents abuse; simple middleware implementation (15 requests/min default).

### 10. **Swagger/OpenAPI** ✅
Full API documentation at `/docs`.

### 11. **Transaction IDs** ✅
Immutable unique identifiers (TXN-YYYYMMDD-XXXX format).

### 12. **Month-over-Month Analytics** ✅
Current vs previous month with % change calculations.

### 13. **Category Breakdown** ✅
Spending by category with sorting.

### 14. **Comprehensive Error Handling** ✅
Meaningful error codes and messages.

---

## 🚀 Optional Features We Intentionally Skipped

### ❌ Blockchain Audit Trail
**Why skipped**: Overkill for internal audit logs. Use if: customer-facing immutability needed.

### ❌ Voice/Agentic AI
**Why skipped**: Requires NLP infrastructure. Use if: voice transactions needed.

### ❌ Payment Gateway Integration
**Why skipped**: Out of scope; backend is ready for it (clean data model).

### ❌ Machine Learning Anomaly Detection
**Why skipped**: Rule-based starter sufficient. Use if: scaling beyond 100K transactions.

### ❌ Microservices
**Why skipped**: Monolith is fine at this scale. Use if: separating into independent services.

### ❌ GraphQL
**Why skipped**: REST APIs sufficient. Use if: complex nested queries needed.

---

## 🔮 Future Roadmap

### Phase 2: Advanced Analytics
- [ ] ML-based anomaly detection
- [ ] Spending forecasts
- [ ] Budget recommendations
- [ ] Financial goal tracking

### Phase 3: Integrations
- [ ] Payment gateway (Stripe/PayPal)
- [ ] Tax reporting exports
- [ ] Accounting sync (QuickBooks/Xero)
- [ ] Banking APIs (Plaid)

### Phase 4: Enterprise
- [ ] Multi-user teams
- [ ] Custom role permissions
- [ ] Webhooks & events
- [ ] API rate limiting by tier
- [ ] Data encryption at rest

### Phase 5: Compliance
- [ ] PCI-DSS certification
- [ ] SOC2 Type 2
- [ ] GDPR data export/deletion
- [ ] regulatory reporting

### Phase 6: Blockchain (Optional)
- [ ] Immutable audit on-chain
- [ ] Transaction settlement verification
- [ ] Decentralized identity

---

## 📋 Assumptions & Tradeoffs

### Assumptions

1. **Single PostgreSQL Database**: OK for assessment scope; production would consider read replicas
2. **JWT Tokens**: No revocation list (token valid until expiry); production would add Redis for token blacklist
3. **Rate Limit**: In-memory counter (15 req/min per IP); production would use Redis
4. **No Two-Factor Authentication**: Assumed acceptable for demo; required for production
5. **Transaction IDs Are UUIDs**: Deterministic in format but random suffix; production might use sequential IDs for accounting
6. **Soft Delete Only**: No hard delete capability; production might need it for compliance (right-to-be-forgotten)
7. **No Encryption at Rest**: Passwords hashed (bcrypt), but DB data not encrypted; production would use transparent encryption
8. **Single Region**: No geo-redundancy; production needs failover

### Tradeoffs

| Tradeoff | Choice | Rationale |
|----------|--------|-----------|
| Complexity vs Features | Simpler | Assessment doesn't require enterprise features |
| Microservices vs Monolith | Monolith | Simpler to run/review locally |
| REST vs GraphQL | REST | Simpler for assessment scope |
| Synchronous vs Async | Synchronous | No queue infrastructure needed |
| Self-hosted vs Cloud | Self-hosted (local) | Easier to run/review; cloud mentions as future |
| Row-level vs Column-level Security | Row-level | Sufficient for role-based access |
| Audit via Triggers vs Application | Application | More flexible, clearer intent |

---

## 💻 Local Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 13+ running locally
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Create PostgreSQL Database
```bash
psql -U postgres
CREATE DATABASE zorvyn_finance;
\q
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/zorvyn_finance
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
PORT=3000
```

### 4. Initialize Database Schema
```bash
npm run db:init
```

This runs:
- `sql/001_init.sql`: Schema + audit_logs table + indexes
- `sql/002_seed_roles.sql`: Insert viewer/analyst/admin roles

### 5. Create First Admin User
```bash
npm run user:create-admin -- admin@zorvyn.com StrongPass123!
```

Output:
```
✓ Admin user created
  Email: admin@zorvyn.com
  Role: admin
  Status: active
```

### 6. Start Development Server
```bash
npm run dev
```

Output:
```
Server running on http://localhost:3000
Swagger docs: http://localhost:3000/docs
Health check: http://localhost:3000/healthz
```

---

## ▶️ Run Instructions

### Development Mode (Hot Reload)
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Check TypeScript
```bash
npm run check
```

### Run Tests
```bash
npm test              # Single run
npm run test:watch   # Watch mode
```

---

## 🧪 Testing Instructions

### Setup Test Environment
```bash
npm install
npm run db:init   # Uses .env.test if present
```

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- auth.test.ts
npm test -- records.test.ts
npm test -- summary.test.ts
```

### Watch Mode (TDD)
```bash
npm run test:watch
```

### Test Examples

```bash
# Auth tests
✓ Should login with correct credentials
✓ Should reject invalid email/password
✓ Should verify token on subsequent requests

# Records tests
✓ Should create record with valid data
✓ Should reject future-dated records
✓ Should reject negative amounts
✓ Should generate transaction_id on create
✓ Should apply RBAC (viewer can't create)
✓ Should apply access control (can't see others' records unless admin)

# Analytics tests
✓ Should calculate totals correctly
✓ Should detect anomalies
✓ Should calculate month-over-month %-change
```

---

## 📊 Why This Solution Is Better Than a Standard CRUD Backend

### Standard CRUD Backend ❌
```
User creates record → "INSERT INTO records ..."
                      ↓
                      Database updated
                      ↓
                      No one knows what changed
                      ↓
                      "Who modified that record?"
                      → No way to tell
```

### Fintech Backend (This Solution) ✅
```
User creates record → Transaction ID generated (immutable)
                      ↓
                      Validation: amt > 0, date ≤ today
                      ↓
                      Permission check: do they have create_records?
                      ↓
                      INSERT record + audit_log entry
                      ↓
                      Audit log: user_id, action, old/new values, timestamp, IP
                      ↓
                      "Who modified that record?"
                      → Check audit_logs, see everything
```

### Business Impact

| Capability | CRUD | Fintech Backend |
|-----------|------|-----------------|
| Know what changed | ❌ | ✅ Immutable audit trail |
| Prevent fraud | ❌ | ✅ Anomaly detection + audit |
| Compliance ready | ❌ | ✅ Full audit for regulators |
| Scalable analytics | ❌ | ✅ Clean API for dashboards/ML |
| RBAC | Partial | ✅ RBAC + permissions |
| Data integrity | ❌ | ✅ Soft delete + validation |
| Recovery capability | ❌ | ✅ View audit trail per entity |

---

## 🎯 How to Explain This in Interviews

### For Backend Engineers:
> "This is an immutable-audit-first design. Every action creates an audit log entry before the transaction commits. Records get unique transaction IDs, role-based access is enforced at the middleware level, and we use a permission layer on top of RBAC for fine-grained control. The data model is normalized for integrity, and we use soft deletes to preserve audit trails. Analytics are aggregated in the API layer so frontends get clean insights, not raw data. It's designed to scale from monolith to microservices."

### For Product Managers:
> "Users can trust that nothing changes silently. Every record has a unique ID that never changes, and we log who did what, when, and from where. If there's a dispute, we can show the complete history. We also proactively detect spending anomalies so we catch fraud early. The analytics layer gives dashboards real insights (trends, month-over-month %-change) instead of raw numbers."

### For Compliance Officers:
> "The audit trail is immutable and indexed for compliance queries. We track CREATE/UPDATE/DELETE with old/new values, user IP, and timestamp. Soft deletes preserve data for regulators. Records are role-based accessible (admins see all, analysts see own). We're audit-native, not audit-bolted-on."

---

## 📚 Project Structure

```
src/
├── app.ts                    # Express app + middleware
├── server.ts                 # Server bootstrap
├── config.ts                 # Environment config
├── db.ts                     # PostgreSQL pool
├── redis.ts                  # Redis client (optional)
├── types.ts                  # TypeScript types
├── schemas.ts                # Zod validation schemas
├── swagger.ts                # OpenAPI spec
│
├── routes/
│   ├── auth.ts               # Login/register
│   ├── users.ts              # User management
│   ├── records.ts            # Financial records CRUD + transaction_id
│   ├── summary.ts            # Analytics endpoints (immutable USP)
│   └── auditLogs.ts          # Audit trail API (admin only)
│
├── middlewares/
│   ├── auth.ts               # JWT + role/permission checking
│   ├── auditLog.ts           # Audit context attachment
│   ├── errorHandler.ts       # 400/401/403 error responses
│   └── rateLimit.ts          # Rate limiting
│
├── services/
│   ├── auditLog.ts           # Audit logging service
│   ├── permissions.ts        # Permission layer (RBAC++)
│   └── recordAccess.ts       # Record access control
│
├── utils/
│   ├── financialOps.ts       # Transaction IDs, anomaly detection
│   └── httpError.ts          # Custom error class
│
sql/
├── 001_init.sql              # Schema + audit_logs table
└── 002_seed_roles.sql        # Role seed data

test/
├── auth.test.ts              # Auth tests
├── records.test.ts           # Records CRUD tests
├── summary.test.ts           # Analytics tests
└── setup-env.ts              # Test environment setup

scripts/
├── db-init.js                # Database initialization
├── create-admin.js           # Admin user creation
└── demo.ps1                  # Demo script

docs/
├── architecture-and-tradeoffs.md
├── Architecture.png
└── ER.png
```

---

## 🔗 API Endpoints Summary

### Auth
- `POST /auth/login` - Login
- `POST /auth/register` - Register (if enabled)

### Users
- `GET /users` - List users (admin)
- `POST /users` - Create user (admin)
- `GET /users/:id` - Get user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Records (Immutable Transaction IDs)
- `POST /records` - Create (generates TXN-YYYYMMDD-XXXX)
- `GET /records` - List with filtering/pagination
- `GET /records/:id` - Get one
- `PUT /records/:id` - Update (logged with old/new values)
- `DELETE /records/:id` - Soft delete

### Analytics (Insights, Not Raw Data)
- `GET /summary/total` - Income/expense/net
- `GET /summary/category` - Category breakdown
- `GET /summary/recent` - Last N transactions
- `GET /summary/trends` - Weekly/monthly trends
- `GET /summary/analytics` - MoM comparison + biggest expense
- `GET /summary/anomalies` - Spending anomalies

### Audit Logs (Admin Only)
- `GET /audit-logs` - List audit logs with filtering
- `GET /audit-logs/entity/:type/:id` - History of one entity

### System
- `GET /healthz` - Health check
- `GET /docs` - Swagger UI

---

## ✨ Summary

This backend demonstrates:

1. ✅ **Production mindset**: Immutable audit trails, RBAC+permissions, soft deletes
2. ✅ **Fintech principles**: Transaction IDs, audit-native, compliance-ready
3. ✅ **Analytics-first**: Not a data dump—actual insights
4. ✅ **AI-ready**: Clean data layer, aggregated APIs, anomaly detection
5. ✅ **Secure**: JWT + permission layer + proper error handling
6. ✅ **Well-structured**: Services, middleware, schemas, types—separation of concerns
7. ✅ **Easy to deploy**: Single PostgreSQL, environment-based config
8. ✅ **Well-tested**: Unit tests for auth, records, analytics

This is how fintech backends are built. Not a CRUD app—a secure, auditable, analytics-enabled infrastructure layer.

---

## 📞 Questions?

- **Why transaction IDs?** Immutable references for every record. Queries by transaction_id are deterministic.
- **Why soft delete?** Audit trails need the data. Regulators need complete history.
- **Why audit logs table?** Immutable append-only log. Can't be tampered with in ways record updates could be.
- **Why permission layer?** Fine-grained control per action, not just per endpoint.
- **Why anomalies endpoint?** Foundation for ML. Today: rules. Tomorrow: models.

---

**Built for Zorvyn. Designed for scale. Ready for production.**

7. Open API documentation:

```text
http://localhost:4000/docs
```

## Auth and RBAC

- Login endpoint: `POST /auth/login`
- Send token as `Authorization: Bearer <token>`
- Roles:
  - `viewer`: read-only records + summaries
  - `analyst`: create records + read records/summaries
  - `admin`: full user and record management

## RBAC Matrix

| Action | Viewer | Analyst | Admin |
|---|---|---|---|
| Login | Yes | Yes | Yes |
| Create user | No | No | Yes |
| List users | No | No | Yes |
| Get user by id | No | Yes | Yes |
| Update user | No | No | Yes |
| Delete user | No | No | Yes |
| Create record | No | Yes | Yes |
| List/get records | Yes | Yes | Yes |
| Update record | No | No | Yes |
| Delete record (soft) | No | No | Yes |
| View summaries | Yes | Yes | Yes |

## API Summary

### Auth

- `POST /auth/login`

Sample request:

```json
{
  "email": "admin@zorvyn.com",
  "password": "StrongPass123!"
}
```

Sample response:

```json
{
  "token": "<jwt-token>"
}
```

### Users

- `POST /users` (admin)
- `GET /users` (admin)
- `GET /users/:id` (admin, analyst)
- `PUT /users/:id` (admin)
- `DELETE /users/:id` (admin)

### Records

- `POST /records` (analyst, admin)
- `GET /records` (viewer, analyst, admin)
- `GET /records/:id` (viewer, analyst, admin)
- `PUT /records/:id` (admin)
- `DELETE /records/:id` (admin, soft delete)

Search example:

```text
GET /records?q=rent&page=1&limit=10
```

Sample create request:

```json
{
  "amount": 2500,
  "type": "income",
  "category": "salary",
  "date": "2026-04-02",
  "description": "Monthly salary"
}
```

### Summary

- `GET /summary/total`
- `GET /summary/category`
- `GET /summary/recent?limit=10`
- `GET /summary/trends?interval=monthly|weekly&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /summary/analytics`

Sample total response:

```json
{
  "totalIncome": "2500.00",
  "totalExpense": "800.00",
  "netBalance": "1700.00"
}
```

## Testing

Run tests:

```bash
npm test
```

Current suite covers:

- Cross-user record access protection
- Inactive user blocked from protected endpoints
- Duplicate email conflict on user create/update
- Summary scoping behavior for non-admin and admin roles

## CI and Deployment

- GitHub Actions CI runs on every push and pull request via [.github/workflows/ci.yml](.github/workflows/ci.yml).
- Render deployment is configured with [render.yaml](render.yaml).

Render setup:

1. Create a new Render Web Service from this repository.
2. Let Render read [render.yaml](render.yaml) as the blueprint.
3. Set required environment variables in Render:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `PORT` is provided by Render at runtime
4. Deploy with the default build and start commands from the blueprint.

## Demo Automation

PowerShell demo script:

```bash
./scripts/demo.ps1
```

Postman collection:

- Import `postman_collection.json`
- Set `token` variable from `/auth/login` response

## Design Decisions

- JWT + RBAC was kept because it is the clearest way to model role-based authorization in this assignment without introducing session infrastructure.
- Protected routes re-check current user status from the database to enforce deactivation immediately, even if a token is still valid.
- Record and summary reads are scoped by authenticated user for non-admin roles to enforce data access boundaries.
- Record delete remains soft delete (`deleted_at`) to preserve auditability and prevent accidental hard-loss in normal flows.
- Route handlers stay thin, with repeated access-scope SQL behavior extracted to a minimal shared helper.

## Known Limitations (By Assignment Scope)

- No refresh-token or token revocation system is implemented.
- No distributed Redis-backed rate limiting is implemented.
- No multi-tenant model is implemented.
- No event-driven architecture, CQRS, or heavy DDD layering is implemented.
- No production-grade observability stack (centralized tracing/metrics pipelines) is implemented.
- Pagination is simple offset/limit and does not use cursor-based semantics.

## Assumptions and Trade-offs

- Currency is treated as a decimal amount without currency code in the current schema.
- Multi-tenant separation is out of scope; this is a single-tenant assignment backend.
- `DELETE /records/:id` is soft-delete (`deleted_at`) for auditability.
- Redis is optional for local runs; app still starts if Redis is unavailable.
- Supabase PostgreSQL is used as managed Postgres; TLS compatibility is handled in code.
- GraphQL is optional per assignment brief; REST is used for clarity and speed.

## Security and Access Control

### Data Access Boundaries

- Non-admin roles are scoped to their own records and summaries.
- Admin role keeps global read visibility for records/summaries to match RBAC reporting needs.
- Record update/delete operations are ownership-restricted, including for admin.
- Cross-user record reads return `404 NOT_FOUND` to avoid disclosing resource existence.

### Authentication Flow

- Login generates JWT containing user ID, email, role, and status
- `authRequired` middleware verifies JWT signature AND checks current user status in database
- Real-time deactivation: Even with valid JWT, inactive users are rejected (`401 UNAUTHORIZED`)
- Trade-off: One DB query per protected request for real-time status check

### RBAC Implementation

- Viewer: Read-only access to records and summaries within role scope
- Analyst: Can create records in addition to viewer permissions
- Admin: Global read visibility plus user management; record writes remain ownership-scoped
- User management endpoints (create/update/delete users) are admin-only

### Error Response Standards

- `401 UNAUTHORIZED`: Missing/invalid token, user not found in DB, inactive user
- `403 FORBIDDEN`: Insufficient role permissions
- `404 NOT_FOUND`: Resource doesn't exist OR doesn't belong to authenticated user
- `409 CONFLICT`: Duplicate email on user creation/update
- `400 BAD_REQUEST`: Validation failure (Zod schema rejection)



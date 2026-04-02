# Architecture and Trade-offs

This document explains how the Zorvyn backend is structured and why key design decisions were made.

## Architecture Diagram
![Architecture](/docs/Architecture.png)

## Layering and Responsibilities

- Routing layer: Defines endpoint contracts, status codes, and transport-level logic. Implemented under src/routes.
- Validation layer: Zod schemas enforce input shape and reject invalid requests early.
- Access-control layer: authRequired verifies JWT and checks user status in DB; requireRoles enforces role permissions.
- Data-access layer: query calls in db.ts execute parameterized SQL against PostgreSQL.
- Shared domain helpers: recordAccess service centralizes reusable scoping logic used by records and summary routes.
- Infra and cross-cutting concerns: rate limiting, logging, security headers, error normalization, and Swagger docs are wired in app.ts.

This keeps route handlers thin while preserving straightforward readability for assignment-style review.

## Core Data Model

- roles: controlled role vocabulary (viewer, analyst, admin).
- users: identity, password hash, role reference, active or inactive state, and login metadata.
- records: finance events with amount, type (income or expense), category, date, optional description, and soft-delete timestamp.

Important constraints:

- Check constraints enforce valid enums and non-negative amounts.
- Foreign keys preserve role and owner referential integrity.
- Indexes support common filters: date, type, category, user_id, deleted_at.

The model is intentionally minimal but production-adjacent: enough rigor for correctness and queryability without overengineering.

## Trade-offs and Rationale

### 1) REST over GraphQL

Decision:

- Use REST endpoints grouped by resources (auth, users, records, summary).

Why:

- Faster implementation and easier evaluator readability for the assignment.
- Clear mapping from HTTP verbs to CRUD and reporting operations.

Trade-off:

- Less flexible query shaping than GraphQL, but simpler mental model and lower implementation complexity.

### 2) JWT stateless auth plus DB status recheck

Decision:

- Issue JWT on login, then verify token and re-query user status on every protected request.

Why:

- Stateless authentication keeps infra simple.
- Rechecking DB status enables near-immediate deactivation enforcement even when a token is still unexpired.

Trade-off:

- Adds one DB read per protected request.
- Chosen because security semantics were prioritized over raw throughput in this scope.

### 3) Role-based access control with scoped data reads

Decision:

- Role gates for endpoint capability, plus non-admin record and summary scoping to requester-owned data.

Why:

- Prevents cross-user data leakage.
- Separates capability control (role) from data boundary control (owner scope).

Trade-off:

- Extra SQL condition composition and helper abstraction.
- Worth it for clearer, testable access rules.

### 4) Ownership restriction on record writes, including admin

Decision:

- Record update and delete operations are ownership-scoped.

Why:

- Conservative safety default: prevents accidental mutation of other users' records.

Trade-off:

- Admin cannot arbitrarily edit all records by default.
- This is stricter than some admin models, but aligns with least-privilege and auditability goals.

### 5) Soft delete for records

Decision:

- Deletion sets deleted_at instead of removing rows.

Why:

- Preserves historical trace and reduces accidental data loss risk.

Trade-off:

- All read queries must consistently filter deleted_at IS NULL.
- Additional operational tasks are needed if eventual hard purge is desired.

### 6) SQL-first aggregation in summary endpoints

Decision:

- Compute totals, category groups, and trends directly in SQL.

Why:

- Pushes aggregation work to the database where it is efficient and concise.
- Reduces application-layer data transformation complexity.

Trade-off:

- SQL statements are more complex and DB-coupled.
- Acceptable here because PostgreSQL is a required dependency.

### 7) Offset/limit pagination

Decision:

- Use page plus limit query parameters.

Why:

- Easy to implement and easy for API consumers to understand.

Trade-off:

- Large offsets can degrade performance and produce unstable page windows under heavy write activity.
- Cursor pagination would be stronger for high-scale production workloads.

### 8) Redis optionality

Decision:

- Redis integration is non-blocking; app still starts when Redis is unavailable.

Why:

- Improves local developer ergonomics and avoids hard dependency for assignment evaluation.

Trade-off:

- Features that depend on Redis (for example, distributed rate-limiting state) are not guaranteed in all environments.

### 9) Minimal service layering

Decision:

- Keep most business flow in routes, extracting only repeated access-scope logic.

Why:

- Balances clarity and speed for a compact codebase.

Trade-off:

- As domain complexity grows, larger handlers may need refactoring into richer service or use-case layers.

## What This Architecture Optimizes For

- Assignment clarity: reviewers can quickly trace endpoint to validation to SQL.
- Correctness under role and ownership constraints.
- Fast local setup with predictable behavior.

## What It Does Not Optimize For Yet

- Enterprise-scale observability, token revocation, multi-tenant isolation, and advanced consistency patterns.
- Those can be added incrementally without rewriting the current core structure.

---
name: database-architect
description: Use when designing database schemas, writing Prisma models, planning migrations, optimizing slow queries, or debugging N+1 problems and connection pool exhaustion
---

# Database Architect

## Overview

Design schemas and write queries that stay fast as data grows. This skill covers PostgreSQL schema design, Prisma ORM patterns, safe migrations, index strategy, query optimization, connection pooling, and data modeling trade-offs.

**Core principle:** Schema design is the foundation. A bad schema cannot be fixed with indexes or query tricks. Get the data model right first.

## PostgreSQL Schema Design

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Tables | snake_case, plural | `users`, `order_items` |
| Columns | snake_case, singular | `created_at`, `email` |
| Primary keys | `id` (UUID or bigserial) | `id UUID DEFAULT gen_random_uuid()` |
| Foreign keys | `{table}_id` | `user_id`, `order_id` |
| Join tables | `{table1}_{table2}` | `user_roles`, `product_categories` |
| Indexes | `idx_{table}_{column(s)}` | `idx_orders_user_id` |
| Unique constraints | `uq_{table}_{column(s)}` | `uq_users_email` |

### Column Types

- Use `TIMESTAMPTZ` not `TIMESTAMP` -- always store with timezone
- Use `UUID` primary keys for distributed systems, `BIGSERIAL` for single-DB apps
- Use `TEXT` instead of `VARCHAR(n)` unless you need the length constraint
- Use `BOOLEAN` for true/false, not `TINYINT` or `CHAR(1)`
- Use `NUMERIC(p,s)` for money, never `FLOAT`
- Use `JSONB` for truly dynamic data, not as a replacement for normalized columns

### Constraints Are Documentation

Every constraint tells future developers what must be true about your data:

```sql
CHECK (price > 0)
UNIQUE (email)
NOT NULL
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

**Never trust application-level validation alone.** Constraints enforce data integrity at the database level regardless of which application writes to it.

## Prisma ORM Patterns

### Model Organization

```prisma
// Group related models, order: primary entities first, join tables last
model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  orders    Order[]
  profile   Profile?

  @@map("users")
}

model Order {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  total      Decimal  @db.Decimal(10, 2)
  status     String   @default("pending")
  createdAt  DateTime @default(now()) @map("created_at")

  user       User     @relation(fields: [userId], references: [id])
  items      OrderItem[]

  @@index([userId])
  @@index([status, createdAt])
  @@map("orders")
}
```

### Relation Loading Strategies

| Strategy | When | Risk |
|----------|------|------|
| `include` | Single relation, small dataset | N+1 in loops |
| `select` | Few fields from large model | Verbose |
| Raw SQL | Complex aggregations, window functions | Loses ORM benefits |

**Always use `include` on `findUnique`/`findFirst`.** Only use raw SQL when Prisma's query API cannot express what you need (window functions, recursive CTEs, full-text search ranking).

### Batch Operations

```typescript
// BAD -- N+1 in a loop
for (const id of ids) {
  await prisma.user.update({ where: { id }, data: { status } });
}

// GOOD -- single query
await prisma.user.updateMany({
  where: { id: { in: ids } },
  data: { status },
});
```

### Transaction Patterns

```typescript
// Interactive transaction for dependent operations
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: { userId, total } });
  for (const item of items) {
    await tx.orderItem.create({ data: { ...item, orderId: order.id } });
  }
});
```

## Migration Strategies

### Expand/Contract Pattern

**Never make destructive schema changes in a single migration.** Use the expand/contract pattern:

```
Phase 1 (Expand):   Add new column/table, dual-write to both old and new
Phase 2 (Migrate):  Backfill historical data, verify consistency
Phase 3 (Contract): Remove old column/table, drop dual-write code
```

### Safe Migration Checklist

- [ ] Migration is reversible -- write both `up` and `down` for raw SQL migrations
- [ ] No `DROP COLUMN` without verifying nothing reads it
- [ ] No `ALTER COLUMN ... SET NOT NULL` without backfilling null rows first
- [ ] Large tables: `CREATE INDEX CONCURRENTLY` (not in a transaction), then `ALTER TABLE ... ADD CONSTRAINT` using the index
- [ ] Prisma: generate migration, review the SQL, then `prisma migrate deploy`
- [ ] Long-running migrations: run during low traffic, monitor `pg_stat_activity`

### Prisma Migration Commands

```bash
# Development
npx prisma migrate dev --name add_user_status    # Create + apply migration
npx prisma migrate reset                          # Reset + re-seed

# Production
npx prisma migrate deploy                         # Apply pending migrations
npx prisma migrate status                         # Check migration state

# Diff-based
npx prisma migrate diff --from-empty --to-schema-datamodel > migration.sql
```

## Index Design

### What to Index

| Query Pattern | Index |
|--------------|-------|
| `WHERE col = ?` | Single-column B-tree on `col` |
| `WHERE col1 = ? AND col2 = ?` | Composite B-tree on `(col1, col2)` |
| `WHERE col IN (?)` | Single-column B-tree on `col` |
| `ORDER BY col` | B-tree on `col` |
| `WHERE col LIKE 'prefix%'` | B-tree on `col` (supports prefix match) |
| `WHERE text ILIKE '%search%'` | Trigram GIN index (`pg_trgm`) |
| `WHERE jsonb_col @> '{"key":"val"}'` | GIN on `jsonb_col` |
| Full-text search | GIN on `to_tsvector('english', col)` |

### Composite Index Design Rules

1. **Equality first, range last** -- put columns compared with `=` before columns compared with `<`, `>`, `BETWEEN`, `LIKE`
2. **Most selective first** -- columns with more distinct values should come earlier in the index
3. **Covering indexes** -- add `INCLUDE (col1, col2)` for columns you only need in SELECT (avoids table lookups)

```sql
-- Query: SELECT * FROM orders WHERE status = 'active' AND created_at > '2024-01-01'
-- Index: columns in WHERE, equality before range
CREATE INDEX idx_orders_status_created_at ON orders (status, created_at);

-- Covering index: avoids visiting the table for these queries
CREATE INDEX idx_orders_user_status ON orders (user_id, status) INCLUDE (total, created_at);
```

### When NOT to Index

- Small tables (< 1000 rows) -- sequential scan is faster
- Columns updated frequently but rarely queried -- index maintenance cost
- Columns with low cardinality (boolean, status with 2-3 values) -- unless combined with a high-cardinality column
- Tables with heavy write volume but few reads -- each index slows writes

## Query Optimization

### EXPLAIN ANALYZE

Always verify query performance with `EXPLAIN ANALYZE`:

```
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = '...';
```

**Key metrics to check:**
- `Seq Scan` on a large table -- missing index
- `Sort` -- consider an index to provide sorted order
- `Rows Removed by Filter` >> actual rows returned -- bad selectivity
- `Nested Loop` joining large datasets -- needs index or different join strategy

### N+1 Detection

**Symptoms:** Page loads fast for 10 items, slow for 100. Database shows many identical queries.

**Prisma fix (eager loading):**
```typescript
// BAD -- N+1: one query per order to load user
const orders = await prisma.order.findMany();
for (const order of orders) {
  console.log(order.user.name); // triggers query per loop body
}

// GOOD -- single query with join
const orders = await prisma.order.findMany({
  include: { user: true },
});
```

**Detection tools:**
- Prisma: enable `log: ['query']` and look for repeated identical queries
- `pg_stat_statements`: check for patterns with high `calls` count
- Datadog/New Relic: database traces showing repeated queries

### Common Anti-Patterns

| Anti-Pattern | Fix |
|-------------|-----|
| `SELECT *` when you need 2 columns | Select only needed columns |
| Loading entire table for pagination | Use cursor-based pagination, not `offset` |
| `COUNT(*)` on every request | Cache counts, use approximate counts for large tables |
| Filtering in application code | Push filters to SQL WHERE clause |
| Joining 10+ tables | Consider denormalization or materialized views |

## Connection Pooling

### Configuration

```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool is configured via connection string:
  // postgresql://user:pass@host:5432/db?pool_timeout=10&connection_limit=20
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}
```

**Pool sizing guidelines:**
- `connections = (CPU_cores * 2) + effective_spindle_count`
- Start with 10-20 connections, monitor `pg_stat_activity` for waiting connections
- PgBouncer mode: use `transaction` mode for serverless, `session` mode for long-lived connections

### Pool Exhaustion

**Symptoms:** Timeouts, `Error: Can't reach database server`, degraded response times.

**Causes:**
- Long-running transactions holding connections
- Connection leaks (forgetting to disconnect)
- Insufficient pool size for request volume
- Slow queries backing up the pool

**Fixes:**
1. Set `pool_timeout` low (e.g., 3 seconds)
2. Keep transactions short
3. Monitor with `SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction'`
4. Use PgBouncer between app and database for connection multiplexing

## Data Modeling Patterns

### Normalization

**Apply 3NF (Third Normal Form) by default:**
1. Each column contains atomic values (1NF)
2. Every column depends on the whole primary key (2NF)
3. Every column depends on nothing but the primary key (3NF)

```prisma
// DENORMALIZED -- user_name repeated on every order
model Order {
  id       String
  userName String // redundant -- update if user renames
}

// NORMALIZED -- user_name lives in one place
model Order {
  id     String
  userId String
  user   User @relation(fields: [userId], references: [id])
}
model User {
  id   String
  name String
}
```

### When to Denormalize

Denormalize only after you measure a real performance problem:

| Scenario | Denormalization |
|----------|----------------|
| Dashboard aggregations | Add `order_count` to `users` table, updated via triggers or application code |
| High-read, low-write JOINs | Embed frequently-read fields (e.g., `user_name` on `orders`) |
| Time-series summaries | Pre-aggregate hourly/daily summaries in materialized views |

```sql
-- Example: materialized view for dashboards
CREATE MATERIALIZED VIEW daily_order_summary AS
SELECT
  date_trunc('day', created_at) AS day,
  status,
  COUNT(*) AS order_count,
  SUM(total) AS revenue
FROM orders
GROUP BY 1, 2;

REFRESH MATERIALIZED VIEW CONCURRENTLY daily_order_summary;
```

### Inheritance Strategies

| Pattern | Prisma | When |
|---------|--------|------|
| Single table | All fields in one model with optional fields | Simple, few subtypes |
| Concrete table | Separate models per type | Subtypes share no common fields |
| Joined table | Base model + related subtype models with shared ID | Subtypes share fields, need polymorphism |

## Quick Reference

```bash
# Diagnose slow queries
EXPLAIN ANALYZE <query>;

# Check connection pool
SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();

# Find blocking queries
SELECT blocked.pid, blocked.query AS blocked_query, blocker.query AS blocker_query
FROM pg_locks blocked
JOIN pg_stat_activity blocker ON blocked.pid <> blocker.pid
WHERE NOT blocked.granted;

# Table size
SELECT pg_size_pretty(pg_total_relation_size('tablename'));
```

## Common Mistakes

### Missing indexes on foreign keys
Prisma creates indexes on `@@id` and `@unique` fields, but not on foreign keys. Add `@@index([foreignKeyId])` to every model with a relation.

### Using `update` when `updateMany` works
Each `prisma.user.update()` call is a round-trip. Batch with `updateMany()` when the update is the same across rows.

### Forgetting cascading deletes
Prisma requires explicit `onDelete: Cascade` in the schema. Without it, deleting a parent fails if children exist.

### Running migrations during peak traffic
Migrations lock tables. Always deploy schema changes during low-traffic windows or use zero-downtime tools like `pgroll`.

## Red Flags

**Stop and redesign when you see:**
- `JSONB` columns queried with `->>` in WHERE clauses (should be a normalized column)
- Tables with 50+ columns (likely violating 3NF, or the table represents multiple entities)
- The same JOIN pattern repeated across 10+ queries (consider a view or REST API endpoint)
- Raw SQL embedded in application code alongside Prisma (either use Prisma's `$queryRaw` consistently or convert to Prisma queries)
- Migrations that `DROP COLUMN` in the same deploy as code that reads it

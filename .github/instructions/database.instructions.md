---
applyTo: 'src/db/**'
---

# Database Instructions (Drizzle + SQLite)

## Schema Conventions (`src/db/schema.ts`)

- Use `sqliteTable` from `drizzle-orm/sqlite-core`
- All tables include a `userId` text column (multi-user ready, hardcode '1' for now)
- Use `text` for IDs — generate with a prefix pattern (e.g., `tsk_`, `lst_`, `cat_`, `tag_`, `nte_`)
- Use `text` for dates — store as ISO 8601 strings
- Use `integer` for sort order fields
- Use `text('json')` for structured data stored as JSON (e.g., recurrence rules)
- Foreign keys: use `.references(() => otherTable.id)` with explicit `onDelete` behavior

## Client Singleton (`src/db/index.ts`)

```typescript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('./data/whatidid.db')
export const db = drizzle(sqlite, { schema })
```

## Migrations

- Generate: `pnpm db:generate`
- Apply: `pnpm db:migrate`
- Never edit generated migration files manually
- Seed data in `src/db/seed.ts` — run via `pnpm db:seed`

## Query Patterns

- Import `eq`, `and`, `desc`, `asc`, `sql` from `drizzle-orm` as needed
- Always filter by `userId` in queries
- Use `db.select().from(table)` for reads
- Use `db.insert(table).values({...})` for creates
- Use `db.update(table).set({...}).where(...)` for updates
- Use `db.delete(table).where(...)` for deletes
- For joins, use `db.query.table.findMany({ with: { relation: true } })`

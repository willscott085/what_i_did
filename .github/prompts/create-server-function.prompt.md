---
description: 'Create a new TanStack Start server function'
mode: 'agent'
---

# Create Server Function

Create a new server function following the project pattern.

## Pattern

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '~/db'
import { tableName } from '~/db/schema'
import { eq } from 'drizzle-orm'

export const myFunction = createServerFn({ method: 'GET' })
  .inputValidator(z.object({
    // Zod schema for input validation
  }))
  .handler(async ({ data }) => {
    // Direct Drizzle query — no HTTP calls
    return db.select().from(tableName).where(eq(tableName.id, data.id))
  })
```

## Rules

- Place in `src/features/{domain}/server.ts`
- Always validate input with Zod (`.inputValidator()`)
- Use `GET` for reads, `POST` for writes
- Query the database directly via Drizzle — never make HTTP calls
- Return typed data, not raw responses
- Include `userId` filtering where appropriate (hardcode '1' for now)
- Create corresponding React Query options in `queries.ts`
- Create corresponding mutation in `mutations.ts` if it's a write operation

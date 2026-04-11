---
applyTo: "**/server.ts"
---

# Server Function Instructions

## Pattern

Every server function in `src/features/{domain}/server.ts` follows this structure:

```typescript
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/db";
import { tableName } from "~/db/schema";
import { eq, and } from "drizzle-orm";

export const fetchItems = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    return db.select().from(tableName).where(eq(tableName.userId, data.userId));
  });
```

## Rules

- Use `GET` for read operations, `POST` for writes (create, update, delete)
- Always validate input with `.inputValidator()` using Zod schemas
- Query the database directly via Drizzle — never make HTTP calls to external APIs (except AI providers in Phase 8)
- Always include `userId` in queries for multi-user readiness
- Return typed data — avoid `as any` or untyped responses
- One server function file per feature domain
- Keep handlers focused — complex logic should be extracted to utility functions
- Log meaningful info for debugging: `console.info('Updating task', data.id)`

import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { auditLog } from '#server/db/schema/audit'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'audit:read')

  const query = getQuery(event)
  const action = query.action as string | undefined
  const actorId = query.actorId as string | undefined
  const search = query.search as string | undefined
  const outcome = query.outcome as string | undefined
  const page = Math.max(1, Number.parseInt((query.page as string) || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt((query.limit as string) || '25', 10) || 25))
  const offset = (page - 1) * limit

  const db = useDb()

  const conditions = []

  if (action) {
    conditions.push(eq(auditLog.action, action))
  }

  if (actorId) {
    conditions.push(eq(auditLog.actorId, actorId))
  }

  if (outcome) {
    conditions.push(eq(auditLog.outcome, outcome))
  }

  if (search) {
    conditions.push(
      or(
        ilike(auditLog.actorEmail, `%${search}%`),
        ilike(auditLog.action, `%${search}%`),
        ilike(auditLog.ipAddress, `%${search}%`),
      ),
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [totalResult] = await db
    .select({ count: count() })
    .from(auditLog)
    .where(where)

  const total = totalResult?.count ?? 0

  const rows = await db
    .select({
      id: auditLog.id,
      actorId: auditLog.actorId,
      actorEmail: auditLog.actorEmail,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      targetUserId: auditLog.targetUserId,
      details: auditLog.details,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      outcome: auditLog.outcome,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset)

  // Get unique actions for the filter dropdown
  const [actionResults] = await db
    .select({
      actions: sql<string[]>`array_agg(DISTINCT ${auditLog.action})`,
    })
    .from(auditLog)

  return {
    data: rows,
    total,
    page,
    limit,
    actions: actionResults?.actions || [],
  }
})

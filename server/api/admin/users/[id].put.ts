import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '#server/db/schema/auth'
import { user, userInvitation } from '#server/db/schema/user'
import { getRouterParamOrThrow, validateBody } from '#server/utils/validate'

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  payrollId: z.string().min(1).max(6).trim().optional(),
  locationId: z.string().uuid().nullable().optional(),
  jobRoleId: z.string().uuid().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
  email: z.string().email().max(255).trim().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:update')
  const id = getRouterParamOrThrow(event, 'id')

  const body = await validateBody(event, updateUserSchema)
  const db = useDb()

  const [existing] = await db.select().from(user).where(eq(user.id, id)).limit(1)
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (existing.isSuperadmin)
    throw createError({ statusCode: 403, statusMessage: 'Cannot modify Superadmin' })

  if (Object.keys(body).length === 0)
    throw createError({ statusCode: 400, statusMessage: 'No fields to update' })

  const { email, ...userFields } = body

  if (email) {
    const [otherAuth] = await db.select({ userId: auth.userId }).from(auth).where(eq(auth.email, email)).limit(1)
    if (otherAuth && otherAuth.userId !== id)
      throw createError({ statusCode: 409, statusMessage: 'Email already in use' })
  }

  if (Object.keys(userFields).length > 0) {
    await db.update(user).set(userFields).where(eq(user.id, id))
  }

  if (email) {
    const [userAuth] = await db.select({ id: auth.id }).from(auth).where(eq(auth.userId, id)).limit(1)
    if (userAuth) {
      await db.update(auth).set({ email }).where(eq(auth.userId, id))
    }
    else {
      await db.update(userInvitation).set({ email }).where(eq(userInvitation.userId, id))
    }
  }

  logAuditEvent(event, { action: 'USER_UPDATED', targetUserId: id, details: { fields: Object.keys(body) } })

  const [updated] = await db.select().from(user).where(eq(user.id, id)).limit(1)
  return updated
})

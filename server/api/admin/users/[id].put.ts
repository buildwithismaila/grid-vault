import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { systemRoleEnum } from '#server/db/schema/enums'
import { user } from '#server/db/schema/user'
import { validateBody } from '#server/utils/validate'

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  payrollId: z.string().min(1).max(6).trim().optional(),
  locationId: z.string().uuid().nullable().optional(),
  jobRoleId: z.string().uuid().nullable().optional(),
  role: z.enum(systemRoleEnum.enumValues).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:update')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing user id' })

  const body = await validateBody(event, updateUserSchema)
  const db = useDb()

  const [existing] = await db.select().from(user).where(eq(user.id, id)).limit(1)
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (existing.role === 'Superadmin')
    throw createError({ statusCode: 400, statusMessage: 'Cannot modify Superadmin' })

  if (Object.keys(body).length === 0)
    throw createError({ statusCode: 400, statusMessage: 'No fields to update' })

  const [updated] = await db.update(user).set(body).where(eq(user.id, id)).returning()
  return updated
})

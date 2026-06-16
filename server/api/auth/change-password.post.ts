import { eq } from 'drizzle-orm'
import { auth } from '#server/db/schema/auth'
import { changePasswordSchema } from '#shared/schemas/user'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { currentPassword, newPassword } = await validateBody(event, changePasswordSchema)
  const db = useDb()

  const [existing] = await db
    .select()
    .from(auth)
    .where(eq(auth.userId, user.id))
    .limit(1)

  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Auth record not found' })

  const valid = await verifyPassword(existing.passwordHash, currentPassword)
  if (!valid)
    throw createError({ statusCode: 400, statusMessage: 'Current password is incorrect' })

  const passwordHash = await hashPassword(newPassword)

  await db.update(auth)
    .set({ passwordHash })
    .where(eq(auth.id, existing.id))

  return { success: true }
})

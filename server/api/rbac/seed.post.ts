import { eq } from 'drizzle-orm'
import { user } from '#server/db/schema/user'
import { seedRbac } from '#server/db/seeds/rbac'

export default defineEventHandler(async (event) => {
  const db = useDb()

  const [superadmin] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, 'SUPERADMIN'))
    .limit(1)

  if (superadmin) {
    if (!event.context.user || event.context.user.id !== superadmin.id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  await seedRbac()
  return { success: true, message: 'RBAC seeded successfully' }
})

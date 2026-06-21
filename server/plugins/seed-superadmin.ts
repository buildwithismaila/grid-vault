import { eq } from 'drizzle-orm'
import { auth } from '../db/schema/auth'
import { role, userRole } from '../db/schema/rbac'
import { user } from '../db/schema/user'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  if (!config.initialEmail || !config.initialPassword)
    return
  const db = useDb()
  const [existing] = await db.select({ id: user.id }).from(user).limit(1)
  if (existing)
    return
  const passwordHash = await hashPassword(config.initialPassword)

  await db.transaction(async (tx) => {
    const [newUser] = await tx.insert(user).values({
      name: 'Super Admin',
      payrollId: '000001',
      isSuperadmin: true,
      status: 'ACTIVE',
    }).returning({ id: user.id })
    if (!newUser) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create superuser' })
    }
    await tx.insert(auth).values({
      userId: newUser.id,
      email: config.initialEmail,
      passwordHash,
    })

    const [superadminRole] = await tx.select({ id: role.id }).from(role).where(eq(role.name, 'Superadmin')).limit(1)
    if (superadminRole) {
      await tx.insert(userRole).values({ userId: newUser.id, roleId: superadminRole.id }).onConflictDoNothing()
    }
  })
  // eslint-disable-next-line no-console
  console.log('✅ Superadmin created:', config.initialEmail)
})

import { eq, sql } from 'drizzle-orm'
import { auth } from '#server/db/schema/auth'
import { role, userRole } from '#server/db/schema/rbac'
import { user } from '#server/db/schema/user'
import { loginSchema } from '#shared/schemas/user'
import { AUTH } from '#shared/utils/constants'

export default defineEventHandler(async (event) => {
  const { email, password } = await validateBody(event, loginSchema)
  const db = useDb()

  const [row] = await db
    .select({ auth, user })
    .from(auth)
    .where(eq(auth.email, email))
    .innerJoin(user, eq(auth.userId, user.id))
    .limit(1)

  if (!row)
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })

  if (row.auth.lockedUntil && row.auth.lockedUntil > new Date())
    throw createError({ statusCode: 423, statusMessage: 'Account is locked' })

  const valid = await verifyPassword(row.auth.passwordHash, password)
  if (!valid) {
    const newAttempts = row.auth.failedLoginAttempts + 1
    const updateData: Record<string, unknown> = { failedLoginAttempts: newAttempts }
    if (newAttempts >= AUTH.MAX_LOGIN_ATTEMPTS)
      updateData.lockedUntil = new Date(Date.now() + AUTH.LOCKOUT_DURATION_MS)

    await db.update(auth).set(updateData).where(eq(auth.id, row.auth.id))
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  if (row.user.status !== 'ACTIVE')
    throw createError({ statusCode: 403, statusMessage: 'Account is not active' })

  await db.update(auth).set({
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: sql`now()`,
  }).where(eq(auth.id, row.auth.id))

  if (row.auth.mfaEnabled) {
    const mfaToken = createMfaChallenge(row.auth.userId)
    return { mfaRequired: true, mfaToken }
  }

  let permissions: string[] = []
  let roles: string[] = []

  if (row.user.role !== 'Superadmin') {
    const userRoles = await db
      .select({ name: role.name })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(eq(userRole.userId, row.user.id))

    roles = userRoles.map(r => r.name)
    permissions = await getUserPermissions(row.user.id)
  }

  const sessionUser = {
    id: row.user.id,
    payrollId: row.user.payrollId ?? '',
    email: row.auth.email,
    name: row.user.name ?? '',
    avatarUrl: row.user.avatarUrl ?? '',
    role: row.user.role,
    locationId: row.user.locationId ?? '',
    permissions,
    roles,
  }

  await setUserSession(event, { user: sessionUser })

  return sessionUser
})

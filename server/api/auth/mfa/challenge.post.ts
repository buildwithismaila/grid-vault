import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '#server/db/schema/auth'
import { role, userRole } from '#server/db/schema/rbac'
import { user } from '#server/db/schema/user'

const challengeSchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const { mfaToken, code } = await validateBody(event, challengeSchema)
  const userId = consumeMfaChallenge(mfaToken)
  if (!userId)
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired MFA challenge' })

  const db = useDb()

  const [row] = await db
    .select({ auth, user })
    .from(auth)
    .where(eq(auth.userId, userId))
    .innerJoin(user, eq(auth.userId, user.id))
    .limit(1)

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (!row.auth.mfaSecret)
    throw createError({ statusCode: 400, statusMessage: 'MFA not configured' })
  if (!row.auth.mfaEnabled)
    throw createError({ statusCode: 400, statusMessage: 'MFA is not enabled' })
  if (row.user.status !== 'ACTIVE')
    throw createError({ statusCode: 403, statusMessage: 'Account is not active' })

  if (!verifyMFAToken(code, row.auth.mfaSecret))
    throw createError({ statusCode: 401, statusMessage: 'Invalid verification code' })

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

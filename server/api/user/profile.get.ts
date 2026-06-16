import { eq } from 'drizzle-orm'
import { auth } from '#server/db/schema/auth'
import { jobRole, orgUnit } from '#server/db/schema/org'
import { user } from '#server/db/schema/user'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user?.email)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = useDb()

  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      payrollId: user.payrollId,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      email: auth.email,
      locationId: user.locationId,
      locationName: orgUnit.name,
      jobRoleId: user.jobRoleId,
      jobRoleName: jobRole.name,
    })
    .from(auth)
    .innerJoin(user, eq(auth.userId, user.id))
    .leftJoin(orgUnit, eq(user.locationId, orgUnit.id))
    .leftJoin(jobRole, eq(user.jobRoleId, jobRole.id))
    .where(eq(auth.email, session.user.email))
    .limit(1)

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'User not found' })

  return row
})

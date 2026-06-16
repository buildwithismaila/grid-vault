import { eq } from 'drizzle-orm'
import { auth } from '#server/db/schema/auth'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user?.email)
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const db = useDb()

  const [row] = await db
    .select({ mfaEnabled: auth.mfaEnabled })
    .from(auth)
    .where(eq(auth.email, session.user.email))
    .limit(1)

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Auth record not found' })

  return { mfaEnabled: row.mfaEnabled }
})

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '#server/db/schema/auth'

const verifySchema = z.object({
  token: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user?.email)
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const db = useDb()
  const { token } = await validateBody(event, verifySchema)

  const [row] = await db
    .select()
    .from(auth)
    .where(eq(auth.email, session.user.email))
    .limit(1)

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Auth record not found' })
  if (row.mfaEnabled)
    throw createError({ statusCode: 400, statusMessage: 'MFA already enabled' })
  if (!row.mfaSecret)
    throw createError({ statusCode: 400, statusMessage: 'No MFA secret found. Run setup first.' })

  if (!verifyMFAToken(token, row.mfaSecret))
    throw createError({ statusCode: 400, statusMessage: 'Invalid verification code' })

  await db.update(auth).set({ mfaEnabled: true }).where(eq(auth.id, row.id))

  return { success: true }
})

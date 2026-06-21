import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '#server/db/schema/auth'

const setupSchema = z.object({
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user?.email)
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const db = useDb()
  const { password } = await validateBody(event, setupSchema)

  const [row] = await db
    .select()
    .from(auth)
    .where(eq(auth.email, session.user.email))
    .limit(1)

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Auth record not found' })
  if (row.mfaEnabled)
    throw createError({ statusCode: 409, statusMessage: 'MFA already enabled' })

  const valid = await verifyPassword(row.passwordHash, password)
  if (!valid)
    throw createError({ statusCode: 403, statusMessage: 'Invalid password' })

  const { secret, otpauth } = generateMFASecret(row.email)

  await db.update(auth).set({ mfaSecret: secret }).where(eq(auth.id, row.id))

  return { secret, otpauth }
})

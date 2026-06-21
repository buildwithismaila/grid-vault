import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '#server/db/schema/auth'

const disableSchema = z.object({
  password: z.string().min(1),
  code: z.string().length(6),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user?.email)
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const db = useDb()
  const { password, code } = await validateBody(event, disableSchema)

  const [row] = await db
    .select()
    .from(auth)
    .where(eq(auth.email, session.user.email))
    .limit(1)

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Auth record not found' })
  if (!row.mfaEnabled || !row.mfaSecret)
    throw createError({ statusCode: 409, statusMessage: 'MFA is not enabled' })

  const valid = await verifyPassword(row.passwordHash, password)
  if (!valid)
    throw createError({ statusCode: 403, statusMessage: 'Invalid password' })

  const codeValid = verifyMFAToken(code, row.mfaSecret)
  if (!codeValid)
    throw createError({ statusCode: 403, statusMessage: 'Invalid authentication code' })

  await db.update(auth).set({ mfaSecret: null, mfaEnabled: false }).where(eq(auth.id, row.id))

  return { success: true }
})

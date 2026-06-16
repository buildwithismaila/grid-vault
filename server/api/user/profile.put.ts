import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { user } from '#server/db/schema/user'

const updateProfileSchema = z.object({
  avatarUrl: z.string().max(255).optional(),
})

export default defineEventHandler(async (event) => {
  const sessionUser = event.context.user
  if (!sessionUser)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await validateBody(event, updateProfileSchema)
  if (Object.keys(body).length === 0)
    throw createError({ statusCode: 400, statusMessage: 'No fields to update' })

  const db = useDb()

  const [updated] = await db
    .update(user)
    .set(body)
    .where(eq(user.id, sessionUser.id))
    .returning()

  const currentSession = await getUserSession(event)
  await setUserSession(event, {
    user: {
      ...currentSession.user!,
      avatarUrl: updated.avatarUrl ?? '',
    },
  })

  return { avatarUrl: updated.avatarUrl ?? '' }
})

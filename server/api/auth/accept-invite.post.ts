import { and, eq, gt, isNull } from 'drizzle-orm'
import { auth } from '#server/db/schema/auth'
import { user, userInvitation } from '#server/db/schema/user'
import { acceptInviteSchema } from '#shared/schemas/user'

export default defineEventHandler(async (event) => {
  const { token, password } = await validateBody(event, acceptInviteSchema)
  const tokenHash = hashToken(token)
  const db = useDb()

  const [invite] = await db
    .select({ id: userInvitation.id, userId: userInvitation.userId, email: userInvitation.email })
    .from(userInvitation)
    .where(
      and(
        eq(userInvitation.tokenHash, tokenHash),
        isNull(userInvitation.acceptedAt),
        gt(userInvitation.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!invite)
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired invitation' })

  const [existingAuth] = await db
    .select({ id: auth.id })
    .from(auth)
    .where(eq(auth.userId, invite.userId))
    .limit(1)

  if (existingAuth)
    throw createError({ statusCode: 409, statusMessage: 'User already activated' })

  const passwordHash = await hashPassword(password)

  await db.transaction(async (tx) => {
    await tx.update(user)
      .set({ status: 'ACTIVE' })
      .where(eq(user.id, invite.userId))

    await tx.insert(auth).values({
      userId: invite.userId,
      email: invite.email,
      passwordHash,
    })

    await tx.update(userInvitation)
      .set({ acceptedAt: new Date() })
      .where(eq(userInvitation.id, invite.id))
  })

  return { success: true, message: 'Account activated. You can now log in.' }
})

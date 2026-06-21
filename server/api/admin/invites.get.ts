import { eq } from 'drizzle-orm'
import { user, userInvitation } from '#server/db/schema/user'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:read')

  const db = useDb()

  const inviterAlias = db.select({
    id: user.id,
    name: user.name,
  }).from(user).as('inviter')

  const rows = await db
    .select({
      id: userInvitation.id,
      email: userInvitation.email,
      userId: userInvitation.userId,
      isSuperadmin: user.isSuperadmin,
      invitedByName: inviterAlias.name,
      createdAt: userInvitation.createdAt,
      expiresAt: userInvitation.expiresAt,
      acceptedAt: userInvitation.acceptedAt,
    })
    .from(userInvitation)
    .leftJoin(user, eq(userInvitation.userId, user.id))
    .leftJoin(inviterAlias, eq(userInvitation.invitedByUserId, inviterAlias.id))
    .orderBy(userInvitation.createdAt)

  return rows
})

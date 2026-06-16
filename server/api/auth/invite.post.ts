import { eq } from 'drizzle-orm'
import { auth } from '#server/db/schema/auth'
import { user, userInvitation } from '#server/db/schema/user'
import { sendInviteSchema } from '#shared/schemas/user'
import { AUTH } from '#shared/utils/constants'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  await requirePermission(event, 'user:create')

  const { email, role, name, payrollId, locationId, jobRoleId } = await validateBody(event, sendInviteSchema)
  const db = useDb()

  const [existing] = await db
    .select({ id: auth.id })
    .from(auth)
    .where(eq(auth.email, email))
    .limit(1)

  if (existing)
    throw createError({ statusCode: 409, statusMessage: 'Email already registered' })

  const { rawToken, tokenHash } = generateToken()

  // Send the email first so we don't create orphaned users if email fails
  await sendInviteEmail(email, name, rawToken)

  const [newUser] = await db.insert(user).values({
    name,
    payrollId,
    locationId,
    jobRoleId,
    role,
    status: 'PENDING',
  }).returning({ id: user.id })

  if (!newUser)
    throw createError({ statusCode: 500, statusMessage: 'Failed to create user' })

  await db.insert(userInvitation).values({
    userId: newUser.id,
    invitedByUserId: currentUser.id,
    email,
    tokenHash,
    expiresAt: new Date(Date.now() + AUTH.INVITE_EXPIRY_MS),
  })

  return { success: true, message: 'Invitation sent' }
})

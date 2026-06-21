import { auditLog } from '#server/db/schema/audit'

export const AUDIT_EVENTS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  PASSWORD_RESET_ADMIN: 'PASSWORD_RESET_ADMIN',
  ACCEPT_INVITE: 'ACCEPT_INVITE',
  INVITE_SENT: 'INVITE_SENT',
  MFA_SETUP: 'MFA_SETUP',
  MFA_VERIFIED: 'MFA_VERIFIED',
  MFA_DISABLED: 'MFA_DISABLED',
  MFA_CHALLENGE: 'MFA_CHALLENGE',
  MFA_CHALLENGE_FAILED: 'MFA_CHALLENGE_FAILED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLES_CHANGED: 'USER_ROLES_CHANGED',
  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_DELETED: 'ROLE_DELETED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const

export async function logAuditEvent(
  event: H3Event,
  params: {
    action: string
    resourceType?: string
    resourceId?: string
    targetUserId?: string
    details?: Record<string, unknown>
    outcome?: 'SUCCESS' | 'FAILURE'
  },
) {
  try {
    const user = event.context.user
    const ipAddress = event.headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
      || event.headers?.get('x-real-ip')
      || event.node?.req?.socket?.remoteAddress
      || 'unknown'

    const db = useDb()
    await db.insert(auditLog).values({
      actorId: user?.id,
      actorEmail: user?.email,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      targetUserId: params.targetUserId,
      details: params.details ?? null,
      ipAddress,
      userAgent: event.headers?.get('user-agent') || null,
      outcome: params.outcome ?? 'SUCCESS',
    })
  }
  catch (err) {
    console.error('[audit] Failed to log event:', err)
  }
}

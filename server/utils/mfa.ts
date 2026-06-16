import { generateSecret, generateURI, verifySync } from 'otplib'

const APP_NAME = 'Grid Vault'

export function generateMFASecret(email: string): { secret: string, otpauth: string } {
  const secret = generateSecret()
  const otpauth = generateURI({ issuer: APP_NAME, label: email, secret })
  return { secret, otpauth }
}

export function verifyMFAToken(token: string, secret: string): boolean {
  try {
    const result = verifySync({ secret, token })
    return result.valid
  }
  catch {
    return false
  }
}

const mfaStore = new Map<string, { userId: string, expiresAt: Date }>()

export function createMfaChallenge(userId: string): string {
  const token = crypto.randomUUID()
  mfaStore.set(token, { userId, expiresAt: new Date(Date.now() + 5 * 60 * 1000) })
  return token
}

export function consumeMfaChallenge(token: string): string | null {
  const entry = mfaStore.get(token)
  if (!entry)
    return null
  mfaStore.delete(token)
  if (entry.expiresAt < new Date())
    return null
  return entry.userId
}

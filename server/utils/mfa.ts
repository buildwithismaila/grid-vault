import { eq } from 'drizzle-orm'
import { generateSecret, generateURI, verifySync } from 'otplib'
import { mfaChallenge } from '#server/db/schema/auth'

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

export async function createMfaChallenge(userId: string): Promise<string> {
  const db = useDb()
  const { rawToken, tokenHash } = generateToken()
  await db.insert(mfaChallenge).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  })
  return rawToken
}

export async function consumeMfaChallenge(token: string): Promise<string | null> {
  const db = useDb()
  const tokenHash = hashToken(token)
  const [challenge] = await db
    .select()
    .from(mfaChallenge)
    .where(eq(mfaChallenge.tokenHash, tokenHash))
    .limit(1)

  if (!challenge || challenge.consumedAt || challenge.expiresAt < new Date())
    return null

  await db.update(mfaChallenge)
    .set({ consumedAt: new Date() })
    .where(eq(mfaChallenge.id, challenge.id))

  return challenge.userId
}

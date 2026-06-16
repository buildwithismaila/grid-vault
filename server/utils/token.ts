import { createHash } from 'node:crypto'

export function generateToken(): { rawToken: string, tokenHash: string } {
  const rawToken = crypto.randomUUID()
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  return { rawToken, tokenHash }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

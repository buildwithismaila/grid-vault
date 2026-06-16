import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { user } from '#server/db/schema/user'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const sessionUser = event.context.user
  if (!sessionUser)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const form = await readMultipartFormData(event)
  const file = form?.find(f => f.name === 'file')

  if (!file || !file.data || file.data.length === 0)
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })

  if (!file.type || !ALLOWED_TYPES.includes(file.type))
    throw createError({ statusCode: 400, statusMessage: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' })

  if (file.data.length > MAX_SIZE)
    throw createError({ statusCode: 400, statusMessage: 'File too large. Maximum size is 2MB' })

  const ext = file.filename?.split('.').pop() || 'jpg'
  const filename = `${sessionUser.id}-${Date.now()}.${ext}`
  const dir = path.resolve('public/uploads/avatar')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), new Uint8Array(file.data))

  const avatarUrl = `/uploads/avatar/${filename}`
  const db = useDb()
  await db.update(user).set({ avatarUrl }).where(eq(user.id, sessionUser.id))

  const currentSession = await getUserSession(event)
  await setUserSession(event, {
    user: { ...currentSession.user!, avatarUrl },
  })

  return { avatarUrl }
})

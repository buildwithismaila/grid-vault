import { getRouterParam } from 'h3'
import type { H3Event } from 'h3'
import type { ZodError, ZodType } from 'zod'

export function formatZodError(error: ZodError) {
  const errors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    if (!errors[key])
      errors[key] = []
    errors[key].push(issue.message)
  }
  return errors
}

export async function validateBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: formatZodError(result.error),
    })
  }
  return result.data
}

export function validateQuery<T>(event: H3Event, schema: ZodType<T>): T {
  const query = getQuery(event)
  const result = schema.safeParse(query)

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: formatZodError(result.error),
    })
  }
  return result.data
}

export function getRouterParamOrThrow(event: H3Event, name: string) {
  const value = getRouterParam(event, name)
  if (!value)
    throw createError({ statusCode: 400, statusMessage: `Missing ${name} parameter` })
  return value
}

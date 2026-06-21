export default defineEventHandler(async (event) => {
  const res = event.node.res
  const origEnd = res.end.bind(res)

  res.end = function (this: typeof res, ...args: any[]) {
    const status = res.statusCode
    if (status === 403 || status === 401) {
      logAuditEvent(event, {
        action: 'PERMISSION_DENIED',
        outcome: 'FAILURE',
        details: { statusCode: status, method: event.method, path: event.path },
      })
    }
    return origEnd(...args)
  } as typeof res.end
})

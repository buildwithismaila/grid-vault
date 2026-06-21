interface SendEmailPayload {
  to: string
  subject: string
  html: string
}

function sendEmail(payload: SendEmailPayload) {
  const { emailFrom } = useRuntimeConfig()
  return useResend().emails.send({
    from: emailFrom,
    ...payload,
  })
}

function inviteHtml(name: string, url: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="padding:32px 32px 0">
<h1 style="margin:0 0 8px;font-size:20px;color:#111">You're invited to Grid Vault</h1>
<p style="margin:0 0 16px;font-size:14px;color:#555">Hi ${name},</p>
<p style="margin:0 0 16px;font-size:14px;color:#555">You've been invited to join <strong>Grid Vault</strong>. Click the button below to set your password and activate your account.</p>
<a href="${url}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">Activate account</a>
<p style="margin:16px 0 0;font-size:12px;color:#888">This link expires in 7 days. If you did not expect this invitation, you can ignore this email.</p>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #eee;font-size:12px;color:#aaa;text-align:center">Grid Vault &mdash; Internal Admin Panel</td></tr>
</table>
</td></tr></table></body></html>`
}

function resetPasswordHtml(url: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="padding:32px 32px 0">
<h1 style="margin:0 0 8px;font-size:20px;color:#111">Reset your password</h1>
<p style="margin:0 0 16px;font-size:14px;color:#555">We received a request to reset your Grid Vault password. Click the button below to set a new password.</p>
<a href="${url}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">Reset password</a>
<p style="margin:16px 0 0;font-size:12px;color:#888">This link expires in 1 hour. If you did not request a password reset, you can ignore this email.</p>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #eee;font-size:12px;color:#aaa;text-align:center">Grid Vault &mdash; Internal Admin Panel</td></tr>
</table>
</td></tr></table></body></html>`
}

export async function sendInviteEmail(email: string, name: string, token: string): Promise<void> {
  const { appUrl } = useRuntimeConfig()
  const url = `${appUrl}/accept-invite/${token}`

  const { error } = await sendEmail({
    to: email,
    subject: `You're invited to Grid Vault`,
    html: inviteHtml(name, url),
  })

  if (error)
    throw createError({ statusCode: 500, statusMessage: `Failed to send invite email: ${error.message}` })
}

export async function sendResetPasswordEmail(email: string, token: string): Promise<void> {
  const { appUrl } = useRuntimeConfig()
  const url = `${appUrl}/reset-password/${token}`

  const { error } = await sendEmail({
    to: email,
    subject: 'Reset your Grid Vault password',
    html: resetPasswordHtml(url),
  })

  if (error)
    throw createError({ statusCode: 500, statusMessage: `Failed to send reset email: ${error.message}` })
}

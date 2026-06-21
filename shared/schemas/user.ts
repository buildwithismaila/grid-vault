import z from 'zod'

export const emailSchema = z
  .email('Must be a valid email')
  .toLowerCase()
  .trim()

export const passwordSchema = z
  .string('Password is required')
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be under 72 characters') // bcrypt limit

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string('Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string('Token is required').min(1),
  password: passwordSchema,
  confirmPassword: passwordSchema,
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const changePasswordSchema = z.object({
  currentPassword: z.string('Current password is required').min(1),
  newPassword: passwordSchema,
  confirmPassword: passwordSchema,
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine(d => d.currentPassword !== d.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
})

export const sendInviteSchema = z.object({
  email: emailSchema,
  role: z.string('Role is required').min(1, 'Role is required'),
  name: z.string().min(1).max(255).trim().optional(),
  payrollId: z.string().min(1).max(6).trim().optional(),
  locationId: z.string().uuid().optional(),
  jobRoleId: z.string().uuid().optional(),
})

export const acceptInviteSchema = z.object({
  token: z.string('Token is required').min(1),
  password: passwordSchema,
  confirmPassword: passwordSchema,
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

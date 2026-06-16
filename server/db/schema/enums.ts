import { pgEnum } from 'drizzle-orm/pg-core'

export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INACTIVE', 'PENDING'])

export const systemRoleEnum = pgEnum('system_role', [
  'Superadmin',
  'Admin',
  'HQ Asset Manager',
  'Regional Technical Manager',
  'Technical Manager',
  'Service Centre Technician',
  'Finance Officer',
  'Stores Officer',
  'Auditor',
  'Viewer',
])

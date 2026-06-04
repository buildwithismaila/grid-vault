export const RESOURCES = ['user', 'org_unit', 'job_role'] as const

export const ACTIONS = ['create', 'read', 'update', 'delete'] as const

export type Resource = typeof RESOURCES[number]
export type Action = typeof ACTIONS[number]

export const PERMISSIONS = {
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  ORG_UNIT_CREATE: 'org_unit:create',
  ORG_UNIT_READ: 'org_unit:read',
  ORG_UNIT_UPDATE: 'org_unit:update',
  ORG_UNIT_DELETE: 'org_unit:delete',
  JOB_ROLE_CREATE: 'job_role:create',
  JOB_ROLE_READ: 'job_role:read',
  JOB_ROLE_UPDATE: 'job_role:update',
  JOB_ROLE_DELETE: 'job_role:delete',
} as const

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS]

export function permissionName(resource: Resource, action: Action): string {
  return `${resource}:${action}`
}

export function allPermissions(): string[] {
  return RESOURCES.flatMap(resource =>
    ACTIONS.map(action => permissionName(resource, action)),
  )
}

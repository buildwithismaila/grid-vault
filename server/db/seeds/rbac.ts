import { eq, inArray } from 'drizzle-orm'
import { ACTIONS, RESOURCES } from '~~/shared/utils/permissions'
import { SYSTEM_ROLES } from '~~/shared/utils/roles'
import { permission, role, rolePermission } from '../../db/schema/rbac'

export async function seedRbac() {
  const db = useDb()
  await seedPermissions(db)
  await seedRoles(db)
  await seedRolePermissions(db)
}

const permDescriptions: Record<string, string> = {
  'user:create': 'Invite new users and send invitations',
  'user:read': 'View user list, profiles, and details',
  'user:update': 'Edit user details, role, and status',
  'user:delete': 'Remove users from the system',
  'org_unit:create': 'Create new organisation units (regions, offices, centers)',
  'org_unit:read': 'View organisation unit hierarchy and details',
  'org_unit:update': 'Edit organisation unit details',
  'org_unit:delete': 'Remove organisation units',
  'job_role:create': 'Create new job role definitions',
  'job_role:read': 'View job role list and descriptions',
  'job_role:update': 'Edit job role details',
  'job_role:delete': 'Remove job roles',
  'inventory:create': 'Add new inventory items',
  'inventory:read': 'View inventory catalogue and stock levels',
  'inventory:update': 'Edit inventory item details',
  'inventory:delete': 'Remove inventory items',
  'asset:create': 'Register new assets',
  'asset:read': 'View asset register and details',
  'asset:update': 'Edit asset details and assignment',
  'asset:delete': 'Remove assets from the register',
  'report:create': 'Generate new reports',
  'report:read': 'View existing reports',
  'report:update': 'Modify saved reports',
  'report:delete': 'Delete reports',
}

async function seedPermissions(db: ReturnType<typeof useDb>) {
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      const name = `${resource}:${action}`
      await db.insert(permission).values({
        name,
        resource,
        action,
        description: permDescriptions[name] || null,
      }).onConflictDoUpdate({
        target: permission.name,
        set: { description: permDescriptions[name] || null },
      })
    }
  }
}

async function seedRoles(db: ReturnType<typeof useDb>) {
  for (const [roleName] of Object.entries(SYSTEM_ROLES)) {
    await db.insert(role).values({
      name: roleName,
      description: `System ${roleName} role`,
      isSystem: true,
    }).onConflictDoNothing({ target: role.name })
  }
}

async function seedRolePermissions(db: ReturnType<typeof useDb>) {
  for (const [roleName, permNames] of Object.entries(SYSTEM_ROLES)) {
    const [roleRow] = await db.select().from(role).where(eq(role.name, roleName)).limit(1)
    if (!roleRow)
      continue

    const perms = await db
      .select()
      .from(permission)
      .where(inArray(permission.name, permNames))

    for (const p of perms) {
      await db.insert(rolePermission).values({
        roleId: roleRow.id,
        permissionId: p.id,
      }).onConflictDoNothing({ target: [rolePermission.roleId, rolePermission.permissionId] })
    }
  }
}

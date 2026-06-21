import { eq, inArray } from 'drizzle-orm'
import { ACTIONS, RESOURCES } from '~~/shared/utils/permissions'
import { permission, role, rolePermission, userRole } from '../../db/schema/rbac'
import { user } from '../../db/schema/user'

export async function seedRbac() {
  const db = useDb()
  await seedPermissions(db)
  await seedRoles(db)
  await seedRolePermissions(db)
  await assignSuperadminRole(db)
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
  'audit:create': 'Generate audit trail entries',
  'audit:read': 'View security audit logs',
  'audit:update': 'Modify audit log entries',
  'audit:delete': 'Purge audit log entries',
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

interface SeedRoleDef {
  description: string
  permissions: string[]
}

const seedRoleDefs: Record<string, SeedRoleDef> = {
  'Superadmin': {
    description: 'Full system access with all permissions. Can manage users, roles, permissions, and all system resources.',
    permissions: [
      'audit:read',
      'user:create',
      'user:read',
      'user:update',
      'user:delete',
      'org_unit:create',
      'org_unit:read',
      'org_unit:update',
      'org_unit:delete',
      'job_role:create',
      'job_role:read',
      'job_role:update',
      'job_role:delete',
      'inventory:create',
      'inventory:read',
      'inventory:update',
      'inventory:delete',
      'asset:create',
      'asset:read',
      'asset:update',
      'asset:delete',
      'report:create',
      'report:read',
      'report:update',
      'report:delete',
    ],
  },
  'Admin': {
    description: 'System administration with full CRUD access to users, roles, resources, and audit logs.',
    permissions: [
      'audit:read',
      'user:create',
      'user:read',
      'user:update',
      'user:delete',
      'org_unit:create',
      'org_unit:read',
      'org_unit:update',
      'org_unit:delete',
      'job_role:create',
      'job_role:read',
      'job_role:update',
      'job_role:delete',
      'inventory:create',
      'inventory:read',
      'inventory:update',
      'inventory:delete',
      'asset:create',
      'asset:read',
      'asset:update',
      'asset:delete',
      'report:create',
      'report:read',
      'report:update',
      'report:delete',
    ],
  },
  'HQ Asset Manager': {
    description: 'Manages inventory items and asset register at headquarters level.',
    permissions: [
      'user:read',
      'org_unit:read',
      'job_role:read',
      'inventory:create',
      'inventory:read',
      'inventory:update',
      'asset:create',
      'asset:read',
      'asset:update',
      'asset:delete',
      'report:read',
    ],
  },
  'Regional Technical Manager': {
    description: 'Oversees technical operations and can view inventory, assets, and reports across a region.',
    permissions: [
      'user:read',
      'org_unit:read',
      'job_role:read',
      'inventory:read',
      'asset:read',
      'report:read',
    ],
  },
  'Technical Manager': {
    description: 'Manages technical teams with read access to inventory and assets, plus ability to update stock levels.',
    permissions: [
      'user:read',
      'org_unit:read',
      'job_role:read',
      'inventory:read',
      'inventory:update',
      'asset:read',
      'asset:update',
      'report:read',
    ],
  },
  'Service Centre Technician': {
    description: 'Service centre staff who can view and update inventory and asset records.',
    permissions: [
      'user:read',
      'org_unit:read',
      'job_role:read',
      'inventory:read',
      'inventory:update',
      'asset:read',
      'asset:update',
    ],
  },
  'Finance Officer': {
    description: 'Handles financial reporting with access to reports, inventory, and asset records.',
    permissions: [
      'user:read',
      'org_unit:read',
      'job_role:read',
      'inventory:read',
      'asset:read',
      'report:create',
      'report:read',
      'report:update',
    ],
  },
  'Stores Officer': {
    description: 'Manages store inventory with full CRUD on inventory items and read access to assets.',
    permissions: [
      'user:read',
      'org_unit:read',
      'inventory:create',
      'inventory:read',
      'inventory:update',
      'inventory:delete',
      'asset:read',
      'report:read',
    ],
  },
  'Auditor': {
    description: 'Read-only access to users, organisation structure, inventory, assets, and reports for auditing purposes.',
    permissions: [
      'user:read',
      'org_unit:read',
      'job_role:read',
      'inventory:read',
      'asset:read',
      'report:read',
    ],
  },
  'Viewer': {
    description: 'Minimal read-only access to users, organisation units, job roles, and reports.',
    permissions: [
      'user:read',
      'org_unit:read',
      'job_role:read',
      'report:read',
    ],
  },
}

async function seedRoles(db: ReturnType<typeof useDb>) {
  for (const [roleName, def] of Object.entries(seedRoleDefs)) {
    await db.insert(role).values({
      name: roleName,
      description: def.description,
    }).onConflictDoNothing({ target: role.name })
  }
}

async function seedRolePermissions(db: ReturnType<typeof useDb>) {
  for (const [roleName, def] of Object.entries(seedRoleDefs)) {
    const [roleRow] = await db.select().from(role).where(eq(role.name, roleName)).limit(1)
    if (!roleRow)
      continue

    const perms = await db
      .select()
      .from(permission)
      .where(inArray(permission.name, def.permissions))

    for (const p of perms) {
      await db.insert(rolePermission).values({
        roleId: roleRow.id,
        permissionId: p.id,
      }).onConflictDoNothing({ target: [rolePermission.roleId, rolePermission.permissionId] })
    }
  }
}

async function assignSuperadminRole(db: ReturnType<typeof useDb>) {
  const [superadminRole] = await db.select({ id: role.id }).from(role).where(eq(role.name, 'Superadmin')).limit(1)
  if (!superadminRole)
    return

  const superadmins = await db.select({ id: user.id }).from(user).where(eq(user.isSuperadmin, true))
  for (const u of superadmins) {
    await db.insert(userRole).values({ userId: u.id, roleId: superadminRole.id }).onConflictDoNothing()
  }
}

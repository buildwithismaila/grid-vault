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

async function seedPermissions(db: ReturnType<typeof useDb>) {
  const values = RESOURCES.flatMap(resource =>
    ACTIONS.map(action => ({
      name: `${resource}:${action}`,
      resource,
      action,
    })),
  )

  for (const p of values) {
    await db.insert(permission).values(p).onConflictDoNothing({ target: permission.name })
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

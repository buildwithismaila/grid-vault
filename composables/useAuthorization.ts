export function useAuthorization() {
  const { user } = useUserSession()

  function can(permission: string): boolean {
    if (!user.value)
      return false
    if (user.value.role === 'SUPERADMIN')
      return true
    return user.value.permissions?.includes(permission) ?? false
  }

  function canAny(permissions: string[]): boolean {
    if (!user.value)
      return false
    if (user.value.role === 'SUPERADMIN')
      return true
    return permissions.some(p => user.value.permissions?.includes(p))
  }

  function hasRole(roleName: string): boolean {
    return user.value?.roles?.includes(roleName) ?? false
  }

  function isSuperadmin(): boolean {
    return user.value?.role === 'SUPERADMIN'
  }

  return { can, canAny, hasRole, isSuperadmin }
}

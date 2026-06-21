export function useAuthorization() {
  const { user } = useUserSession()

  function can(permission: string): boolean {
    if (!user.value)
      return false
    if (user.value.role === 'Superadmin')
      return true
    return user.value?.permissions?.includes(permission) ?? false
  }

  function canAny(...permissions: string[]): boolean {
    if (!user.value)
      return false
    if (user.value.role === 'Superadmin')
      return true

    return permissions.length > 0 && permissions.some(p => user.value?.permissions?.includes(p) ?? false)
  }

  function hasRole(roleName: string): boolean {
    if (!user.value)
      return false
    return user.value?.roles?.includes(roleName) ?? false
  }

  function isSuperadmin(): boolean {
    return user.value?.role === 'Superadmin'
  }

  return { can, canAny, hasRole, isSuperadmin }
}

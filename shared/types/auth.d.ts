declare module '#auth-utils' {
  interface User {
    id: string
    payrollId: string
    email: string
    name: string
    avatarUrl: string
    isSuperadmin: boolean
    locationId: string
    permissions: string[]
    roles: string[]
  }
}

export { }

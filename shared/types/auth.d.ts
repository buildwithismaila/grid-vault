declare module '#auth-utils' {
  interface User {
    id: string
    payrollId: string
    email: string
    name: string
    role: 'SUPERADMIN' | 'ADMIN' | 'REVIEWER' | 'EDITOR' | 'USER'
    locationId: string
    permissions: string[]
    roles: string[]
  }
}

export { }

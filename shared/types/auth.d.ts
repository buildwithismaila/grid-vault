declare module '#auth-utils' {
  interface User {
    id: string
    payrollId: string
    email: string
    name: string
    avatarUrl: string
    role: 'Superadmin' | 'Admin' | 'HQ Asset Manager' | 'Regional Technical Manager' | 'Technical Manager' | 'Service Centre Technician' | 'Finance Officer' | 'Stores Officer' | 'Auditor' | 'Viewer'
    locationId: string
    permissions: string[]
    roles: string[]
  }
}

export { }

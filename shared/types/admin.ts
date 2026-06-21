export interface UserRow {
  id: string
  payrollId: string | null
  name: string | null
  email: string
  isSuperadmin: boolean
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  locationId: string | null
  locationName: string | null
  jobRoleId: string | null
  jobRoleName: string | null
  invitedByName: string | null
  inviteExpiresAt: string | null
  inviteId: string | null
  createdAt: string
  roles: string[]
}

export interface OrgUnitRow {
  id: string
  name: string
  type: string
  parentId: string | null
}

export interface RegionRow {
  id: string
  name: string
  type: string
  areaOfficeCount: number
  serviceCenterCount: number
}

export interface AreaOfficeRow {
  id: string
  name: string
  regionName: string | null
  regionId: string | null
  serviceCenterCount: number
}

export interface ServiceCenterRow {
  id: string
  name: string
  areaOfficeName: string | null
  areaOfficeId: string | null
  regionName: string | null
}

export interface JobRoleRow {
  id: string
  name: string
  description: string | null
}

export interface RoleRow {
  id: string
  name: string
  description: string | null
  permissionIds: string[]
  userCount: number
}

export interface PermissionRow {
  id: string
  name: string
  resource: string
  action: string
  description: string | null
}

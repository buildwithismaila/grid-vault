<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AreaOfficeRow, OrgUnitRow, RegionRow, ServiceCenterRow } from '#shared/types/admin'
import { formatEnum } from '#shared/utils'

const { can } = useAuthorization()
const { onError, toast } = useToastError()

const currentTab = ref('regions')
const tabItems = [
  { label: 'Regions', value: 'regions', icon: 'i-lucide-globe' },
  { label: 'Area Offices', value: 'area-offices', icon: 'i-lucide-building' },
  { label: 'Service Centers', value: 'service-centers', icon: 'i-lucide-store' },
]

const search = ref('')
const createOpen = ref(false)
const editOpen = ref(false)
const deleteOpen = ref(false)

const selectedOrgUnit = ref<OrgUnitRow | null>(null)
const orgUnitToDelete = ref<OrgUnitRow | null>(null)

const orgUnitName = ref('')
const orgUnitType = ref('')
const orgUnitParentId = ref('')

const saving = ref(false)

const { data: flatUnits, status: orgUnitsStatus, refresh: refreshOrgUnits } = useLazyFetch<OrgUnitRow[]>('/api/org-units', { server: false })

const loading = computed(() => orgUnitsStatus.value === 'pending' || orgUnitsStatus.value === 'idle')

const typeOptions = ['HQ', 'REGION', 'AREA_OFFICE', 'SERVICE_CENTER'].map(v => ({ value: v, label: formatEnum(v) }))

const typeToAllowedParentType: Record<string, string | null> = {
  HQ: null,
  REGION: null,
  AREA_OFFICE: 'REGION',
  SERVICE_CENTER: 'AREA_OFFICE',
}

const showParentField = computed(() => !!typeToAllowedParentType[orgUnitType.value])

const parentFieldLabel = computed(() => {
  if (orgUnitType.value === 'AREA_OFFICE')
    return 'Parent region'
  if (orgUnitType.value === 'SERVICE_CENTER')
    return 'Parent area office'
  return 'Parent unit'
})

const parentFieldPlaceholder = computed(() => {
  if (orgUnitType.value === 'AREA_OFFICE')
    return 'Select parent region'
  if (orgUnitType.value === 'SERVICE_CENTER')
    return 'Select parent area office'
  return 'None (top-level)'
})

watch(orgUnitType, () => {
  orgUnitParentId.value = ''
})

const unitMap = computed(() => {
  const map = new Map<string, OrgUnitRow>()
  for (const u of flatUnits.value ?? []) {
    map.set(u.id, u)
  }
  return map
})

const regionsData = computed(() => {
  const units = flatUnits.value ?? []
  const q = search.value?.toLowerCase()
  return units
    .filter(u => u.type === 'HQ' || u.type === 'REGION')
    .filter(u => !q || u.name.toLowerCase().includes(q))
    .map(u => ({
      id: u.id,
      name: u.name,
      type: u.type,
      areaOfficeCount: units.filter(c => c.parentId === u.id && c.type === 'AREA_OFFICE').length,
      serviceCenterCount: units.filter((c) => {
        if (c.type !== 'SERVICE_CENTER')
          return false
        const ao = unitMap.value.get(c.parentId ?? '')
        return ao?.parentId === u.id
      }).length,
    }))
})

const areaOfficesData = computed(() => {
  const units = flatUnits.value ?? []
  const q = search.value?.toLowerCase()
  return units
    .filter(u => u.type === 'AREA_OFFICE')
    .filter((u) => {
      if (!q)
        return true
      const parent = u.parentId ? unitMap.value.get(u.parentId) : null
      return u.name.toLowerCase().includes(q) || parent?.name.toLowerCase().includes(q)
    })
    .map(u => ({
      id: u.id,
      name: u.name,
      regionName: u.parentId ? unitMap.value.get(u.parentId)?.name ?? null : null,
      regionId: u.parentId,
      serviceCenterCount: units.filter(c => c.parentId === u.id && c.type === 'SERVICE_CENTER').length,
    }))
})

const serviceCentersData = computed(() => {
  const units = flatUnits.value ?? []
  const q = search.value?.toLowerCase()
  return units
    .filter(u => u.type === 'SERVICE_CENTER')
    .filter((u) => {
      if (!q)
        return true
      const parent = u.parentId ? unitMap.value.get(u.parentId) : null
      const grandparent = parent?.parentId ? unitMap.value.get(parent.parentId) : null
      return u.name.toLowerCase().includes(q)
        || parent?.name.toLowerCase().includes(q)
        || grandparent?.name.toLowerCase().includes(q)
    })
    .map((u) => {
      const parent = u.parentId ? unitMap.value.get(u.parentId) : null
      const grandparent = parent?.parentId ? unitMap.value.get(parent.parentId) : null
      return {
        id: u.id,
        name: u.name,
        areaOfficeName: parent?.name ?? null,
        areaOfficeId: u.parentId,
        regionName: grandparent?.name ?? null,
      }
    })
})

const filteredParentOptions = computed(() => {
  const units = flatUnits.value ?? []
  const allowedType = typeToAllowedParentType[orgUnitType.value]
  if (!allowedType)
    return []
  const excludeId = selectedOrgUnit.value?.id
  return units
    .filter(u => u.type === allowedType && u.id !== excludeId)
    .map(u => ({ id: u.id, name: u.name, type: u.type }))
})

const regionsColumns: TableColumn<RegionRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'areaOfficeCount', header: 'Area Offices' },
  { accessorKey: 'serviceCenterCount', header: 'Service Centers' },
  { id: 'actions' },
]

const areaOfficesColumns: TableColumn<AreaOfficeRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'regionName', header: 'Region' },
  { accessorKey: 'serviceCenterCount', header: 'Service Centers' },
  { id: 'actions' },
]

const serviceCentersColumns: TableColumn<ServiceCenterRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'areaOfficeName', header: 'Area Office' },
  { accessorKey: 'regionName', header: 'Region' },
  { id: 'actions' },
]

function openCreateForTab(tab: string) {
  selectedOrgUnit.value = null
  orgUnitName.value = ''
  orgUnitParentId.value = ''
  if (tab === 'regions') {
    orgUnitType.value = 'REGION'
  }
  else if (tab === 'area-offices') {
    orgUnitType.value = 'AREA_OFFICE'
  }
  else {
    orgUnitType.value = 'SERVICE_CENTER'
  }
  createOpen.value = true
}

async function createOrgUnit() {
  if (!orgUnitName.value || !orgUnitType.value)
    return
  saving.value = true
  try {
    await $fetch('/api/org-units', {
      method: 'POST',
      body: {
        name: orgUnitName.value,
        type: orgUnitType.value,
        parentId: orgUnitParentId.value || null,
      },
    })
    toast.add({ title: 'Org unit created', color: 'success', icon: 'i-lucide-check-circle' })
    createOpen.value = false
    await refreshOrgUnits()
  }
  catch (err) {
    onError(err, 'Failed to create org unit')
  }
  finally {
    saving.value = false
  }
}

function openEdit(unit: OrgUnitRow) {
  selectedOrgUnit.value = unit
  orgUnitName.value = unit.name
  orgUnitType.value = unit.type
  orgUnitParentId.value = unit.parentId ?? ''
  editOpen.value = true
}

async function updateOrgUnit() {
  if (!selectedOrgUnit.value || !orgUnitName.value || !orgUnitType.value)
    return
  saving.value = true
  try {
    await $fetch(`/api/org-units/${selectedOrgUnit.value.id}`, {
      method: 'PUT',
      body: {
        name: orgUnitName.value,
        type: orgUnitType.value,
        parentId: orgUnitParentId.value || null,
      },
    })
    toast.add({ title: 'Org unit updated', color: 'success', icon: 'i-lucide-check-circle' })
    editOpen.value = false
    await refreshOrgUnits()
  }
  catch (err) {
    onError(err, 'Failed to update org unit')
  }
  finally {
    saving.value = false
  }
}

function confirmDelete(unit: OrgUnitRow) {
  orgUnitToDelete.value = unit
  deleteOpen.value = true
}

async function deleteOrgUnit() {
  if (!orgUnitToDelete.value)
    return
  saving.value = true
  try {
    await $fetch(`/api/org-units/${orgUnitToDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Org unit deleted', color: 'success', icon: 'i-lucide-check-circle' })
    deleteOpen.value = false
    await refreshOrgUnits()
  }
  catch (err) {
    onError(err, 'Failed to delete org unit')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col flex-1 w-full">
    <div class="px-4 pt-3 border-b border-accented">
      <UTabs v-model="currentTab" :items="tabItems" variant="link" />
    </div>

    <div class="flex justify-between items-center px-4 py-3.5 border-b border-accented">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="`Search ${tabItems.find(t => t.value === currentTab)?.label.toLowerCase() ?? 'org units'}...`"
        class="w-64"
      />
      <UButton
        v-if="can('org_unit:create')"
        icon="i-lucide-plus"
        label="Add unit"
        @click="openCreateForTab(currentTab)"
      />
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
    </div>

    <!-- Regions tab -->
    <template v-else-if="currentTab === 'regions'">
      <UTable v-if="regionsData.length" :data="regionsData" :columns="regionsColumns">
        <template #type-cell="{ row }">
          <UBadge
            :label="formatEnum(row.original.type)"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UTooltip text="Edit org unit">
              <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" square aria-label="Edit org unit" @click="openEdit(row.original)" />
            </UTooltip>
            <UTooltip text="Delete org unit">
              <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm" square aria-label="Delete org unit" @click="confirmDelete(row.original)" />
            </UTooltip>
          </div>
        </template>
        <template #empty>
          <div class="flex flex-col items-center gap-2 py-8">
            <UIcon name="i-lucide-globe" class="size-8 text-muted" />
            <p class="text-sm text-muted">
              No regions yet
            </p>
          </div>
        </template>
      </UTable>
      <div v-else class="flex flex-col items-center gap-2 py-12">
        <UIcon name="i-lucide-globe" class="size-8 text-muted" />
        <p class="text-sm text-muted">
          No regions yet
        </p>
      </div>
    </template>

    <!-- Area Offices tab -->
    <template v-else-if="currentTab === 'area-offices'">
      <UTable v-if="areaOfficesData.length" :data="areaOfficesData" :columns="areaOfficesColumns">
        <template #regionName-cell="{ row }">
          <span class="text-sm">{{ row.original.regionName || '—' }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UTooltip text="Edit org unit">
              <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" square aria-label="Edit org unit" @click="openEdit(row.original)" />
            </UTooltip>
            <UTooltip text="Delete org unit">
              <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm" square aria-label="Delete org unit" @click="confirmDelete(row.original)" />
            </UTooltip>
          </div>
        </template>
        <template #empty>
          <div class="flex flex-col items-center gap-2 py-8">
            <UIcon name="i-lucide-building" class="size-8 text-muted" />
            <p class="text-sm text-muted">
              No area offices yet
            </p>
          </div>
        </template>
      </UTable>
      <div v-else class="flex flex-col items-center gap-2 py-12">
        <UIcon name="i-lucide-building" class="size-8 text-muted" />
        <p class="text-sm text-muted">
          No area offices yet
        </p>
      </div>
    </template>

    <!-- Service Centers tab -->
    <template v-else>
      <UTable v-if="serviceCentersData.length" :data="serviceCentersData" :columns="serviceCentersColumns">
        <template #areaOfficeName-cell="{ row }">
          <span class="text-sm">{{ row.original.areaOfficeName || '—' }}</span>
        </template>
        <template #regionName-cell="{ row }">
          <span class="text-sm text-muted">{{ row.original.regionName || '—' }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UTooltip text="Edit org unit">
              <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" square aria-label="Edit org unit" @click="openEdit(row.original)" />
            </UTooltip>
            <UTooltip text="Delete org unit">
              <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm" square aria-label="Delete org unit" @click="confirmDelete(row.original)" />
            </UTooltip>
          </div>
        </template>
        <template #empty>
          <div class="flex flex-col items-center gap-2 py-8">
            <UIcon name="i-lucide-store" class="size-8 text-muted" />
            <p class="text-sm text-muted">
              No service centers yet
            </p>
          </div>
        </template>
      </UTable>
      <div v-else class="flex flex-col items-center gap-2 py-12">
        <UIcon name="i-lucide-store" class="size-8 text-muted" />
        <p class="text-sm text-muted">
          No service centers yet
        </p>
      </div>
    </template>
  </div>

  <UModal v-model:open="createOpen" title="Create org unit" description="Add a new organisational unit">
    <template #body>
      <div class="max-w-sm mx-auto space-y-5 py-1">
        <UFormField name="name" label="Name" required>
          <UInput v-model="orgUnitName" :placeholder="`e.g. ${orgUnitType ? formatEnum(orgUnitType) : 'Org unit'} name`" class="w-full" />
        </UFormField>
        <UFormField name="type" label="Type" required>
          <USelect v-model="orgUnitType" :items="typeOptions" placeholder="Select type" class="w-full" />
        </UFormField>
        <UFormField v-if="showParentField" name="parent" :label="parentFieldLabel">
          <USelect
            v-model="orgUnitParentId"
            :items="filteredParentOptions"
            value-key="id"
            label-key="name"
            :placeholder="parentFieldPlaceholder"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton label="Cancel" color="neutral" variant="outline" @click="createOpen = false" />
        <UButton label="Create" :loading="saving" :disabled="!orgUnitName || !orgUnitType" @click="createOrgUnit" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="editOpen" :title="`Edit — ${selectedOrgUnit?.name || ''}`" description="Update org unit details">
    <template #body>
      <div class="max-w-sm mx-auto space-y-5 py-1">
        <UFormField name="name" label="Name" required>
          <UInput v-model="orgUnitName" class="w-full" />
        </UFormField>
        <UFormField name="type" label="Type" required>
          <USelect v-model="orgUnitType" :items="typeOptions" class="w-full" />
        </UFormField>
        <UFormField v-if="showParentField" name="parent" :label="parentFieldLabel">
          <USelect
            v-model="orgUnitParentId"
            :items="filteredParentOptions"
            value-key="id"
            label-key="name"
            :placeholder="parentFieldPlaceholder"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-3">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton label="Save" :loading="saving" :disabled="!orgUnitName || !orgUnitType" @click="updateOrgUnit" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="deleteOpen" title="Delete org unit" description="This action cannot be undone">
    <template #body>
      <p class="text-sm">
        Are you sure you want to delete <strong>{{ orgUnitToDelete?.name }}</strong>?
      </p>
      <p class="text-xs text-muted mt-3">
        Users assigned to this unit will have their location set to none.
      </p>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-3">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton label="Delete" color="error" :loading="saving" @click="deleteOrgUnit" />
      </div>
    </template>
  </UModal>
</template>

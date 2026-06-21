<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  middleware: async () => {
    const { can } = useAuthorization()
    if (!can('audit:read'))
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  },
})

interface AuditLogRow {
  id: string
  actorId: string | null
  actorEmail: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  targetUserId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  outcome: string
  createdAt: string
}

const searchInput = ref('')
const search = ref('')
const actionFilter = ref('all')
const outcomeFilter = ref('all')
const page = ref(1)
const pageSize = ref(25)
const actionsList = ref<string[]>([])

const queryParams = computed(() => ({
  search: search.value,
  action: actionFilter.value === 'all' ? undefined : actionFilter.value,
  outcome: outcomeFilter.value === 'all' ? undefined : outcomeFilter.value,
  page: page.value.toString(),
  limit: pageSize.value.toString(),
}))

const { data: auditData, status: fetchStatus, refresh } = useLazyFetch('/api/admin/audit', { query: queryParams, server: false } as any)

watch([actionFilter, outcomeFilter, page, pageSize], () => { refresh() }) // eslint-disable-line style/max-statements-per-line

let debounceTimer: ReturnType<typeof setTimeout>
watch(searchInput, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    search.value = val
    page.value = 1
  }, 300)
})

watch(auditData, (val) => {
  if (val?.actions && actionsList.value.length === 0) {
    actionsList.value = val.actions
  }
})

const loading = computed(() => fetchStatus.value === 'pending' || fetchStatus.value === 'idle')

const columns: TableColumn<AuditLogRow>[] = [
  { id: 'createdAt', accessorKey: 'createdAt', header: 'Time' },
  { id: 'action', accessorKey: 'action', header: 'Action' },
  { id: 'actorEmail', accessorKey: 'actorEmail', header: 'Actor' },
  { id: 'outcome', accessorKey: 'outcome', header: 'Outcome' },
  { id: 'target', header: 'Target' },
  { id: 'ipAddress', accessorKey: 'ipAddress', header: 'IP Address' },
  { id: 'details', header: 'Details' },
]

const outcomeColors: Record<string, 'success' | 'error'> = {
  SUCCESS: 'success',
  FAILURE: 'error',
}

interface FlattenedActionItem {
  label: string
  value: string
}

const actionOptions = computed<FlattenedActionItem[]>(() => [
  { label: 'All actions', value: 'all' },
  ...actionsList.value.map(a => ({ label: a.replace(/_/g, ' ').replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()), value: a })),
])

function formatTime(iso: string) {
  return new Date(iso).toLocaleString()
}
</script>

<template>
  <div class="w-full">
    <div class="mb-8">
      <h3 class="text-xl font-bold">
        Security Audit Log
      </h3>
      <p class="text-sm text-muted mt-1">
        Track security events and changes across the system
      </p>
    </div>

    <div class="flex items-center px-4 py-3.5 border-b border-accented justify-between gap-4 w-full overflow-x-auto">
      <div class="flex items-center gap-2 flex-1">
        <UInput v-model="searchInput" icon="i-lucide-search" placeholder="Search email, action, or IP..." class="w-64" />
      </div>
      <div class="flex items-center gap-2">
        <USelect v-model="actionFilter" :items="actionOptions" class="w-44" />
        <USelect
          v-model="outcomeFilter"
          :items="[
            { label: 'All outcomes', value: 'all' },
            { label: 'Success', value: 'SUCCESS' },
            { label: 'Failure', value: 'FAILURE' },
          ]"
          class="w-36"
        />
      </div>
    </div>

    <UTable
      :data="(auditData?.data ?? []) as AuditLogRow[]"
      :columns="columns"
      :loading="loading"
    >
      <template #createdAt-cell="{ row }">
        <span class="text-sm whitespace-nowrap">{{ formatTime(row.original.createdAt) }}</span>
      </template>

      <template #action-cell="{ row }">
        <UBadge
          :label="row.original.action.replace(/_/g, ' ')"
          variant="subtle"
          size="sm"
        />
      </template>

      <template #actorEmail-cell="{ row }">
        <span class="text-sm">{{ row.original.actorEmail || '—' }}</span>
      </template>

      <template #outcome-cell="{ row }">
        <UBadge
          :label="row.original.outcome"
          :color="outcomeColors[row.original.outcome] || 'neutral'"
          variant="solid"
          size="sm"
        />
      </template>

      <template #target-cell="{ row }">
        <span class="text-sm text-muted">{{ row.original.targetUserId || row.original.resourceId || '—' }}</span>
      </template>

      <template #ipAddress-cell="{ row }">
        <span class="text-sm font-mono text-muted">{{ row.original.ipAddress || '—' }}</span>
      </template>

      <template #details-cell="{ row }">
        <span v-if="row.original.details" class="text-xs text-muted max-w-48 truncate block">{{ JSON.stringify(row.original.details) }}</span>
        <span v-else class="text-muted text-sm">—</span>
      </template>

      <template #empty>
        <div class="flex flex-col items-center gap-2 py-12">
          <UIcon name="i-lucide-shield-alert" class="size-10 text-muted" />
          <p class="text-sm font-medium">
            No audit events found
          </p>
          <p class="text-xs text-muted">
            Try adjusting your search or filter
          </p>
        </div>
      </template>
    </UTable>

    <div class="flex items-center justify-between px-4 py-3">
      <p class="text-sm text-muted">
        {{ auditData?.data?.length || 0 }} of {{ auditData?.total || 0 }} event{{ auditData?.total !== 1 ? 's' : '' }}
      </p>
      <div class="flex items-center gap-2">
        <USelect
          :model-value="pageSize"
          :items="[10, 25, 50, 100]"
          class="w-20"
          @update:model-value="(v: number) => { pageSize = v; page = 1 }"
        />
        <UPagination
          :page="page"
          :items-per-page="pageSize"
          :total="auditData?.total ?? 0"
          @update:page="(p: number) => page = p"
        />
      </div>
    </div>
  </div>
</template>

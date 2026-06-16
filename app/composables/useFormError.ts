interface ApiError {
  data?: {
    data?: Record<string, string[]>
    statusMessage?: string
  }
  message?: string
}

export function useFormError() {
  const fieldErrors = ref<Record<string, string>>({})
  const globalError = ref('')

  function handleApiError(err: unknown, fallback: string) {
    const api = err as ApiError | null | undefined

    if (api?.data?.data) {
      for (const [key, messages] of Object.entries(api.data.data)) {
        if (key && messages.length > 0)
          fieldErrors.value[key] = messages[0] as string
      }
    }
    else if (api?.data?.statusMessage) {
      globalError.value = api.data.statusMessage
    }
    else {
      globalError.value = api?.message || fallback
    }
  }

  function resetErrors() {
    fieldErrors.value = {}
    globalError.value = ''
  }

  return { fieldErrors, globalError, handleApiError, resetErrors }
}

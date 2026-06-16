export function useToastError() {
  const toast = useToast()
  const formError = useFormError()

  function onError(err: unknown, fallback: string) {
    formError.handleApiError(err, fallback)
    toast.add({
      title: formError.globalError.value || fallback,
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }

  return { onError, toast, ...formError }
}

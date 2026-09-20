export function createUnexpectedAuthSessionClear(options: {
  clearLocalAuthSession: () => Promise<void>
  onError: (error: unknown) => void
}) {
  let inProgress = false

  function request(): void {
    if (inProgress) return

    inProgress = true

    setTimeout(() => {
      void options
        .clearLocalAuthSession()
        .catch(options.onError)
        .finally(() => {
          inProgress = false
        })
    }, 0)
  }

  return { request }
}

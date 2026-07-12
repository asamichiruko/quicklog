export type LocalAuthSessionClearErrorReason = "completed" | "canceled"

export type PasswordRecoveryFlowOptions = {
  verifyPasswordResetCode: (email: string, code: string) => Promise<void>
  updatePasswordAfterRecovery: (password: string) => Promise<void>
  clearLocalAuthSession: () => Promise<void>
  activateAnonymousScope: () => void
  onLocalAuthSessionClearError: (error: unknown, reason: LocalAuthSessionClearErrorReason) => void
}

export function createPasswordRecoveryFlow(options: PasswordRecoveryFlowOptions) {
  let passwordRecoveryInProgress = false

  async function verifyPasswordResetCode(email: string, code: string) {
    passwordRecoveryInProgress = true
    try {
      await options.verifyPasswordResetCode(email, code)
    } catch (error) {
      passwordRecoveryInProgress = false
      throw error
    }
  }

  async function updatePasswordAfterRecovery(password: string) {
    if (!passwordRecoveryInProgress) {
      throw new Error("Password recovery is not in progress.")
    }

    await options.updatePasswordAfterRecovery(password)
    try {
      await options.clearLocalAuthSession()
    } catch (error) {
      options.onLocalAuthSessionClearError(error, "completed")
    }

    passwordRecoveryInProgress = false
    options.activateAnonymousScope()
  }

  async function cancelPasswordRecovery() {
    if (!passwordRecoveryInProgress) return

    try {
      await options.clearLocalAuthSession()
    } catch (error) {
      options.onLocalAuthSessionClearError(error, "canceled")
    }

    passwordRecoveryInProgress = false
    options.activateAnonymousScope()
  }

  return {
    isInProgress: () => passwordRecoveryInProgress,
    verifyPasswordResetCode,
    updatePasswordAfterRecovery,
    cancelPasswordRecovery,
  }
}

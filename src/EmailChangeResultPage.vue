<script setup lang="ts">
const params = new URLSearchParams(window.location.hash.slice(1))

const hasError = params.has("error") || params.has("error_code") || params.has("error_description")

const errorMessage =
  params.get("error_code") === "otp_expired"
    ? "この確認リンクは無効であるか、有効期限が切れています。"
    : "メールアドレスの確認に失敗しました。"
</script>

<template>
  <main class="container">
    <h1>quicklog - メールアドレスの確認</h1>

    <template v-if="hasError">
      <p>{{ errorMessage }}</p>
      <p>すでに確認済みで変更が完了している場合、追加の操作は必要ありません。</p>
      <p>
        quicklog のアカウント画面で現在のメールアドレスを確認してください。
        変更が完了していない場合は、メールアドレス変更画面から確認メールを再送してください。
      </p>
    </template>
    <template v-else>
      <p>メールアドレスの確認結果は quicklog のアカウント画面で確認してください。</p>
      <p>
        もう一方のメールアドレスで確認を行っていない場合、そちらに届いた確認メールのリンクも開いてください。
      </p>
    </template>

    <p>このページは閉じて構いません。</p>
  </main>
</template>

<style lang="css" scoped>
.container {
  padding: var(--space-4) var(--space-3);
}
</style>

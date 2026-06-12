import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  })
}

Deno.serve(async (request: Request): Promise<Response> => {
  // ブラウザが本リクエストの前に送る CORS 確認
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed" },
      405,
    )
  }

  const authorization = request.headers.get("Authorization")

  if (authorization === null) {
    return jsonResponse(
      { error: "Authorization header is required" },
      401,
    )
  }

  const accessToken = authorization.replace(/^Bearer\s+/i, "")

  // Authorization: abcdef のような形式を弾く
  if (accessToken === authorization) {
    return jsonResponse(
      { error: "Invalid authorization header" },
      401,
    )
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (supabaseUrl === undefined || serviceRoleKey === undefined) {
    console.error("Required environment variables are missing")

    return jsonResponse(
      { error: "Server configuration error" },
      500,
    )
  }

  /*
   * service_role クライアントは強い管理者権限を持つ。
   * Edge Function 内だけで使用し、ブラウザには渡さない。
   */
  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  /*
   * クライアントから userId は受け取らない。
   * Authorization header のトークンから本人を特定する。
   */
  const {
    data: { user },
    error: getUserError,
  } = await adminClient.auth.getUser(accessToken)

  if (getUserError !== null || user === null) {
    console.warn("Failed to authenticate account deletion request", {
      message: getUserError?.message,
    })

    return jsonResponse(
      { error: "Unauthorized" },
      401,
    )
  }

  const { error: deleteUserError } =
    await adminClient.auth.admin.deleteUser(user.id)

  if (deleteUserError !== null) {
    console.error("Failed to delete user", {
      userId: user.id,
      message: deleteUserError.message,
    })

    return jsonResponse(
      { error: "Failed to delete account" },
      500,
    )
  }

  return jsonResponse({ success: true }, 200)
})

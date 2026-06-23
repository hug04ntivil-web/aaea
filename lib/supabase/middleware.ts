import { createServerClient } from "@supabase/ssr"
import { createClient as createAdminSupabase } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

function getAdminClient() {
  return createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const publicRoutes = ["/login", "/forgot-password", "/reset-password"]
  const isPublicRoute = publicRoutes.some(r => pathname.startsWith(r))
  const isPublicToken = pathname.startsWith("/p/") || pathname.startsWith("/q/")
  const isApiRoute = pathname.startsWith("/api/")

  if (!user && !isPublicRoute && !isPublicToken && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user) {
    const admin = getAdminClient()
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = profile?.role

    if (isPublicRoute) {
      const url = request.nextUrl.clone()
      if (role === "admin") url.pathname = "/admin/dashboard"
      else if (role === "inspector") url.pathname = "/inspector/dashboard"
      else url.pathname = "/client/dashboard"
      return NextResponse.redirect(url)
    }

    if (!role) return supabaseResponse

    if (pathname.startsWith("/admin") && role !== "admin") {
      const url = request.nextUrl.clone()
      url.pathname = role === "inspector" ? "/inspector/dashboard" : "/client/dashboard"
      return NextResponse.redirect(url)
    }
    if (pathname.startsWith("/inspector") && role !== "inspector" && role !== "admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/client/dashboard"
      return NextResponse.redirect(url)
    }
    if (pathname.startsWith("/client") && role !== "client") {
      const url = request.nextUrl.clone()
      url.pathname = role === "admin" ? "/admin/dashboard" : "/inspector/dashboard"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

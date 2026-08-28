import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function requireEnv(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Copia .env.example a .env.local y complétala.`,
    )
  }
  return valor
}

/** Cliente con la anon key. Se usa tanto en el Server Component que lee el menú
 *  como en la server action que inserta el pedido: RLS permite exactamente eso
 *  (select en el menú, insert en pedidos) y nada más. */
export function getSupabase(): SupabaseClient {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { persistSession: false } },
  )
}

/** Cliente administrador (service_role). SOLO para scripts locales de seed —
 *  nunca se importa desde código que corra en el navegador ni en Vercel. */
export function getSupabaseAdmin(): SupabaseClient {
  return createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** true si el proyecto todavía no tiene credenciales configuradas. */
export function supabaseConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

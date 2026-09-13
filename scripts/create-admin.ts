import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function createUser(email: string, password: string, name: string, role: string) {
  console.log(`\nCreating ${role}: ${email}`)
  
  // Check if user already exists
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
  const found = existing?.users?.find((u) => u.email === email)
  
  if (found) {
    console.log(`  User already exists (${found.id}) — ensuring profile...`)
    const { error: profileError } = await supabaseAdmin
      .from('cf_profiles')
      .upsert({ id: found.id, role, name }, { onConflict: 'id' })
    if (profileError) console.error('  Profile error:', profileError.message)
    else console.log('  Profile upserted.')
    return
  }

  const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) { console.error('  Error:', error.message); return }
  console.log('  Created user:', user?.id)

  const { error: profileError } = await supabaseAdmin
    .from('cf_profiles')
    .insert({ id: user!.id, role, name })
  if (profileError) console.error('  Profile error:', profileError.message)
  else console.log('  Profile created.')
}

async function main() {
  await createUser('dustin@patriotwms.com', 'Patriot@2026!', 'Dustin Abshire', 'admin')
  await createUser('manager@patriotwms.com', 'Patriot@2026!', 'Manager', 'manager')
  console.log('\nDone.')
}

main()

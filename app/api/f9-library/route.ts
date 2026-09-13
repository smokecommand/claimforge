import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lossType = searchParams.get('loss_type')
    const carrier = searchParams.get('carrier')
    const category = searchParams.get('category')

    let query = supabaseAdmin
      .from('cf_f9_library')
      .select('*')
      .order('category', { ascending: true })
      .order('item_name', { ascending: true })

    if (lossType) query = query.eq('loss_type', lossType)
    if (carrier) query = query.eq('carrier', carrier)
    if (category) query = query.ilike('category', `%${category}%`)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, item_name, xactimate_code, loss_type, carrier, f9_text } = body

    if (!category || !item_name || !loss_type || !f9_text) {
      return NextResponse.json(
        { error: 'Missing required fields: category, item_name, loss_type, f9_text' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('cf_f9_library')
      .insert({
        category,
        item_name,
        xactimate_code: xactimate_code || null,
        loss_type,
        carrier: carrier || null,
        f9_text,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

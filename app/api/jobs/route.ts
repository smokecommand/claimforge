import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('cf_jobs')
      .select('*')
      .order('created_at', { ascending: false })

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
    const {
      job_name,
      claim_number,
      carrier,
      loss_type,
      property_address,
      insured_name,
      adjuster_name,
      adjuster_email,
      notes,
    } = body

    if (!job_name) {
      return NextResponse.json({ error: 'job_name is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('cf_jobs')
      .insert({
        job_name,
        claim_number: claim_number || null,
        carrier: carrier || null,
        loss_type: loss_type || null,
        status: 'estimating',
        property_address: property_address || null,
        insured_name: insured_name || null,
        adjuster_name: adjuster_name || null,
        adjuster_email: adjuster_email || null,
        notes: notes || null,
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

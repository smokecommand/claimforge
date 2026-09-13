import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const entries = [
  {
    category: 'Equipment',
    item_name: 'Air Scrubber Quantity Justification',
    xactimate_code: 'WTR SCRUB',
    loss_type: 'fire+smoke',
    carrier: null,
    f9_text: `Air scrubbers were deployed in accordance with IICRC S-700 Standard for Professional Fire and Smoke Damage Restoration. The number of units deployed (see line item quantity) was calculated based on the affected cubic footage of the structure requiring air changes per hour (ACH). Per S-700 guidelines, a minimum of 4 ACH is required in fire/smoke-affected areas to achieve acceptable IAQ during the remediation phase. Each air scrubber unit provides approximately 500–600 CFM of filtered airflow. Total affected area cubic footage divided by required CFM per ACH yields the documented unit count. Reducing the quantity of air scrubbers below this threshold would result in insufficient air exchange, prolonged remediation timelines, incomplete particulate removal, and potential secondary damage from soot and smoke residue — all of which would increase the overall claim cost. Unit count is consistent with contractor's field documentation and daily monitoring logs.`,
  },
  {
    category: 'Equipment',
    item_name: 'Dehumidifier Quantity Justification',
    xactimate_code: 'WTR DEHUM LG',
    loss_type: 'water',
    carrier: null,
    f9_text: `Dehumidifiers were placed in accordance with IICRC S-500 Standard for Professional Water Damage Restoration, Section 14 — Psychrometrics and Equipment Placement. The number of units was determined by calculating the Class of water damage and the total square footage of affected floor area. Per S-500 methodology, equipment placement is based on achieving adequate grain depression across all affected materials. Class 2 and Class 3 losses require a higher equipment density due to increased moisture load in porous materials (flooring, wall cavities, subfloor). The unit count documented reflects field measurement data and psychrometric readings taken at time of initial assessment. Reducing equipment quantity without corresponding evidence of reduced moisture conditions would be inconsistent with S-500 standards and would extend the drying timeline, increasing the likelihood of secondary microbial growth.`,
  },
  {
    category: 'Antimicrobial',
    item_name: 'Antimicrobial Treatment — Category 3 Water Intrusion',
    xactimate_code: 'WTR ANTIM',
    loss_type: 'water',
    carrier: null,
    f9_text: `Antimicrobial treatment was applied to all affected structural surfaces following Category 3 water intrusion (sewage/groundwater/flood). Per IICRC S-500 Section 12, Category 3 water carries pathogenic microorganisms and requires mandatory disinfection of all contacted materials prior to demolition, removal, or containment procedures. Application was performed using an EPA-registered biocide in accordance with the product label and concentration requirements. Treatment was applied to affected flooring, wall cavities, framing members, and subfloor as documented in the scope of work. This line item is not discretionary — IICRC S-500 and OSHA 29 CFR 1910.1030 mandate pathogen control protocols for Category 3 losses to protect both occupants and workers. Omission of this line item would expose the carrier to liability and is not supported by the applicable standard of care.`,
  },
  {
    category: 'Equipment',
    item_name: 'HEPA Vacuum — Fire/Smoke Remediation',
    xactimate_code: 'FIRE VACUUM',
    loss_type: 'fire+smoke',
    carrier: null,
    f9_text: `HEPA vacuuming was performed throughout all fire and smoke-affected areas in compliance with IICRC S-700 Standard for Professional Fire and Smoke Damage Restoration. S-700 Section 7 specifies that HEPA-filtered vacuums (99.97% efficiency at 0.3 microns) must be used during dry cleaning phases to capture combustion byproducts, char particulates, and ultra-fine soot particles that standard vacuums would recirculate into the air. HEPA vacuuming is a non-negotiable first step before any wet cleaning, encapsulation, or chemical treatment. The square footage reflected in this line item corresponds to the total affected surface area documented in the field assessment. Using non-HEPA equipment would be a violation of S-700 protocols and would result in cross-contamination and inadequate remediation of smoke-affected materials.`,
  },
  {
    category: 'Sealing & Encapsulation',
    item_name: 'Shellac-Based Sealer (BIN) — Odor Blocking',
    xactimate_code: 'FIRE SEAL',
    loss_type: 'fire+smoke',
    carrier: null,
    f9_text: `Shellac-based primer/sealer (Zinsser BIN or equivalent) was applied to structural framing, subfloor, and/or wall surfaces exhibiting smoke penetration and odor. Per IICRC S-700, encapsulation with an appropriate sealer is required when smoke odor compounds have penetrated porous building materials that cannot be removed or where full replacement is not warranted. Shellac-based sealers are the recognized industry standard for sealing in polycyclic aromatic hydrocarbons (PAHs), aldehydes, and volatile organic compounds (VOCs) produced by combustion. Water-based or latex primers do not provide adequate vapor barrier properties for smoke odor compounds. The square footage and number of coats applied are consistent with the scope of damage documented during inspection and are required to achieve acceptable post-remediation odor levels consistent with pre-loss conditions.`,
  },
  {
    category: 'Odor Management',
    item_name: 'Thermal Fogging — Smoke Odor Neutralization',
    xactimate_code: 'FIRE FOG',
    loss_type: 'fire+smoke',
    carrier: null,
    f9_text: `Thermal fogging was performed to neutralize smoke odor compounds that have permeated porous structural materials, HVAC cavities, wall voids, and ceiling spaces inaccessible by direct surface treatment. Per IICRC S-700, thermal fogging is a recognized and often required deodorization technique for fire/smoke losses where smoke has migrated into building cavities. The fogging agent is heated to create a fine mist that follows the same migration pathway as smoke, chemically pairing with and neutralizing odor-causing compounds at the molecular level. Thermal fogging is distinct from and complementary to surface cleaning — it addresses odor in locations where direct application is not possible. The treatment was performed following IICRC protocols with appropriate building preparation (windows sealed, HVAC isolated, occupants evacuated) and post-treatment ventilation. Omission of this step results in persistent odor that will be detectable after reconstruction, constituting an incomplete remediation.`,
  },
  {
    category: 'Odor Management',
    item_name: 'Hydroxyl Generator — Ongoing Odor Treatment',
    xactimate_code: 'FIRE HYDROXYL',
    loss_type: 'fire+smoke',
    carrier: null,
    f9_text: `Hydroxyl generators were deployed throughout the affected structure to provide ongoing, safe, and occupant-compatible odor neutralization during the remediation phase. Unlike ozone generators, hydroxyl generators do not require building evacuation and can be operated safely with workers and in some cases occupants present. Hydroxyl generators produce OH radicals that oxidize and break down VOCs, odor compounds, bacteria, and mold spores at the molecular level. Per IICRC S-700 and industry best practices, hydroxyl treatment is particularly effective for persistent smoke odor in structures where thermal fogging alone does not achieve full odor neutralization. The number of units deployed and treatment duration are based on the affected cubic footage and the severity of smoke penetration documented during initial assessment. Daily monitoring confirmed active treatment throughout the remediation period.`,
  },
  {
    category: 'Surface Protection',
    item_name: 'Floor Protection — Active Work Zone',
    xactimate_code: 'FIRE FLTAPE',
    loss_type: 'fire+smoke',
    carrier: null,
    f9_text: `Temporary floor protection was installed in all work zones, access routes, and unaffected areas adjacent to the fire/smoke damage scope. Per IICRC S-700 and general contractor best practices, floor protection is required to prevent secondary damage to finished flooring materials during remediation and restoration activities. Without floor protection, foot traffic carrying soot, debris, water, and chemicals from affected areas would cause cross-contamination and secondary damage to unaffected flooring, generating additional claim costs. Protection materials used include Ram Board or equivalent (minimum 1/8" corrugated fiberboard with poly backing) installed per manufacturer guidelines with taped seams. Square footage reflects the area protected as documented in field notes. This is a required line item per the standard of care for professional restoration.`,
  },
  {
    category: 'Documentation',
    item_name: 'Daily Equipment Monitoring — Water Loss',
    xactimate_code: 'WTR MON',
    loss_type: 'water',
    carrier: null,
    f9_text: `Daily equipment monitoring and psychrometric documentation was performed throughout the active drying phase of this water loss. Per IICRC S-500 Section 14.4, monitoring of drying progress is a required component of professional water damage restoration. Each monitoring visit includes: (1) recording ambient temperature and relative humidity, (2) measuring moisture content of affected structural materials with a calibrated moisture meter, (3) checking equipment operation and repositioning as needed, (4) recording psychrometric data to demonstrate drying progress toward established drying goals, and (5) updating daily monitoring logs. This documentation is required to demonstrate standard of care, justify equipment placement decisions, and establish the timeline and completion of the drying phase. Carrier requests to reduce or eliminate monitoring visits are inconsistent with S-500 and would constitute a deviation from the established standard of care, potentially affecting the quality and defensibility of the restoration outcome.`,
  },
  {
    category: 'HVAC',
    item_name: 'HVAC System Assessment — Post Fire/Smoke',
    xactimate_code: 'FIRE HVAC',
    loss_type: 'fire+smoke',
    carrier: null,
    f9_text: `HVAC system assessment was performed following fire and smoke damage to determine the extent of smoke and soot infiltration throughout the ductwork, air handler, and mechanical components. Per IICRC S-700, the HVAC system must be evaluated and addressed in every fire/smoke loss because smoke and combustion byproducts are distributed through the duct system when the HVAC operates during or after the fire event. Failure to assess and remediate the HVAC system results in re-contamination of remediated spaces each time the system operates, rendering the remediation incomplete. The assessment included visual inspection of all accessible ductwork, return air plenums, supply registers, air handler coils, and blower components. Findings are documented in the attached inspection report. Scope of HVAC cleaning or replacement is based on the degree of contamination found and is consistent with NADCA (National Air Duct Cleaners Association) ACR standards for fire/smoke-affected HVAC systems.`,
  },
]

async function seed() {
  console.log(`Seeding ${entries.length} F9 library entries…`)

  for (const entry of entries) {
    const { data, error } = await supabase
      .from('cf_f9_library')
      .insert(entry)
      .select('id, item_name')
      .single()

    if (error) {
      console.error(`  ✗ Failed: ${entry.item_name} — ${error.message}`)
    } else {
      console.log(`  ✓ Seeded: ${data.item_name} (${data.id})`)
    }
  }

  console.log('\nDone!')
}

seed().catch((e) => {
  console.error('Seed script failed:', e)
  process.exit(1)
})

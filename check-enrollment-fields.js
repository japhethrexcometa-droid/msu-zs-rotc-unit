// Script to check enrollment request field values in Supabase
// Run with: node check-enrollment-fields.js

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env file manually
const envContent = readFileSync('.env', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEnrollmentFields() {
  console.log('Fetching enrollment requests...')
  
  const { data, error } = await supabase
    .from('enrollment_requests')
    .select('*')
    .limit(5)
  
  if (error) {
    console.error('Error fetching data:', error)
    process.exit(1)
  }
  
  if (!data || data.length === 0) {
    console.log('No enrollment requests found')
    process.exit(0)
  }
  
  console.log(`\nFound ${data.length} sample records\n`)
  
  const criticalFields = [
    'religion',
    'blood_type', 
    'height_feet',
    'beneficiary_name',
    'beneficiary_relationship',
    'emergency_name',
    'emergency_relationship',
    'emergency_contact'
  ]
  
  data.forEach((record, index) => {
    console.log(`\n--- Record ${index + 1} (ID: ${record.id_number}) ---`)
    console.log(`Status: ${record.status}`)
    console.log(`School: ${record.school}`)
    console.log('\nCritical Fields:')
    
    criticalFields.forEach(field => {
      const value = record[field]
      const hasValue = value !== null && value !== undefined && value !== ''
      console.log(`  ${field}: ${hasValue ? `"${value}"` : 'NULL/EMPTY'}`)
    })
  })
  
  // Summary statistics
  console.log('\n\n=== SUMMARY ===')
  console.log(`Total records checked: ${data.length}`)
  
  criticalFields.forEach(field => {
    const withValues = data.filter(r => r[field] !== null && r[field] !== undefined && r[field] !== '').length
    const percentage = ((withValues / data.length) * 100).toFixed(1)
    console.log(`${field}: ${withValues}/${data.length} (${percentage}%) have values`)
  })
}

checkEnrollmentFields().catch(console.error)

import { extractDateFromTitle } from './date-from-title'

async function testSpecificTitle() {
  const title = "Log 2025-01-12 at 8.07 PM #2"

  console.log(`Testing title: "${title}"`)

  try {
    const result = await extractDateFromTitle(title)
    console.log('Result:', JSON.stringify(result, null, 2))

    if (result.date) {
      console.log(`✅ Success! Extracted date: ${result.date.toISOString().split('T')[0]}`)
      console.log(`Confidence: ${result.confidence}`)
    } else {
      console.log('❌ Failed to extract date')
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
  }
}

testSpecificTitle().catch(console.error)

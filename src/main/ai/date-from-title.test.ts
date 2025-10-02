import { extractDateFromTitle } from './date-from-title'

async function testSpecificTitle() {
  const title = 'Log 2025-01-12 at 8.07 PM #2'

  console.log(`Testing title: "${title}"`)

  try {
    const result = await extractDateFromTitle(title)
    console.log('Result:', JSON.stringify(result, null, 2))

    if ('error' in result) {
      console.log('❌ Error:', result.error)
    } else {
      console.log(
        `✅ Success! Extracted date: ${result.year}-${result.month.toString().padStart(2, '0')}-${result.day.toString().padStart(2, '0')}`,
      )
      console.log(`Confidence: ${result.confidence}`)
      console.log(
        `Time: ${result.hour.toString().padStart(2, '0')}:${result.minute.toString().padStart(2, '0')}`,
      )
    }
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}

testSpecificTitle().catch(console.error)

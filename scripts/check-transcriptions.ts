/**
 * Script to identify items in data.json with missing or incomplete transcriptions.
 *
 * This script checks for:
 * 1. Items with no transcription at all
 * 2. Items with transcription.status !== 'completed'
 * 3. Items where transcription.result.duration < log.duration (incomplete transcription)
 *
 * Usage: bun run scripts/check-transcriptions.ts [--remove]
 */

import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { State, Log, TranscriptionState } from '../shared-types'

// Path to data.json
const DATA_JSON_PATH = join(
  homedir(),
  'Library',
  'Application Support',
  'yap-camera',
  'data.json',
)

// Tolerance for duration comparison (in seconds)
// If transcription duration is within this tolerance of video duration, consider it complete
const DURATION_TOLERANCE = 30

interface MissingTranscription {
  id: string
  name: string
  path: string
  videoDuration: string
  reason: string
}

interface IncompleteTranscription {
  id: string
  name: string
  path: string
  videoDuration: string
  transcriptionDuration: string
  durationDiff?: string
  missingSeconds?: string
  reason?: string
}

interface ErrorTranscription {
  id: string
  name: string
  path: string
  videoDuration: string
  error: string
}

interface CompleteTranscription {
  id: string
  name: string
  path: string
  videoDuration: string
  transcriptionDuration: string
  note?: string
}

interface CheckResults {
  summary: {
    total: number
    complete: number
    missing: number
    incomplete: number
    errors: number
  }
  missingTranscriptions: MissingTranscription[]
  incompleteTranscriptions: IncompleteTranscription[]
  errorTranscriptions: ErrorTranscription[]
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds || !isFinite(seconds)) {
    return 'N/A'
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}m ${secs}s`
}

function checkTranscriptions(): {
  incompleteTranscriptions: IncompleteTranscription[]
  errorTranscriptions: ErrorTranscription[]
  data: State
} {
  console.log('Checking transcriptions in data.json...\n')
  console.log(`Data file: ${DATA_JSON_PATH}\n`)

  // Check if file exists
  if (!existsSync(DATA_JSON_PATH)) {
    console.error(`Error: data.json not found at ${DATA_JSON_PATH}`)
    process.exit(1)
  }

  // Read and parse data.json
  let data: State
  try {
    const fileContent = readFileSync(DATA_JSON_PATH, 'utf-8')
    data = JSON.parse(fileContent) as State
  } catch (error) {
    const err = error as Error
    console.error(`Error reading or parsing data.json: ${err.message}`)
    process.exit(1)
  }

  const logs = data.logs || {}
  const logIds = Object.keys(logs)

  if (logIds.length === 0) {
    console.log('No logs found in data.json')
    process.exit(0)
  }

  console.log(`Found ${logIds.length} log(s) to check\n`)

  const missingTranscriptions: MissingTranscription[] = []
  const incompleteTranscriptions: IncompleteTranscription[] = []
  const errorTranscriptions: ErrorTranscription[] = []
  const completeTranscriptions: CompleteTranscription[] = []

  for (const logId of logIds) {
    const log = logs[logId] as Log
    const videoDuration = log.duration
    const transcription = log.transcription

    // Check if transcription is missing
    if (!transcription) {
      missingTranscriptions.push({
        id: logId,
        name: log.name || 'Unknown',
        path: log.path,
        videoDuration: formatDuration(videoDuration),
        reason: 'No transcription field',
      })
      continue
    }

    // Check transcription status
    if (transcription.status === 'error') {
      errorTranscriptions.push({
        id: logId,
        name: log.name || 'Unknown',
        path: log.path,
        videoDuration: formatDuration(videoDuration),
        error: transcription.error || 'Unknown error',
      })
      continue
    }

    if (transcription.status !== 'completed') {
      missingTranscriptions.push({
        id: logId,
        name: log.name || 'Unknown',
        path: log.path,
        videoDuration: formatDuration(videoDuration),
        reason: `Status: ${transcription.status || 'unknown'}`,
      })
      continue
    }

    // Check if result exists
    if (!transcription.result) {
      missingTranscriptions.push({
        id: logId,
        name: log.name || 'Unknown',
        path: log.path,
        videoDuration: formatDuration(videoDuration),
        reason: 'Status is completed but no result field',
      })
      continue
    }

    const transcriptionDuration = transcription.result.duration

    // Check if transcription duration is available
    if (!transcriptionDuration || !isFinite(transcriptionDuration)) {
      incompleteTranscriptions.push({
        id: logId,
        name: log.name || 'Unknown',
        path: log.path,
        videoDuration: formatDuration(videoDuration),
        transcriptionDuration: 'N/A',
        reason: 'Transcription duration is missing or invalid',
      })
      continue
    }

    // Check if video duration is available for comparison
    if (!videoDuration || !isFinite(videoDuration)) {
      // Can't compare, but transcription exists
      completeTranscriptions.push({
        id: logId,
        name: log.name || 'Unknown',
        path: log.path,
        videoDuration: 'N/A',
        transcriptionDuration: formatDuration(transcriptionDuration),
        note: 'Video duration not available for comparison',
      })
      continue
    }

    // Compare durations
    const durationDiff = videoDuration - transcriptionDuration
    if (durationDiff > DURATION_TOLERANCE) {
      incompleteTranscriptions.push({
        id: logId,
        name: log.name || 'Unknown',
        path: log.path,
        videoDuration: formatDuration(videoDuration),
        transcriptionDuration: formatDuration(transcriptionDuration),
        durationDiff: formatDuration(durationDiff),
        missingSeconds: durationDiff.toFixed(1),
      })
    } else {
      completeTranscriptions.push({
        id: logId,
        name: log.name || 'Unknown',
        path: log.path,
        videoDuration: formatDuration(videoDuration),
        transcriptionDuration: formatDuration(transcriptionDuration),
      })
    }
  }

  // Print summary
  console.log('='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log(`Total logs: ${logIds.length}`)
  console.log(`Complete transcriptions: ${completeTranscriptions.length}`)
  console.log(`Missing transcriptions: ${missingTranscriptions.length}`)
  console.log(`Incomplete transcriptions: ${incompleteTranscriptions.length}`)
  console.log(`Error transcriptions: ${errorTranscriptions.length}`)
  console.log('')

  // Print missing transcriptions
  if (missingTranscriptions.length > 0) {
    console.log('='.repeat(80))
    console.log('MISSING TRANSCRIPTIONS')
    console.log('='.repeat(80))
    missingTranscriptions.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name}`)
      console.log(`   ID: ${item.id}`)
      console.log(`   Path: ${item.path}`)
      console.log(`   Video Duration: ${item.videoDuration}`)
      console.log(`   Reason: ${item.reason}`)
    })
    console.log('')
  }

  // Print incomplete transcriptions
  if (incompleteTranscriptions.length > 0) {
    console.log('='.repeat(80))
    console.log('INCOMPLETE TRANSCRIPTIONS (transcription shorter than video)')
    console.log('='.repeat(80))
    incompleteTranscriptions.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name}`)
      console.log(`   ID: ${item.id}`)
      console.log(`   Path: ${item.path}`)
      console.log(`   Video Duration: ${item.videoDuration}`)
      console.log(`   Transcription Duration: ${item.transcriptionDuration}`)
      if (item.durationDiff) {
        console.log(
          `   Missing: ${item.missingSeconds} seconds (${item.durationDiff})`,
        )
      } else {
        console.log(`   Reason: ${item.reason}`)
      }
    })
    console.log('')
  }

  // Print error transcriptions
  if (errorTranscriptions.length > 0) {
    console.log('='.repeat(80))
    console.log('TRANSCRIPTIONS WITH ERRORS')
    console.log('='.repeat(80))
    errorTranscriptions.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name}`)
      console.log(`   ID: ${item.id}`)
      console.log(`   Path: ${item.path}`)
      console.log(`   Video Duration: ${item.videoDuration}`)
      console.log(`   Error: ${item.error}`)
    })
    console.log('')
  }

  // Print complete transcriptions count (optional, can be verbose)
  if (completeTranscriptions.length > 0 && process.argv.includes('--verbose')) {
    console.log('='.repeat(80))
    console.log('COMPLETE TRANSCRIPTIONS')
    console.log('='.repeat(80))
    completeTranscriptions.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name}`)
      console.log(`   ID: ${item.id}`)
      console.log(`   Video Duration: ${item.videoDuration}`)
      console.log(`   Transcription Duration: ${item.transcriptionDuration}`)
      if (item.note) {
        console.log(`   Note: ${item.note}`)
      }
    })
    console.log('')
  }

  // Export results to JSON file
  const results: CheckResults = {
    summary: {
      total: logIds.length,
      complete: completeTranscriptions.length,
      missing: missingTranscriptions.length,
      incomplete: incompleteTranscriptions.length,
      errors: errorTranscriptions.length,
    },
    missingTranscriptions,
    incompleteTranscriptions,
    errorTranscriptions,
  }

  const outputPath = join(process.cwd(), 'transcription-check-results.json')
  writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\nDetailed results saved to: ${outputPath}`)

  return {
    incompleteTranscriptions,
    errorTranscriptions,
    data,
  }
}

function removeIncompleteTranscriptions(): void {
  console.log('Removing incomplete transcriptions from data.json...\n')
  console.log(`Data file: ${DATA_JSON_PATH}\n`)

  // Check if file exists
  if (!existsSync(DATA_JSON_PATH)) {
    console.error(`Error: data.json not found at ${DATA_JSON_PATH}`)
    process.exit(1)
  }

  // Create backup
  const backupPath = `${DATA_JSON_PATH}.backup.${Date.now()}`
  console.log(`Creating backup: ${backupPath}`)
  copyFileSync(DATA_JSON_PATH, backupPath)
  console.log('Backup created successfully.\n')

  // Read and parse data.json
  let data: State
  try {
    const fileContent = readFileSync(DATA_JSON_PATH, 'utf-8')
    data = JSON.parse(fileContent) as State
  } catch (error) {
    const err = error as Error
    console.error(`Error reading or parsing data.json: ${err.message}`)
    process.exit(1)
  }

  const logs = data.logs || {}
  const logIds = Object.keys(logs)
  let removedCount = 0
  const removedItems: Array<{ id: string; name: string; reason: string }> = []

  for (const logId of logIds) {
    const log = logs[logId] as Log
    const videoDuration = log.duration
    const transcription = log.transcription

    if (!transcription) {
      continue // No transcription to remove
    }

    let shouldRemove = false
    let reason = ''

    // Check if it's an error transcription
    if (transcription.status === 'error') {
      shouldRemove = true
      reason = 'error status'
    }
    // Check if it's incomplete (status completed but duration mismatch)
    else if (transcription.status === 'completed' && transcription.result) {
      const transcriptionDuration = transcription.result.duration

      if (!transcriptionDuration || !isFinite(transcriptionDuration)) {
        shouldRemove = true
        reason = 'invalid transcription duration'
      } else if (videoDuration && isFinite(videoDuration)) {
        const durationDiff = videoDuration - transcriptionDuration
        if (durationDiff > DURATION_TOLERANCE) {
          shouldRemove = true
          reason = `incomplete (missing ${durationDiff.toFixed(1)}s)`
        }
      }
    }

    if (shouldRemove) {
      delete log.transcription
      removedCount++
      removedItems.push({
        id: logId,
        name: log.name || 'Unknown',
        reason,
      })
    }
  }

  // Write modified data back
  try {
    writeFileSync(DATA_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`\nRemoved transcriptions from ${removedCount} item(s):\n`)
    removedItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (${item.reason})`)
    })
    console.log(`\nModified data.json saved successfully.`)
    console.log(`Backup saved to: ${backupPath}`)
  } catch (error) {
    const err = error as Error
    console.error(`Error writing data.json: ${err.message}`)
    console.error(`Backup is available at: ${backupPath}`)
    process.exit(1)
  }
}

// Check if --remove flag is provided
if (process.argv.includes('--remove')) {
  removeIncompleteTranscriptions()
} else {
  // Run the check
  checkTranscriptions()
}

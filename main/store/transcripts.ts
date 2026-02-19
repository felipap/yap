import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { TranscriptionState } from '../../shared-types'
import { store } from './index'

function transcriptionsDir(): string {
  return join(dirname(store.path), 'transcriptions')
}

function summariesDir(): string {
  return join(dirname(store.path), 'summaries')
}

function transcriptionPath(logId: string): string {
  return join(transcriptionsDir(), `${logId}.json`)
}

function summaryPath(logId: string): string {
  return join(summariesDir(), `${logId}.txt`)
}

export async function getTranscriptionData(
  logId: string,
): Promise<TranscriptionState | null> {
  try {
    const raw = await readFile(transcriptionPath(logId), 'utf-8')
    return JSON.parse(raw) as TranscriptionState
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      return null
    }
    throw err
  }
}

export async function setTranscriptionData(
  logId: string,
  data: TranscriptionState,
): Promise<void> {
  await mkdir(transcriptionsDir(), { recursive: true })
  await writeFile(transcriptionPath(logId), JSON.stringify(data), 'utf-8')
}

export async function getSummaryData(logId: string): Promise<string | null> {
  try {
    return await readFile(summaryPath(logId), 'utf-8')
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      return null
    }
    throw err
  }
}

export async function setSummaryData(
  logId: string,
  summary: string,
): Promise<void> {
  await mkdir(summariesDir(), { recursive: true })
  await writeFile(summaryPath(logId), summary, 'utf-8')
}

export async function deleteSidecarData(logId: string): Promise<void> {
  try {
    await rm(transcriptionPath(logId))
  } catch (err: unknown) {
    if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) {
      throw err
    }
  }
  try {
    await rm(summaryPath(logId))
  } catch (err: unknown) {
    if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) {
      throw err
    }
  }
}

export async function copySidecarData(
  fromLogId: string,
  toLogId: string,
): Promise<void> {
  const transcription = await getTranscriptionData(fromLogId)
  if (transcription) {
    await setTranscriptionData(toLogId, transcription)
  }
  const summary = await getSummaryData(fromLogId)
  if (summary) {
    await setSummaryData(toLogId, summary)
  }
}

/**
 * One-time migration: extracts transcription and summary fields from logs
 * in data.json into individual sidecar files, then strips them from the store.
 */
export async function migrateTranscriptsFromStore(): Promise<void> {
  const logs = store.get('logs') || {}
  let migrated = 0

  for (const [logId, log] of Object.entries(logs)) {
    const rawLog = log as unknown as Record<string, unknown>
    let changed = false

    if (rawLog.transcription) {
      await setTranscriptionData(logId, rawLog.transcription as TranscriptionState)
      delete rawLog.transcription
      changed = true
    }

    if (typeof rawLog.summary === 'string' && rawLog.summary.length > 0) {
      await setSummaryData(logId, rawLog.summary as string)
      delete rawLog.summary
      changed = true
    }

    if (changed) {
      migrated++
    }
  }

  if (migrated > 0) {
    store.set('logs', logs)
    console.log(`Migrated transcripts/summaries for ${migrated} logs to sidecar files`)
  }
}

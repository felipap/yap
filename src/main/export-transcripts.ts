import { BrowserWindow, dialog } from 'electron'
import { writeFile } from 'fs/promises'
import { Log, TranscriptionState } from '../shared-types'
import { getAllLogs } from './store'
import { getTranscriptionData } from './store/transcripts'

function formatDatePretty(date: Date): string {
  const day = date.getDate()
  const suffix = getOrdinalSuffix(day)
  const month = date.toLocaleString('en-US', { month: 'long' })
  const year = date.getFullYear()
  const time = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return `${month} ${day}${suffix}, ${year} ${time}`
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th'
  }

  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

function formatTranscriptText(text: string): string {
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  return paragraphs.join('\n\n')
}

function formatLogEntry(log: Log, transcription: TranscriptionState | null): string {
  const date = new Date(log.timestamp)
  const dateStr = formatDatePretty(date)

  const parts: string[] = [dateStr]

  if (log.title) {
    parts.push(log.title)
  }

  const transcriptText = transcription?.result?.text
  if (transcriptText) {
    parts.push('')
    parts.push(formatTranscriptText(transcriptText))
  }

  return parts.join('\n')
}

export async function exportTranscripts(window: BrowserWindow): Promise<void> {
  const monthsResult = await dialog.showMessageBox(window, {
    type: 'question',
    buttons: ['Cancel', '1 month', '3 months', '6 months', '12 months', 'All'],
    defaultId: 3,
    cancelId: 0,
    title: 'Export Transcripts',
    message: 'How many months of transcripts do you want to export?',
  })

  if (monthsResult.response === 0) {
    return
  }

  const monthsMap: Record<number, number | null> = {
    1: 1,
    2: 3,
    3: 6,
    4: 12,
    5: null,
  }
  const monthsToExport = monthsMap[monthsResult.response]

  const now = new Date()
  let cutoffDate: Date | null = null
  if (monthsToExport !== null) {
    cutoffDate = new Date(now)
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToExport)
  }

  const allLogs = getAllLogs()
  let candidateLogs = Object.values(allLogs)

  if (cutoffDate) {
    candidateLogs = candidateLogs.filter((log) => {
      const logDate = new Date(log.timestamp)
      return logDate >= cutoffDate
    })
  }

  const logsWithTranscripts: { log: Log; transcription: TranscriptionState }[] = []
  for (const log of candidateLogs) {
    const transcription = await getTranscriptionData(log.id)
    if (transcription?.result?.text) {
      logsWithTranscripts.push({ log, transcription })
    }
  }

  logsWithTranscripts.sort((a, b) => {
    const dateA = new Date(a.log.timestamp)
    const dateB = new Date(b.log.timestamp)
    return dateA.getTime() - dateB.getTime()
  })

  if (logsWithTranscripts.length === 0) {
    await dialog.showMessageBox(window, {
      type: 'info',
      buttons: ['OK'],
      title: 'No Transcripts',
      message: 'No transcripts found in the selected time range.',
    })
    return
  }

  const saveResult = await dialog.showSaveDialog(window, {
    title: 'Save Transcripts',
    defaultPath: `transcripts-export.txt`,
    filters: [{ name: 'Text Files', extensions: ['txt'] }],
  })

  if (saveResult.canceled || !saveResult.filePath) {
    return
  }

  const separator = '='.repeat(80) + '\n' + '='.repeat(80)
  const entries = logsWithTranscripts.map(({ log, transcription }) =>
    formatLogEntry(log, transcription),
  )
  const content = entries.join('\n\n' + separator + '\n\n')

  await writeFile(saveResult.filePath, content, 'utf-8')

  await dialog.showMessageBox(window, {
    type: 'info',
    buttons: ['OK'],
    title: 'Export Complete',
    message: `Exported ${logsWithTranscripts.length} transcript${logsWithTranscripts.length === 1 ? '' : 's'} successfully.`,
  })
}

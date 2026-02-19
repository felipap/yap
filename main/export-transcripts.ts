import { BrowserWindow, dialog } from 'electron'
import { writeFile } from 'fs/promises'
import { Log } from '../shared-types'
import { getAllLogs } from './store'

function formatDatePretty(date: Date): string {
  const day = date.getDate()
  const suffix = getOrdinalSuffix(day)

  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }

  const formatted = date.toLocaleString('en-US', options)
  const [monthYear, time] = formatted.split(' at ')
  const [month, year] = monthYear.split(', ')

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

function formatLogEntry(log: Log): string {
  const date = new Date(log.timestamp)
  const dateStr = formatDatePretty(date)

  const parts: string[] = [dateStr]

  if (log.title) {
    parts.push(log.title)
  }

  const transcriptText = log.transcription?.result?.text
  if (transcriptText) {
    parts.push('')
    parts.push(formatTranscriptText(transcriptText))
  }

  return parts.join('\n')
}

export async function exportTranscripts(window: BrowserWindow): Promise<void> {
  const monthsResult = await dialog.showMessageBox(window, {
    type: 'question',
    buttons: ['Cancel', '1 Month', '3 Months', '6 Months', '12 Months', 'All'],
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
  let logsWithTranscripts = Object.values(allLogs).filter((log) => {
    const hasTranscript = log.transcription?.result?.text
    if (!hasTranscript) {
      return false
    }

    if (cutoffDate) {
      const logDate = new Date(log.timestamp)
      return logDate >= cutoffDate
    }

    return true
  })

  logsWithTranscripts.sort((a, b) => {
    const dateA = new Date(a.timestamp)
    const dateB = new Date(b.timestamp)
    return dateB.getTime() - dateA.getTime()
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
  const entries = logsWithTranscripts.map(formatLogEntry)
  const content = entries.join('\n\n' + separator + '\n\n')

  await writeFile(saveResult.filePath, content, 'utf-8')

  await dialog.showMessageBox(window, {
    type: 'info',
    buttons: ['OK'],
    title: 'Export Complete',
    message: `Exported ${logsWithTranscripts.length} transcript${logsWithTranscripts.length === 1 ? '' : 's'} successfully.`,
  })
}

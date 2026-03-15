import { createHash } from 'crypto'
import { Log, State } from '../../shared-types'
import { store } from './index'
import { deleteSidecarData } from './transcripts'

export function generateLogId(filePath: string): string {
  return createHash('sha256').update(filePath).digest('hex').substring(0, 16)
}

type LogChangeListener = (logId: string) => void
const logChangeListeners: LogChangeListener[] = []

export function onLogChange(listener: LogChangeListener): void {
  logChangeListeners.push(listener)
}

function notifyLogChange(logId: string): void {
  for (const listener of logChangeListeners) {
    listener(logId)
  }
}

export function getLog(logId: string): Log | null {
  const log = store.get(`logs.${logId}` as keyof State) as Log | undefined
  return log || null
}

export function appendLog(log: Log): Log {
  store.set(`logs.${log.id}` as keyof State, log)
  notifyLogChange(log.id)
  return log
}

export function setLog(log: Log): void {
  store.set(`logs.${log.id}` as keyof State, log)
  notifyLogChange(log.id)
}

export function updateLog(logId: string, updates: Partial<Log>): void {
  const existing = store.get(`logs.${logId}` as keyof State) as Log | undefined

  if (
    !existing ||
    !existing.id ||
    !existing.name ||
    !existing.path ||
    !existing.timestamp
  ) {
    console.warn(
      `Cannot update log ${logId}: log does not exist or is missing required fields`,
    )
    return
  }

  store.set(`logs.${logId}` as keyof State, { ...existing, ...updates })
  notifyLogChange(logId)
}

export function deleteLog(logId: string): void {
  const logs = store.get('logs') || {}
  delete logs[logId]
  store.set('logs', logs)
  notifyLogChange(logId)

  deleteSidecarData(logId).catch((err) =>
    console.warn(`Failed to delete sidecar data for ${logId}:`, err),
  )
}

export function getAllLogs(): Record<string, Log> {
  return store.get('logs') || {}
}

import { getDefaultRecordingsDir } from '../lib/config'
import { store } from './index'

export function getActiveRecordingsDir(): string {
  const customFolder = store.get('recordingsFolder')
  return customFolder || getDefaultRecordingsDir()
}






import { DEBUG } from './config'

export function debug(message: string, ...args: any[]) {
  if (DEBUG) {
    console.debug(message, ...args)
  }
}

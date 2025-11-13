// Utilities for using `ffmpeg`

import { spawn } from 'child_process'
import { access } from 'fs/promises'
import { constants } from 'fs'

let cachedFfmpegPath: string | null = null

/**
 * Find the FFmpeg binary path by checking common installation locations
 * This handles the case where packaged apps don't inherit the shell's PATH
 */
export async function findFFmpegPath(): Promise<string | null> {
  if (cachedFfmpegPath) {
    return cachedFfmpegPath
  }

  const commonPaths = [
    '/opt/homebrew/bin/ffmpeg', // Homebrew on Apple Silicon
    '/usr/local/bin/ffmpeg', // Homebrew on Intel Mac
    '/usr/bin/ffmpeg', // System installation
  ]

  for (const path of commonPaths) {
    try {
      await access(path, constants.X_OK)
      cachedFfmpegPath = path
      return path
    } catch {
      // Continue to next path
    }
  }

  // If not found in common paths, try to use 'which' command
  // with proper PATH environment variable
  return new Promise((resolve) => {
    const which = spawn('which', ['ffmpeg'], {
      env: {
        ...process.env,
        PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin:/usr/bin`,
      },
    })
    let output = ''

    which.stdout.on('data', (data) => {
      output += data.toString().trim()
    })

    which.on('close', (code) => {
      if (code === 0 && output) {
        cachedFfmpegPath = output
        resolve(output)
      } else {
        resolve(null)
      }
    })

    which.on('error', () => resolve(null))
  })
}

/**
 * Get environment variables with proper PATH for ffmpeg
 * Use this when spawning ffmpeg processes
 */
export function getFFmpegEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin:/usr/bin`,
  }
}

/**
 * Check if FFmpeg is available on the system
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  const ffmpegPath = await findFFmpegPath()
  if (!ffmpegPath) {
    return false
  }

  return new Promise((resolve) => {
    const ffmpeg = spawn(ffmpegPath, ['-version'], {
      env: getFFmpegEnv(),
    })
    ffmpeg.on('error', () => resolve(false))
    ffmpeg.on('close', (code) => resolve(code === 0))
  })
}

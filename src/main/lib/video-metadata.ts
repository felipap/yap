import { spawn } from 'child_process'

interface VideoMetadata {
  creationDate: Date | null
}

/**
 * Detects if a filename follows the iPhone video naming pattern (IMG_XXXX.MOV)
 */
export function isIPhoneVideoFilename(filename: string): boolean {
  const pattern = /^IMG_\d{4}\.MOV$/i
  return pattern.test(filename)
}

/**
 * Extracts metadata from a video file using ffprobe
 */
export async function extractVideoMetadata(
  videoPath: string,
): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_entries',
      'format_tags=creation_time',
      videoPath,
    ]

    const ffprobe = spawn('ffprobe', args)
    let output = ''
    let errorOutput = ''

    ffprobe.stdout.on('data', (data) => {
      output += data.toString()
    })

    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed with code ${code}: ${errorOutput}`))
        return
      }

      try {
        const data = JSON.parse(output)
        const creationTime =
          data?.format?.tags?.creation_time || data?.format?.tags?.CREATION_TIME

        if (creationTime) {
          const date = new Date(creationTime)
          if (!isNaN(date.getTime())) {
            resolve({ creationDate: date })
            return
          }
        }

        resolve({ creationDate: null })
      } catch (parseError) {
        reject(
          new Error(
            `Failed to parse ffprobe output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          ),
        )
      }
    })

    ffprobe.on('error', (error) => {
      reject(new Error(`Failed to start ffprobe: ${error.message}`))
    })
  })
}

/**
 * Formats a date for display in readable format
 */
export function formatDateForPrompt(date: Date): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * Parses a date string from format YYYY-MM-DD HH:MM
 */
export function parseDateFromPrompt(dateString: string): Date | null {
  // Try parsing as ISO format first
  const isoDate = new Date(dateString.replace(' ', 'T'))
  if (!isNaN(isoDate.getTime())) {
    return isoDate
  }

  // Try parsing manually
  const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/)
  if (match) {
    const [, year, month, day, hours, minutes] = match
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
    )
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  return null
}

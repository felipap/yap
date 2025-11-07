import { spawn } from 'child_process'
import { unlink, access, open } from 'fs/promises'
import { constants } from 'fs'

// Helper function to check if a file is actually readable (not just a cloud placeholder)
async function isFileActuallyReadable(filePath: string): Promise<boolean> {
  // Check for cloud storage paths
  const isCloudPath = filePath.includes('/CloudStorage/') ||
                      filePath.includes('/Google Drive/') ||
                      filePath.includes('/Dropbox/') ||
                      filePath.includes('/OneDrive/')

  if (isCloudPath) {
    console.log('Detected cloud storage path, performing read test:', filePath)
  }

  try {
    // Try to actually open and read the first few KB of the file with a timeout
    // This will fail if the file is just a cloud placeholder or takes too long to fetch
    const readPromise = (async () => {
      const fileHandle = await open(filePath, 'r')
      try {
        const buffer = Buffer.allocUnsafe(8192) // Try to read 8KB
        const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, 0)

        if (bytesRead === 0) {
          console.log('File exists but has no content:', filePath)
          return false
        }

        return true
      } finally {
        await fileHandle.close()
      }
    })()

    // Add a 2-second timeout for the read operation
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        console.log('File read test timed out after 2s:', filePath)
        resolve(false)
      }, 2000)
    })

    return await Promise.race([readPromise, timeoutPromise])
  } catch (error) {
    console.log('File read test failed:', filePath, error)
    return false
  }
}

export class VideoConverter {
  private static ffmpegPath: string | null = null

  /**
   * Find the FFmpeg binary path by checking common installation locations
   */
  private static async findFFmpegPath(): Promise<string | null> {
    if (this.ffmpegPath) {
      return this.ffmpegPath
    }

    const commonPaths = [
      '/opt/homebrew/bin/ffmpeg', // Homebrew on Apple Silicon
      '/usr/local/bin/ffmpeg', // Homebrew on Intel Mac
      '/usr/bin/ffmpeg', // System installation
    ]

    for (const path of commonPaths) {
      try {
        await access(path, constants.X_OK)
        this.ffmpegPath = path
        return path
      } catch {
        // Continue to next path
      }
    }

    // If not found in common paths, try to use 'which' command
    return new Promise((resolve) => {
      const which = spawn('which', ['ffmpeg'])
      let output = ''

      which.stdout.on('data', (data) => {
        output += data.toString().trim()
      })

      which.on('close', (code) => {
        if (code === 0 && output) {
          this.ffmpegPath = output
          resolve(output)
        } else {
          resolve(null)
        }
      })

      which.on('error', () => resolve(null))
    })
  }

  private static async isFFmpegAvailable(): Promise<boolean> {
    const ffmpegPath = await this.findFFmpegPath()
    if (!ffmpegPath) {
      return false
    }

    return new Promise((resolve) => {
      const ffmpeg = spawn(ffmpegPath, ['-version'])
      ffmpeg.on('error', () => resolve(false))
      ffmpeg.on('close', (code) => resolve(code === 0))
    })
  }

  static async convertWebMToMP4(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    // Check if source video file is actually readable
    const isReadable = await isFileActuallyReadable(inputPath)
    if (!isReadable) {
      throw new Error(
        `Cannot read video file for conversion: ${inputPath}. This file appears to be in cloud storage (Google Drive, Dropbox, etc.) and is not fully downloaded locally. Please ensure the file is available offline before processing.`,
      )
    }

    const ffmpegPath = await this.findFFmpegPath()

    if (!ffmpegPath) {
      throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
    }

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        '-i',
        inputPath,
        '-c:v',
        'libx264', // Use H.264 codec
        '-preset',
        'medium', // Balance speed and quality
        '-crf',
        '23', // Quality (lower = better, 23 is default)
        '-movflags',
        '+faststart', // Optimize for streaming
        '-y', // Overwrite output file
        outputPath,
      ])

      let errorOutput = ''

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          try {
            // Remove the original WebM file after successful conversion
            await unlink(inputPath)
            resolve()
          } catch (error) {
            console.warn('Failed to delete original WebM file:', error)
            resolve() // Still resolve as conversion was successful
          }
        } else {
          reject(new Error(`FFmpeg conversion failed: ${errorOutput}`))
        }
      })

      ffmpeg.on('error', (error) => {
        reject(new Error(`Failed to start FFmpeg: ${error.message}`))
      })
    })
  }

  /**
   * Convert WebM to MP4 without deleting the original file
   * Uses hardware acceleration on macOS via h264_videotoolbox
   */
  static async convertToMP4(
    inputPath: string,
    outputPath: string,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    // Check if source video file is actually readable
    const isReadable = await isFileActuallyReadable(inputPath)
    if (!isReadable) {
      throw new Error(
        `Cannot read video file for conversion: ${inputPath}. This file appears to be in cloud storage (Google Drive, Dropbox, etc.) and is not fully downloaded locally. Please ensure the file is available offline before processing.`,
      )
    }

    const ffmpegPath = await this.findFFmpegPath()

    if (!ffmpegPath) {
      throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
    }

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        '-i',
        inputPath,
        '-c:v',
        'h264_videotoolbox', // Use hardware acceleration on macOS
        '-b:v',
        '6000K', // Video bitrate
        '-c:a',
        'aac', // Audio codec
        '-y', // Overwrite output file
        '-progress',
        'pipe:1', // Output progress to stdout
        outputPath,
      ])

      let errorOutput = ''
      let duration = 0
      let lastReportedProgress = 0

      ffmpeg.stdout.on('data', (data) => {
        const output = data.toString()
        console.log('[FFMPEG STDOUT RAW]:', JSON.stringify(output))

        // Parse progress (time processed) from -progress output
        // Try multiple possible formats
        let timeMatch = output.match(/out_time_us=(\d+)/)
        if (!timeMatch) {
          timeMatch = output.match(/out_time_ms=(\d+)/)
        }
        if (!timeMatch) {
          timeMatch = output.match(/out_time=(\d+)/)
        }

        if (timeMatch) {
          console.log('[MATCH FOUND]:', timeMatch[0], 'duration:', duration)
          if (duration > 0) {
            // Determine the unit based on which pattern matched
            let timeProcessed: number
            if (output.includes('out_time_us=')) {
              timeProcessed = parseInt(timeMatch[1]) / 1000000 // microseconds to seconds
            } else if (output.includes('out_time_ms=')) {
              timeProcessed = parseInt(timeMatch[1]) / 1000000 // still microseconds, just different name
            } else {
              timeProcessed = parseInt(timeMatch[1]) / 1000000 // assume microseconds
            }

            const progress = Math.min(
              Math.round((timeProcessed / duration) * 100),
              100,
            )
            console.log(
              `[PROGRESS] ${progress}% (${timeProcessed.toFixed(1)}s / ${duration}s)`,
            )
            // Only report progress if it has increased
            if (onProgress && progress > lastReportedProgress) {
              lastReportedProgress = progress
              console.log(`[REPORTING PROGRESS] ${progress}%`)
              onProgress(progress)
            }
          } else {
            console.log('[PROGRESS WAITING] Duration not yet detected')
          }
        }
      })

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString()
        errorOutput += output

        // Only log stderr lines that contain Duration or time= to avoid spam
        if (output.includes('Duration:') || output.includes('time=')) {
          console.log('[FFMPEG STDERR]:', output.trim())
        }

        // Parse duration from stderr (ffmpeg outputs metadata here)
        if (duration === 0) {
          const durationMatch = output.match(
            /Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/,
          )
          if (durationMatch) {
            const hours = parseInt(durationMatch[1])
            const minutes = parseInt(durationMatch[2])
            const seconds = parseInt(durationMatch[3])
            duration = hours * 3600 + minutes * 60 + seconds
            console.log(`[DURATION DETECTED] ${duration} seconds`)
            // Report 0% progress once we have duration
            if (onProgress) {
              console.log('[REPORTING] 0% progress')
              onProgress(0)
            }
          }
        }

        // Also parse time from stderr as backup (format: time=00:01:23.45)
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
        if (timeMatch && duration > 0) {
          const hours = parseInt(timeMatch[1])
          const minutes = parseInt(timeMatch[2])
          const seconds = parseInt(timeMatch[3])
          const timeProcessed = hours * 3600 + minutes * 60 + seconds
          const progress = Math.min(
            Math.round((timeProcessed / duration) * 100),
            100,
          )
          // Only report progress if it has increased
          if (onProgress && progress > lastReportedProgress) {
            lastReportedProgress = progress
            console.log(`[REPORTING PROGRESS FROM STDERR] ${progress}%`)
            onProgress(progress)
          }
        }
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          if (onProgress) {
            onProgress(100)
          }
          resolve()
        } else {
          reject(new Error(`FFmpeg conversion failed: ${errorOutput}`))
        }
      })

      ffmpeg.on('error', (error) => {
        reject(new Error(`Failed to start FFmpeg: ${error.message}`))
      })
    })
  }
}

import { spawn } from 'child_process'
import { findFFmpegPath, getFFmpegEnv } from './ffmpeg'
import { isFileActuallyReadable } from './file-utils'
import { moveToTrash } from './filesystem'

export class VideoConverter {
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

    const ffmpegPath = await findFFmpegPath()

    if (!ffmpegPath) {
      throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
    }

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(
        ffmpegPath,
        [
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
        ],
        {
          env: getFFmpegEnv(),
        },
      )

      let errorOutput = ''

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          try {
            await moveToTrash(inputPath)
            resolve()
          } catch (error) {
            console.warn('Failed to move original WebM file to trash:', error)
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

    const ffmpegPath = await findFFmpegPath()

    if (!ffmpegPath) {
      throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
    }

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(
        ffmpegPath,
        [
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
        ],
        {
          env: getFFmpegEnv(),
        },
      )

      let errorOutput = ''
      let duration = 0
      let lastReportedProgress = 0

      ffmpeg.stdout.on('data', (data) => {
        const output = data.toString()

        let timeMatch = output.match(/out_time_us=(\d+)/)
        if (!timeMatch) {
          timeMatch = output.match(/out_time_ms=(\d+)/)
        }
        if (!timeMatch) {
          timeMatch = output.match(/out_time=(\d+)/)
        }

        if (timeMatch && duration > 0) {
          let timeProcessed: number
          if (output.includes('out_time_us=')) {
            timeProcessed = parseInt(timeMatch[1]) / 1000000
          } else if (output.includes('out_time_ms=')) {
            timeProcessed = parseInt(timeMatch[1]) / 1000000
          } else {
            timeProcessed = parseInt(timeMatch[1]) / 1000000
          }

          const progress = Math.min(
            Math.round((timeProcessed / duration) * 100),
            100,
          )
          if (onProgress && progress > lastReportedProgress) {
            lastReportedProgress = progress
            onProgress(progress)
          }
        }
      })

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString()
        errorOutput += output

        if (duration === 0) {
          const durationMatch = output.match(
            /Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/,
          )
          if (durationMatch) {
            const hours = parseInt(durationMatch[1])
            const minutes = parseInt(durationMatch[2])
            const seconds = parseInt(durationMatch[3])
            duration = hours * 3600 + minutes * 60 + seconds
            if (onProgress) {
              onProgress(0)
            }
          }
        }

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
          if (onProgress && progress > lastReportedProgress) {
            lastReportedProgress = progress
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

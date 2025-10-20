import { spawn } from 'child_process'
import { unlink } from 'fs/promises'

export class VideoConverter {
  private static isFFmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version'])
      ffmpeg.on('error', () => resolve(false))
      ffmpeg.on('close', (code) => resolve(code === 0))
    })
  }

  static async convertWebMToMP4(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    const isAvailable = await this.isFFmpegAvailable()

    if (!isAvailable) {
      throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
    }

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
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
    const isAvailable = await this.isFFmpegAvailable()

    if (!isAvailable) {
      throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
    }

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
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

      ffmpeg.stdout.on('data', (data) => {
        const output = data.toString()

        // Parse duration from ffmpeg output
        const durationMatch = output.match(
          /Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/,
        )
        if (durationMatch) {
          const hours = parseInt(durationMatch[1])
          const minutes = parseInt(durationMatch[2])
          const seconds = parseInt(durationMatch[3])
          duration = hours * 3600 + minutes * 60 + seconds
        }

        // Parse progress (time processed)
        const timeMatch = output.match(/out_time_ms=(\d+)/)
        if (timeMatch && duration > 0) {
          const timeProcessed = parseInt(timeMatch[1]) / 1000000 // Convert microseconds to seconds
          const progress = Math.min(
            Math.round((timeProcessed / duration) * 100),
            100,
          )
          if (onProgress) {
            onProgress(progress)
          }
        }
      })

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString()
        errorOutput += output

        // Also try to parse duration from stderr (ffmpeg outputs info there)
        if (duration === 0) {
          const durationMatch = output.match(
            /Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/,
          )
          if (durationMatch) {
            const hours = parseInt(durationMatch[1])
            const minutes = parseInt(durationMatch[2])
            const seconds = parseInt(durationMatch[3])
            duration = hours * 3600 + minutes * 60 + seconds
          }
        }

        // Parse time from stderr as well
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
          if (onProgress) {
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

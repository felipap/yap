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

  static async convertWebMToMP4(inputPath: string, outputPath: string): Promise<void> {
    const isAvailable = await this.isFFmpegAvailable()

    if (!isAvailable) {
      throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
    }

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-c:v', 'libx264',        // Use H.264 codec
        '-preset', 'medium',       // Balance speed and quality
        '-crf', '23',              // Quality (lower = better, 23 is default)
        '-movflags', '+faststart', // Optimize for streaming
        '-y',                      // Overwrite output file
        outputPath
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
}

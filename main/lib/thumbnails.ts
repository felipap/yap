import { access, mkdir } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { createHash } from 'crypto'
import { getCacheDir } from './config'

const execAsync = promisify(exec)

// Cache directory for thumbnails
const CACHE_DIR = join(getCacheDir(), 'thumbnails')

// Cache directory initialization is handled by the centralized config

// Helper function to generate thumbnail for a video file
export async function generateThumbnail(
  videoPath: string,
): Promise<string | null> {
  try {
    // Ensure cache directory exists
    await mkdir(CACHE_DIR, { recursive: true })

    // Generate a unique filename based on video path hash
    const videoHash = createHash('sha256')
      .update(videoPath)
      .digest('hex')
      .substring(0, 16)
    const thumbnailPath = join(CACHE_DIR, `${videoHash}.jpg`)

    // Check if thumbnail already exists
    try {
      await access(thumbnailPath)
      return thumbnailPath
    } catch {
      // Thumbnail doesn't exist, generate it
    }

    // Try to use ffmpeg if available
    try {
      await execAsync(
        `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:180" -q:v 2 "${thumbnailPath}"`,
      )
      return thumbnailPath
    } catch (ffmpegError) {
      if (
        ffmpegError instanceof Error &&
        'stderr' in ffmpegError &&
        (ffmpegError.stderr as string).includes('command not found')
      ) {
        console.log('ffmpeg not available, trying alternative method')
      } else {
        console.log('FFmpeg failed for video:', videoPath)
        console.log('Error details:', ffmpegError)

        // Try with different ffmpeg options for corrupted files
        try {
          console.log('Trying ffmpeg with error recovery options...')
          await execAsync(
            `ffmpeg -err_detect ignore_err -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:180" -q:v 2 "${thumbnailPath}"`,
          )
          return thumbnailPath
        } catch (recoveryError) {
          console.log(
            'FFmpeg recovery also failed, trying alternative approach...',
          )
        }
      }
    }

    // Fallback: try different approaches for corrupted files
    try {
      // Try extracting from the very beginning (frame 0) which is more likely to work
      console.log('Trying to extract frame from beginning of video...')
      await execAsync(
        `ffmpeg -i "${videoPath}" -ss 00:00:00 -vframes 1 -vf "scale=320:180" -q:v 2 "${thumbnailPath}"`,
      )
      return thumbnailPath
    } catch (beginningError) {
      console.log(
        'Beginning frame extraction failed, trying with different codec options...',
      )

      // Try with different codec options
      try {
        await execAsync(
          `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:180" -c:v mjpeg -q:v 2 "${thumbnailPath}"`,
        )
        return thumbnailPath
      } catch (codecError) {
        console.log(
          'Codec-specific extraction failed, trying final fallback...',
        )

        // Final fallback: try without seeking (just take first frame)
        try {
          await execAsync(
            `ffmpeg -i "${videoPath}" -vframes 1 -vf "scale=320:180" -q:v 2 "${thumbnailPath}"`,
          )
          return thumbnailPath
        } catch (finalError) {
          console.log('All thumbnail generation methods failed for:', videoPath)
          console.log('Final error:', finalError)
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    return null
  }
}

// Helper function to get thumbnail path for a video file
export function getThumbnailPath(videoPath: string): string {
  const videoHash = createHash('sha256')
    .update(videoPath)
    .digest('hex')
    .substring(0, 16)
  return join(CACHE_DIR, `${videoHash}.jpg`)
}

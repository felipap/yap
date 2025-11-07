import { exec } from 'child_process'
import { createHash } from 'crypto'
import { access, mkdir, open } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'
import { getCacheDir } from './config'
import { debug } from './logger'

const execAsync = promisify(exec)

// Cache directory for thumbnails
const CACHE_DIR = join(getCacheDir(), 'thumbnails')

// Cache directory initialization is handled by the centralized config

// Helper function to check if a file is actually readable (not just a cloud placeholder)
async function isFileActuallyReadable(filePath: string): Promise<boolean> {
  // Check for cloud storage paths
  const isCloudPath =
    filePath.includes('/CloudStorage/') ||
    filePath.includes('/Google Drive/') ||
    filePath.includes('/Dropbox/') ||
    filePath.includes('/OneDrive/')

  if (isCloudPath) {
    debug('Detected cloud storage path, performing read test:', filePath)
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
          debug('File exists but has no content:', filePath)
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
        debug('File read test timed out after 2s:', filePath)
        resolve(false)
      }, 2000)
    })

    return await Promise.race([readPromise, timeoutPromise])
  } catch (error) {
    debug('File read test failed:', filePath, error)
    return false
  }
}

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

    // Check if source video file is actually readable
    const isReadable = await isFileActuallyReadable(videoPath)
    if (!isReadable) {
      debug(
        'Cannot read video file for thumbnail (may be cloud storage placeholder):',
        videoPath,
      )
      return null
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

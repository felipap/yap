import { access, mkdir } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { createHash } from 'crypto'
import { homedir } from 'os'

const execAsync = promisify(exec)

// Cache directory for thumbnails
const CACHE_DIR = join(homedir(), '.vlog-electron', 'thumbnails')

// Ensure cache directory exists
export async function ensureCacheDir(): Promise<void> {
  try {
    await access(CACHE_DIR)
  } catch {
    await mkdir(CACHE_DIR, { recursive: true })
  }
}

// Helper function to generate thumbnail for a video file
export async function generateThumbnail(
  videoPath: string,
): Promise<string | null> {
  try {
    // Ensure cache directory exists
    await ensureCacheDir()

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
        `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${thumbnailPath}"`,
      )
      return thumbnailPath
    } catch (ffmpegError) {
      console.log('ffmpeg not available, trying alternative method')
    }

    // Fallback: try to use system's built-in tools
    try {
      // On macOS, try sips (built-in image processing tool)
      if (process.platform === 'darwin') {
        // First extract frame using ffmpeg if available, or use a different approach
        await execAsync(
          `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -f image2pipe -vcodec png - | sips -s format jpeg --out "${thumbnailPath}"`,
        )
        return thumbnailPath
      }
    } catch (fallbackError) {
      console.log('Fallback thumbnail generation failed')
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

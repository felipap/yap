import { access } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Helper function to generate thumbnail for a video file
export async function generateThumbnail(videoPath: string): Promise<string | null> {
  try {
    const thumbnailPath = videoPath.replace(/\.(webm|mp4)$/, '.jpg')

    // Check if thumbnail already exists
    try {
      await access(thumbnailPath)
      return thumbnailPath
    } catch {
      // Thumbnail doesn't exist, generate it
    }

    // Try to use ffmpeg if available
    try {
      await execAsync(`ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${thumbnailPath}"`)
      return thumbnailPath
    } catch (ffmpegError) {
      console.log('ffmpeg not available, trying alternative method')
    }

    // Fallback: try to use system's built-in tools
    try {
      // On macOS, try sips (built-in image processing tool)
      if (process.platform === 'darwin') {
        // First extract frame using ffmpeg if available, or use a different approach
        await execAsync(`ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -f image2pipe -vcodec png - | sips -s format jpeg --out "${thumbnailPath}"`)
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
  return videoPath.replace(/\.(webm|mp4)$/, '.jpg')
}

import { open } from 'fs/promises'

/**
 * Checks if a file is actually readable (not just a cloud placeholder)
 * This is especially important for cloud storage paths that may appear
 * to exist but haven't been downloaded locally yet.
 */
export async function isFileActuallyReadable(
  filePath: string,
): Promise<boolean> {
  // Check for cloud storage paths
  const isCloudPath =
    filePath.includes('/CloudStorage/') ||
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


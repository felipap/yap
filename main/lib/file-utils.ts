import { open } from 'fs/promises'

// Checks if a file is actually readable (not just a cloud placeholder). This is
// especially important for cloud storage paths that may appear to exist but
// haven't been downloaded locally yet.
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

  const fileHandleRef: { current: Awaited<ReturnType<typeof open>> | null } = {
    current: null,
  }

  try {
    // Try to actually open and read the first few KB of the file with a timeout
    // This will fail if the file is just a cloud placeholder or takes too long to fetch
    const readPromise = (async () => {
      fileHandleRef.current = await open(filePath, 'r')
      try {
        const buffer = Buffer.allocUnsafe(8192) // Try to read 8KB
        const { bytesRead } = await fileHandleRef.current.read(
          buffer,
          0,
          buffer.length,
          0,
        )

        if (bytesRead === 0) {
          console.log('File exists but has no content:', filePath)
          return false
        }

        return true
      } finally {
        if (fileHandleRef.current) {
          await fileHandleRef.current.close()
          fileHandleRef.current = null
        }
      }
    })()

    // Add a 2-second timeout for the read operation
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(async () => {
        console.log('File read test timed out after 2s:', filePath)
        // Ensure file handle is closed if timeout occurs
        if (fileHandleRef.current) {
          try {
            await fileHandleRef.current.close()
          } catch {
            // Ignore close errors during timeout
          }
          fileHandleRef.current = null
        }
        resolve(false)
      }, 2000)
    })

    return await Promise.race([readPromise, timeoutPromise])
  } catch (error) {
    // Ensure file handle is closed on error
    if (fileHandleRef.current) {
      try {
        await fileHandleRef.current.close()
      } catch {
        // Ignore close errors
      }
      fileHandleRef.current = null
    }
    console.log('File read test failed:', filePath, error)
    return false
  }
}

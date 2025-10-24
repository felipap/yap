import { spawn } from 'child_process'
import { protocol } from 'electron'
import { createReadStream } from 'fs'
import { readFile, stat } from 'fs/promises'
import { vlogIdToPath } from './ipc'
import { debug } from './lib/logger'
import { generateThumbnail } from './lib/thumbnails'
import { getVideoDuration } from './lib/transcription'

// Cache for fixed webm files to avoid reprocessing
const fixedWebmCache = new Map<string, string>()

// Function to fix webm files by adding duration metadata
async function fixWebmDuration(inputPath: string): Promise<string> {
  // Check if we've already fixed this file
  if (fixedWebmCache.has(inputPath)) {
    return fixedWebmCache.get(inputPath)!
  }

  try {
    // First check if the file already has duration
    const duration = await getVideoDuration(inputPath)
    if (duration && duration > 0) {
      // File already has duration, no need to fix
      fixedWebmCache.set(inputPath, inputPath)
      return inputPath
    }
  } catch (error) {
    debug('Error checking webm duration:', error)
  }

  // Create a fixed version of the file
  const fixedPath = inputPath.replace('.webm', '.fixed.webm')

  return new Promise((resolve, reject) => {
    // Use ffmpeg to copy the webm file and add duration metadata
    const ffmpeg = spawn('ffmpeg', [
      '-i',
      inputPath,
      '-c',
      'copy', // Copy streams without re-encoding
      '-avoid_negative_ts',
      'make_zero', // Fix timestamp issues
      '-y', // Overwrite output file
      fixedPath,
    ])

    let errorOutput = ''

    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    ffmpeg.on('close', async (code) => {
      if (code === 0) {
        try {
          // Verify the fixed file has duration
          const fixedDuration = await getVideoDuration(fixedPath)
          if (fixedDuration && fixedDuration > 0) {
            debug(`Fixed webm duration: ${fixedDuration}s`)
            fixedWebmCache.set(inputPath, fixedPath)
            resolve(fixedPath)
          } else {
            debug('Fixed webm file still has no duration, using original')
            fixedWebmCache.set(inputPath, inputPath)
            resolve(inputPath)
          }
        } catch (error) {
          debug('Error verifying fixed webm file:', error)
          fixedWebmCache.set(inputPath, inputPath)
          resolve(inputPath)
        }
      } else {
        debug('FFmpeg failed to fix webm file:', errorOutput)
        fixedWebmCache.set(inputPath, inputPath)
        resolve(inputPath)
      }
    })

    ffmpeg.on('error', (error) => {
      debug('Failed to start FFmpeg for webm fix:', error)
      fixedWebmCache.set(inputPath, inputPath)
      resolve(inputPath)
    })
  })
}

// Register custom protocols
export function registerProtocols() {
  // Register the custom protocol as a standard scheme before app is ready
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'vlog-video',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: false,
        stream: true,
      },
    },
    {
      scheme: 'vlog-thumbnail',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: false,
        stream: true,
      },
    },
  ])
}

// Setup protocol handlers
export function setupProtocolHandlers() {
  // Register custom protocol to serve local video files
  protocol.handle(
    'vlog-video',
    withErrorHandling(
      async (request) => {
        // Remove the protocol and get the vlog ID
        const vlogId = request.url
          .replace('vlog-video://', '')
          .replace('/', '')
          .replace(/(\.mp4)|(\.webm)/, '')

        debug('Video request URL:', request.url)
        debug('Vlog ID:', vlogId)
        debug('Request headers:', Object.fromEntries(request.headers.entries()))

        const filePath = vlogIdToPath.get(vlogId)
        if (!filePath) {
          console.error(`Vlog with ID ${vlogId} not found in mapping`)
          debug('Available vlog IDs:', Array.from(vlogIdToPath.keys()))
          return new Response('Vlog not found', { status: 404 })
        }

        debug('Resolved file path:', filePath)

        // Check if file exists and get stats
        let stats
        try {
          stats = await stat(filePath)
          debug('File stats:', { size: stats.size, isFile: stats.isFile() })

          if (!stats.isFile()) {
            console.error('Path is not a file:', filePath)
            return new Response('Not a file', { status: 400 })
          }
        } catch (statError) {
          console.error('File stat error:', statError)
          return new Response('File not accessible', { status: 404 })
        }

        // Determine MIME type based on file extension
        const mimeType = filePath.endsWith('.webm') ? 'video/webm' : 'video/mp4'
        debug('MIME type:', mimeType)

        // For webm files, try to fix duration metadata
        let actualFilePath = filePath
        if (filePath.endsWith('.webm')) {
          try {
            actualFilePath = await fixWebmDuration(filePath)
            debug('Using webm file:', actualFilePath)
          } catch (error) {
            debug('Failed to fix webm duration, using original:', error)
          }
        }

        // Get stats for the actual file we're serving
        const actualStats =
          actualFilePath !== filePath ? await stat(actualFilePath) : stats

        // Handle range requests for video seeking
        const range = request.headers.get('range')
        if (range) {
          debug('Range request:', range)

          const match = range.match(/bytes=(\d+)-(\d*)/)
          if (match) {
            const start = parseInt(match[1], 10)
            const end = match[2] ? parseInt(match[2], 10) : actualStats.size - 1
            const chunkSize = end - start + 1

            debug(`Serving range: ${start}-${end} (${chunkSize} bytes)`)

            const stream = createReadStream(actualFilePath, { start, end })

            const headers: Record<string, string> = {
              'Content-Type': mimeType,
              'Content-Length': chunkSize.toString(),
              'Content-Range': `bytes ${start}-${end}/${actualStats.size}`,
              'Accept-Ranges': 'bytes',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET',
              'Access-Control-Allow-Headers': 'Content-Type, Range',
            }

            return new Response(stream as any, {
              status: 206, // Partial Content
              headers,
            })
          }
        }

        // Full file request (no range)
        debug('Full file request')
        const stream = createReadStream(actualFilePath)

        const headers: Record<string, string> = {
          'Content-Type': mimeType,
          'Content-Length': actualStats.size.toString(),
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
        }

        return new Response(stream as any, {
          headers,
        })
      },
      'Error loading video file',
      500,
    ),
  )

  // Register custom protocol to serve thumbnail images
  protocol.handle(
    'vlog-thumbnail',
    withErrorHandling(
      async (request) => {
        // Remove the protocol and get the vlog ID
        const vlogId = request.url
          .replace('vlog-thumbnail://', '')
          .replace('/', '')
          .replace('.jpg', '')

        debug('Thumbnail request URL:', request.url)
        debug('Vlog ID:', vlogId)

        const filePath = vlogIdToPath.get(vlogId)
        if (!filePath) {
          console.error(`Vlog with ID ${vlogId} not found in mapping`)
          return new Response('Vlog not found', { status: 404 })
        }

        // Generate thumbnail lazily if it doesn't exist
        const thumbnailPath = await generateThumbnail(filePath)
        if (!thumbnailPath) {
          console.error('Failed to generate thumbnail for:', filePath)
          return new Response('Thumbnail generation failed', { status: 500 })
        }

        debug('Resolved thumbnail path:', thumbnailPath)

        let data: Buffer
        try {
          data = await readFile(thumbnailPath)
        } catch (error) {
          console.error('Error reading thumbnail file:', error)
          return new Response('Thumbnail file not found', { status: 404 })
        }

        debug(
          'Successfully loaded thumbnail:',
          thumbnailPath,
          'Size:',
          data.length,
          'bytes',
        )

        return new Response(new Uint8Array(data), {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Length': data.length.toString(),
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      },
      'Error loading thumbnail file',
      404,
    ),
  )
}

// Generic try-catch decorator for protocol handlers
function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  errorMessage: string = 'Internal server error',
  statusCode: number = 500,
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error(`${errorMessage}:`, error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })

      // If the handler returns a Response, return an error response
      if (
        args.length > 0 &&
        args[0] &&
        typeof args[0] === 'object' &&
        'url' in args[0]
      ) {
        return new Response(errorMessage, { status: statusCode }) as R
      }

      throw error
    }
  }
}

import { protocol } from 'electron'
import { readFile, stat } from 'fs/promises'
import { createReadStream } from 'fs'
import { vlogIdToPath } from './ipc'

console.log('a'.repeat(100))

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
  protocol.handle('vlog-video', async (request) => {
    try {
      // Remove the protocol and get the vlog ID
      const vlogId = request.url
        .replace('vlog-video://', '')
        .replace('/', '')
        .replace(/(\.mp4)|(\.webm)/, '')

      console.log('Video request URL:', request.url)
      console.log('Vlog ID:', vlogId)
      console.log('Request headers:', Object.fromEntries(request.headers.entries()))

      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        console.error(`Vlog with ID ${vlogId} not found in mapping`)
        console.log('Available vlog IDs:', Array.from(vlogIdToPath.keys()))
        return new Response('Vlog not found', { status: 404 })
      }

      console.log('Resolved file path:', filePath)

      // Check if file exists and get stats
      let stats
      try {
        stats = await stat(filePath)
        console.log('File stats:', { size: stats.size, isFile: stats.isFile() })

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
      console.log('MIME type:', mimeType)

      // Handle range requests for video seeking
      const range = request.headers.get('range')
      if (range) {
        console.log('Range request:', range)

        const match = range.match(/bytes=(\d+)-(\d*)/)
        if (match) {
          const start = parseInt(match[1], 10)
          const end = match[2] ? parseInt(match[2], 10) : stats.size - 1
          const chunkSize = end - start + 1

          console.log(`Serving range: ${start}-${end} (${chunkSize} bytes)`)

          const stream = createReadStream(filePath, { start, end })

          return new Response(stream as any, {
            status: 206, // Partial Content
            headers: {
              'Content-Type': mimeType,
              'Content-Length': chunkSize.toString(),
              'Content-Range': `bytes ${start}-${end}/${stats.size}`,
              'Accept-Ranges': 'bytes',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET',
              'Access-Control-Allow-Headers': 'Content-Type, Range',
            },
          })
        }
      }

      // Full file request (no range)
      console.log('Full file request')
      const stream = createReadStream(filePath)

      return new Response(stream as any, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': stats.size.toString(),
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
        },
      })
    } catch (error) {
      console.error('Error loading video file:', error)
      console.error('Request URL:', request.url)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      return new Response('Internal server error', { status: 500 })
    }
  })

  // Register custom protocol to serve thumbnail images
  protocol.handle('vlog-thumbnail', async (request) => {
    try {
      // Remove the protocol and get the vlog ID
      const vlogId = request.url
        .replace('vlog-thumbnail://', '')
        .replace('/', '')
        .replace('.jpg', '')

      console.log('Thumbnail request URL:', request.url)
      console.log('Vlog ID:', vlogId)

      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        console.error(`Vlog with ID ${vlogId} not found in mapping`)
        return new Response('Vlog not found', { status: 404 })
      }

      // Generate thumbnail lazily if it doesn't exist
      const { generateThumbnail } = await import('./lib/thumbnails')
      const thumbnailPath = await generateThumbnail(filePath)

      if (!thumbnailPath) {
        console.error('Failed to generate thumbnail for:', filePath)
        return new Response('Thumbnail generation failed', { status: 500 })
      }

      console.log('Resolved thumbnail path:', thumbnailPath)

      const data = await readFile(thumbnailPath)

      console.log(
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
    } catch (error) {
      console.error('Error loading thumbnail file:', error)
      console.error('Request URL:', request.url)
      return new Response('Thumbnail not found', { status: 404 })
    }
  })
}

import { protocol } from 'electron'
import { readFile } from 'fs/promises'
import { vlogIdToPath } from './ipc'

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
        stream: true
      }
    },
    {
      scheme: 'vlog-thumbnail',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: false,
        stream: true
      }
    }
  ])
}

// Setup protocol handlers
export function setupProtocolHandlers() {
  // Register custom protocol to serve local video files
  protocol.handle('vlog-video', async (request) => {
    try {
      // Remove the protocol and get the vlog ID
      const vlogId = request.url.replace('vlog-video://', '').replace('/', '')

      console.log('Video request URL:', request.url)
      console.log('Vlog ID:', vlogId)

      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        console.error(`Vlog with ID ${vlogId} not found in mapping`)
        console.log('Available vlog IDs:', Array.from(vlogIdToPath.keys()))
        return new Response('Vlog not found', { status: 404 })
      }

      console.log('Resolved file path:', filePath)

      const data = await readFile(filePath)

      // Determine MIME type based on file extension
      const mimeType = filePath.endsWith('.webm') ? 'video/webm' : 'video/mp4'

      console.log('Successfully loaded video:', filePath, 'Size:', data.length, 'bytes')

      return new Response(new Uint8Array(data), {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': data.length.toString(),
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    } catch (error) {
      console.error('Error loading video file:', error)
      console.error('Request URL:', request.url)
      return new Response('File not found', { status: 404 })
    }
  })

  // Register custom protocol to serve thumbnail images
  protocol.handle('vlog-thumbnail', async (request) => {
    try {
      // Remove the protocol and get the vlog ID
      const vlogId = request.url.replace('vlog-thumbnail://', '').replace('/', '').replace('.jpg', '')

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

      console.log('Successfully loaded thumbnail:', thumbnailPath, 'Size:', data.length, 'bytes')

      return new Response(new Uint8Array(data), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Length': data.length.toString(),
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    } catch (error) {
      console.error('Error loading thumbnail file:', error)
      console.error('Request URL:', request.url)
      return new Response('Thumbnail not found', { status: 404 })
    }
  })
}

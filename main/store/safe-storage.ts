import { safeStorage } from 'electron'

const ENCRYPTED_PREFIX = 'encrypted:'

if (!safeStorage.isEncryptionAvailable()) {
  console.warn('Keychain encryption not available, storing in plaintext')
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) {
    return ''
  }

  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('Keychain encryption not available, storing in plaintext')
    return plaintext
  }

  const encrypted = safeStorage.encryptString(plaintext)
  return ENCRYPTED_PREFIX + encrypted.toString('base64')
}

export function decryptSecret(stored: string): string {
  if (!stored) {
    return ''
  }

  if (!stored.startsWith(ENCRYPTED_PREFIX)) {
    return stored
  }

  if (!safeStorage.isEncryptionAvailable()) {
    console.error('Cannot decrypt: keychain encryption not available')
    return ''
  }

  const base64Data = stored.slice(ENCRYPTED_PREFIX.length)
  const encryptedBuffer = Buffer.from(base64Data, 'base64')
  return safeStorage.decryptString(encryptedBuffer)
}

// Test utilities for creating mock files and validation testing

/**
 * Creates a mock File object for testing
 */
export function createMockFile(
  name: string,
  size: number,
  type: string = 'audio/mpeg'
): File {
  const file = new File(['mock file content'], name, { type })
  
  // Override the size property since File constructor doesn't set it from content
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  })
  
  return file
}

/**
 * Creates a mock audio file with valid properties
 */
export function createValidAudioFile(
  name: string = 'test.mp3',
  size: number = 1024 * 1024 // 1MB
): File {
  return createMockFile(name, size, 'audio/mpeg')
}

/**
 * Creates a mock audio file that exceeds size limit
 */
export function createOversizedAudioFile(
  name: string = 'large.mp3',
  size: number = 60 * 1024 * 1024 // 60MB
): File {
  return createMockFile(name, size, 'audio/mpeg')
}

/**
 * Creates a mock file with unsupported format
 */
export function createUnsupportedFile(
  name: string = 'test.txt',
  size: number = 1024
): File {
  return createMockFile(name, size, 'text/plain')
}

/**
 * Creates an empty mock file
 */
export function createEmptyFile(
  name: string = 'empty.mp3'
): File {
  return createMockFile(name, 0, 'audio/mpeg')
}

/**
 * Test data for various audio formats
 */
export const TEST_FILES = {
  validMp3: createValidAudioFile('song.mp3', 5 * 1024 * 1024),
  validWav: createValidAudioFile('song.wav', 10 * 1024 * 1024),
  validFlac: createValidAudioFile('song.flac', 15 * 1024 * 1024),
  validM4a: createValidAudioFile('song.m4a', 8 * 1024 * 1024),
  oversized: createOversizedAudioFile(),
  unsupported: createUnsupportedFile(),
  empty: createEmptyFile(),
  noExtension: createValidAudioFile('noextension', 1024 * 1024),
  multipleExtensions: createValidAudioFile('song.backup.mp3', 1024 * 1024),
  uppercaseExtension: createValidAudioFile('SONG.MP3', 1024 * 1024),
} as const
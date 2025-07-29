import type {
    AudioFile,
    ValidationResult,
    KeyResult,
    BPMResult,
    AnalysisResult,
    WaveformData,
    SupportedFormat
} from '../types'

import {
    SUPPORTED_FORMATS,
    MAX_FILE_SIZE,
    BPM_RANGE,
    CONFIDENCE_RANGE
} from '../types'

/**
 * Validates if a file is a supported audio format
 */
export function validateAudioFile(file: File): ValidationResult {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            isValid: false,
            error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
        }
    }

    // Check file format
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension as SupportedFormat)) {
        return {
            isValid: false,
            error: `Unsupported file format. Supported formats: ${SUPPORTED_FORMATS.join(', ').toUpperCase()}`
        }
    }

    // Check if file is empty
    if (file.size === 0) {
        return {
            isValid: false,
            error: 'File is empty'
        }
    }

    return { isValid: true }
}

/**
 * Validates BPM result data
 */
export function validateBPMResult(bpm: Partial<BPMResult>): ValidationResult {
    if (typeof bpm.bpm !== 'number' || isNaN(bpm.bpm)) {
        return {
            isValid: false,
            error: 'BPM must be a valid number'
        }
    }

    if (bpm.bpm < BPM_RANGE.min || bpm.bpm > BPM_RANGE.max) {
        return {
            isValid: false,
            error: `BPM (${bpm.bpm}) is outside valid range (${BPM_RANGE.min}-${BPM_RANGE.max})`
        }
    }

    if (typeof bpm.confidence !== 'number' ||
        bpm.confidence < CONFIDENCE_RANGE.min ||
        bpm.confidence > CONFIDENCE_RANGE.max) {
        return {
            isValid: false,
            error: 'BPM confidence must be between 0 and 1'
        }
    }

    if (typeof bpm.detectedBeats !== 'number' || bpm.detectedBeats < 0) {
        return {
            isValid: false,
            error: 'Detected beats must be a non-negative number'
        }
    }

    return { isValid: true }
}

/**
 * Validates key result data
 */
export function validateKeyResult(key: Partial<KeyResult>): ValidationResult {
    if (!key.keyName || typeof key.keyName !== 'string') {
        return {
            isValid: false,
            error: 'Key name is required and must be a string'
        }
    }

    if (!key.keySignature || typeof key.keySignature !== 'string') {
        return {
            isValid: false,
            error: 'Key signature is required and must be a string'
        }
    }

    if (typeof key.confidence !== 'number' ||
        key.confidence < CONFIDENCE_RANGE.min ||
        key.confidence > CONFIDENCE_RANGE.max) {
        return {
            isValid: false,
            error: 'Key confidence must be between 0 and 1'
        }
    }

    if (key.mode !== 'major' && key.mode !== 'minor') {
        return {
            isValid: false,
            error: 'Key mode must be either "major" or "minor"'
        }
    }

    return { isValid: true }
}

/**
 * Validates waveform data
 */
export function validateWaveformData(waveform: Partial<WaveformData>): ValidationResult {
    if (!Array.isArray(waveform.peaks)) {
        return {
            isValid: false,
            error: 'Waveform peaks must be an array'
        }
    }

    if (waveform.peaks.length === 0) {
        return {
            isValid: false,
            error: 'Waveform peaks array cannot be empty'
        }
    }

    if (typeof waveform.duration !== 'number' || waveform.duration <= 0) {
        return {
            isValid: false,
            error: 'Duration must be a positive number'
        }
    }

    if (typeof waveform.sampleRate !== 'number' || waveform.sampleRate <= 0) {
        return {
            isValid: false,
            error: 'Sample rate must be a positive number'
        }
    }

    if (typeof waveform.channels !== 'number' || waveform.channels < 1 || waveform.channels > 2) {
        return {
            isValid: false,
            error: 'Channels must be 1 (mono) or 2 (stereo)'
        }
    }

    return { isValid: true }
}

/**
 * Validates complete analysis result
 */
export function validateAnalysisResult(result: Partial<AnalysisResult>): ValidationResult {
    if (!result.key) {
        return {
            isValid: false,
            error: 'Analysis result must include key data'
        }
    }

    if (!result.bpm) {
        return {
            isValid: false,
            error: 'Analysis result must include BPM data'
        }
    }

    const keyValidation = validateKeyResult(result.key)
    if (!keyValidation.isValid) {
        return keyValidation
    }

    const bpmValidation = validateBPMResult(result.bpm)
    if (!bpmValidation.isValid) {
        return bpmValidation
    }

    if (typeof result.processingTime !== 'number' || result.processingTime < 0) {
        return {
            isValid: false,
            error: 'Processing time must be a non-negative number'
        }
    }

    return { isValid: true }
}

/**
 * Creates an AudioFile object from a File with validation
 */
export function createAudioFile(file: File): AudioFile | null {
    const validation = validateAudioFile(file)
    if (!validation.isValid) {
        return null
    }

    return {
        file,
        name: file.name,
        size: file.size,
        format: file.name.split('.').pop()?.toLowerCase() || '',
        duration: 0 // Will be set after audio loading
    }
}

/**
 * Utility to get file extension from filename
 */
export function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Utility to format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Utility to format confidence score as percentage
 */
export function formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`
}
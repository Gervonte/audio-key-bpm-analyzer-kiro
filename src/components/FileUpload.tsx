import React, { useCallback, useState } from 'react'
import {
  Box,
  Button,
  Text,
  VStack,
} from '@chakra-ui/react'
import { validateAudioFile, formatFileSize } from '../utils/validation'
import { checkBrowserCompatibility } from '../utils/errorHandling'
import { SUPPORTED_FORMATS, MAX_FILE_SIZE } from '../types'
import type { ValidationResult } from '../types'
import { ErrorDisplay } from './ErrorDisplay'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isProcessing: boolean
  acceptedFormats?: string[]
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  isProcessing,
  acceptedFormats = SUPPORTED_FORMATS
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBrowserWarning, setShowBrowserWarning] = useState(false)

  // Check browser compatibility on mount
  React.useEffect(() => {
    const browserCompat = checkBrowserCompatibility()
    if (!browserCompat.isSupported || browserCompat.warnings.length > 0) {
      setShowBrowserWarning(true)
    }
  }, [])

  const handleFileValidation = useCallback((file: File): ValidationResult => {
    const validation = validateAudioFile(file)
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file')
      return validation
    }

    setError(null)
    return validation
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    const validation = handleFileValidation(file)
    if (validation.isValid) {
      onFileSelect(file)
    }
  }, [handleFileValidation, onFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isProcessing) {
      setIsDragOver(true)
    }
  }, [isProcessing])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (isProcessing) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [isProcessing, handleFileSelect])

  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setInputRef(e.target) // Store reference to reset later
      handleFileSelect(files[0])
      // Don't reset the input immediately - this causes NotReadableError
    }
  }, [handleFileSelect])

  // Reset input when processing is complete
  React.useEffect(() => {
    if (!isProcessing && inputRef) {
      inputRef.value = ''
      setInputRef(null)
    }
  }, [isProcessing, inputRef])

  const handleClick = useCallback(() => {
    if (!isProcessing) {
      const input = document.getElementById('file-input') as HTMLInputElement
      input?.click()
    }
  }, [isProcessing])

  const handleRetry = useCallback(() => {
    setError(null)
    setShowBrowserWarning(false)
    // Re-check browser compatibility
    const browserCompat = checkBrowserCompatibility()
    if (!browserCompat.isSupported || browserCompat.warnings.length > 0) {
      setShowBrowserWarning(true)
    }
  }, [])

  const handleDismissError = useCallback(() => {
    setError(null)
  }, [])

  const handleDismissBrowserWarning = useCallback(() => {
    setShowBrowserWarning(false)
  }, [])

  return (
    <VStack gap={4} align="stretch">
      {/* Browser Compatibility Warning */}
      {showBrowserWarning && (
        <ErrorDisplay
          error={null}
          showBrowserCompatibility={true}
          onDismiss={handleDismissBrowserWarning}
        />
      )}

      {/* File Upload Error */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={handleRetry}
          onDismiss={handleDismissError}
          context="File Upload"
        />
      )}

      <Box
        border="2px dashed"
        borderColor={isDragOver ? 'red.500' : 'gray.300'}
        borderRadius="lg"
        p={{ base: 6, md: 8 }}
        textAlign="center"
        bg={isDragOver ? 'gray.100' : 'gray.50'}
        cursor={isProcessing ? 'not-allowed' : 'pointer'}
        transition="all 0.2s"
        _hover={!isProcessing ? {
          borderColor: 'red.400',
          bg: 'gray.100'
        } : {}}
        _active={!isProcessing ? {
          borderColor: 'red.500',
          bg: 'gray.200',
          transform: 'scale(0.98)'
        } : {}}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        opacity={isProcessing ? 0.6 : 1}
        // Mobile touch optimization
        minH={{ base: '120px', md: '140px' }}
        touchAction="manipulation"
      >
        <input
          id="file-input"
          type="file"
          accept={acceptedFormats.map(format => `.${format}`).join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={isProcessing}
        />

        <VStack gap={{ base: 2, md: 3 }}>
          <Text
            fontSize={{ base: 'lg', md: 'xl' }}
            fontWeight="medium"
            color="black"
            textAlign="center"
            px={{ base: 2, md: 0 }}
          >
            {isProcessing
              ? 'Processing audio file...'
              : isDragOver
                ? 'Drop your audio file here'
                : 'Drag & drop your audio file here'
            }
          </Text>

          {!isProcessing && (
            <Text fontSize="sm" color="gray.600">
              or
            </Text>
          )}

          <Button
            colorScheme="red"
            variant="outline"
            size={{ base: 'md', md: 'lg' }}
            disabled={isProcessing}
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
            _disabled={{
              opacity: 0.6,
              cursor: 'not-allowed'
            }}
            // Mobile touch optimization
            minH={{ base: '44px', md: '48px' }} // iOS recommended touch target size
            px={{ base: 6, md: 8 }}
          >
            {isProcessing ? 'Processing...' : 'Choose File'}
          </Button>

          {!isProcessing && (
            <VStack gap={1} textAlign="center">
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
                Supported formats: {acceptedFormats.map(f => f.toUpperCase()).join(', ')}
              </Text>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
                Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
              </Text>
            </VStack>
          )}

          {isProcessing && (
            <VStack gap={1} textAlign="center">
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" fontWeight="medium">
                Please wait while we process your file
              </Text>
              <Text fontSize="xs" color="gray.500">
                Do not upload another file during processing
              </Text>
            </VStack>
          )}
        </VStack>
      </Box>
    </VStack>
  )
}

export default FileUpload
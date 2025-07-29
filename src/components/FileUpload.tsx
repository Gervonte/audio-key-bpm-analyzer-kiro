import React, { useCallback, useState } from 'react'
import {
  Box,
  Button,
  Text,
  VStack,
} from '@chakra-ui/react'
import { validateAudioFile, formatFileSize } from '../utils/validation'
import { SUPPORTED_FORMATS, MAX_FILE_SIZE } from '../types'
import type { ValidationResult } from '../types'

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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }, [handleFileSelect])

  const handleClick = useCallback(() => {
    if (!isProcessing) {
      const input = document.getElementById('file-input') as HTMLInputElement
      input?.click()
    }
  }, [isProcessing])

  return (
    <VStack gap={4} align="stretch">
      <Box
        border="2px dashed"
        borderColor={isDragOver ? 'red.500' : 'gray.300'}
        borderRadius="lg"
        p={8}
        textAlign="center"
        bg={isDragOver ? 'gray.100' : 'gray.50'}
        cursor={isProcessing ? 'not-allowed' : 'pointer'}
        transition="all 0.2s"
        _hover={!isProcessing ? {
          borderColor: 'red.400',
          bg: 'gray.100'
        } : {}}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        opacity={isProcessing ? 0.6 : 1}
      >
        <input
          id="file-input"
          type="file"
          accept={acceptedFormats.map(format => `.${format}`).join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={isProcessing}
        />
        
        <VStack gap={3}>
          <Text fontSize="xl" fontWeight="medium" color="black">
            {isDragOver ? 'Drop your audio file here' : 'Drag & drop your audio file here'}
          </Text>
          
          <Text fontSize="sm" color="gray.600">
            or
          </Text>
          
          <Button
            colorScheme="red"
            variant="outline"
            size="lg"
            disabled={isProcessing}
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
          >
            {isProcessing ? 'Processing...' : 'Choose File'}
          </Button>
          
          <VStack gap={1}>
            <Text fontSize="sm" color="gray.500">
              Supported formats: {acceptedFormats.map(f => f.toUpperCase()).join(', ')}
            </Text>
            <Text fontSize="sm" color="gray.500">
              Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
            </Text>
          </VStack>
        </VStack>
      </Box>

      {error && (
        <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={4}>
          <Text fontWeight="bold" color="red.800">Upload Error</Text>
          <Text color="red.700">{error}</Text>
        </Box>
      )}
    </VStack>
  )
}

export default FileUpload
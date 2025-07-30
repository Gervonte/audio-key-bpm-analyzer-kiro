import React from 'react'
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Link
} from '@chakra-ui/react'
import { categorizeError, checkBrowserCompatibility, type ErrorInfo } from '../utils/errorHandling'

interface ErrorDisplayProps {
  error: string | Error | null
  onRetry?: () => void
  onDismiss?: () => void
  showBrowserCompatibility?: boolean
  context?: string
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showBrowserCompatibility = false,
  context
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)
  const [isBrowserInfoOpen, setIsBrowserInfoOpen] = React.useState(false)

  const toggleDetails = () => setIsDetailsOpen(!isDetailsOpen)
  const toggleBrowserInfo = () => setIsBrowserInfoOpen(!isBrowserInfoOpen)

  if (!error && !showBrowserCompatibility) {
    return null
  }

  const errorInfo: ErrorInfo | null = error ? categorizeError(error) : null
  const browserCompat = checkBrowserCompatibility()

  return (
    <VStack gap={4} align="stretch" w="100%">
      {/* Browser Compatibility Warnings */}
      {showBrowserCompatibility && (!browserCompat.isSupported || browserCompat.warnings.length > 0) && (
        <Box
          bg={browserCompat.isSupported ? "orange.50" : "red.50"}
          border="1px solid"
          borderColor={browserCompat.isSupported ? "orange.200" : "red.200"}
          borderRadius="md"
          p={4}
        >
          <VStack align="stretch" gap={3}>
            <HStack>
              <Text fontSize="lg" color={browserCompat.isSupported ? "orange.600" : "red.600"}>
                {browserCompat.isSupported ? "⚠️" : "❌"}
              </Text>
              <Text fontWeight="bold" color={browserCompat.isSupported ? "orange.800" : "red.800"}>
                {browserCompat.isSupported ? 'Browser Compatibility Warning' : 'Browser Not Supported'}
              </Text>
            </HStack>

            <VStack align="stretch" gap={2}>
              {browserCompat.errors.map((error, index) => (
                <Text key={index} color="red.700">• {error}</Text>
              ))}
              {browserCompat.warnings.map((warning, index) => (
                <Text key={index} color="orange.700">• {warning}</Text>
              ))}

              {browserCompat.suggestions.length > 0 && (
                <Box mt={2}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleBrowserInfo}
                  >
                    {isBrowserInfoOpen ? 'Hide' : 'View'} Recommendations
                  </Button>

                  {isBrowserInfoOpen && (
                    <Box mt={2} p={3} bg="gray.50" borderRadius="md">
                      <Text fontWeight="medium" mb={2}>Recommendations:</Text>
                      <VStack align="stretch" gap={1}>
                        {browserCompat.suggestions.map((suggestion, index) => (
                          <Text key={index} fontSize="sm">• {suggestion}</Text>
                        ))}
                      </VStack>
                    </Box>
                  )}
                </Box>
              )}
            </VStack>
          </VStack>
        </Box>
      )}

      {/* Main Error Display */}
      {errorInfo && (
        <Box
          bg={getErrorBgColor(errorInfo.severity)}
          border="1px solid"
          borderColor={getErrorBorderColor(errorInfo.severity)}
          borderRadius="md"
          p={4}
        >
          <VStack align="stretch" gap={3}>
            <HStack w="100%" justify="space-between">
              <HStack>
                <Text fontSize="lg">{getErrorIcon(errorInfo.severity)}</Text>
                <Text fontWeight="bold" color={getErrorTextColor(errorInfo.severity)}>
                  {getErrorTitle(errorInfo.type)}
                </Text>
              </HStack>

              {onDismiss && (
                <Button size="sm" variant="ghost" onClick={onDismiss}>
                  ×
                </Button>
              )}
            </HStack>

            <Text>{errorInfo.message}</Text>

            {errorInfo.suggestion && (
              <Box p={3} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.400">
                <Text fontSize="sm" color="blue.800">
                  <Text as="span" fontWeight="medium">💡 Suggestion: </Text>
                  {errorInfo.suggestion}
                </Text>
              </Box>
            )}

            {/* Action Buttons */}
            <HStack gap={2} pt={2}>
              {errorInfo.canRetry && onRetry && (
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={onRetry}
                >
                  Try Again
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={toggleDetails}
              >
                {isDetailsOpen ? '▲ Hide' : '▼ Show'} Details
              </Button>
            </HStack>

            {/* Error Details */}
            {isDetailsOpen && (
              <Box p={3} bg="gray.50" borderRadius="md" fontSize="sm">
                <VStack align="stretch" gap={2}>
                  <HStack>
                    <Text fontWeight="medium">Error Type:</Text>
                    <Text>{errorInfo.type.replace('_', ' ')}</Text>
                  </HStack>

                  {context && (
                    <HStack>
                      <Text fontWeight="medium">Context:</Text>
                      <Text>{context}</Text>
                    </HStack>
                  )}

                  <HStack align="flex-start">
                    <Text fontWeight="medium">Can Retry:</Text>
                    <Text color={errorInfo.canRetry ? 'green.600' : 'red.600'}>
                      {errorInfo.canRetry ? 'Yes' : 'No'}
                    </Text>
                  </HStack>

                  {typeof error === 'object' && error && error.stack && (
                    <Box>
                      <Text fontWeight="medium" mb={1}>Technical Details:</Text>
                      <Text
                        fontSize="xs"
                        fontFamily="mono"
                        color="gray.600"
                        whiteSpace="pre-wrap"
                        maxH="100px"
                        overflowY="auto"
                        p={2}
                        bg="white"
                        borderRadius="sm"
                      >
                        {error.stack}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </Box>
            )}

            {/* Additional Help Links */}
            {getHelpLinks(errorInfo.type).length > 0 && (
              <Box pt={2} borderTop="1px solid" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="medium" mb={2}>Need more help?</Text>
                <HStack gap={4} flexWrap="wrap">
                  {getHelpLinks(errorInfo.type).map((link, index) => (
                    <Link
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      fontSize="sm"
                      color="blue.600"
                      textDecoration="underline"
                    >
                      {link.text}
                    </Link>
                  ))}
                </HStack>
              </Box>
            )}
          </VStack>
        </Box>
      )}
    </VStack>
  )
}

function getErrorTitle(errorType: string): string {
  switch (errorType) {
    case 'file_validation':
      return 'File Validation Error'
    case 'file_loading':
      return 'File Loading Error'
    case 'browser_compatibility':
      return 'Browser Compatibility Issue'
    case 'audio_processing':
      return 'Audio Processing Error'
    case 'key_detection':
      return 'Key Detection Failed'
    case 'bpm_detection':
      return 'BPM Detection Failed'
    case 'timeout':
      return 'Processing Timeout'
    case 'memory':
      return 'Memory Error'
    case 'network':
      return 'Network Error'
    default:
      return 'Error'
  }
}

function getErrorIcon(severity: 'error' | 'warning' | 'info'): string {
  switch (severity) {
    case 'error':
      return '❌'
    case 'warning':
      return '⚠️'
    case 'info':
      return 'ℹ️'
    default:
      return '❌'
  }
}

function getErrorBgColor(severity: 'error' | 'warning' | 'info'): string {
  switch (severity) {
    case 'error':
      return 'red.50'
    case 'warning':
      return 'orange.50'
    case 'info':
      return 'blue.50'
    default:
      return 'gray.50'
  }
}

function getErrorBorderColor(severity: 'error' | 'warning' | 'info'): string {
  switch (severity) {
    case 'error':
      return 'red.200'
    case 'warning':
      return 'orange.200'
    case 'info':
      return 'blue.200'
    default:
      return 'gray.200'
  }
}

function getErrorTextColor(severity: 'error' | 'warning' | 'info'): string {
  switch (severity) {
    case 'error':
      return 'red.800'
    case 'warning':
      return 'orange.800'
    case 'info':
      return 'blue.800'
    default:
      return 'gray.800'
  }
}

function getHelpLinks(errorType: string): Array<{ text: string; url: string }> {
  switch (errorType) {
    case 'browser_compatibility':
      return [
        { text: 'Browser Support Info', url: 'https://caniuse.com/audio-api' },
        { text: 'Update Your Browser', url: 'https://browsehappy.com/' }
      ]
    case 'file_validation':
      return [
        { text: 'Audio Format Guide', url: 'https://en.wikipedia.org/wiki/Audio_file_format' }
      ]
    case 'memory':
      return [
        { text: 'Browser Memory Tips', url: 'https://support.google.com/chrome/answer/142063' }
      ]
    default:
      return []
  }
}

export default ErrorDisplay
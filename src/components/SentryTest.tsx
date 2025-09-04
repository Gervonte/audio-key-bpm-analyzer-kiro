import { Box, Button, VStack, Text, HStack } from '@chakra-ui/react'
import * as Sentry from '@sentry/react'
import { trackAnalysisError } from '../utils/sentryPerformance'
import { getDebugConfig } from '../utils/debugMode'

/**
 * Test component for Sentry functionality - only visible in debug mode
 */
export const SentryTest = () => {
    const debugConfig = getDebugConfig()

    // Only show when debug mode is enabled
    if (!debugConfig.isDebugMode) {
        return null
    }

    const testError = () => {
        try {
            throw new Error('Test error for Sentry verification')
        } catch (error) {
            Sentry.captureException(error)
            console.log('Test error sent to Sentry')
        }
    }

    const testMessage = () => {
        Sentry.captureMessage('Test message from Audio Key & BPM Analyzer', 'info')
        console.log('Test message sent to Sentry')
    }

    const testPerformance = () => {
        Sentry.startSpan({
            name: 'Test Performance Span',
            op: 'test',
        }, (span) => {
            setTimeout(() => {
                if (span && typeof span.setStatus === 'function') {
                    span.setStatus({ code: 1 }) // OK status
                }
                console.log('Test performance span completed')
            }, 1000)
        })
    }

    const testCustomMetrics = () => {
        trackAnalysisError('processing_failed', { test_error: true })
        console.log('Test custom metrics sent')
    }

    const testBreadcrumb = () => {
        Sentry.addBreadcrumb({
            category: 'test',
            message: 'Test breadcrumb added',
            level: 'info',
        })
        console.log('Test breadcrumb added')
    }

    return (
        <Box
            p={6}
            borderWidth="2px"
            borderColor="black"
            borderRadius="md"
            bg="white"
            maxW="600px"
        >
            <VStack gap={5} align="stretch">
                <Box>
                    <Text fontWeight="bold" fontSize="xl" color="black" mb={2}>
                        🔧 Sentry Test Panel
                    </Text>
                    <Text fontSize="sm" color="black" fontWeight="normal" lineHeight="1.5" mb={1}>
                        Test Sentry integration functionality. Results will appear in browser console and Sentry dashboard.
                    </Text>
                    <Text fontSize="xs" color="red" fontWeight="medium">
                        Debug Mode Only
                    </Text>
                </Box>

                <VStack gap={3} align="stretch">
                    <HStack gap={3} flexWrap="wrap" justify="flex-start">
                        <Button
                            size="md"
                            onClick={testError}
                            fontWeight="medium"
                            px={4}
                            bg="black"
                            color="white"
                            _hover={{ bg: "gray.800" }}
                        >
                            ❌ Test Error
                        </Button>
                        <Button
                            size="md"
                            onClick={testMessage}
                            fontWeight="medium"
                            px={4}
                            bg="black"
                            color="white"
                            _hover={{ bg: "gray.800" }}
                        >
                            💬 Test Message
                        </Button>
                        <Button
                            size="md"
                            onClick={testPerformance}
                            fontWeight="medium"
                            px={4}
                            bg="black"
                            color="white"
                            _hover={{ bg: "gray.800" }}
                        >
                            ⚡ Test Performance
                        </Button>
                    </HStack>

                    <HStack gap={3} flexWrap="wrap" justify="flex-start">
                        <Button
                            size="md"
                            onClick={testCustomMetrics}
                            fontWeight="medium"
                            px={4}
                            bg="black"
                            color="white"
                            _hover={{ bg: "gray.800" }}
                        >
                            📊 Test Metrics
                        </Button>
                        <Button
                            size="md"
                            onClick={testBreadcrumb}
                            fontWeight="medium"
                            px={4}
                            bg="black"
                            color="white"
                            _hover={{ bg: "gray.800" }}
                        >
                            🍞 Test Breadcrumb
                        </Button>
                    </HStack>
                </VStack>

                <Box pt={2} borderTop="1px solid" borderColor="black">
                    <Text fontSize="sm" color="black" fontWeight="medium">
                        Configuration Status:
                        <Text as="span" color={import.meta.env.VITE_SENTRY_DSN ? "black" : "red"} fontWeight="bold" ml={1}>
                            {import.meta.env.VITE_SENTRY_DSN ? "✅ DSN Configured" : "❌ DSN Missing"}
                        </Text>
                    </Text>
                </Box>
            </VStack>
        </Box>
    )
}
import React from 'react'
import { Box, Text, VStack, HStack, Code, Badge } from '@chakra-ui/react'
import { getDebugConfig } from '../utils/debugMode'

export const DebugInfo: React.FC = () => {
  const debugConfig = getDebugConfig()

  if (!debugConfig.isDebugMode) {
    return null
  }

  return (
    <Box
      bg="blue.50"
      border="1px solid"
      borderColor="blue.200"
      borderRadius="md"
      p={3}
      fontSize="sm"
    >
      <VStack align="stretch" gap={2}>
        <HStack justify="space-between">
          <Text fontWeight="bold" color="blue.800">
            🔧 Debug Mode Active
          </Text>
          <Badge colorScheme="blue" size="sm">
            Developer
          </Badge>
        </HStack>
        
        <Text color="blue.700" fontSize="xs">
          Debug features are enabled. Remove <Code>?debug=true</Code> from the URL to hide this panel.
        </Text>
        
        <VStack align="stretch" gap={1} fontSize="xs" color="blue.600">
          <Text><strong>Available debug parameters:</strong></Text>
          <Text>• <Code>?debug=true</Code> - Enable all debug features</Text>
          <Text>• <Code>?perf=true</Code> - Show performance monitoring only</Text>
          <Text>• <Code>?cache=true</Code> - Enable analysis caching</Text>
          <Text>• <Code>?progressive=true</Code> - Enable progressive loading</Text>
          <Text>• <Code>?optimize=true</Code> - Use optimized waveform rendering</Text>
        </VStack>

        <VStack align="stretch" gap={1} fontSize="xs" color="blue.600">
          <Text><strong>Current configuration:</strong></Text>
          <HStack wrap="wrap" gap={1}>
            <Badge colorScheme={debugConfig.showPerformanceMonitoring ? 'green' : 'gray'} size="xs">
              Performance Monitoring: {debugConfig.showPerformanceMonitoring ? 'ON' : 'OFF'}
            </Badge>
            <Badge colorScheme={debugConfig.enableCaching ? 'green' : 'gray'} size="xs">
              Caching: {debugConfig.enableCaching ? 'ON' : 'OFF'}
            </Badge>
            <Badge colorScheme={debugConfig.enableProgressiveLoading ? 'green' : 'gray'} size="xs">
              Progressive Loading: {debugConfig.enableProgressiveLoading ? 'ON' : 'OFF'}
            </Badge>
          </HStack>
        </VStack>
      </VStack>
    </Box>
  )
}

export default DebugInfo
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
    Box,
    Text,
    Progress,
    VStack,
    HStack,
    Badge,
    Tooltip,
    Button,
    Collapsible,
    useDisclosure
} from '@chakra-ui/react'
import { memoryManager, MemoryManager } from '../utils/memoryManager'

interface MemoryMonitorProps {
    showDetails?: boolean
    compact?: boolean
}

export const MemoryMonitor: React.FC<MemoryMonitorProps> = ({
    showDetails = false,
    compact = false
}) => {
    const [memoryStats, setMemoryStats] = useState(() => memoryManager.getMemoryStats())
    const { open: isOpen, onToggle } = useDisclosure({ defaultOpen: showDetails })

    const updateStats = useCallback((stats: any) => {
        setMemoryStats(prevStats => {
            // Only update if stats actually changed to prevent infinite loops
            if (JSON.stringify(prevStats) !== JSON.stringify(stats)) {
                return stats
            }
            return prevStats
        })
    }, [])

    useEffect(() => {
        memoryManager.addListener(updateStats)

        return () => {
            memoryManager.removeListener(updateStats)
        }
    }, [updateStats])

    const calculations = useMemo(() => {
        if (!memoryStats.current) {
            return null
        }

        const usagePercentage = (memoryStats.current.usedJSHeapSize / memoryStats.current.jsHeapSizeLimit) * 100
        const isHighMemory = memoryStats.memoryPressure === 'high'
        const isMediumMemory = memoryStats.memoryPressure === 'medium'

        const getColorScheme = () => {
            if (isHighMemory) return 'red'
            if (isMediumMemory) return 'yellow'
            return 'green'
        }

        const getPressureBadgeColor = () => {
            switch (memoryStats.memoryPressure) {
                case 'high': return 'red'
                case 'medium': return 'yellow'
                case 'low': return 'green'
                default: return 'gray'
            }
        }

        return {
            usagePercentage,
            isHighMemory,
            isMediumMemory,
            colorScheme: getColorScheme(),
            pressureBadgeColor: getPressureBadgeColor()
        }
    }, [memoryStats])

    if (!calculations) {
        return null
    }

    const { usagePercentage, isHighMemory, colorScheme, pressureBadgeColor } = calculations

    if (compact) {
        return (
            <Tooltip.Root>
                <Tooltip.Trigger asChild>
                    <Box>
                        <Progress.Root
                            value={usagePercentage}
                            colorScheme={colorScheme}
                            size="sm"
                            width="100px"
                        >
                            <Progress.Track borderRadius="md">
                                <Progress.Range />
                            </Progress.Track>
                        </Progress.Root>
                    </Box>
                </Tooltip.Trigger>
                <Tooltip.Positioner>
                    <Tooltip.Content>
                        {`Memory Usage: ${usagePercentage.toFixed(1)}% (${memoryStats.memoryPressure} pressure)`}
                    </Tooltip.Content>
                </Tooltip.Positioner>
            </Tooltip.Root>
        )
    }


    return (
        <Box
            bg="gray.50"
            borderRadius="md"
            border="1px solid"
            borderColor="gray.200"
            p={3}
            fontSize="sm"
        >
            <HStack justify="space-between" align="center">
                <HStack gap={2}>
                    <Text fontWeight="medium" color="gray.700">
                        Memory Usage
                    </Text>
                    <Badge colorScheme={pressureBadgeColor} size="sm">
                        {memoryStats.memoryPressure}
                    </Badge>
                </HStack>

                <HStack gap={2}>
                    <Text fontSize="xs" color="gray.600">
                        {usagePercentage.toFixed(1)}%
                    </Text>
                    {showDetails && (
                        <Button
                            aria-label="Toggle details"
                            size="xs"
                            variant="ghost"
                            onClick={onToggle}
                            fontSize="xs"
                            minW="auto"
                            h="auto"
                            p={1}
                        >
                            {isOpen ? '▲' : '▼'}
                        </Button>
                    )}
                </HStack>
            </HStack>

            <Progress.Root
                value={usagePercentage}
                colorScheme={colorScheme}
                size="sm"
                mt={2}
            >
                <Progress.Track borderRadius="md">
                    <Progress.Range />
                </Progress.Track>
            </Progress.Root>

            <Collapsible.Root open={isOpen && showDetails}>
                <Collapsible.Content>
                    <VStack align="stretch" gap={2} mt={3} pt={3} borderTop="1px solid" borderColor="gray.200">
                        <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.600">Used:</Text>
                            <Text fontSize="xs" fontWeight="medium">
                                {memoryStats.current ? MemoryManager.formatMemorySize(memoryStats.current.usedJSHeapSize) : 'N/A'}
                            </Text>
                        </HStack>

                        <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.600">Total:</Text>
                            <Text fontSize="xs" fontWeight="medium">
                                {memoryStats.current ? MemoryManager.formatMemorySize(memoryStats.current.totalJSHeapSize) : 'N/A'}
                            </Text>
                        </HStack>

                        <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.600">Limit:</Text>
                            <Text fontSize="xs" fontWeight="medium">
                                {memoryStats.current ? MemoryManager.formatMemorySize(memoryStats.current.jsHeapSizeLimit) : 'N/A'}
                            </Text>
                        </HStack>

                        <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.600">Available:</Text>
                            <Text fontSize="xs" fontWeight="medium" color="green.600">
                                {MemoryManager.formatMemorySize(memoryStats.availableMemory)}
                            </Text>
                        </HStack>

                        {memoryStats.peak && (
                            <HStack justify="space-between">
                                <Text fontSize="xs" color="gray.600">Peak:</Text>
                                <Text fontSize="xs" fontWeight="medium" color="orange.600">
                                    {MemoryManager.formatMemorySize(memoryStats.peak.usedJSHeapSize)}
                                </Text>
                            </HStack>
                        )}

                        {isHighMemory && (
                            <Box
                                bg="red.50"
                                border="1px solid"
                                borderColor="red.200"
                                borderRadius="md"
                                p={2}
                                mt={2}
                            >
                                <Text fontSize="xs" color="red.700" fontWeight="medium">
                                    High memory usage detected. Consider closing other browser tabs or using smaller audio files.
                                </Text>
                            </Box>
                        )}
                    </VStack>
                </Collapsible.Content>
            </Collapsible.Root>
        </Box>
    )
}

export default MemoryMonitor
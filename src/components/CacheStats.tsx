import React, { useEffect, useState } from 'react'
import {
    Box,
    Text,
    VStack,
    HStack,
    Badge,
    Button,
    Stat,
    SimpleGrid,
    createToaster
} from '@chakra-ui/react'
import { audioCache } from '../utils/audioCache'
import { MemoryManager } from '../utils/memoryManager'

interface CacheStatsProps {
    showControls?: boolean
}

export const CacheStats: React.FC<CacheStatsProps> = ({
    showControls = true
}) => {
    const [stats, setStats] = useState(audioCache.getStats())
    const toaster = createToaster({
        placement: 'top'
    })

    useEffect(() => {
        const interval = setInterval(() => {
            setStats(audioCache.getStats())
        }, 2000) // Update every 2 seconds

        return () => clearInterval(interval)
    }, [])

    const handleClearCache = () => {
        audioCache.clear()
        setStats(audioCache.getStats())

        toaster.create({
            title: 'Cache Cleared',
            description: 'All cached analysis results have been removed.',
            duration: 3000
        })
    }

    const hitRate = audioCache.getHitRate()
    const totalRequests = stats.hits + stats.misses

    const getHitRateColor = () => {
        if (hitRate >= 0.7) return 'green'
        if (hitRate >= 0.4) return 'yellow'
        return 'red'
    }

    return (
        <Box
            bg="gray.50"
            borderRadius="md"
            border="1px solid"
            borderColor="gray.200"
            p={4}
        >
            <VStack align="stretch" gap={4}>
                <HStack justify="space-between" align="center">
                    <Text fontWeight="bold" color="gray.700">
                        Analysis Cache
                    </Text>
                    {showControls && (
                        <Button
                            size="sm"
                            variant="outline"
                            colorScheme="red"
                            onClick={handleClearCache}
                            disabled={stats.totalEntries === 0}
                        >
                            Clear Cache
                        </Button>
                    )}
                </HStack>

                <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
                    <Stat.Root>
                        <Stat.Label fontSize="xs">Hit Rate</Stat.Label>
                        <Stat.ValueText fontSize="lg">
                            <Badge colorScheme={getHitRateColor()} fontSize="sm">
                                {totalRequests > 0 ? `${(hitRate * 100).toFixed(1)}%` : '0%'}
                            </Badge>
                        </Stat.ValueText>
                        <Stat.HelpText fontSize="xs">
                            {stats.hits}/{totalRequests} hits
                        </Stat.HelpText>
                    </Stat.Root>

                    <Stat.Root>
                        <Stat.Label fontSize="xs">Cached Files</Stat.Label>
                        <Stat.ValueText fontSize="lg">{stats.totalEntries}</Stat.ValueText>
                        <Stat.HelpText fontSize="xs">
                            analysis results
                        </Stat.HelpText>
                    </Stat.Root>

                    <Stat.Root>
                        <Stat.Label fontSize="xs">Memory Usage</Stat.Label>
                        <Stat.ValueText fontSize="lg">
                            {MemoryManager.formatMemorySize(stats.memoryUsage)}
                        </Stat.ValueText>
                        <Stat.HelpText fontSize="xs">
                            cache overhead
                        </Stat.HelpText>
                    </Stat.Root>

                    <Stat.Root>
                        <Stat.Label fontSize="xs">Cache Misses</Stat.Label>
                        <Stat.ValueText fontSize="lg">{stats.misses}</Stat.ValueText>
                        <Stat.HelpText fontSize="xs">
                            new analyses
                        </Stat.HelpText>
                    </Stat.Root>
                </SimpleGrid>

                {stats.totalEntries > 0 && (
                    <Box
                        bg="blue.50"
                        border="1px solid"
                        borderColor="blue.200"
                        borderRadius="md"
                        p={3}
                    >
                        <VStack align="stretch" gap={2}>
                            <Text fontSize="sm" fontWeight="medium" color="blue.800">
                                Cache Performance
                            </Text>

                            <VStack align="stretch" gap={1} fontSize="xs" color="blue.700">
                                <HStack justify="space-between">
                                    <Text>Files analyzed:</Text>
                                    <Text fontWeight="medium">{totalRequests}</Text>
                                </HStack>

                                <HStack justify="space-between">
                                    <Text>Cache hits:</Text>
                                    <Text fontWeight="medium" color="green.600">{stats.hits}</Text>
                                </HStack>

                                <HStack justify="space-between">
                                    <Text>Time saved:</Text>
                                    <Text fontWeight="medium" color="green.600">
                                        ~{Math.round(stats.hits * 15)}s
                                    </Text>
                                </HStack>
                            </VStack>
                        </VStack>
                    </Box>
                )}

                {stats.totalEntries === 0 && (
                    <Box
                        bg="gray.100"
                        borderRadius="md"
                        p={3}
                        textAlign="center"
                    >
                        <Text fontSize="sm" color="gray.600">
                            No cached analysis results yet. Upload and analyze audio files to see cache statistics.
                        </Text>
                    </Box>
                )}
            </VStack>
        </Box>
    )
}

export default CacheStats
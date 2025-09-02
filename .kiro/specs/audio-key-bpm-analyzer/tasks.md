# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - Initialize React TypeScript project with Vite
  - Install Chakra UI, Web Audio API types, and audio analysis dependencies
  - Configure project structure with components, hooks, and utilities folders
  - Set up basic routing and app shell
  - _Requirements: 1.1, 3.1_

- [x] 2. Implement core data models and types
  - Create TypeScript interfaces for AudioFile, AnalysisResult, KeyResult, BPMResult
  - Define WaveformData interface for visualization
  - Create AppState interface for UI state management
  - Set up utility functions for data validation
  - _Requirements: 1.2, 2.1_

- [x] 3. Create file upload component with validation
  - Build FileUpload component using Chakra UI with drag-and-drop functionality
  - Implement file format validation (MP3, WAV, FLAC, M4A)
  - Add file size validation (max 50MB)
  - Create error handling for unsupported formats and oversized files
  - Write unit tests for file validation logic
  - _Requirements: 1.1, 1.2, 1.5, 4.1, 4.3_

- [x] 4. Implement audio file loading and Web Audio API integration
  - Create useFileUpload hook for loading audio files into AudioBuffer
  - Implement audio file decoding using Web Audio API
  - Add error handling for corrupted files and browser compatibility
  - Create utility functions for audio preprocessing and normalization
  - Write unit tests for audio loading functionality
  - _Requirements: 1.3, 2.1_

- [x] 5. Build waveform visualization component
  - Create WaveformDisplay component using HTML5 Canvas
  - Implement useWaveform hook to generate waveform data from AudioBuffer
  - Add canvas drawing functions for red waveform visualization
  - Implement responsive canvas sizing and SoundCloud-style appearance
  - Add progress overlay functionality for analysis feedback
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 6. Implement BPM detection module
  - Create BPMDetector class with onset detection algorithms
  - Implement tempo estimation using autocorrelation or beat tracking
  - Add filtering and validation for BPM results within reasonable ranges
  - Create unit tests with known BPM audio samples
  - Integrate with Web Workers to prevent UI blocking
  - _Requirements: 2.1, 2.2, 2.4, 4.2_

- [x] 7. Implement key detection module
  - Create KeyDetector class with chroma feature extraction
  - Implement Krumhansl-Schmuckler key detection algorithm
  - Add major/minor key classification logic
  - Create unit tests with known key audio samples
  - Integrate with Web Workers for non-blocking processing
  - _Requirements: 2.1, 2.3, 4.2_

- [x] 8. Create audio processing engine and coordination
  - Build AudioProcessor class to coordinate key and BPM detection
  - Implement useAudioProcessor hook for React integration
  - Add progress tracking and timeout handling (30 second limit)
  - Create error handling for analysis failures and timeouts
  - Implement processing state management
  - _Requirements: 2.1, 2.2, 2.4, 4.2, 4.4_

- [x] 9. Build results display component with Chakra UI
  - Create ResultsDisplay component showing key and BPM prominently
  - Implement confidence score display as percentages
  - Add Chakra UI Cards for clean result presentation
  - Use simple color scheme: white background, black text
  - Add reset functionality for new file uploads
  - _Requirements: 2.3, 2.4, 3.4_

- [x] 10. Implement progress indicators and loading states
  - Add Chakra UI Progress component for analysis progress
  - Create loading states for file upload and processing
  - Implement progress overlay on waveform during analysis
  - Add estimated completion time display
  - Prevent multiple simultaneous uploads during processing
  - _Requirements: 3.2, 3.3, 4.4_

- [x] 11. Add comprehensive error handling and user feedback
  - Implement Chakra UI Alert components for error states
  - Create specific error messages for different failure scenarios
  - Add browser compatibility detection and warnings
  - Implement retry functionality for failed analyses
  - Create helpful error messages with actionable suggestions
  - _Requirements: 1.5, 2.5, 3.1, 4.3, 4.5_

- [x] 12. Create main app component and state management
  - Build main App component integrating all sub-components
  - Implement centralized state management for app state
  - Add component composition and data flow
  - Create responsive layout using Chakra UI layout components
  - Ensure proper cleanup of audio resources and memory management
  - _Requirements: 3.1, 3.4_

- [x] 13. Write comprehensive unit and integration tests
  - Create unit tests for all audio processing functions
  - Test file validation and error handling scenarios
  - Add integration tests for complete upload-to-results workflow
  - Test waveform generation and canvas rendering
  - Create tests with various audio file formats and edge cases
  - _Requirements: 2.1, 2.2, 4.1, 4.2_

- [x] 14. Implement responsive design and mobile optimization
  - Ensure all components work properly on mobile devices
  - Test touch interactions for file upload
  - Optimize canvas rendering for different screen sizes
  - Verify Chakra UI responsive behavior across devices
  - Test performance on mobile browsers
  - _Requirements: 3.1_

- [x] 15. Replace custom algorithms with essentia.js implementation
  - Install essentia.js dependency for accurate audio analysis
  - Replace custom BPM detection with essentia.js tempo estimation algorithms
  - Replace custom key detection with essentia.js key detection algorithms
  - Ensure accuracy meets requirements (±2 BPM tolerance for BPM detection)
  - _Requirements: 1.3, 2.1, 2.2_

- [x] 16. Match essentia.js web demo output accuracy
  - Research essentia.js web demo implementation and parameters
  - Update BPM detection to use exact same essentia.js algorithms and settings as web demo
  - Update key detection to use exact same essentia.js algorithms and settings as web demo
  - Test against same audio samples used in essentia.js web demo
  - Ensure output matches web demo results exactly for reference tracks
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 17. Improve analysis accuracy and validation
  - ✅ Implemented fallback mechanisms for edge cases (fallback algorithms when essentia.js fails)
  - ✅ Validated BPM detection accuracy with real audio samples (72 BPM detected for test file)
  - ✅ Validated key detection accuracy with real audio samples (F minor detected with 100% confidence)
  - ✅ Fine-tuned algorithm parameters to match essentia.js web demo exactly
  - ✅ Implemented confidence score reporting (key: 100%, BPM: 80% for test file)
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 18. Fix file upload issues and improve reliability
  - ✅ Resolved NotReadableError by preventing premature file input reset
  - ✅ Added comprehensive error handling for file reading failures
  - ✅ Implemented proper file reference management to prevent stale references
  - ✅ Added detailed logging for debugging file upload issues
  - ✅ Tested with large files (4.4MB MP3) successfully
  - _Requirements: 1.1, 1.2, 4.1_

- [x] 19. Optimize audio preprocessing for web demo compatibility
  - ✅ Implemented exact same monomix algorithm as web demo (0.5 * (left + right))
  - ✅ Implemented exact same downsampling algorithm to 16kHz as web demo
  - ✅ Removed redundant preprocessing to avoid double processing
  - ✅ Updated AudioProcessor to handle preprocessing exactly like web demo
  - ✅ Verified preprocessing works correctly with unit tests
  - _Requirements: 2.1, 2.2_

- [x] 20. Improve BPM display with smart tempo suggestions
  - Add contextual BPM suggestions for half-time/double-time detection
  - Display helpful tips when BPM might be detected at half-time
  - Provide educational context about common BPM detection issues
  - Implement genre-aware suggestions (hip-hop often detects at half-time)
  - Maintain clean, non-overwhelming UI while being informative
  - _Requirements: 2.4, 3.4_

- [x] 21. Add advanced performance optimizations and memory management (Optional)
  - Implement caching for repeated analysis of same files
  - Add progressive loading for large audio files
  - Optimize waveform rendering for large audio files with downsampling
  - Add memory usage monitoring and garbage collection triggers
  - Implement file chunking for very large files
  - _Requirements: 4.2, 4.4_

  - [x] 22. Improve file upload progress bar smoothness and accuracy
  - Fix progress bar that stops moving during file loading and jumps at the end
  - Implement smoother progress updates during file reading and audio decoding phases
  - Add more granular progress tracking for large file processing
  - Ensure progress bar moves continuously rather than in discrete jumps
  - Improve user experience with realistic progress indication throughout upload process
  - Test with various file sizes to ensure consistent smooth progress behavior
  - _Requirements: 3.2, 3.3, 4.4_

- [ ] 23. Implement advanced audio analysis pipeline with ensemble methods and spectral analysis
  - Add pre-filtering with essentia.BandPass (50-8000 Hz) and essentia.Scale for normalization
  - Replace single 15% audio slice with multi-slice energy-based sampling strategy across the full track
  - Implement spectral-based analysis using essentia.SpectralPeaks and essentia.HPCP for enhanced key detection
  - Use essentia.RhythmExtractor and essentia.OnsetDetection for improved tempo analysis with confidence scoring
  - Implement ensemble aggregation with mode voting for key results and median for BPM results across multiple slices
  - Add frequency domain analysis to separate tonal vs rhythmic content using available spectral tools
  - Create A/B evaluation harness with curated test set and ground-truth key/BPM values (debug mode only)
  - Integrate evaluation interface with debug mode system (?debug=true or ?eval=true)
  - Add side-by-side algorithm comparison UI for developers
  - Implement parameter tuning controls for BandPass cutoffs, slice count, and RhythmExtractor thresholds
  - Add per-track failure analysis and diagnostic logging for iterative improvement (debug mode)
  - Include accuracy metrics display and export functionality for development use
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 24. Fix alternative tempo display logic for BPM detection
  - Investigate cases where BPM is detected at double-time when it's actually half-time
  - Update alternative tempo display to show half-time (72 BPM) instead of detected tempo (144 BPM) when appropriate
  - Implement logic to determine when detected BPM is likely double-time vs actual tempo
  - Hide alternative tempo display entirely if no valid alternative exists
  - Ensure tooltip shows correct half-time BPM (72) when main detection shows double-time (144)
  - Test with various hip-hop instrumentals to validate detection accuracy
  - _Requirements: 2.4, 3.4_

- [ ] 25. Implement confidence scoring for alternative tempo suggestions using essentia.js
  - Use BeatTrackerDegara or BeatTrackerMultiFeature to analyze beat positions and spacing
  - Implement onset rate analysis using OnsetRate or OnsetDetection to measure transient density
  - Calculate confidence scores for half-time/double-time suggestions based on beat consistency
  - Use higher onset rates to indicate faster actual tempos (supporting double-time suggestions)
  - Update TempoSuggestions component to display calculated confidence scores for alternatives
  - Add logic to prefer suggestions with higher confidence scores in the UI
  - _Requirements: 2.4, 3.4_
- [ ] 26. Optimize fallback algorithms for better performance and accuracy
  - Improve fallback BPM detection algorithm performance to reduce timeout issues
  - Optimize fallback key detection algorithm for better accuracy and speed
  - Add more sophisticated onset detection for BPM analysis
  - Implement better chroma feature extraction for key detection
  - Add algorithm parameter tuning for hip-hop instrumental analysis
  - Reduce computational complexity while maintaining accuracy
  - Add better error handling and edge case management in fallback algorithms
  - _Requirements: 2.1, 2.2, 4.2_
  
- [ ] 27. Update README with comprehensive documentation
  - Create detailed README.md with project overview and feature description
  - Add installation and setup instructions for development
  - Document supported audio formats and file size limits
  - Include usage instructions with screenshots or examples
  - Add technical details about essentia.js integration and algorithms used
  - Document the technology stack (React, TypeScript, Chakra UI, essentia.js)
  - Include troubleshooting section for common issues
  - Add performance considerations and browser compatibility information
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1_

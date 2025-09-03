# Audio Key & BPM Analyzer

A web application that analyzes hip hop instrumental audio files to automatically detect their musical key and beats per minute (BPM) using advanced audio processing algorithms. Built with React, TypeScript, and essentia.js for accurate, client-side audio analysis.

## Features

- **Automatic Key Detection**: Identifies musical keys (major/minor) with confidence scores
- **BPM Detection**: Accurately detects tempo within ±2 BPM tolerance
- **Multiple Audio Formats**: Supports MP3, WAV, FLAC, and M4A files
- **Real-time Waveform Visualization**: SoundCloud-style red waveform display
- **Client-side Processing**: All analysis happens locally in your browser for privacy
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Progress Tracking**: Real-time progress indicators with estimated completion times
- **Smart Tempo Suggestions**: Contextual BPM suggestions for half-time/double-time detection
- **Performance Monitoring**: Debug mode with memory usage and cache statistics

## Technology Stack

- **Frontend Framework**: React 19 with TypeScript
- **UI Framework**: Chakra UI for consistent, accessible design
- **Audio Processing**: Web Audio API for audio file handling
- **Audio Analysis**: essentia.js for key detection and BPM analysis algorithms
- **Visualization**: HTML5 Canvas for waveform rendering
- **Build Tool**: Vite for fast development and optimized builds
- **Testing**: Vitest with React Testing Library
- **Additional Libraries**:
  - chroma-js for color manipulation
  - web-audio-beat-detector for fallback BPM detection
  - framer-motion for smooth animations

## Installation and Setup

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager
- Modern web browser with Web Audio API support

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd audio-key-bpm-analyzer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production-ready application
- `npm run preview` - Preview production build locally
- `npm run test` - Run unit tests in watch mode
- `npm run test:run` - Run all tests once
- `npm run lint` - Run ESLint code analysis

## Usage Instructions

### Basic Usage

1. **Upload Audio File**: 
   - Click the upload area or drag and drop an audio file
   - Supported formats: MP3, WAV, FLAC, M4A
   - Maximum file size: 50MB

2. **View Analysis Progress**:
   - Watch the real-time progress bar during file loading and analysis
   - See the red waveform visualization appear as the file loads
   - Analysis typically completes within 30 seconds

3. **Review Results**:
   - Musical key is displayed with confidence percentage
   - BPM is shown as a whole number with confidence score
   - Smart tempo suggestions appear for potential half-time/double-time detection

4. **Upload Another File**:
   - Click "Analyze Another File" to reset and upload a new audio file
   - Previous analysis results are cleared automatically

### Debug Mode

Enable debug mode by adding `?debug=true` to the URL for additional features:

- Memory usage monitoring
- Cache statistics and controls
- Detailed processing information
- Performance metrics

Example: `http://localhost:5173/?debug=true`

## Supported Audio Formats and Limits

### Supported Formats
- **MP3**: Most common format, widely supported
- **WAV**: Uncompressed audio, highest quality
- **FLAC**: Lossless compression, excellent quality
- **M4A**: Apple's audio format, good compression

### File Size Limits
- **Maximum file size**: 50MB
- **Recommended duration**: Up to 10 minutes for optimal performance
- **Processing timeout**: 30 seconds maximum analysis time

### Audio Quality Requirements
- **Sample rate**: Any standard rate (44.1kHz, 48kHz, etc.)
- **Bit depth**: 16-bit or 24-bit recommended
- **Channels**: Mono or stereo (automatically converted to mono for analysis)

## Technical Details

### essentia.js Integration

The application uses essentia.js, a JavaScript port of the Essentia audio analysis library, for accurate audio analysis:

#### Key Detection Algorithm
- **Chroma Feature Extraction**: Analyzes harmonic content across 12 pitch classes
- **Krumhansl-Schmuckler Algorithm**: Statistical key detection method
- **Major/Minor Classification**: Distinguishes between major and minor keys
- **Confidence Scoring**: Provides reliability metrics for detected keys

#### BPM Detection Algorithm
- **Onset Detection**: Identifies rhythmic events in the audio
- **Tempo Estimation**: Uses autocorrelation and beat tracking algorithms
- **Rhythm Extraction**: Advanced tempo analysis with multiple feature extraction
- **Validation**: Filters results within reasonable BPM ranges (60-200 BPM)

### Audio Processing Pipeline

1. **File Loading**: Web Audio API decodes audio files into AudioBuffer
2. **Preprocessing**: 
   - Converts stereo to mono using `0.5 * (left + right)` formula
   - Downsamples to 16kHz for consistent analysis
   - Normalizes audio levels
3. **Feature Extraction**: essentia.js extracts musical features
4. **Analysis**: Parallel key and BPM detection algorithms
5. **Post-processing**: Confidence scoring and result validation

### Performance Optimizations

- **Web Workers**: Audio analysis runs in background threads to prevent UI blocking
- **Progressive Loading**: Large files are processed in chunks
- **Memory Management**: Automatic cleanup of audio buffers and resources
- **Caching**: Results are cached to avoid re-analysis of identical files
- **Waveform Optimization**: Downsampling for large audio files to improve rendering performance

## Browser Compatibility

### Supported Browsers
- **Chrome**: Version 66+ (recommended)
- **Firefox**: Version 60+
- **Safari**: Version 14.1+
- **Edge**: Version 79+

### Required Web APIs
- **Web Audio API**: For audio file processing and analysis
- **File API**: For drag-and-drop file uploads
- **Canvas API**: For waveform visualization
- **Web Workers**: For non-blocking audio processing

### Mobile Support
- **iOS Safari**: Version 14.5+
- **Chrome Mobile**: Version 66+
- **Samsung Internet**: Version 10+

## Troubleshooting

### Common Issues

#### File Upload Problems
**Issue**: "File format not supported" error
- **Solution**: Ensure file is MP3, WAV, FLAC, or M4A format
- **Check**: File extension matches actual format

**Issue**: "File too large" error
- **Solution**: Compress file or use shorter audio clips
- **Limit**: Maximum 50MB file size

#### Analysis Failures
**Issue**: "Analysis timeout" after 30 seconds
- **Solution**: Try shorter audio files or refresh the page
- **Cause**: Very complex audio or browser performance issues

**Issue**: Inaccurate BPM detection
- **Solution**: Check if result shows double-time or half-time
- **Note**: Hip-hop often detects at half the actual tempo

#### Browser Compatibility
**Issue**: "Web Audio API not supported"
- **Solution**: Update to a modern browser version
- **Alternative**: Try Chrome or Firefox for best compatibility

**Issue**: Poor performance on mobile
- **Solution**: Close other browser tabs and apps
- **Recommendation**: Use smaller files on mobile devices

### Performance Issues

#### Slow Analysis
- **Close unnecessary browser tabs**
- **Ensure sufficient available RAM (2GB+ recommended)**
- **Try smaller audio files (under 5MB)**
- **Disable browser extensions that might interfere**

#### Memory Issues
- **Refresh the page between analyses**
- **Enable debug mode to monitor memory usage**
- **Use shorter audio clips for analysis**

#### Waveform Display Problems
- **Ensure browser supports HTML5 Canvas**
- **Try refreshing the page**
- **Check browser console for JavaScript errors**

### Getting Help

If you encounter issues not covered here:

1. **Check Browser Console**: Look for JavaScript errors or warnings
2. **Try Different File**: Test with a known working audio file
3. **Update Browser**: Ensure you're using a supported browser version
4. **Clear Cache**: Clear browser cache and cookies
5. **Disable Extensions**: Temporarily disable browser extensions

## Performance Considerations

### Optimal Usage
- **File Size**: 5-15MB files provide best balance of quality and speed
- **Duration**: 3-6 minute tracks are ideal for analysis
- **Format**: MP3 files typically process fastest
- **Browser**: Chrome provides best performance

### System Requirements
- **RAM**: 4GB+ recommended for large files
- **CPU**: Modern multi-core processor recommended
- **Storage**: Minimal local storage used (cache only)
- **Network**: No internet required after initial page load

### Memory Management
- Audio buffers are automatically cleaned up after analysis
- Cache is limited to prevent excessive memory usage
- Garbage collection is triggered for large files
- Debug mode provides real-time memory monitoring

## Development

### Project Structure
```
src/
├── components/          # React UI components
├── hooks/              # Custom React hooks
├── utils/              # Utility functions and audio processing
├── types/              # TypeScript type definitions
├── workers/            # Web Workers for background processing
└── __tests__/          # Test files
```

### Key Components
- **FileUpload**: Handles file selection and validation
- **WaveformDisplay**: Canvas-based waveform visualization
- **ResultsDisplay**: Shows analysis results with confidence scores
- **AudioProcessor**: Coordinates audio analysis pipeline
- **MemoryMonitor**: Performance monitoring (debug mode)

### Testing
The application includes comprehensive test coverage:
- Unit tests for all audio processing functions
- Integration tests for complete workflows
- Component tests for UI interactions
- Edge case testing for various audio formats

Run tests with:
```bash
npm run test        # Watch mode
npm run test:run    # Single run
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.

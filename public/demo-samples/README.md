# Demo Samples Directory

This directory contains hip-hop instrumental audio files for the demo feature.

## Required Files

Add the following hip-hop instrumental files to this directory:

### 1. Classic Hip-Hop Beat
- **File**: `classic-hip-hop-beat.mp3`
- **Expected**: C Minor, 90 BPM
- **Duration**: ~30 seconds
- **Size**: Under 5MB
- **Description**: Classic 90s-style hip-hop instrumental with heavy kick and snare patterns

### 2. Trap Instrumental
- **File**: `trap-instrumental.mp3`
- **Expected**: A Minor, 140 BPM
- **Duration**: ~25 seconds
- **Size**: Under 5MB
- **Description**: Modern trap instrumental with heavy 808s, hi-hats, and dark minor key progression

### 3. Boom Bap Beat
- **File**: `boom-bap-beat.mp3`
- **Expected**: F Minor, 85 BPM
- **Duration**: ~28 seconds
- **Size**: Under 5MB
- **Description**: Traditional boom bap instrumental with classic drum breaks and soulful samples

### 4. Modern Hip-Hop Track
- **File**: `modern-hip-hop-track.mp3`
- **Expected**: G Minor, 120 BPM
- **Duration**: ~32 seconds
- **Size**: Under 5MB
- **Description**: Contemporary hip-hop instrumental blending traditional elements with modern production techniques

## File Requirements

- **Format**: MP3 (recommended for web compatibility)
- **Quality**: 44.1kHz, 16-bit minimum
- **Size**: Under 5MB each for fast loading
- **Duration**: 15-30 seconds for quick analysis
- **Content**: Hip-hop instrumentals only (no vocals)

## Usage

These files will be loaded by the demo feature to showcase the application's key and BPM detection capabilities using real hip-hop instrumentals.

## Metadata Configuration

Once files are added, update the metadata in `src/utils/demoSamples.ts` with the actual values:

### Step 1: Analyze Your Files
1. Upload each hip-hop instrumental file to the application
2. Run the analysis to get the detected key and BPM
3. Note the file duration and size

### Step 2: Update Sample Metadata
In `src/utils/demoSamples.ts`, update each sample in the `HIP_HOP_DEMO_SAMPLES` array:

```typescript
{
  id: 'classic-hip-hop-beat',
  name: 'Classic Hip-Hop Beat',
  description: 'A classic 90s-style hip-hop instrumental...',
  subgenre: 'classic',
  expectedKey: 'C Minor',        // ← Update with detected key
  expectedBPM: 90,              // ← Update with detected BPM
  duration: 30,                 // ← Update with actual duration
  fileSize: 1024 * 1024,       // ← Update with actual file size
  filePath: '/demo-samples/classic-hip-hop-beat.mp3',
  hipHopCharacteristics: {
    tempoStyle: 'laid-back',
    keyType: 'minor',           // ← Update based on detected key
    productionEra: '90s',
    typicalUse: 'freestyle'
  }
}
```

### Step 3: Verify Accuracy
- Test each sample to ensure the analysis results match the expected values
- Adjust `expectedKey` and `expectedBPM` if needed
- Update `hipHopCharacteristics.keyType` to match the detected key mode

### Step 4: Test Demo Mode
- Enable demo mode in the application
- Select each sample and verify the analysis works correctly
- Check that the educational content displays properly

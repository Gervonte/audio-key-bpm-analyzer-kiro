# Demo Feature UI Mockup

## Overview
This document outlines the visual design and user interface for the demo feature, showing how it integrates with the existing application.

## Related Documentation
- **[DEMO_FEATURE_HIP_HOP_FOCUSED.md](./DEMO_FEATURE_HIP_HOP_FOCUSED.md)** - Comprehensive implementation plan and architecture
- **[DEMO_FEATURE_TASKS.md](./DEMO_FEATURE_TASKS.md)** - Detailed task breakdown and timeline
- **[DEMO_FEATURE_QUICK_START.md](./DEMO_FEATURE_QUICK_START.md)** - Simplified implementation guide with code examples

## Main App Layout

### Current Layout (Before Demo Feature)
```
┌─────────────────────────────────────────────────────────────┐
│                    Audio Key & BPM Analyzer                  │
│              Upload your hip hop instrumental               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Drag & Drop Audio File Here               │   │
│  │                                                     │   │
│  │                [Choose File]                       │   │
│  │                                                     │   │
│  │        Supported formats: MP3, WAV, FLAC, M4A      │   │
│  │        Maximum file size: 50MB                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Waveform Display                      │   │
│  │              (Red waveform visualization)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Analysis Results                      │   │
│  │                                                     │   │
│  │  Key: C Major (85% confidence)                     │   │
│  │  BPM: 120 (92% confidence)                         │   │
│  │                                                     │   │
│  │  [Analyze Another File]                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Enhanced Layout (With Demo Feature - Recommended Approach)
```
┌─────────────────────────────────────────────────────────────┐
│                    Audio Key & BPM Analyzer                  │
│              Upload your hip hop instrumental               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Demo Mode: Try hip-hop instrumental samples        │   │
│  │  Upload Mode: Upload your own hip-hop instrumentals │   │
│  │                                                     │   │
│  │  [Demo Mode Toggle Switch]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Drag & Drop Audio File Here               │   │
│  │                                                     │   │
│  │                [Choose File]                       │   │
│  │                                                     │   │
│  │        Supported formats: MP3, WAV, FLAC, M4A      │   │
│  │        Maximum file size: 50MB                     │   │
│  │                                                     │   │
│  │  OR                                                 │   │
│  │                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │ Classic     │  │ Trap        │  │ Boom Bap    │   │   │
│  │  │ Hip-Hop     │  │ Instrumental│  │ Beat        │   │   │
│  │  │ Beat        │  │             │  │             │   │   │
│  │  │             │  │             │  │             │   │   │
│  │  │ 90 BPM      │  │ 140 BPM     │  │ 85 BPM      │   │   │
│  │  │ C Minor     │  │ A Minor     │  │ F Minor     │   │   │
│  │  │             │  │             │  │             │   │   │
│  │  │ [Try This]  │  │ [Try This]  │  │ [Try This]  │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Waveform Display                      │   │
│  │              (Red waveform visualization)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Analysis Results                      │   │
│  │                                                     │   │
│  │  Demo Mode: Analyzing hip-hop instrumental sample  │   │
│  │                                                     │   │
│  │  Key: C Minor (85% confidence)                     │   │
│  │  BPM: 90 (92% confidence)                          │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │        Hip-Hop Production Insights         │   │   │
│  │  │                                             │   │   │
│  │  │  Expected: C Minor, 90 BPM                 │   │   │
│  │  │  Detected: C Minor, 90 BPM                 │   │   │
│  │  │                                             │   │   │
│  │  │  Key Accuracy: 100% ✓                     │   │   │
│  │  │  BPM Accuracy: 100% ✓                     │   │   │
│  │  │                                             │   │   │
│  │  │  💡 This classic beat is typical of 90s    │   │   │
│  │  │     hip-hop production with laid-back      │   │   │
│  │  │     tempo perfect for freestyle rap.       │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  [Try Another Sample] [Upload Your Own]            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Demo Mode Toggle
```
┌─────────────────────────────────────────────────────────────┐
│  Demo Mode: Try sample audio files                          │
│  Upload Mode: Upload your own files                        │
│                                                             │
│  [Demo Mode Toggle Switch]                                 │
└─────────────────────────────────────────────────────────────┘
```

**Design Specifications:**
- **Background**: White (#FFFFFF) - follows minimal color palette
- **Border**: Red/coral border when active, gray border when inactive
- **Switch**: Chakra UI Switch component with red color scheme
- **Text**: Black text (#000000) for clear contrast
- **Spacing**: 16px padding, 8px gap between elements

### 2. Sample Selection Interface
```
┌─────────────────────────────────────────────────────────────┐
│  Sample Selection                                           │
│                                                             │
│  [All] [Classic] [Trap] [Boom Bap] [Modern]               │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ Classic     │  │ Trap        │  │ Boom Bap    │           │
│  │ Hip-Hop     │  │ Instrumental│  │ Beat        │           │
│  │ Beat        │  │             │  │             │           │
│  │             │  │             │  │             │           │
│  │ 90 BPM      │  │ 140 BPM     │  │ 85 BPM      │           │
│  │ C Minor     │  │ A Minor     │  │ F Minor     │           │
│  │             │  │             │  │             │           │
│  │ [Try This]  │  │ [Try This]  │  │ [Try This]  │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

**Design Specifications:**
- **Category Buttons**: Small buttons with red color scheme
- **Sample Cards**: 300px width, rounded corners, shadow
- **Card Layout**: Vertical stack with title, genre badge, metadata, button
- **Genre Badges**: Gray background with red text, or red background with white text
- **Grid**: Responsive grid (1 column on mobile, 2-3 on desktop)
- **Spacing**: 16px gap between cards, 8px gap between elements

### 3. Sample Card Design
```
┌─────────────────────────────────────────────────────────────┐
│  Classic Hip-Hop Beat                          [✓]        │
│  [CLASSIC]                                      [Badge]    │
│                                                             │
│  A classic 90s-style hip-hop instrumental with            │
│  heavy kick and snare patterns, perfect for               │
│  freestyle and underground rap                            │
│                                                             │
│  Expected: C Minor, 90 BPM                                 │
│  Duration: 30s • Era: 90s • Style: Laid-back             │
│                                                             │
│  [Try This Beat]                                           │
└─────────────────────────────────────────────────────────────┘
```

**Design Specifications:**
- **Card Size**: 300px width, auto height
- **Border**: 2px solid, red/coral when selected, gray when not
- **Background**: White with red/coral tint when selected
- **Title**: Bold, 18px font size
- **Genre Badge**: Small badge with color coding
- **Description**: 14px font size, gray color
- **Metadata**: 12px font size, gray color
- **Button**: Red/coral color scheme, full width
- **Selection Indicator**: Check icon in top-right corner

### 4. Demo Comparison Display
```
┌─────────────────────────────────────────────────────────────┐
│  Demo Comparison                                            │
│                                                             │
│  Expected Results:          Detected Results:              │
│  ┌─────────────────┐        ┌─────────────────┐            │
│  │ Key: C Minor    │        │ Key: C Minor    │            │
│  │ BPM: 90         │        │ BPM: 90         │            │
│  │ Confidence: 100%│        │ Confidence: 85% │            │
│  └─────────────────┘        └─────────────────┘            │
│                                                             │
│  Accuracy Analysis:                                         │
│  Key Detection: 100% ✓ (Perfect match!)                    │
│  BPM Detection: 100% ✓ (Perfect match!)                    │
│                                                             │
│  💡 Hip-Hop Production Insight: This classic beat is       │
│  typical of 90s hip-hop production with laid-back tempo    │
│  perfect for freestyle rap. Minor keys are common in       │
│  hip-hop production for their darker, more aggressive      │
│  sound.                                                    │
└─────────────────────────────────────────────────────────────┘
```

**Design Specifications:**
- **Layout**: Side-by-side comparison with accuracy analysis
- **Background**: Light gray background
- **Border**: Gray border with rounded corners
- **Cards**: White background with shadow
- **Accuracy**: Color-coded (red/coral for perfect, gray for partial, red/coral for poor)
- **Tips**: Light gray background with info icon
- **Spacing**: 16px padding, 8px gap between elements

## Responsive Design

### Mobile Layout (320px - 768px)
```
┌─────────────────────────────────────────────────────────────┐
│                    Audio Key & BPM Analyzer                  │
│              Upload your hip hop instrumental               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Demo Mode: Try sample audio files                  │   │
│  │  Upload Mode: Upload your own files                │   │
│  │                                                     │   │
│  │  [Demo Mode Toggle Switch]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Sample Selection                     │   │
│  │                                                     │   │
│  │  [All] [Hip-Hop] [Electronic] [Jazz] [Classical]   │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ Hip-Hop Beat                                │   │   │
│  │  │ [Hip-Hop]                                   │   │   │
│  │  │                                             │   │   │
│  │  │ 90 BPM, C Minor                            │   │   │
│  │  │                                             │   │   │
│  │  │ [Try This Sample]                           │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ Electronic Track                             │   │   │
│  │  │ [Electronic]                                │   │   │
│  │  │                                             │   │   │
│  │  │ 128 BPM, A Major                            │   │   │
│  │  │                                             │   │   │
│  │  │ [Try This Sample]                           │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Waveform Display                      │   │
│  │              (Red waveform visualization)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Analysis Results                      │   │
│  │                                                     │   │
│  │  Demo Mode: Analyzing sample audio file             │   │
│  │                                                     │   │
│  │  Key: C Major (85% confidence)                     │   │
│  │  BPM: 120 (92% confidence)                         │   │
│  │                                                     │   │
│  │  [Try Another Sample] [Upload Your Own]            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Mobile Design Specifications:**
- **Single Column**: All elements stack vertically
- **Full Width**: Cards take full width of container
- **Touch Targets**: Minimum 44px height for buttons
- **Spacing**: 16px padding, 8px gap between elements
- **Text Size**: Slightly larger for mobile readability
- **Button Size**: Larger buttons for touch interaction

## Color Scheme

### Primary Colors (Following Project Design System)
- **White**: #FFFFFF (Background, cards)
- **Black**: #000000 (Text, labels)
- **Red Shades**: Dynamic waveform colors based on amplitude
  - **Light Pink**: rgba(255, 182, 193, 0.4-0.8) - Quiet parts
  - **Coral**: rgba(255, 100, 80, 0.7-0.9) - Medium parts  
  - **Red**: rgba(255, 0, 0, 0.8-0.9) - Loud parts
  - **Hot Pink**: rgba(255, 69, 100, 0.9-1.0) - Very loud parts

### Secondary Colors
- **Gray**: #718096 (Text, borders, inactive states)
- **Gray Light**: #F7FAFC (Backgrounds, cards)
- **Gray Dark**: #4A5568 (Text, labels)

### Status Colors (Minimal Design System)
- **Success**: Red shades (#FF0000 or coral #FF6446) with checkmark
- **Warning**: Gray (#718096) with exclamation
- **Error**: Red shades (#FF0000 or coral #FF6446) with X mark

### Hip-Hop Subgenre Colors (Using Design System Only)
- **Classic**: Red (#FF0000) or Coral (#FF6446)
- **Trap**: Gray (#718096) with red accent (#FF0000)
- **Boom Bap**: Gray (#718096) with coral accent (#FF6446)
- **Modern**: Gray (#718096) with hot pink accent (#FF4564)

## Typography

### Font Sizes
- **Title**: 24px (Chakra UI heading size="xl")
- **Subtitle**: 18px (Chakra UI heading size="lg")
- **Body**: 16px (Chakra UI text size="md")
- **Small**: 14px (Chakra UI text size="sm")
- **Caption**: 12px (Chakra UI text size="xs")

### Font Weights
- **Bold**: 700 (Chakra UI fontWeight="bold")
- **Medium**: 500 (Chakra UI fontWeight="medium")
- **Normal**: 400 (Chakra UI fontWeight="normal")

## Accessibility

### ARIA Labels
- **Toggle Switch**: "Toggle demo mode"
- **Sample Cards**: "Select {sample name} for analysis"
- **Category Buttons**: "Filter samples by {category}"
- **Comparison**: "Analysis comparison results"

### Keyboard Navigation
- **Tab Order**: Toggle → Categories → Samples → Results
- **Enter/Space**: Activate buttons and toggles
- **Arrow Keys**: Navigate between samples
- **Escape**: Close modals or return to main view

### Screen Reader Support
- **Descriptive Text**: Clear descriptions for all interactive elements
- **Status Updates**: Announce loading states and results
- **Error Messages**: Clear error descriptions
- **Progress Indicators**: Announce progress updates

## Animation & Transitions

### Transitions
- **Mode Switch**: 200ms ease-in-out
- **Sample Selection**: 150ms ease-in-out
- **Card Hover**: 100ms ease-in-out
- **Loading States**: 300ms ease-in-out

### Animations
- **Sample Loading**: Pulse animation for loading states
- **Success States**: Check mark animation
- **Error States**: Shake animation for errors
- **Progress**: Smooth progress bar animation

This UI mockup provides a comprehensive visual guide for implementing the demo feature while maintaining consistency with the existing application design.

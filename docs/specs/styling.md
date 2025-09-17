Transform this medical transcription app using Tailwind CSS and shadcn/ui components with the following design direction:

## Visual Design Direction
Inspired by:
- Barnes & Noble: Warm, literary sophistication with serif/sans-serif font pairing, subtle paper textures, and rich burgundy/forest green accents
- Black Watch Global: Premium dark interfaces with high contrast, refined typography, and strategic use of negative space
- Cemento: Brutalist minimalism with bold geometric shapes, monospace accents, and confident use of scale

## Core Design Principles
1. **Typography Hierarchy**: 
   - Headers: Bold serif (Playfair Display or similar) for trustworthy medical authority
   - Body: Clean sans-serif (Inter) for readability
   - Medical terms: Monospace (JetBrains Mono) to distinguish drug names/dosages

2. **Color Palette**:
   - Background: Off-white (#FAFAF8) with subtle paper texture overlay
   - Primary: Deep burgundy (#6B1F1F) for critical actions
   - Secondary: Forest green (#1B4332) for success states
   - Accent: Warm amber (#F59E0B) for warnings/medical highlights
   - Dark mode: Rich charcoal (#1C1917) with cream text

3. **Layout Improvements**:
   - Replace centered timer with left-aligned status panel
   - Move recording controls to persistent bottom bar (thumb-reachable)
   - Add visual waveform during recording for feedback
   - Use card-based sections with subtle shadows (not flat)

## UX Heuristics Implementation

### Visibility of System Status
- Replace static timer with live waveform visualization
- Add subtle pulsing dot when recording (not just red)
- Show estimated transcription time before starting
- Progress stages in stepped sidebar (not modal)

### User Control & Freedom
- Add "Pause" button between Start/Stop
- Include "Discard Recording" with confirmation
- Auto-save drafts every 30 seconds
- Undo/Redo for last 10 actions

### Recognition Over Recall
- Show recent patients in dropdown (not blank field)
- Display last 3 recordings as cards below main controls
- Visual mode indicator with icon + color (not just toggle)

### Aesthetic & Minimalist Design
- Remove version number from main view (move to settings)
- Combine mode toggle into recording button dropdown
- Use progressive disclosure for advanced options

## Component Specifications

### Recording Interface
<Card className="border-0 shadow-xl bg-gradient-to-br from-stone-50 to-amber-50/20">
  <div className="flex items-start justify-between p-8">
    <!-- Left: Status Panel -->
    <div className="space-y-4">
      <Badge variant="outline" className="font-mono text-xs">
        High Accuracy Mode
      </Badge>
      <div className="space-y-1">
        <h2 className="font-serif text-3xl text-stone-900">Ready to Record</h2>
        <p className="text-stone-600">10 minute maximum • Processes in ~2-3 minutes</p>
      </div>
    </div>
    
    <!-- Right: Recent Sessions -->
    <div className="flex gap-2">
      <!-- Mini cards showing last 3 recordings -->
    </div>
  </div>
  
  <!-- Waveform Visualization Area -->
  <div className="h-32 bg-stone-900/5 backdrop-blur">
    <!-- Canvas for waveform -->
  </div>
  
  <!-- Bottom Control Bar -->
  <div className="flex items-center justify-center gap-4 p-6 bg-white/80 backdrop-blur">
    <Button size="lg" className="gap-2 px-8 py-6 text-lg font-medium">
      <Mic className="w-5 h-5" />
      Start Recording
    </Button>
  </div>
</Card>

### Transcription View
- Split layout: Audio timeline on left (25%), transcript on right (75%)
- Medical terms highlighted with dashed underline (not harsh colors)
- Confidence indicated by underline opacity (not intrusive badges)
- Floating action bar for Edit/Save/Export (not inline buttons)

### Visual Polish
- Subtle grain texture overlay: bg-[url('/paper-texture.svg')]
- Box shadows: shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.05)]
- Micro-animations: Recording button scales on hover (scale-105)
- Loading states: Skeleton screens, not spinners

## Implementation Priority
1. Fix layout hierarchy (status left, controls bottom)
2. Add waveform visualization
3. Implement card-based recent recordings
4. Apply typography system
5. Add texture/depth with shadows and gradients
6. Polish with micro-interactions

This design balances medical professionalism with modern warmth, avoiding both sterile clinical aesthetics and trendy but impractical interfaces.
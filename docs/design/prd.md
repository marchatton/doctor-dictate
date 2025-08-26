# PRD: PsychScribe - Local-First Dictation for Psychiatrists

A desktop application for solo psychiatrists that accurately transcribes clinical dictation locally, optimized for psychiatric medication terminology.

## TL;DR

Solo psychiatrists waste hours on documentation and face privacy concerns with cloud dictation. PsychScribe uses Whisper AI locally to achieve >95% accuracy on psychiatric terms. This is a side project targeting 10 paid users initially. Phase 0 validates accuracy, V0 delivers basic transcription, V1 adds encryption and templates.

---

## Phase 0: Proof of Concept (1 Week) - MUST COMPLETE FIRST

### Goal
Prove Whisper can achieve >95% accuracy on psychiatric terminology before building anything else.

### Scope
- Python script or command-line tool
- Record 10-minute audio samples
- Test Whisper models for accuracy
- No UI, no features, just validation

### Technical Approach

**Testing Multiple Whisper Options**:
1. **Whisper large-v3** (most accurate, 1.55GB, ~3-5 min for 10-min audio)
2. **Whisper medium.en** (faster, 764MB, ~1-2 min for 10-min audio)
3. **Whisper small.en** (fastest, 244MB, ~30-60 sec for 10-min audio)

### Privacy Note on Whisper
- Whisper processes audio 100% locally - no data leaves the device
- However, the model was trained on internet data and may have seen medical content
- Still more private than any cloud service, but not "zero knowledge"

### Success Criteria
- Overall Word Error Rate: <5%
- Medication name accuracy: >95%
- Common psychiatric drugs perfect: sertraline, fluoxetine, aripiprazole, lamotrigine
- If these aren't met, project stops here

### Test Dataset Required
- Record yourself reading medication lists and dosages
- Use text-to-speech to generate sample psychiatric dictations
- Create 10 test recordings with known transcripts

---

## Goals

### Business Goals (Side Project Scope)
- Achieve 10 paid users at $49/month within 2 months
- Learn Electron/desktop development skills
- Validate concept for potential future expansion
- Build portfolio piece demonstrating AI integration

### User Goals  
- Save >50% time on medication management notes
- Achieve >95% transcription accuracy for medications
- Keep patient data processing local
- Simple workflow without learning curve

### Non-Goals
- Windows/mobile support
- Cloud features of any kind
- Direct EHR integration
- Multi-user support
- HIPAA certification (users responsible for their compliance)

---

## V0: Basic Transcription Tool (3 Weeks)

### Scope
- Electron desktop app (works on macOS)
- Record audio, transcribe, display text
- Basic editing and export
- NO encryption in V0 (moved to V1)
- NO templates in V0 (moved to V1)

### Why Electron Instead of Native macOS
- Zero macOS development experience = 6+ weeks learning curve for Swift
- Electron allows shipping in 3 weeks with AI assistance
- Can reuse web development patterns
- Trade-off: 150MB app size vs 15MB native

### Functional Requirements

**Week 1 - Core Recording**:
```javascript
// Simple recording using MediaRecorder API
- Start/stop recording button
- Save audio as WAV file
- Display recording time
- Basic error handling
```

**Week 2 - Whisper Integration**:
```javascript
// Run Whisper via Node.js child process
- Install whisper.cpp locally
- Process audio file
- Display transcript
- Show processing progress
```

**Week 3 - Basic Editing**:
```javascript
// Minimal text editor
- Display transcript in textarea
- Allow editing
- Save as text file
- Export as PDF using electron-pdf
```

### Technical Stack for Non-macOS Developer
- **Framework**: Electron (HTML/CSS/JavaScript)
- **UI**: Plain HTML/CSS or React if familiar
- **Whisper**: whisper.cpp via child_process
- **Audio**: MediaRecorder Web API
- **Storage**: Local file system (no database yet)
- **PDF Export**: electron-pdf or pdfkit

### V0 Deliverables
1. Working app that records audio
2. Transcribes using Whisper locally
3. Displays editable text
4. Exports to PDF
5. NO fancy features - just proof it works

### Timeline Adjusted for Learning Curve
- **Week 1**: Set up Electron, implement recording
- **Week 2**: Integrate Whisper, handle processing
- **Week 3**: Add editing, export, basic testing

---

## V1: Encryption & Templates (4 Weeks after V0)

### Why V1 Matters
- V0 proves it works
- V1 makes it usable for real patient data
- Encryption is complex - don't attempt until core works

### New Features in V1
1. **Encryption** (moved from V0)
   - Use electron-store with encryption option
   - Password protection on app launch
   - Encrypted storage of audio and transcripts
   
2. **Templates**
   - Psychotherapy notes (short)
   - Medication management (detailed)
   - Auto-populate from transcript
   
3. **Medical Accuracy Features**
   - Highlight medical terms
   - Show confidence scores
   - Drug name validation

### V1 Technical Additions
```javascript
// Encryption using electron-store
const Store = require('electron-store');
const store = new Store({
  encryptionKey: 'user-password-derived-key'
});

// Medical dictionary
const medications = ['sertraline', 'fluoxetine', ...];
// Highlight if found in transcript
```

### Timeline for V1
- **Week 1**: Add encryption and password protection
- **Week 2**: Implement templates
- **Week 3**: Add medical term highlighting
- **Week 4**: Testing with real users

---

## Adjusted Success Metrics for Side Project

### Realistic Metrics for 10 Users
- 5 beta testers in first month
- 2-3 convert to paid
- 10 total paid users by month 3
- Learning goal: Ship working Electron app

### What Success Looks Like
- Proof that local Whisper works for medical transcription
- 10 psychiatrists saving 15 minutes per day
- $490/month recurring revenue
- Portfolio piece showing AI + healthcare capability

---

## Distribution Strategy for 10 Users

### Where to Find First 10 Users
1. **Personal network** - Any psychiatrist friends?
2. **Reddit** - r/psychiatry (be transparent it's a side project)
3. **Local medical school** - Offer free to residents
4. **Psychiatry forums** - Focus on privacy-conscious practitioners
5. **Product Hunt** - After getting 5 happy users

### Pricing for Side Project
- First 10 users: $49/month lifetime rate
- After 10 users: $79/month
- Annual option: $399 (save $189)

---

## Technical Considerations for Beginner

### Learning Resources Needed
1. **Electron basics**: Electron Forge documentation
2. **Whisper integration**: whisper.cpp GitHub examples
3. **Audio recording**: MDN MediaRecorder guides
4. **File encryption**: electron-store documentation

### Architecture (Keep It Simple)
```
/main.js           - Electron main process
/renderer.js       - UI logic
/whisper.js        - Whisper integration
/index.html        - Single page UI
/styles.css        - Basic styling
```

### Common Beginner Pitfalls to Avoid
1. **Don't over-engineer** - No React/Vue needed for V0
2. **Skip the database** - File system is fine for 10 users
3. **No real-time transcription** - Process after recording stops
4. **Don't build user authentication** - Single user per install
5. **Avoid scope creep** - Resist adding "just one more feature"

---

## Realistic Development Timeline

### With Zero macOS Experience + Side Project Constraints

**Week 0: Setup & Learning** (not counted in development)
- Install development tools
- Electron "Hello World"
- Test Whisper CLI

**Phase 0: Proof of Concept** (1 week)
- Python script to test Whisper accuracy
- Must achieve >95% accuracy or stop

**Phase 1: V0 Development** (3 weeks)
- Week 1: Recording functionality
- Week 2: Whisper integration
- Week 3: Export and polish

**Phase 2: V0 Testing** (1 week)
- Test with 2-3 friendly psychiatrists
- Fix critical bugs only

**Phase 3: V1 Development** (4 weeks)
- Week 1: Encryption
- Week 2: Templates
- Week 3: Medical features
- Week 4: Beta testing

**Total: 9 weeks to V1** (realistic for side project)

---

## Risk Mitigation for Solo Developer

| Risk | Impact | Mitigation |
|------|--------|------------|
| Whisper too slow | High | Use medium/small model |
| Can't figure out Electron | High | Fall back to web app |
| Encryption too complex | Medium | Use simple password ZIP |
| No users interested | Medium | Open source it for portfolio |
| Takes longer than expected | Low | It's a side project - that's OK |

---

## Decision Points

### After Phase 0 (Proof of Concept)
- If accuracy <95%: Stop or try different approach
- If processing >5 minutes: Try smaller model

### After V0 (Basic Transcription)
- If 0 beta users interested: Stop or pivot
- If >5 users excited: Continue to V1

### After V1 (With Encryption)
- If <10 paid users after 3 months: Open source
- If >10 users: Consider expanding features

---

## Why This Can Succeed as Side Project

1. **Narrow focus** - Just transcription for psychiatrists
2. **Clear value prop** - Save 15 minutes per session
3. **Technical moat** - Medical accuracy others lack
4. **Low competition** - Big players ignore 10-user markets
5. **Learning opportunity** - Even "failure" builds skills

## User Stories

### Functional Jobs
- As a psychiatrist, I want to dictate medication changes after sessions, so documentation is accurate while details are fresh
- As a psychiatrist, I want all processing done locally, so patient data never leaves my control
- As a psychiatrist, I want to quickly correct medical terms, so my final notes are accurate
- As a psychiatrist, I want to export notes as PDF, so I can upload to my existing EHR system

### Emotional Jobs
- As a psychiatrist, I want confidence that drug names and dosages are correct, so I don't worry about medical errors
- As a psychiatrist, I want a simple workflow that doesn't add stress, so note-taking doesn't feel like a burden
- As a psychiatrist, I want to finish notes before leaving office, so work doesn't follow me home

### Social Jobs
- As a psychiatrist, I want to spend more time with family instead of typing notes, so relationships aren't strained
- As a psychiatrist, I want to stop complaining about documentation burden, so I can focus on positive aspects of practice
- As a psychiatrist, I want a defensible way to share notes with colleagues when needed, so collaboration remains smooth

---

## User Experience

### Entry Point & First-Time User Experience

**Download & Install**:
- Direct download from simple website (not App Store)
- Standard DMG installer for macOS
- App size ~150MB (Electron overhead)

**First Launch**:
1. Welcome screen: "PsychScribe - Your notes never leave your Mac"
2. Microphone permission request with explanation
3. Choose storage folder for notes
4. Quick 3-step tutorial:
   - Click record → Speak → Review transcript

### Core Experience

**Main Window** (V0):
```
+----------------------------------+
|  PsychScribe                     |
+----------------------------------+
|                                  |
|     [ Start Recording ]          |
|                                  |
|   Recording: 00:00               |
|                                  |
+----------------------------------+
```

**Recording Flow**:
1. Click "Start Recording" (big, obvious button)
2. Speak naturally for up to 10 minutes
3. Click "Stop" when done
4. Wait for processing (progress bar shows "Transcribing...")
5. Review transcript in simple text editor
6. Click "Export PDF" to save

**Editing Experience** (V0):
- Plain text area with transcript
- Click anywhere to edit
- Ctrl+Z for undo
- Auto-save every 30 seconds

**Enhanced Experience** (V1):
- Medical terms highlighted in blue
- Low confidence words underlined in red
- Right-click for suggestions
- Template sections clearly marked

### Edge Cases & Error Handling

**Poor Audio Quality**:
- "Recording too quiet - please speak closer to microphone"
- Offer to re-record or proceed with warning

**Processing Failure**:
- "Transcription failed - would you like to try again?"
- Keep audio file for manual recovery

**Unsaved Changes**:
- Prompt before closing: "Save your notes?"
- Auto-recovery on next launch

---

## Narrative

Dr. Sarah Chen is a solo psychiatrist in private practice. It's 5 PM on Wednesday, and she just finished her last patient - a complex medication management case involving multiple drug interactions and dosage adjustments.

Previously, she'd spend 20-30 minutes carefully typing up notes, double-checking every medication spelling, worried about forgetting the exact milligrams discussed. She tried Dragon Medical, but at $99/month plus the discomfort of patient data in the cloud, it didn't feel right. Apple's built-in dictation made too many medication errors to trust.

With PsychScribe, she clicks the record button and speaks naturally: "Patient stable on sertraline 100mg daily, but reporting initial insomnia. Discussed cross-tapering to mirtazapine 15mg at bedtime. Continuing lamotrigine 200mg for mood stabilization..."

In 3 minutes, she's dictated everything. The app processes locally - no internet needed. The transcript appears with "sertraline," "mirtazapine," and "lamotrigine" highlighted for quick verification. She corrects "15mg" to "7.5mg" (deciding to start lower), then exports to PDF.

Total time: 6 minutes vs her usual 25. She heads home, present for dinner with her family instead of typing notes until 7 PM.

---

## Acceptance Criteria

### Phase 0 (Proof of Concept)
- [ ] Whisper correctly transcribes 95% of psychiatric medication names
- [ ] Processing completes in <5 minutes for 10-minute audio
- [ ] Common drugs perfect: sertraline, fluoxetine, aripiprazole

### V0 (Basic Transcription)
- [ ] User can record up to 10 minutes of audio
- [ ] Transcription appears within 3-5 minutes
- [ ] User can edit transcript and export as PDF
- [ ] App works completely offline
- [ ] No crashes during 10 consecutive recordings

### V1 (With Encryption & Templates)
- [ ] Password protects app launch
- [ ] All files encrypted on disk
- [ ] Medication management template available
- [ ] Medical terms highlighted with confidence scores
- [ ] 5 beta users successfully complete full workflow

---

## Pilot Checklist (For Beta Testers)

### V0 Testing
1. Install app from provided link
2. Grant microphone permissions
3. Record a 5-minute medication management note
4. Verify transcript accuracy (mark any errors)
5. Edit and export as PDF
6. Report time saved vs typing

### V1 Testing  
1. Set password on first launch
2. Record both psychotherapy and medication notes
3. Verify medical terms are highlighted correctly
4. Test template auto-population
5. Confirm files are encrypted (we'll provide verification tool)
6. Complete satisfaction survey

---

## Tracking Plan

### Privacy-Preserving Local Analytics
Track locally (never uploaded):
- App launches per week
- Number of recordings
- Average recording length  
- Time from recording to export
- Number of edits per transcript
- Crash events (no content)

Optional user-initiated feedback:
- Accuracy satisfaction (1-10 scale)
- Time saved estimate
- Feature requests

---

## Next Steps

1. Download Whisper and test with medical terms (today)
2. Set up Electron development environment (tomorrow)
3. Build proof of concept (this week)
4. Only continue if PoC succeeds
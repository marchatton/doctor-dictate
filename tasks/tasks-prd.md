# Task List: PsychScribe - Local-First Dictation for Psychiatrists

## Relevant Files

- `src/main.js` - Electron main process for the desktop application
- `src/renderer.js` - UI logic and user interactions
- `src/whisper.js` - Whisper AI integration and transcription processing
- `src/index.html` - Single page UI for the application
- `src/styles.css` - Basic styling for the interface
- `package.json` - Project dependencies and scripts
- `whisper/` - Directory for Whisper models and processing scripts

### Notes

- Unit tests should typically be placed alongside the code files they are testing
- Use `npm test` to run tests once Jest is configured
- Whisper models will be downloaded locally and processed via Node.js child processes

## Tasks

- [ ] 1.0 Phase 0: Proof of Concept - Whisper Accuracy Validation
  - [ ] 1.1 Set up Python environment for Whisper testing
  - [ ] 1.2 Install and configure Whisper large-v3 model
  - [ ] 1.3 Create test dataset with psychiatric medication terminology
  - [ ] 1.4 Record 10-minute audio samples using mock psychiatrist file
  - [ ] 1.5 Test Whisper accuracy on medication names and dosages
  - [ ] 1.6 Validate >95% accuracy on psychiatric terms
  - [ ] 1.7 Document results and decide whether to proceed

- [ ] 2.0 Phase 1: V0 Development - Basic Transcription Tool
  - [ ] 2.1 Set up Electron development environment
  - [ ] 2.2 Configure project structure and dependencies
  - [ ] 2.3 Implement basic Electron main process (main.js)
  - [ ] 2.4 Create main application window and UI shell
  - [ ] 2.5 Implement audio recording functionality using MediaRecorder API
  - [ ] 2.6 Add recording controls (start/stop, timer display)
  - [ ] 2.7 Integrate Whisper large-v3 via Node.js child process
  - [ ] 2.8 Implement transcription processing and progress display
  - [ ] 2.9 Create basic text editor for transcript display and editing
  - [ ] 2.10 Add export functionality (text file and PDF)
  - [ ] 2.11 Implement basic error handling and user feedback
  - [ ] 2.12 Add auto-save functionality for transcripts

- [ ] 3.0 Phase 2: V0 Testing and Bug Fixes
  - [ ] 3.1 Test recording functionality with various audio inputs
  - [ ] 3.2 Validate transcription accuracy with psychiatric terminology
  - [ ] 3.3 Test export functionality and file formats
  - [ ] 3.4 Identify and fix critical bugs
  - [ ] 3.5 Test with 2-3 friendly psychiatrists (including mock file)
  - [ ] 3.6 Collect feedback on accuracy and usability
  - [ ] 3.7 Implement critical bug fixes based on testing

- [ ] 4.0 Phase 3: V1 Development - Encryption and Templates
  - [ ] 4.1 Implement password protection on app launch
  - [ ] 4.2 Add encryption for stored audio and transcript files
  - [ ] 4.3 Create medication management template
  - [ ] 4.4 Implement psychotherapy notes template
  - [ ] 4.5 Add medical term highlighting and confidence scoring
  - [ ] 4.6 Implement template auto-population from transcripts
  - [ ] 4.7 Add drug name validation against medical dictionary
  - [ ] 4.8 Test encryption and security features

- [ ] 5.0 Phase 4: V1 Beta Testing and User Feedback
  - [ ] 5.1 Recruit 5 beta testers from target user base
  - [ ] 5.2 Conduct comprehensive testing with real psychiatric notes
  - [ ] 5.3 Validate encryption and privacy features
  - [ ] 5.4 Test template functionality with various note types
  - [ ] 5.5 Collect user satisfaction and time-saving metrics
  - [ ] 5.6 Implement final bug fixes and improvements
  - [ ] 5.7 Prepare for initial user launch

# PsychScribe - Local-First Dictation for Psychiatrists

A desktop application for solo psychiatrists that accurately transcribes clinical dictation locally, optimized for psychiatric medication terminology.

## 🎯 Project Overview

PsychScribe addresses the documentation burden faced by psychiatrists by providing:
- **Local transcription** using Whisper AI (no cloud processing)
- **Medical accuracy** optimized for psychiatric terminology
- **Privacy-first** approach with all data staying on your device
- **Simple workflow** for quick note-taking after patient sessions

## 🔒 Privacy First

- **All processing happens on your Mac** - no cloud services or external APIs
- **Your patient data never leaves your device** - complete local control
- **No internet connection required** for transcription
- **Built with privacy in mind** from the ground up

## 🚀 Current Status

**Phase 0**: Proof of Concept - Whisper accuracy validation (In Progress)
**V0**: Basic transcription tool with Electron (Planned)
**V1**: Encryption and templates (Future)

## 🛠️ Technology Stack

- **Frontend**: Electron + HTML/CSS/JavaScript
- **AI**: Whisper large-v3 for transcription accuracy
- **Audio**: MediaRecorder Web API
- **Security**: Context isolation, secure IPC communication
- **Platform**: macOS (initially)

## 📋 Prerequisites

- Node.js 18+ and npm
- macOS (for initial development)
- Microphone access
- ~2GB free disk space (for Whisper models)

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd doctor-dictate
npm install
```

### 2. Development Mode
```bash
npm run dev
```

### 3. Build Application
```bash
npm run build
```

## 📁 Project Structure

```
src/
├── main.js          # Electron main process
├── preload.js       # Secure IPC bridge
├── renderer.js      # UI logic and interactions
├── index.html       # Main application interface
├── styles.css       # Application styling
├── assets/          # Icons and static assets
└── __tests__/       # Test files
```

## 🔧 Development Scripts

- `npm start` - Launch application
- `npm run dev` - Development mode with hot reload
- `npm run build` - Build distributable
- `npm test` - Run test suite
- `npm run lint` - Check code quality

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test -- --coverage
```

## 🔒 Security Features

- Context isolation enabled
- Secure IPC communication via preload script
- No external network access
- Local file processing only

## 📱 Features

### V0 (Current Development)
- [x] Basic Electron application structure
- [x] Audio recording interface
- [x] Secure IPC communication
- [ ] Whisper AI integration
- [ ] Basic transcription display
- [ ] Text export functionality

### V1 (Future)
- [ ] Password protection
- [ ] File encryption
- [ ] Medical templates
- [ ] Term highlighting
- [ ] Confidence scoring

## 🤝 Contributing

This is a personal project focused on learning and validation. Contributions are welcome but the primary goal is to prove the concept works before expanding.

## 📄 License

MIT License - see LICENSE file for details.

## ⚠️ Medical Disclaimer

**This software is not FDA approved and should not be used as the sole method for maintaining medical records. Always verify transcriptions for accuracy.**

## 🎯 Success Metrics

- **Phase 0**: >95% accuracy on psychiatric terminology
- **V0**: Working transcription tool with 2-3 beta users
- **V1**: 10 paid users at $49/month

## 🔍 Development Phases

1. **Proof of Concept** (1 week) - Validate Whisper accuracy
2. **V0 Development** (3 weeks) - Basic transcription tool
3. **V0 Testing** (1 week) - Bug fixes and user feedback
4. **V1 Development** (4 weeks) - Encryption and templates
5. **V1 Beta Testing** (1 week) - Final validation

## 📞 Support

For questions or feedback, please open an issue in the repository.

---

**Built with privacy in mind - Your notes never leave your Mac**


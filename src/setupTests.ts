import '@testing-library/jest-dom';

// Mock window.electronAPI
global.window = Object.create(window);
Object.defineProperty(window, 'electronAPI', {
  value: {
    saveAudioBlob: jest.fn(() => Promise.resolve({ success: true, filePath: '/mock/audio.webm' })),
    transcribeAudio: jest.fn(() => Promise.resolve({ 
      success: true, 
      transcript: 'Mock transcript for testing' 
    })),
    setWhisperModel: jest.fn(() => Promise.resolve({ success: true })),
    onTranscriptionProgress: jest.fn(),
    removeTranscriptionProgressListener: jest.fn(),
    saveTranscript: jest.fn(() => Promise.resolve({ success: true })),
    exportPDF: jest.fn(() => Promise.resolve({ success: true })),
    getWhisperModels: jest.fn(() => Promise.resolve({ 
      success: true, 
      models: ['tiny', 'base', 'small', 'medium', 'large'],
      current: 'base'
    })),
    validateWhisper: jest.fn(() => Promise.resolve({ success: true, available: true })),
    initializeWhisper: jest.fn(() => Promise.resolve({ success: true })),
    resetTranscriptionState: jest.fn(() => Promise.resolve({ success: true }))
  },
  writable: true
});

// Mock MediaRecorder
global.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  state: 'inactive',
  ondataavailable: jest.fn(),
  onstop: jest.fn(),
  onerror: jest.fn()
}));

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => 
      Promise.resolve({
        getTracks: () => [{
          stop: jest.fn(),
          kind: 'audio'
        }]
      })
    )
  },
  writable: true
});

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn()
  })),
  createAnalyser: jest.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    smoothingTimeConstant: 0.8,
    getByteFrequencyData: jest.fn((array) => {
      // Simulate some audio data
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.random() * 255;
      }
    }),
    connect: jest.fn()
  })),
  close: jest.fn(),
  state: 'running'
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 0);
  return 1;
});

global.cancelAnimationFrame = jest.fn();
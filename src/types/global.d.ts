export {};

declare global {
  interface Window {
    electronAPI: import('./ipc').ElectronAPI;
    waveformVisualization?: {
      startRecording: () => void;
      stopRecording: () => void;
      updateFromAnalyzer?: (value: number) => void;
    };
  }
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.css';
declare module 'whisper-node' {
  export class WhisperClient {}
}

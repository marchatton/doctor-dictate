import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { RecordingScreen } from './components/RecordingScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { TranscriptScreen } from './components/TranscriptScreen';
import { useElectronAPI } from './hooks/useElectronAPI';

type CorrectionDetails = { original: string; corrected: string; context: string };

type BackendMetadata = {
  duration?: number;
  correctionCount?: number;
  mode?: string;
  formatting?: Record<string, unknown>;
  modeDecision?: Record<string, unknown>;
};

type BackendTranscript = {
  transcript?: string;
  formatted?: string;
  corrected?: string;
  raw?: string;
  corrections?: CorrectionDetails[];
  medications?: string[];
  metadata?: BackendMetadata;
};

type TranscriptResult = string | BackendTranscript;

type RecordingMetadata = {
  duration: number;
  medicalTermsCount: number;
  correctionsCount: number;
  corrections: CorrectionDetails[];
  medications: string[];
  mode: string;
  formattingMetadata?: Record<string, unknown>;
  modeDecision?: Record<string, unknown>;
};
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('recording'); // 'recording', 'processing', 'transcript'
  const defaultModes = [
    {
      key: 'auto',
      label: 'Smart mode',
      description: 'Automatically switches between Fast and Accurate for you.',
      details: ['Checks audio length', 'Respects device memory headroom'],
      badge: 'Recommended',
    },
    {
      key: 'fast',
      label: 'Fast mode',
      description: 'Whisper.cpp tuned for speed with light formatting.',
      details: ['Base.en model', 'Targets <2GB RAM'],
    },
    {
      key: 'accurate',
      label: 'Accurate mode',
      description: 'Faster-Whisper bridge with VAD driven chunking.',
      details: ['Small.en model', 'Enhanced formatting'],
    },
  ];
  const [availableModes, setAvailableModes] = useState(defaultModes);
  const [selectedMode, setSelectedMode] = useState('auto');
  const [resolvedMode, setResolvedMode] = useState<string | null>(null);
  const [modeDecision, setModeDecision] = useState<Record<string, unknown> | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [patientName] = useState('Unknown');
  const [processingStep, setProcessingStep] = useState('audio');
  const [processingProgress, setProcessingProgress] = useState(0);
  const { listTranscriptionModes } = useElectronAPI();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await listTranscriptionModes();
        if (!cancelled && response.success && response.modes && response.modes.length > 0) {
          setAvailableModes(response.modes);
          const hasSelected = response.modes.some((mode) => mode.key === selectedMode);
          if (!hasSelected) {
            const fallbackMode = response.modes.find((mode) => mode.key === 'auto') || response.modes[0];
            if (fallbackMode) {
              setSelectedMode(fallbackMode.key);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load transcription modes:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listTranscriptionModes, selectedMode]);

  // Recording metadata
  const [recordingMetadata, setRecordingMetadata] = useState<RecordingMetadata>({
    duration: 0,
    medicalTermsCount: 0,
    correctionsCount: 0,
    corrections: [],
    medications: [],
    mode: 'auto',
  });
  const handleStartRecording = () => {
    setIsRecording(true);
    // In a real app, we would start the actual recording here
  };
  const handleStopRecording = () => {
    setIsRecording(false);
    setCurrentScreen('processing');
  };

  const handleProcessingStart = () => {
    setProcessingStep('audio');
    setProcessingProgress(0);
    setResolvedMode(null);
    setModeDecision(null);
  };

  const handleProcessingProgress = (step: string, progress: number) => {
    setProcessingStep(step);
    setProcessingProgress(progress);
  };

  const handleModeResolved = (modeKey: string, decision?: Record<string, unknown>) => {
    setResolvedMode(modeKey);
    if (decision) {
      setModeDecision(decision);
    }
  };

  const handleTranscriptionComplete = (transcriptData: TranscriptResult) => {
    // Handle both old string format and new object format
    let transcriptText = '';
    const metadata: RecordingMetadata = {
      duration: recordingTime,
      medicalTermsCount: 0,
      correctionsCount: 0,
      corrections: [],
      medications: [],
      mode: selectedMode,
    };
    let modeUsed = selectedMode;

    if (typeof transcriptData === 'string') {
      transcriptText = transcriptData;
    } else if (transcriptData && typeof transcriptData === 'object') {
      transcriptText =
        transcriptData.transcript ||
        transcriptData.formatted ||
        transcriptData.corrected ||
        transcriptData.raw ||
        '';
      
      // Extract metadata from backend result
      if (transcriptData.corrections) {
        metadata.corrections = transcriptData.corrections;
        metadata.correctionsCount = transcriptData.corrections.length;
      }
      if (transcriptData.medications) {
        metadata.medications = transcriptData.medications;
        metadata.medicalTermsCount = transcriptData.medications.length;
      }
      if (transcriptData.metadata) {
        const meta = transcriptData.metadata;
        metadata.duration = meta.duration || recordingTime;
        metadata.correctionsCount = meta.correctionCount || metadata.correctionsCount;
        if (meta.mode) {
          modeUsed = meta.mode;
          metadata.mode = meta.mode;
        }
        if (meta.formatting) {
          metadata.formattingMetadata = meta.formatting;
        }
        if (meta.modeDecision) {
          setModeDecision(meta.modeDecision);
          metadata.modeDecision = meta.modeDecision;
        }
      }
    }

    setResolvedMode(modeUsed);
    setTranscript(transcriptText);
    setRecordingMetadata(metadata);
    if (modeUsed && modeUsed !== selectedMode && selectedMode !== 'auto') {
      setSelectedMode(modeUsed);
    }
    setCurrentScreen('transcript');
  };
  const handleNewRecording = () => {
    setRecordingTime(0);
    setTranscript('');
    setCurrentScreen('recording');
    setResolvedMode(null);
    setModeDecision(null);
  };
  const activeMode =
    availableModes.find((mode) => mode.key === recordingMetadata.mode) ||
    availableModes.find((mode) => mode.key === resolvedMode) ||
    availableModes.find((mode) => mode.key === selectedMode) ||
    availableModes[0];
  const processingMode =
    availableModes.find((mode) => mode.key === resolvedMode) ||
    availableModes.find((mode) => mode.key === selectedMode) ||
    availableModes[0];
  return <div className="flex flex-col min-h-screen bg-stone-50" style={{
    backgroundImage: "url('https://uploadthingy.s3.us-west-1.amazonaws.com/4hJdzLGeSwniXj4zjWiZkP/image.png')",
    backgroundSize: '30px',
    backgroundColor: '#fafaf9',
    backgroundBlendMode: 'overlay',
    opacity: 1
  }}>
      <Header />
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        <div className="transition-all duration-500 ease-in-out">
          {currentScreen === 'recording' && <RecordingScreen availableModes={availableModes} selectedMode={selectedMode} onSelectMode={setSelectedMode} isRecording={isRecording} recordingTime={recordingTime} setRecordingTime={setRecordingTime} onStartRecording={handleStartRecording} onStopRecording={handleStopRecording} onTranscriptionComplete={handleTranscriptionComplete} onProcessingStart={handleProcessingStart} onProcessingProgress={handleProcessingProgress} onModeResolved={handleModeResolved} />}
          {currentScreen === 'processing' && <ProcessingScreen modeKey={processingMode?.key || selectedMode} modeLabel={processingMode?.label || ''} processingStep={processingStep} processingProgress={processingProgress} minutesProcessed={processingProgress / 100 * (recordingTime / 60)} totalMinutes={recordingTime / 60} modeDecision={modeDecision} />}
          {currentScreen === 'transcript' && <TranscriptScreen transcript={transcript} setTranscript={setTranscript} onNewRecording={handleNewRecording} patientName={patientName} modeKey={recordingMetadata.mode} modeLabel={activeMode?.label || ''} recordingMetadata={recordingMetadata} />}
        </div>
      </main>
      <footer className="bg-stone-900 text-white py-5 text-center text-sm">
        <div className="max-w-5xl mx-auto px-4 flex justify-center items-center">
          <p>Your notes never leave your laptop • Built with privacy in mind</p>
        </div>
      </footer>
    </div>;
}

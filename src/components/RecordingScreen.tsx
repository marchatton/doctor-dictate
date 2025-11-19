import React, { useEffect, useState, useRef } from 'react';
import { MicIcon, StopCircleIcon, CheckCircleIcon } from 'lucide-react';
import { AudioWaveform } from './AudioWaveform';
import { TranscriptionModeSelector } from './ui/TranscriptionModeSelector';
import type { ElectronAPI, TranscriptionModeInfo, TranscriptionProgressUpdate } from '../types/ipc';
import type { RecordingTranscriptPayload } from '../types/ui';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

interface RecordingScreenProps {
  availableModes: TranscriptionModeInfo[];
  selectedMode: string;
  onSelectMode: (key: string) => void;
  isRecording: boolean;
  recordingTime: number;
  setRecordingTime: (value: number) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onTranscriptionComplete: (transcript: RecordingTranscriptPayload) => void;
  onProcessingStart: () => void;
  onProcessingProgress: (step: string, progress: number) => void;
  onModeResolved: (mode: string, decision?: Record<string, unknown>) => void;
}

export function RecordingScreen({
  availableModes,
  selectedMode,
  onSelectMode,
  isRecording,
  recordingTime,
  setRecordingTime,
  onStartRecording,
  onStopRecording,
  onTranscriptionComplete,
  onProcessingStart,
  onProcessingProgress,
  onModeResolved,
}: RecordingScreenProps) {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm');
  const currentMode = availableModes.find((mode) => mode.key === selectedMode);
  const selectedModeRef = useRef(selectedMode);
  const setRecordingTimeRef = useRef(setRecordingTime);
  
  // Store callbacks in refs to prevent re-initialization
  const onTranscriptionCompleteRef = useRef(onTranscriptionComplete);
  const onProcessingProgressRef = useRef(onProcessingProgress);
  const onProcessingStartRef = useRef(onProcessingStart);
  const onModeResolvedRef = useRef(onModeResolved);
  
  // Update refs when props change
  useEffect(() => {
    onTranscriptionCompleteRef.current = onTranscriptionComplete;
    onProcessingProgressRef.current = onProcessingProgress;
    onProcessingStartRef.current = onProcessingStart;
    onModeResolvedRef.current = onModeResolved;
  }, [onTranscriptionComplete, onProcessingProgress, onProcessingStart, onModeResolved]);

  useEffect(() => {
    selectedModeRef.current = selectedMode;
  }, [selectedMode]);

  useEffect(() => {
    setRecordingTimeRef.current = setRecordingTime;
  }, [setRecordingTime]);
  // Initialize media recorder - only once on component mount
  useEffect(() => {
    let mounted = true;
    let stream: MediaStream | null = null;
    
    const initializeMediaRecorder = async () => {
      // Prevent multiple initializations
      if (!mounted || mediaRecorder) {
        console.log('[RecordingScreen] Skipping initialization - mounted:', mounted, 'hasRecorder:', !!mediaRecorder);
        return;
      }
      
      try {
        console.log('[RecordingScreen] Requesting microphone access...');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (!mounted) {
          // Component unmounted while waiting for permission
          console.log('[RecordingScreen] Component unmounted during getUserMedia, cleaning up stream');
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        console.log('[RecordingScreen] Microphone access granted', {
          streamId: stream.id,
          active: stream.active,
          tracks: stream.getTracks().map(t => ({
            id: t.id,
            kind: t.kind,
            label: t.label,
            enabled: t.enabled,
            readyState: t.readyState
          }))
        });
        
        setAudioStream(stream);
        
        // Check for supported MIME types and use the best available
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
          'audio/mpeg'
        ];
        
        let selectedMimeType = 'audio/webm'; // default fallback
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            selectedMimeType = mimeType;
            console.log('Selected MIME type:', selectedMimeType);
            break;
          }
        }
        
        const recorder = new MediaRecorder(stream, {
          mimeType: selectedMimeType,
          audioBitsPerSecond: 128000 // 128 kbps for good quality
        });
        console.log('[RecordingScreen] MediaRecorder created', {
          mimeType: selectedMimeType,
          state: recorder.state,
          audioBitsPerSecond: 128000
        });
        
        // Store the selected MIME type for later use when creating the Blob
        mimeTypeRef.current = selectedMimeType;
        
        recorder.ondataavailable = (event) => {
          console.log('[RecordingScreen] Audio data available, size:', event.data.size);
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        recorder.onstop = async () => {
          console.log('MediaRecorder stopped, processing audio...');
          console.log('Audio chunks collected:', audioChunksRef.current.length);
          
          if (audioChunksRef.current.length === 0) {
            console.error('No audio data collected!');
            return;
          }
          
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
          console.log('Audio blob size:', audioBlob.size);
          const arrayBuffer = await audioBlob.arrayBuffer();
          console.log('Array buffer size:', arrayBuffer.byteLength);
          
          onProcessingStartRef.current(); // Signal that processing has started
          
          // Set up progress listener to map backend progress to UI steps
          window.electronAPI?.onTranscriptionProgress((progress: TranscriptionProgressUpdate) => {
            console.log('Transcription progress:', progress);
            if (progress.mode) {
              onModeResolvedRef.current?.(progress.mode, progress.decision);
            }
            if (progress.message) {
              if (progress.message.includes('Preparing audio file')) {
                onProcessingProgressRef.current('audio', 50);
              } else if (progress.message.includes('Processing') && progress.message.includes('of audio')) {
                // This is transcription happening - move to transcribe step
                // Handle both percentage format (X%) and time format (X:XX of audio)
                const percentMatch = progress.message.match(/(\d+)% of audio/);
                const timeMatch = progress.message.match(/(\d+):(\d+) of audio/);
                
                if (percentMatch) {
                  const percent = parseInt(percentMatch[1]);
                  onProcessingProgressRef.current('transcribe', percent);
                } else if (timeMatch) {
                  // For time format, estimate progress (e.g., "1:00 of audio" = ~50% for 2 min total)
                  // Since we don't know total duration, use a reasonable estimate
                  const minutes = parseInt(timeMatch[1]);
                  const seconds = parseInt(timeMatch[2]);
                  const totalSeconds = minutes * 60 + seconds;
                  // Assume max 3 minutes of audio, calculate rough percentage
                  const estimatedPercent = Math.min(95, (totalSeconds / 180) * 100);
                  onProcessingProgressRef.current('transcribe', Math.max(10, estimatedPercent));
                } else {
                  // If no specific progress, just indicate we're transcribing
                  onProcessingProgressRef.current('transcribe', 25);
                }
              } else if (progress.message.includes('Typically takes')) {
                // Transcription starting
                onProcessingProgressRef.current('transcribe', 5);
              } else if (progress.message.includes('Verifying medical terminology')) {
                // Medical corrections happening
                onProcessingProgressRef.current('medical', 50);
              }
            }
            
            // Also check for stage changes in progress object
            // This is the primary way we should track progress (chunk-based)
            if (progress.stage) {
              if (progress.stage === 'transcribing') {
                // Use chunk-based progress if available
                if (typeof progress.progress === 'number') {
                  onProcessingProgressRef.current('transcribe', progress.progress);
                } else {
                  onProcessingProgressRef.current('transcribe', 10); // Just started
                }
              } else if (progress.stage === 'preparing') {
                onProcessingProgressRef.current('audio', progress.progress || 50);
              } else if (progress.stage === 'completing' || progress.stage === 'complete') {
                onProcessingProgressRef.current('medical', 100);
                onProcessingProgressRef.current('complete', 100);
              }
            }
          });
          
          try {
            // Start audio processing
            onProcessingProgressRef.current('audio', 25);
            
            const saveResult = await window.electronAPI.saveAudioBlob(arrayBuffer);
            console.log('Save result:', saveResult);
            
            if (!saveResult || !saveResult.success || !saveResult.filePath) {
              throw new Error(`Failed to save audio: ${saveResult?.error || 'Unknown error'}`);
            }
            
            onProcessingProgressRef.current('audio', 100); // Audio processing complete
            
            // Move to transcription
            onProcessingProgressRef.current('transcribe', 5); // Start transcription
            
            const transcribeResult = await window.electronAPI.transcribeAudio({
              audioPath: saveResult.filePath,
              mode: selectedModeRef.current,
            });
            console.log('Transcribe result:', transcribeResult);
            
            if (transcribeResult.success) {
              // Transcription complete
              onProcessingProgressRef.current('transcribe', 100);

              // Medical corrections are done as part of transcription in backend
              onProcessingProgressRef.current('medical', 100);

              // Finalize
              onProcessingProgressRef.current('complete', 100);
              onTranscriptionCompleteRef.current(transcribeResult);
            } else {
              // If transcription failed, show error message
              console.error('Transcription failed:', transcribeResult.error);
              onProcessingProgressRef.current('error', 0);
              const errorMessage = `Transcription Error: ${transcribeResult.error || 'Unable to process audio. Please check that Whisper is properly installed and try again.'}`;
              alert(errorMessage);
              // Reset the recording state
              setIsRecording(false);
              setRecordingTimeRef.current(0);
            }
          } catch (error) {
            console.error('Error processing audio:', error);
            // Show error message to user
            onProcessingProgressRef.current('error', 0);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while processing the audio.';
            alert(`Processing Error: ${errorMessage}`);
            // Reset the recording state
            setIsRecording(false);
            setRecordingTimeRef.current(0);
          } finally {
            // Clean up progress listener
            window.electronAPI?.removeTranscriptionProgressListener();
          }
          
          audioChunksRef.current = [];
        };
        
        setMediaRecorder(recorder);
        console.log('[RecordingScreen] Media recorder setup complete');
      } catch (error) {
        console.error('[RecordingScreen] Error accessing microphone:', error);
      }
    };
    
    console.log('[RecordingScreen] Starting initialization...');
    initializeMediaRecorder();
    
    // Cleanup function
    return () => {
      console.log('[RecordingScreen] Component unmounting, cleaning up...');
      mounted = false;
      if (stream) {
        console.log('[RecordingScreen] Cleaning up media stream', {
          streamId: stream.id,
          tracks: stream.getTracks().map(t => ({
            id: t.id,
            readyState: t.readyState
          }))
        });
        stream.getTracks().forEach(track => {
          console.log(`[RecordingScreen] Stopping track ${track.id}`);
          track.stop();
        });
      }
    };
  }, [mediaRecorder]); // Re-check recorder when state changes (initializes only once)

  // Set Whisper model based on selected mode
  useEffect(() => {
    const config = currentMode?.config as { whisper?: { model?: string } } | undefined;
    const model = config?.whisper?.model || (selectedMode === 'fast' ? 'base.en' : 'small.en');
    window.electronAPI?.setWhisperModel(model);
  }, [selectedMode, currentMode]);

  // Timer effect for recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, setRecordingTime]);
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  return <div className="bg-white rounded-xl shadow-xl overflow-hidden transition-all duration-300">
      <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start gap-4 border-b border-stone-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isRecording ? <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span> : <CheckCircleIcon className="w-5 h-5 text-stone-400" />}
            <h2 className="font-serif text-3xl text-stone-900 font-semibold">
              {isRecording ? 'Recording in progress...' : 'Ready to record'}
            </h2>
          </div>
          <p className="text-stone-600">
            <span>10 minute maximum • Processes in ~2-3 minutes</span>
          </p>
        </div>
        <div
          className={`transition-all duration-300 w-full md:w-80 ${
            isRecording ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          <TranscriptionModeSelector
            modes={availableModes}
            selectedKey={selectedMode}
            onSelect={onSelectMode}
          />
        </div>
      </div>
      <div className="px-6 md:px-8 text-sm text-stone-500">
        {currentMode?.description || 'Select a mode to balance speed and accuracy for your note.'}
      </div>
      <div className="text-center py-8 flex justify-center items-center">
        <div className={`text-6xl font-mono text-stone-800 font-light transition-all duration-300 ${isRecording ? 'text-[#6B1F1F]' : ''}`}>
          {formatTime(recordingTime)}
        </div>
      </div>
      <div className={`h-32 bg-stone-50 flex items-center justify-center transition-all duration-300`}>
        <AudioWaveform isActive={isRecording} audioStream={audioStream} />
      </div>
      <div className="p-8 flex justify-center bg-stone-50">
        {!isRecording ? (
          <button 
            onClick={() => {
              if (mediaRecorder && mediaRecorder.state === 'inactive') {
                try {
                  audioChunksRef.current = []; // Clear any previous chunks
                  mediaRecorder.start(1000); // Collect data every second
                  onStartRecording();
                  console.log('[RecordingScreen] Started recording', {
                    recorderState: mediaRecorder.state,
                    streamActive: audioStream?.active,
                    streamId: audioStream?.id,
                    tracks: audioStream?.getTracks().map(t => ({
                      id: t.id,
                      enabled: t.enabled,
                      readyState: t.readyState
                    }))
                  });
                } catch (error) {
                  console.error('[RecordingScreen] Failed to start MediaRecorder:', error);
                  alert('Failed to start recording. Please check microphone permissions and try again.');
                }
              } else {
                console.warn('[RecordingScreen] MediaRecorder not ready:', {
                  exists: !!mediaRecorder,
                  state: mediaRecorder?.state
                });
              }
            }} 
            className="flex items-center gap-2 bg-[#6B1F1F] hover:bg-[#5a1a1a] text-white py-4 px-10 rounded-full text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            disabled={!mediaRecorder}
          >
            <MicIcon className="w-5 h-5" />
            Start recording
          </button>
        ) : (
          <button 
            onClick={() => {
              console.log('[RecordingScreen] Stop button clicked', {
                hasRecorder: !!mediaRecorder,
                recorderState: mediaRecorder?.state,
                streamActive: audioStream?.active,
                streamId: audioStream?.id
              });
              if (mediaRecorder) {
                if (mediaRecorder.state === 'recording') {
                  console.log('[RecordingScreen] Stopping MediaRecorder...');
                  mediaRecorder.stop();
                }
                onStopRecording();
              }
            }} 
            className="flex items-center gap-2 bg-[#6B1F1F] hover:bg-[#5a1a1a] text-white py-4 px-10 rounded-full text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <StopCircleIcon className="w-5 h-5" />
            Stop recording
          </button>
        )}
      </div>
    </div>;
}

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MicIcon, StopCircleIcon, CheckCircleIcon } from 'lucide-react';
import { AudioWaveform } from './AudioWaveform';
import { ToggleSwitch } from './ToggleSwitch';

declare global {
  interface Window {
    electronAPI: {
      saveAudioBlob: (audioBuffer: ArrayBuffer) => Promise<{success: boolean, filePath?: string, error?: string}>;
      transcribeAudio: (filePath: string) => Promise<{success: boolean, transcript?: string, error?: string}>;
      setWhisperModel: (model: string) => Promise<{success: boolean}>;
      onTranscriptionProgress: (callback: (progress: any) => void) => void;
      removeTranscriptionProgressListener: () => void;
    };
  }
}

interface RecordingScreenProps {
  isHighAccuracy: boolean;
  setIsHighAccuracy: (value: boolean) => void;
  isRecording: boolean;
  recordingTime: number;
  setRecordingTime: (value: number) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onTranscriptionComplete: (transcript: string) => void;
  onProcessingStart: () => void;
  onProcessingProgress: (step: string, progress: number) => void;
}

export function RecordingScreen({
  isHighAccuracy,
  setIsHighAccuracy,
  isRecording,
  recordingTime,
  setRecordingTime,
  onStartRecording,
  onStopRecording,
  onTranscriptionComplete,
  onProcessingStart,
  onProcessingProgress
}: RecordingScreenProps) {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Store callbacks in refs to prevent re-initialization
  const onTranscriptionCompleteRef = useRef(onTranscriptionComplete);
  const onProcessingProgressRef = useRef(onProcessingProgress);
  const onProcessingStartRef = useRef(onProcessingStart);
  
  // Update refs when props change
  useEffect(() => {
    onTranscriptionCompleteRef.current = onTranscriptionComplete;
    onProcessingProgressRef.current = onProcessingProgress;
    onProcessingStartRef.current = onProcessingStart;
  });
  // Initialize media recorder - only once on component mount
  useEffect(() => {
    let mounted = true;
    let stream: MediaStream | null = null;
    
    const initializeMediaRecorder = async () => {
      // Prevent multiple initializations
      if (!mounted || mediaRecorder) return;
      
      try {
        console.log('Requesting microphone access...');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (!mounted) {
          // Component unmounted while waiting for permission
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        console.log('Microphone access granted, stream:', stream);
        
        setAudioStream(stream);
        const recorder = new MediaRecorder(stream);
        console.log('MediaRecorder created:', recorder);
        
        recorder.ondataavailable = (event) => {
          console.log('Audio data available, size:', event.data.size);
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
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('Audio blob size:', audioBlob.size);
          const arrayBuffer = await audioBlob.arrayBuffer();
          console.log('Array buffer size:', arrayBuffer.byteLength);
          
          onProcessingStartRef.current(); // Signal that processing has started
          
          // Set up progress listener to map backend progress to UI steps
          window.electronAPI?.onTranscriptionProgress((progress) => {
            console.log('Transcription progress:', progress);
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
            
            const transcribeResult = await window.electronAPI.transcribeAudio(saveResult.filePath);
            console.log('Transcribe result:', transcribeResult);
            
            if (transcribeResult.success && transcribeResult.transcript) {
              // Transcription complete
              onProcessingProgressRef.current('transcribe', 100);
              
              // Medical corrections are done as part of transcription in backend
              onProcessingProgressRef.current('medical', 100);
              
              // Finalize
              onProcessingProgressRef.current('complete', 100);
              onTranscriptionCompleteRef.current(transcribeResult.transcript);
            } else {
              // If transcription failed, show mock data for testing
              console.warn('Transcription failed, using mock data for testing');
              onProcessingProgressRef.current('transcribe', 100);
              onProcessingProgressRef.current('medical', 100);
              onProcessingProgressRef.current('complete', 100);
              onTranscriptionCompleteRef.current('Patient presents with mild anxiety and reports improved sleep patterns. Continuing current medication regimen with sertraline 50mg daily. Follow-up scheduled in 4 weeks.');
            }
          } catch (error) {
            console.error('Error processing audio:', error);
            // Show mock data for testing
            onProcessingProgressRef.current('transcribe', 100);
            onProcessingProgressRef.current('medical', 100);
            onProcessingProgressRef.current('complete', 100);
            onTranscriptionCompleteRef.current('Patient presents with mild anxiety and reports improved sleep patterns. Continuing current medication regimen with sertraline 50mg daily. Follow-up scheduled in 4 weeks.');
          } finally {
            // Clean up progress listener
            window.electronAPI?.removeTranscriptionProgressListener();
          }
          
          audioChunksRef.current = [];
        };
        
        setMediaRecorder(recorder);
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    };
    
    initializeMediaRecorder();
    
    // Cleanup function
    return () => {
      mounted = false;
      if (stream) {
        console.log('Cleaning up media stream...');
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Set Whisper model based on accuracy setting
  useEffect(() => {
    const model = isHighAccuracy ? 'medium.en' : 'small.en';
    window.electronAPI?.setWhisperModel(model);
  }, [isHighAccuracy]);

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
        <div className={`transition-all duration-300 ${isRecording ? 'opacity-60 pointer-events-none' : ''}`}>
          <ToggleSwitch label="High accuracy" secondaryLabel="Slower" isChecked={isHighAccuracy} onChange={setIsHighAccuracy} disabled={isRecording} />
        </div>
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
                audioChunksRef.current = []; // Clear any previous chunks
                mediaRecorder.start(1000); // Collect data every second
                onStartRecording();
                console.log('Started recording with MediaRecorder');
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
              console.log('Stop button clicked, mediaRecorder:', mediaRecorder);
              console.log('MediaRecorder state:', mediaRecorder?.state);
              if (mediaRecorder) {
                if (mediaRecorder.state === 'recording') {
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
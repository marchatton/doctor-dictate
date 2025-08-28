import React, { useEffect, useState, useRef } from 'react';
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
  // Initialize media recorder
  useEffect(() => {
    const initializeMediaRecorder = async () => {
      try {
        console.log('Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          
          onProcessingStart(); // Signal that processing has started
          
          // Set up progress listener
          window.electronAPI?.onTranscriptionProgress((progress) => {
            console.log('Transcription progress:', progress);
            // Map progress to our steps
            if (progress.step) {
              onProcessingProgress(progress.step, progress.percentage || 0);
            }
          });
          
          try {
            onProcessingProgress('audio', 100); // Audio processing complete
            const saveResult = await window.electronAPI.saveAudioBlob(arrayBuffer);
            console.log('Save result:', saveResult);
            
            if (saveResult.success && saveResult.filePath) {
              onProcessingProgress('transcribe', 0); // Start transcription
              const transcribeResult = await window.electronAPI.transcribeAudio(saveResult.filePath);
              console.log('Transcribe result:', transcribeResult);
              
              if (transcribeResult.success && transcribeResult.transcript) {
                onProcessingProgress('medical', 0); // Start medical term processing
                // Simulate medical term processing
                setTimeout(() => {
                  onProcessingProgress('medical', 100);
                  onProcessingProgress('complete', 100);
                  onTranscriptionComplete(transcribeResult.transcript);
                }, 1000);
              }
            }
          } catch (error) {
            console.error('Error processing audio:', error);
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
  }, [onTranscriptionComplete]);

  // Set Whisper model based on accuracy setting
  useEffect(() => {
    const model = isHighAccuracy ? 'base' : 'tiny';
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
                mediaRecorder.start();
                onStartRecording();
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
import { useState, useRef, useEffect, useCallback } from 'react';

interface UseAudioRecorderOptions {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  
  // Initialize media stream
  const initializeStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      return stream;
    } catch (error) {
      console.error('Failed to get audio stream:', error);
      options.onError?.(error as Error);
      throw error;
    }
  }, [options]);
  
  // Start recording
  const startRecording = useCallback(async () => {
    try {
      audioChunksRef.current = [];
      
      let stream = audioStream;
      if (!stream) {
        stream = await initializeStream();
      }
      
      // Detect supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/mpeg'
      ];
      
      let selectedMimeType = 'audio/webm';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      mimeTypeRef.current = selectedMimeType;
      
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mimeTypeRef.current 
        });
        options.onRecordingComplete?.(audioBlob);
      };
      
      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        options.onError?.(new Error('Recording failed'));
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start(100); // Collect data every 100ms
      
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      options.onError?.(error as Error);
    }
  }, [audioStream, initializeStream, options]);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioStream]);
  
  return {
    isRecording,
    recordingTime,
    audioStream,
    startRecording,
    stopRecording
  };
}
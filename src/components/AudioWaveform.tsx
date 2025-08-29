import React, { useEffect, useState, useRef } from 'react';
import { MicIcon } from 'lucide-react';
interface AudioWaveformProps {
  isActive: boolean;
  audioStream?: MediaStream | null;
}
export function AudioWaveform({
  isActive,
  audioStream
}: AudioWaveformProps) {
  const [bars, setBars] = useState<number[]>([15, 20, 25, 20, 15]); // Lower default for better contrast
  const animationFrameRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const audioContextRef = useRef<AudioContext>();

  useEffect(() => {
    console.log('AudioWaveform useEffect:', { isActive, hasAudioStream: !!audioStream });
    if (isActive && audioStream) {
      // Audio analysis starting - logging removed for production
      
      try {
        // Create audio context and analyser
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume context if it's suspended (required for some browsers)
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(audioStream);
        
        analyser.fftSize = 256; // Higher resolution for time domain
        analyser.smoothingTimeConstant = 0.3; // Much less smoothing for responsiveness
        source.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        
        let frameCount = 0;
        const updateBars = () => {
          frameCount++;
          if (analyserRef.current) {
            // Use time domain data for better voice response
            analyserRef.current.getByteTimeDomainData(dataArray);
            
            // Calculate RMS (Root Mean Square) for actual volume level
            let sumSquares = 0;
            for (let i = 0; i < bufferLength; i++) {
              const normalized = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
              sumSquares += normalized * normalized;
            }
            const rms = Math.sqrt(sumSquares / bufferLength);
            
            // Convert RMS to a percentage (0-100)
            // Amplify the signal for better visual response
            const volumeLevel = Math.min(100, rms * 400);
            
            // Apply a noise gate - only show activity above threshold
            const threshold = 5; // Minimum level to show activity
            const gatedLevel = volumeLevel > threshold ? volumeLevel : volumeLevel * 0.3;
            
            // Logging disabled for cleaner console output
            
            // Create dynamic bars with speech-responsive animation
            // Center bar responds most, outer bars follow with slight delay
            const baseHeight = Math.max(15, Math.min(95, gatedLevel));
            
            // Add organic variation that's proportional to volume
            const variation = () => (Math.random() - 0.5) * (gatedLevel * 0.15);
            
            // Create symmetrical pattern with more dynamic range
            const multipliers = [0.4, 0.7, 1.0, 0.7, 0.4];
            const newBars = multipliers.map(mult => 
              Math.max(10, Math.min(98, baseHeight * mult + variation()))
            );
            
            setBars(newBars);
          }
          
          if (isActive) {
            animationFrameRef.current = requestAnimationFrame(updateBars);
          }
        };
        
        updateBars();
      } catch (error) {
        console.error('AudioWaveform: Error initializing audio analysis:', error);
      }
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      };
    } else {
      setBars([15, 20, 25, 20, 15]); // Reset to lower default bars
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    }
  }, [isActive, audioStream]);
  if (!isActive) {
    return <div className="text-stone-400 italic flex items-center gap-2 px-4 py-2 bg-white bg-opacity-50 rounded-full">
        <MicIcon className="w-4 h-4" />
        Audio visualization will appear here during recording
      </div>;
  }
  return <div className="flex items-center justify-center gap-4 h-full w-full px-8 py-4">
      {bars.map((height, i) => <div key={i} className="flex items-center justify-center" style={{
      height: '100%'
    }}>
          <div className="bg-[#6B1F1F] rounded-full" style={{
        height: `${height}%`,
        width: '8px',
        transition: 'height 0.05s ease-out' // Faster transition for more responsive feel
      }}></div>
        </div>)}
    </div>;
}
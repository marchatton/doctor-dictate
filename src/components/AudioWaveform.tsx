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
  const [bars, setBars] = useState<number[]>([]);
  const animationFrameRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const audioContextRef = useRef<AudioContext>();

  useEffect(() => {
    if (isActive && audioStream) {
      // Create audio context and analyser
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);
      
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateBars = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Take 5 frequency bands for visualization
          const barCount = 5;
          const newBars = [];
          const bandSize = Math.floor(dataArray.length / barCount);
          
          for (let i = 0; i < barCount; i++) {
            const start = i * bandSize;
            const end = start + bandSize;
            let sum = 0;
            
            for (let j = start; j < end; j++) {
              sum += dataArray[j];
            }
            
            const average = sum / bandSize;
            const height = Math.max(5, Math.min(80, (average / 255) * 80));
            newBars.push(height);
          }
          
          setBars(newBars);
        }
        
        if (isActive) {
          animationFrameRef.current = requestAnimationFrame(updateBars);
        }
      };
      
      updateBars();
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      };
    } else {
      setBars([]);
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
      {bars.map((height, i) => <div key={i} className="flex items-end justify-center" style={{
      height: '100%'
    }}>
          <div className="bg-[#6B1F1F] rounded-full" style={{
        height: `${height}%`,
        width: '8px',
        transition: 'height 0.1s ease-in-out'
      }}></div>
        </div>)}
    </div>;
}
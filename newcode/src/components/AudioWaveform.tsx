import React, { useEffect, useState } from 'react';
import { MicIcon } from 'lucide-react';
interface AudioWaveformProps {
  isActive: boolean;
}
export function AudioWaveform({
  isActive
}: AudioWaveformProps) {
  const [bars, setBars] = useState<number[]>([]);
  useEffect(() => {
    if (isActive) {
      // Generate initial random bar heights for 5 bars
      const initialBars = Array.from({
        length: 5
      }, () => Math.floor(Math.random() * 60) + 5);
      setBars(initialBars);
      // Update bar heights periodically to simulate audio activity
      const interval = setInterval(() => {
        setBars(prev => prev.map(() => {
          const variance = Math.random() * 30 - 15; // Random value between -15 and 15
          const newHeight = Math.floor(Math.random() * 60) + 5 + variance;
          return Math.max(5, Math.min(80, newHeight)); // Clamp between 5 and 80
        }));
      }, 150);
      return () => clearInterval(interval);
    } else {
      setBars([]);
    }
  }, [isActive]);
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
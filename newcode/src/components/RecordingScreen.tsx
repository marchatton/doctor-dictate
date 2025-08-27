import React, { useEffect } from 'react';
import { MicIcon, StopCircleIcon, CheckCircleIcon } from 'lucide-react';
import { AudioWaveform } from './AudioWaveform';
import { ToggleSwitch } from './ToggleSwitch';
interface RecordingScreenProps {
  isHighAccuracy: boolean;
  setIsHighAccuracy: (value: boolean) => void;
  isRecording: boolean;
  recordingTime: number;
  setRecordingTime: (value: number) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}
export function RecordingScreen({
  isHighAccuracy,
  setIsHighAccuracy,
  isRecording,
  recordingTime,
  setRecordingTime,
  onStartRecording,
  onStopRecording
}: RecordingScreenProps) {
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
        <AudioWaveform isActive={isRecording} />
      </div>
      <div className="p-8 flex justify-center bg-stone-50">
        {!isRecording ? <button onClick={onStartRecording} className="flex items-center gap-2 bg-[#6B1F1F] hover:bg-[#5a1a1a] text-white py-4 px-10 rounded-full text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
            <MicIcon className="w-5 h-5" />
            Start recording
          </button> : <button onClick={onStopRecording} className="flex items-center gap-2 bg-[#6B1F1F] hover:bg-[#5a1a1a] text-white py-4 px-10 rounded-full text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
            <StopCircleIcon className="w-5 h-5" />
            Stop recording
          </button>}
      </div>
    </div>;
}
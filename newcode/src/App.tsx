import React, { useState } from 'react';
import { Header } from './components/Header';
import { RecordingScreen } from './components/RecordingScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { TranscriptScreen } from './components/TranscriptScreen';
export function App() {
  const [currentScreen, setCurrentScreen] = useState('recording'); // 'recording', 'processing', 'transcript'
  const [isHighAccuracy, setIsHighAccuracy] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [patientName, setPatientName] = useState('John Doe');
  const handleStartRecording = () => {
    setIsRecording(true);
    // In a real app, we would start the actual recording here
  };
  const handleStopRecording = () => {
    setIsRecording(false);
    setCurrentScreen('processing');
    // In a real app, we would stop recording and start processing
    // Simulate processing completion after 3 seconds
    setTimeout(() => {
      setTranscript('Patient stable on sertraline 100mg daily, but reporting initial insomnia. Discussed cross-tapering to mirtazapine 15mg at bedtime. Continuing lamotrigine 200mg for mood stabilization.');
      setCurrentScreen('transcript');
    }, 3000);
  };
  const handleNewRecording = () => {
    setRecordingTime(0);
    setTranscript('');
    setCurrentScreen('recording');
  };
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
          {currentScreen === 'recording' && <RecordingScreen isHighAccuracy={isHighAccuracy} setIsHighAccuracy={setIsHighAccuracy} isRecording={isRecording} recordingTime={recordingTime} setRecordingTime={setRecordingTime} onStartRecording={handleStartRecording} onStopRecording={handleStopRecording} />}
          {currentScreen === 'processing' && <ProcessingScreen isHighAccuracy={isHighAccuracy} />}
          {currentScreen === 'transcript' && <TranscriptScreen transcript={transcript} setTranscript={setTranscript} onNewRecording={handleNewRecording} patientName={patientName} isHighAccuracy={isHighAccuracy} />}
        </div>
      </main>
      <footer className="bg-stone-900 text-white py-5 text-center text-sm">
        <div className="max-w-5xl mx-auto px-4 flex justify-center items-center">
          <p>Your notes never leave your laptop • Built with privacy in mind</p>
        </div>
      </footer>
    </div>;
}
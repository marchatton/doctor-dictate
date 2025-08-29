```index.tsx
import './index.css'
import React from "react";
import { render } from "react-dom";
import { App } from "./App";

render(<App />, document.getElementById("root"));

```
```App.tsx
import React, { useState } from 'react'
import { Header } from './components/Header'
import { RecordingScreen } from './components/RecordingScreen'
import { ProcessingScreen } from './components/ProcessingScreen'
import { TranscriptScreen } from './components/TranscriptScreen'
export function App() {
  const [currentScreen, setCurrentScreen] = useState('recording') // 'recording', 'processing', 'transcript'
  const [isHighAccuracy, setIsHighAccuracy] = useState(true)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [patientName, setPatientName] = useState('John Doe')
  const handleStartRecording = () => {
    setIsRecording(true)
    // In a real app, we would start the actual recording here
  }
  const handleStopRecording = () => {
    setIsRecording(false)
    setCurrentScreen('processing')
    // In a real app, we would stop recording and start processing
    // Simulate processing completion after 3 seconds
    setTimeout(() => {
      setTranscript(
        'Patient stable on sertraline 100mg daily, but reporting initial insomnia. Discussed cross-tapering to mirtazapine 15mg at bedtime. Continuing lamotrigine 200mg for mood stabilization.',
      )
      setCurrentScreen('transcript')
    }, 3000)
  }
  const handleNewRecording = () => {
    setRecordingTime(0)
    setTranscript('')
    setCurrentScreen('recording')
  }
  return (
    <div
      className="flex flex-col min-h-screen bg-stone-50"
      style={{
        backgroundImage:
          "url('https://uploadthingy.s3.us-west-1.amazonaws.com/4hJdzLGeSwniXj4zjWiZkP/image.png')",
        backgroundSize: '30px',
        backgroundColor: '#fafaf9',
        backgroundBlendMode: 'overlay',
        opacity: 1,
      }}
    >
      <Header />
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        <div className="transition-all duration-500 ease-in-out">
          {currentScreen === 'recording' && (
            <RecordingScreen
              isHighAccuracy={isHighAccuracy}
              setIsHighAccuracy={setIsHighAccuracy}
              isRecording={isRecording}
              recordingTime={recordingTime}
              setRecordingTime={setRecordingTime}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          )}
          {currentScreen === 'processing' && (
            <ProcessingScreen isHighAccuracy={isHighAccuracy} />
          )}
          {currentScreen === 'transcript' && (
            <TranscriptScreen
              transcript={transcript}
              setTranscript={setTranscript}
              onNewRecording={handleNewRecording}
              patientName={patientName}
              isHighAccuracy={isHighAccuracy}
            />
          )}
        </div>
      </main>
      <footer className="bg-stone-900 text-white py-5 text-center text-sm">
        <div className="max-w-5xl mx-auto px-4 flex justify-center items-center">
          <p>Your notes never leave your laptop • Built with privacy in mind</p>
        </div>
      </footer>
    </div>
  )
}

```
```AppRouter.tsx
import React from "react";
  import { BrowserRouter, Routes, Route } from "react-router-dom";
  import { App } from "./App";

  export function AppRouter() {
    return (
      <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
          </Routes>
      </BrowserRouter>
    );
  }
```
```tailwind.config.js
export default {}
```
```index.css
/* PLEASE NOTE: THESE TAILWIND IMPORTS SHOULD NEVER BE DELETED */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';
/* DO NOT DELETE THESE TAILWIND IMPORTS, OTHERWISE THE STYLING WILL NOT RENDER AT ALL */
```
```components/Header.tsx
import React from 'react'
import { MicIcon } from 'lucide-react'
export function Header() {
  return (
    <header className="bg-stone-900 text-white py-5 px-6 shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md">
            <MicIcon className="w-6 h-6 text-stone-900" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight">
              Doctor Dictate
            </h1>
            <p className="text-stone-300 text-sm">
              Accurate clinical note transcription
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

```
```components/RecordingScreen.tsx
import React, { useEffect } from 'react'
import { MicIcon, StopCircleIcon, CheckCircleIcon } from 'lucide-react'
import { AudioWaveform } from './AudioWaveform'
import { ToggleSwitch } from './ToggleSwitch'
interface RecordingScreenProps {
  isHighAccuracy: boolean
  setIsHighAccuracy: (value: boolean) => void
  isRecording: boolean
  recordingTime: number
  setRecordingTime: (value: number) => void
  onStartRecording: () => void
  onStopRecording: () => void
}
export function RecordingScreen({
  isHighAccuracy,
  setIsHighAccuracy,
  isRecording,
  recordingTime,
  setRecordingTime,
  onStartRecording,
  onStopRecording,
}: RecordingScreenProps) {
  // Timer effect for recording
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, setRecordingTime])
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }
  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden transition-all duration-300">
      <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start gap-4 border-b border-stone-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isRecording ? (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            ) : (
              <CheckCircleIcon className="w-5 h-5 text-stone-400" />
            )}
            <h2 className="font-serif text-3xl text-stone-900 font-semibold">
              {isRecording ? 'Recording in progress...' : 'Ready to record'}
            </h2>
          </div>
          <p className="text-stone-600">
            <span>10 minute maximum • Processes in ~2-3 minutes</span>
          </p>
        </div>
        <div
          className={`transition-all duration-300 ${isRecording ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <ToggleSwitch
            label="High accuracy"
            secondaryLabel="Slower"
            isChecked={isHighAccuracy}
            onChange={setIsHighAccuracy}
            disabled={isRecording}
          />
        </div>
      </div>
      <div className="text-center py-8 flex justify-center items-center">
        <div
          className={`text-6xl font-mono text-stone-800 font-light transition-all duration-300 ${isRecording ? 'text-[#6B1F1F]' : ''}`}
        >
          {formatTime(recordingTime)}
        </div>
      </div>
      <div
        className={`h-32 bg-stone-50 flex items-center justify-center transition-all duration-300`}
      >
        <AudioWaveform isActive={isRecording} />
      </div>
      <div className="p-8 flex justify-center bg-stone-50">
        {!isRecording ? (
          <button
            onClick={onStartRecording}
            className="flex items-center gap-2 bg-[#6B1F1F] hover:bg-[#5a1a1a] text-white py-4 px-10 rounded-full text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <MicIcon className="w-5 h-5" />
            Start recording
          </button>
        ) : (
          <button
            onClick={onStopRecording}
            className="flex items-center gap-2 bg-[#6B1F1F] hover:bg-[#5a1a1a] text-white py-4 px-10 rounded-full text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <StopCircleIcon className="w-5 h-5" />
            Stop recording
          </button>
        )}
      </div>
    </div>
  )
}

```
```components/ToggleSwitch.tsx
import React from 'react'
interface ToggleSwitchProps {
  label: string
  secondaryLabel?: string
  isChecked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}
export function ToggleSwitch({
  label,
  secondaryLabel,
  isChecked,
  onChange,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <div className="flex flex-col items-end">
      <label className="inline-flex items-center cursor-pointer select-none">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isChecked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div className="relative w-14 h-7 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:bg-[#6B1F1F] peer-focus:ring-2 peer-focus:ring-[#6B1F1F]/50 peer-disabled:opacity-70 transition-colors shadow-inner">
          <div
            className="absolute inset-y-0.5 bg-white w-6 h-6 rounded-full shadow-md transition-all duration-300 flex items-center justify-center"
            style={{
              left: isChecked ? 'calc(100% - 26px)' : '2px',
            }}
          >
            {isChecked && (
              <svg
                className="w-3 h-3 text-[#6B1F1F]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
        <span className="ml-3 text-sm font-medium text-stone-900">{label}</span>
      </label>
      {secondaryLabel && (
        <span className="text-xs text-stone-500 mt-1 italic">
          {secondaryLabel}
        </span>
      )}
    </div>
  )
}

```
```components/AudioWaveform.tsx
import React, { useEffect, useState } from 'react'
import { MicIcon } from 'lucide-react'
interface AudioWaveformProps {
  isActive: boolean
}
export function AudioWaveform({ isActive }: AudioWaveformProps) {
  const [bars, setBars] = useState<number[]>([])
  useEffect(() => {
    if (isActive) {
      // Generate initial random bar heights for 5 bars
      const initialBars = Array.from(
        {
          length: 5,
        },
        () => Math.floor(Math.random() * 60) + 5,
      )
      setBars(initialBars)
      // Update bar heights periodically to simulate audio activity
      const interval = setInterval(() => {
        setBars((prev) =>
          prev.map(() => {
            const variance = Math.random() * 30 - 15 // Random value between -15 and 15
            const newHeight = Math.floor(Math.random() * 60) + 5 + variance
            return Math.max(5, Math.min(80, newHeight)) // Clamp between 5 and 80
          }),
        )
      }, 150)
      return () => clearInterval(interval)
    } else {
      setBars([])
    }
  }, [isActive])
  if (!isActive) {
    return (
      <div className="text-stone-400 italic flex items-center gap-2 px-4 py-2 bg-white bg-opacity-50 rounded-full">
        <MicIcon className="w-4 h-4" />
        Audio visualization will appear here during recording
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center gap-4 h-full w-full px-8 py-4">
      {bars.map((height, i) => (
        <div
          key={i}
          className="flex items-end justify-center"
          style={{
            height: '100%',
          }}
        >
          <div
            className="bg-[#6B1F1F] rounded-full"
            style={{
              height: `${height}%`,
              width: '8px',
              transition: 'height 0.1s ease-in-out',
            }}
          ></div>
        </div>
      ))}
    </div>
  )
}

```
```components/ProcessingScreen.tsx
import React, { useEffect, useState } from 'react'
import { CheckCircleIcon, CircleIcon, Clock3Icon } from 'lucide-react'
interface ProcessingScreenProps {
  isHighAccuracy: boolean
}
export function ProcessingScreen({ isHighAccuracy }: ProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progressPercentage, setProgressPercentage] = useState(0)
  const processingTime = isHighAccuracy ? 3 : 1
  const PROCESSING_STEPS = [
    {
      id: 'audio',
      label: 'Audio',
      weight: 10,
      estimatedTime: '~5 sec',
    },
    {
      id: 'transcribe',
      label: 'Transcribe',
      weight: 70,
      estimatedTime: isHighAccuracy ? '~2 min' : '~30 sec',
      longStep: true,
    },
    {
      id: 'medical',
      label: 'Medical terms',
      weight: 15,
      estimatedTime: '~15 sec',
    },
    {
      id: 'complete',
      label: 'Complete',
      weight: 5,
      estimatedTime: '~2 sec',
    },
  ]
  useEffect(() => {
    // Step completion timing
    const stepTiming = [
      500,
      isHighAccuracy ? 1500 : 500,
      800,
      200, // Complete
    ]
    // Update progress with weighted values
    const updateProgress = (step: number, progress: number) => {
      // Calculate the base progress up to the previous step
      let baseProgress = 0
      for (let i = 0; i < step; i++) {
        baseProgress += PROCESSING_STEPS[i].weight
      }
      // Add the progress within the current step
      const currentStepProgress = PROCESSING_STEPS[step].weight * progress
      setProgressPercentage(baseProgress + currentStepProgress)
    }
    let timeSum = 0
    // For each step, animate progress during the step
    PROCESSING_STEPS.forEach((step, index) => {
      const startTime = timeSum
      const duration = stepTiming[index]
      timeSum += duration
      // Animate progress during each step
      const progressInterval = 50 // Update every 50ms
      for (let t = 0; t <= duration; t += progressInterval) {
        setTimeout(() => {
          if (index < currentStep) {
            // Step already completed
            return
          }
          // Progress within current step (0 to 1)
          const stepProgress = Math.min(1, t / duration)
          updateProgress(index, stepProgress)
          // If we've reached the end of this step, update the current step
          if (t + progressInterval > duration && index === currentStep) {
            setCurrentStep(index)
          }
        }, startTime + t)
      }
      // Set the step as current at the beginning of its time
      setTimeout(() => {
        setCurrentStep(index)
      }, startTime)
    })
  }, [isHighAccuracy])
  return (
    <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-3xl text-stone-900 font-semibold">
          Converting to notes
        </h2>
      </div>
      <div className="w-full bg-stone-100 h-2 rounded-full mb-8 overflow-hidden">
        <div
          className="bg-[#6B1F1F] h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${progressPercentage}%`,
          }}
        ></div>
      </div>
      <div className="space-y-4 mb-8">
        {PROCESSING_STEPS.map((step, index) => {
          let status = 'pending'
          if (index < currentStep) status = 'completed'
          if (index === currentStep) status = 'processing'
          return (
            <div
              key={step.id}
              className={`flex items-center justify-between p-3 border-b border-stone-100 last:border-b-0 ${step.longStep ? 'bg-amber-50/50' : ''}`}
            >
              <div className="flex items-center">
                {status === 'completed' ? (
                  <CheckCircleIcon className="w-5 h-5 text-amber-700 mr-3" />
                ) : status === 'processing' ? (
                  <div className="w-5 h-5 rounded-full border-2 border-[#6B1F1F] border-t-transparent animate-spin mr-3"></div>
                ) : (
                  <CircleIcon className="w-5 h-5 text-stone-300 mr-3" />
                )}
                <div>
                  <span
                    className={`font-medium ${status === 'completed' ? 'text-stone-700' : status === 'processing' ? 'text-[#6B1F1F]' : 'text-stone-400'}`}
                  >
                    {step.label}
                  </span>
                  {step.longStep && (
                    <div className="flex items-center text-xs text-amber-700 mt-0.5">
                      <Clock3Icon className="w-3 h-3 mr-1" />
                      <span>Longest step</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-stone-500 mr-3">
                  {step.estimatedTime}
                </span>
                <span className="text-sm">
                  {status === 'completed' && 'Completed'}
                  {status === 'processing' && 'Processing...'}
                  {status === 'pending' && 'Pending'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-center text-stone-600 bg-stone-50 py-3 px-4 rounded-lg border border-stone-100">
        {currentStep < PROCESSING_STEPS.length - 1
          ? `Estimated time remaining: ~${processingTime - Math.round((progressPercentage / 100) * processingTime)} minute${processingTime - Math.round((progressPercentage / 100) * processingTime) !== 1 ? 's' : ''}`
          : 'All processing complete! Preparing transcript...'}
      </p>
    </div>
  )
}

```
```components/TranscriptScreen.tsx
import React, { useState } from 'react'
import {
  EditIcon,
  SaveIcon,
  FileTextIcon,
  PlusIcon,
  CheckIcon,
  ClipboardIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react'
import { Modal } from './Modal'
interface TranscriptScreenProps {
  transcript: string
  setTranscript: (value: string) => void
  onNewRecording: () => void
  patientName: string
  isHighAccuracy: boolean
}
export function TranscriptScreen({
  transcript,
  setTranscript,
  onNewRecording,
  patientName,
  isHighAccuracy,
}: TranscriptScreenProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showCorrections, setShowCorrections] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  // Sample corrections data
  const corrections = [
    {
      original: 'serotonin',
      corrected: 'sertraline',
      context: 'Patient stable on sertraline 100mg daily...',
    },
    {
      original: 'lamictal',
      corrected: 'lamotrigine',
      context: '...Continuing lamotrigine 200mg for mood stabilization.',
    },
  ]
  // Function no longer highlights medical terms
  const highlightMedicalTerms = (text: string) => {
    return text
  }
  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(transcript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  // Format date in US format MM/DD/YYYY
  const formatDate = () => {
    const date = new Date()
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
  }
  const handleNewRecordingClick = () => {
    setShowConfirmModal(true)
  }
  const handleConfirmNewRecording = () => {
    setShowConfirmModal(false)
    onNewRecording()
  }
  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden transition-all duration-300">
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmNewRecording}
        title="Discard current transcript?"
        message="Starting a new recording will discard your current transcript. This action cannot be undone."
        cancelText="Go back"
        confirmText="Discard notes and create new recording"
      />
      <div className="p-6 border-b border-stone-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h2 className="font-serif text-3xl text-stone-900 font-semibold flex items-center gap-2">
            <CheckIcon className="w-6 h-6 text-amber-700" />
            Transcription complete
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCopyTranscript}
            className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-md transition-colors ${copied ? 'bg-amber-700 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
          >
            {copied ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <ClipboardIcon className="w-4 h-4" />
            )}
            {copied ? 'Copied!' : 'Copy text'}
          </button>
          <button className="flex items-center gap-1 text-sm text-stone-600 hover:bg-stone-100 px-3 py-1.5 rounded-md transition-colors">
            <SaveIcon className="w-4 h-4" />
            Save
          </button>
          <button className="flex items-center gap-1 text-sm text-stone-600 hover:bg-stone-100 px-3 py-1.5 rounded-md transition-colors">
            <FileTextIcon className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={handleNewRecordingClick}
            className="flex items-center gap-1 text-sm text-stone-600 hover:bg-stone-100 px-3 py-1.5 rounded-md transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Record new note
          </button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row">
        {/* Sidebar with metadata */}
        <div className="w-full md:w-1/4 p-4 bg-stone-50 border-r border-stone-200">
          <div className="mb-6">
            <h3 className="font-medium text-sm text-stone-500 uppercase tracking-wider mb-2">
              Recording details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                <span className="text-stone-500">Patient:</span>
                <span className="font-medium text-stone-800">
                  {patientName}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                <span className="text-stone-500">Duration:</span>
                <span className="font-medium text-stone-800">01:25</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                <span className="text-stone-500">Date:</span>
                <span className="font-medium text-stone-800">
                  {formatDate()}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                <span className="text-stone-500">Model:</span>
                <span className="font-medium text-stone-800">
                  {isHighAccuracy ? 'High accuracy' : 'Standard'}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-sm text-stone-500 uppercase tracking-wider mb-2">
              Processing
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                <span className="text-stone-500">Medical terms:</span>
                <span className="font-medium text-[#1B4332]">6 detected</span>
              </div>
              <div
                className="p-2 bg-white rounded-md cursor-pointer"
                onClick={() => setShowCorrections(!showCorrections)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Corrections:</span>
                  <div className="flex items-center">
                    <span className="font-medium text-stone-800 mr-1">
                      2 applied
                    </span>
                    {showCorrections ? (
                      <ChevronUpIcon className="w-4 h-4 text-stone-500" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4 text-stone-500" />
                    )}
                  </div>
                </div>
                {showCorrections && (
                  <div className="mt-2 border-t border-stone-200 pt-2 space-y-2">
                    {corrections.map((correction, index) => (
                      <div
                        key={index}
                        className="text-xs bg-stone-100 p-2 rounded"
                      >
                        <div className="flex">
                          <span className="line-through text-stone-500 mr-1">
                            {correction.original}
                          </span>
                          <span className="text-[#1B4332]">
                            → {correction.corrected}
                          </span>
                        </div>
                        <div className="text-stone-600 mt-1 italic">
                          "{correction.context}"
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Main transcript area */}
        <div className="w-full md:w-3/4 p-6">
          {isEditing ? (
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full h-64 p-4 border border-stone-300 rounded-md focus:ring-2 focus:ring-[#6B1F1F] focus:border-[#6B1F1F] outline-none font-sans text-stone-800"
              placeholder="Edit your transcript here..."
            />
          ) : (
            <div
              className="w-full h-64 p-5 border border-stone-200 rounded-md bg-white overflow-y-auto font-sans text-stone-800 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: highlightMedicalTerms(transcript),
              }}
            />
          )}
          <div className="mt-8 text-center">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 bg-[#6B1F1F] hover:bg-[#5a1a1a] text-white py-3 px-6 rounded-full mx-auto transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <EditIcon className="w-4 h-4" />
              {isEditing ? 'Save changes' : 'Edit transcript'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

```
```components/Modal.tsx
import React from 'react'
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  cancelText?: string
  confirmText?: string
}
export function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  cancelText = 'Go back',
  confirmText = 'Confirm',
}: ModalProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-[fadeIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-serif font-semibold text-stone-900 mb-2">
          {title}
        </h3>
        <p className="text-stone-600 mb-6">{message}</p>
        <div className="flex flex-col sm:flex-row-reverse gap-3 sm:gap-4">
          <button
            onClick={onConfirm}
            className="bg-[#6B1F1F] hover:bg-[#5a1a1a] text-white py-2 px-4 rounded-md transition-colors"
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="border border-stone-300 text-stone-700 hover:bg-stone-100 py-2 px-4 rounded-md transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}

```
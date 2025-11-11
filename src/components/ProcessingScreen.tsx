import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, CircleIcon, Clock3Icon } from 'lucide-react';

const PROCESSING_STEPS = [
  {
    id: 'audio',
    label: 'Preparing audio',
    weight: 15,
  },
  {
    id: 'transcribe',
    label: 'Transcribing speech',
    weight: 65,
    longStep: true,
  },
  {
    id: 'medical',
    label: 'Medical formatting',
    weight: 15,
  },
  {
    id: 'complete',
    label: 'Finalizing',
    weight: 5,
  },
] as const;
interface ModeDecision {
  mode?: string;
  reason?: string;
  heuristics?: {
    audio?: {
      durationSeconds?: number;
      fileSizeBytes?: number;
    };
    system?: {
      totalMemMB?: number;
      freeMemMB?: number;
    };
  };
}

interface ProcessingScreenProps {
  modeKey: string;
  modeLabel: string;
  processingStep: string;
  processingProgress: number;
  minutesProcessed?: number;
  totalMinutes?: number;
  modeDecision?: ModeDecision | null;
}
export function ProcessingScreen({
  modeKey,
  modeLabel,
  processingStep,
  processingProgress,
  minutesProcessed = 0,
  totalMinutes = 0,
  modeDecision = null,
}: ProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const processingTime = modeKey === 'fast' ? 1 : 3;
  useEffect(() => {
    // Find current step index based on processingStep prop
    const stepIndex = PROCESSING_STEPS.findIndex(step => step.id === processingStep);
    if (stepIndex >= 0) {
      setCurrentStep(stepIndex);
    }

    // Calculate weighted progress based on current step and progress
    let baseProgress = 0;
    for (let i = 0; i < stepIndex; i++) {
      baseProgress += PROCESSING_STEPS[i].weight;
    }
    
    if (stepIndex >= 0) {
      const currentStepProgress = PROCESSING_STEPS[stepIndex].weight * (processingProgress / 100);
      setProgressPercentage(baseProgress + currentStepProgress);
    }
  }, [processingStep, processingProgress]);
  const decisionReasonMap: Record<string, string> = {
    'long-duration': 'Smart mode chose the faster pipeline for a long recording.',
    'large-file': 'Large audio size triggered the faster pipeline.',
    'duration-memory': 'Fast mode selected to balance duration and system memory.',
    'limited-memory': 'Fast mode selected due to limited system memory.',
    'low-free-memory': 'Fast mode selected to prevent swapping.',
    'short-audio': 'Accurate mode selected for a short recording.',
  };

  const decisionNote = modeDecision?.reason ? decisionReasonMap[modeDecision.reason] || `Smart mode applied: ${modeDecision.reason}` : null;
  const minutes = modeDecision?.heuristics?.audio?.durationSeconds
    ? Math.round((modeDecision.heuristics.audio.durationSeconds / 60) * 10) / 10
    : null;
  const processedMinutesDisplay = minutesProcessed > 0 || totalMinutes > 0
    ? `Processed ~${minutesProcessed.toFixed(1)} min${totalMinutes > 0 ? ` of ~${Math.max(totalMinutes, minutesProcessed).toFixed(1)} min total` : ''}`
    : null;

  return <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-serif text-3xl text-stone-900 font-semibold">
            Converting to notes
          </h2>
          <p className="text-sm text-stone-500">Mode: {modeLabel || modeKey}</p>
          {decisionNote ? (
            <p className="text-xs text-amber-700 mt-1">
              {decisionNote}
              {minutes ? ` • Duration detected: ${minutes} min` : null}
            </p>
          ) : null}
        </div>
      </div>
      <div className="space-y-4 mb-8">
        {PROCESSING_STEPS.map((step, index) => {
        let status = 'pending';
        if (index < currentStep) status = 'completed';
        if (index === currentStep) status = 'processing';
        return <div key={step.id} className="p-3 border-b border-stone-100 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {status === 'completed' ? <CheckCircleIcon className="w-5 h-5 text-amber-700 mr-3" /> : status === 'processing' ? <div className="w-5 h-5 rounded-full border-2 border-[#6B1F1F] border-t-transparent animate-spin mr-3"></div> : <CircleIcon className="w-5 h-5 text-stone-300 mr-3" />}
                  <div>
                    <span className={`font-medium ${status === 'completed' ? 'text-stone-700' : status === 'processing' ? 'text-[#6B1F1F]' : 'text-stone-400'}`}>
                      {step.label}
                    </span>
                    {step.longStep && <div className="flex items-center text-xs text-amber-700 mt-0.5">
                        <Clock3Icon className="w-3 h-3 mr-1" />
                        <span>Main processing step</span>
                      </div>}
                  </div>
                </div>
                <span className="text-sm">
                  {status === 'completed' && 'Completed'}
                  {status === 'processing' && 'Processing...'}
                  {status === 'pending' && 'Pending'}
                </span>
              </div>
            </div>;
      })}
      </div>
	      <p className="text-center text-stone-600 bg-stone-50 py-3 px-4 rounded-lg border border-stone-100">
	        {currentStep < PROCESSING_STEPS.length - 1 ? `Estimated time remaining: ~${processingTime - Math.round(progressPercentage / 100 * processingTime)} minute${processingTime - Math.round(progressPercentage / 100 * processingTime) !== 1 ? 's' : ''}` : 'All processing complete! Preparing transcript...'}
	      </p>
	      {processedMinutesDisplay ? (
	        <p className="text-center text-xs text-stone-500 mt-2">
	          {processedMinutesDisplay}
	        </p>
	      ) : null}
	    </div>;
  }

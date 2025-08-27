import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, CircleIcon, Clock3Icon } from 'lucide-react';
interface ProcessingScreenProps {
  isHighAccuracy: boolean;
}
export function ProcessingScreen({
  isHighAccuracy
}: ProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const processingTime = isHighAccuracy ? 3 : 1;
  const PROCESSING_STEPS = [{
    id: 'audio',
    label: 'Audio',
    weight: 10,
    estimatedTime: '~5 sec'
  }, {
    id: 'transcribe',
    label: 'Transcribe',
    weight: 70,
    estimatedTime: isHighAccuracy ? '~2 min' : '~30 sec',
    longStep: true
  }, {
    id: 'medical',
    label: 'Medical terms',
    weight: 15,
    estimatedTime: '~15 sec'
  }, {
    id: 'complete',
    label: 'Complete',
    weight: 5,
    estimatedTime: '~2 sec'
  }];
  useEffect(() => {
    // Step completion timing
    const stepTiming = [500, isHighAccuracy ? 1500 : 500, 800, 200 // Complete
    ];
    // Update progress with weighted values
    const updateProgress = (step: number, progress: number) => {
      // Calculate the base progress up to the previous step
      let baseProgress = 0;
      for (let i = 0; i < step; i++) {
        baseProgress += PROCESSING_STEPS[i].weight;
      }
      // Add the progress within the current step
      const currentStepProgress = PROCESSING_STEPS[step].weight * progress;
      setProgressPercentage(baseProgress + currentStepProgress);
    };
    let timeSum = 0;
    // For each step, animate progress during the step
    PROCESSING_STEPS.forEach((step, index) => {
      const startTime = timeSum;
      const duration = stepTiming[index];
      timeSum += duration;
      // Animate progress during each step
      const progressInterval = 50; // Update every 50ms
      for (let t = 0; t <= duration; t += progressInterval) {
        setTimeout(() => {
          if (index < currentStep) {
            // Step already completed
            return;
          }
          // Progress within current step (0 to 1)
          const stepProgress = Math.min(1, t / duration);
          updateProgress(index, stepProgress);
          // If we've reached the end of this step, update the current step
          if (t + progressInterval > duration && index === currentStep) {
            setCurrentStep(index);
          }
        }, startTime + t);
      }
      // Set the step as current at the beginning of its time
      setTimeout(() => {
        setCurrentStep(index);
      }, startTime);
    });
  }, [isHighAccuracy]);
  return <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-3xl text-stone-900 font-semibold">
          Converting to notes
        </h2>
      </div>
      <div className="w-full bg-stone-100 h-2 rounded-full mb-8 overflow-hidden">
        <div className="bg-[#6B1F1F] h-full rounded-full transition-all duration-300 ease-out" style={{
        width: `${progressPercentage}%`
      }}></div>
      </div>
      <div className="space-y-4 mb-8">
        {PROCESSING_STEPS.map((step, index) => {
        let status = 'pending';
        if (index < currentStep) status = 'completed';
        if (index === currentStep) status = 'processing';
        return <div key={step.id} className={`flex items-center justify-between p-3 border-b border-stone-100 last:border-b-0 ${step.longStep ? 'bg-amber-50/50' : ''}`}>
              <div className="flex items-center">
                {status === 'completed' ? <CheckCircleIcon className="w-5 h-5 text-amber-700 mr-3" /> : status === 'processing' ? <div className="w-5 h-5 rounded-full border-2 border-[#6B1F1F] border-t-transparent animate-spin mr-3"></div> : <CircleIcon className="w-5 h-5 text-stone-300 mr-3" />}
                <div>
                  <span className={`font-medium ${status === 'completed' ? 'text-stone-700' : status === 'processing' ? 'text-[#6B1F1F]' : 'text-stone-400'}`}>
                    {step.label}
                  </span>
                  {step.longStep && <div className="flex items-center text-xs text-amber-700 mt-0.5">
                      <Clock3Icon className="w-3 h-3 mr-1" />
                      <span>Longest step</span>
                    </div>}
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
            </div>;
      })}
      </div>
      <p className="text-center text-stone-600 bg-stone-50 py-3 px-4 rounded-lg border border-stone-100">
        {currentStep < PROCESSING_STEPS.length - 1 ? `Estimated time remaining: ~${processingTime - Math.round(progressPercentage / 100 * processingTime)} minute${processingTime - Math.round(progressPercentage / 100 * processingTime) !== 1 ? 's' : ''}` : 'All processing complete! Preparing transcript...'}
      </p>
    </div>;
}
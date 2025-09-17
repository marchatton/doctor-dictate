import { useState, useCallback } from 'react';

export type ProcessingStep = 
  | 'idle'
  | 'saving-audio'
  | 'transcribing'
  | 'formatting'
  | 'verifying'
  | 'complete'
  | 'error';

interface ProcessingState {
  step: ProcessingStep;
  progress: number;
  message: string;
  error?: string;
}

export function useProcessingState() {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    step: 'idle',
    progress: 0,
    message: ''
  });
  
  const updateProcessingStep = useCallback((
    step: ProcessingStep, 
    progress: number = 0, 
    message: string = ''
  ) => {
    setProcessingState({
      step,
      progress,
      message,
      error: undefined
    });
  }, []);
  
  const setProcessingError = useCallback((error: string) => {
    setProcessingState(prev => ({
      ...prev,
      step: 'error',
      error
    }));
  }, []);
  
  const resetProcessing = useCallback(() => {
    setProcessingState({
      step: 'idle',
      progress: 0,
      message: ''
    });
  }, []);
  
  const isProcessing = processingState.step !== 'idle' && 
                       processingState.step !== 'complete' && 
                       processingState.step !== 'error';
  
  return {
    processingState,
    updateProcessingStep,
    setProcessingError,
    resetProcessing,
    isProcessing
  };
}
/**
 * Transcription Progress Manager for DoctorDictate
 * Research-backed progress indication for medical professionals
 * Based on HCI principles: Bounded Uncertainty with Meaningful Checkpoints
 */

class TranscriptionProgress {
    constructor(audioDurationSeconds) {
        this.audioDuration = audioDurationSeconds;
        
        // Baseline processing rates for different models
        this.processingRates = {
            'medium.en': 0.5,  // ~0.5x realtime for medium model
            'small.en': 0.3,   // ~0.3x realtime for small model
            'base.en': 0.2     // ~0.2x realtime for base model
        };
        
        // Default to medium model rate
        this.baselineRate = this.processingRates['medium.en'];
        
        // Calculate estimated time with bounds
        this.estimatedSeconds = Math.ceil(audioDurationSeconds / this.baselineRate);
        this.lowerBound = Math.ceil(this.estimatedSeconds * 0.7);
        this.upperBound = Math.ceil(this.estimatedSeconds * 1.5);
        
        // Define stages with expected durations
        this.stages = [
            { 
                id: 'preparing',
                name: 'Preparing audio file',
                duration: 2, 
                deterministic: true,
                icon: '○'
            },
            { 
                id: 'transcribing',
                name: 'Processing audio',
                duration: this.estimatedSeconds, 
                deterministic: false,
                icon: '⟳'
            },
            { 
                id: 'medical',
                name: 'Verifying medical terminology',
                duration: 5, 
                deterministic: true,
                icon: '○'
            },
            { 
                id: 'finalizing',
                name: 'Finalizing transcript',
                duration: 2, 
                deterministic: true,
                icon: '○'
            }
        ];
        
        this.currentStage = 0;
        this.stageStartTime = null;
        this.overallStartTime = Date.now();
        this.completed = [];
    }

    /**
     * Set model for accurate time estimation
     */
    setModel(model) {
        if (this.processingRates[model]) {
            this.baselineRate = this.processingRates[model];
            this.estimatedSeconds = Math.ceil(this.audioDuration / this.baselineRate);
            this.lowerBound = Math.ceil(this.estimatedSeconds * 0.7);
            this.upperBound = Math.ceil(this.estimatedSeconds * 1.5);
            this.stages[1].duration = this.estimatedSeconds;
        }
    }

    /**
     * Format seconds to human-readable time
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)} seconds`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        if (remainingSeconds === 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Format audio duration for display
     */
    formatAudioDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Move to next stage
     */
    nextStage(stageName = null) {
        if (this.currentStage > 0 && this.currentStage <= this.stages.length) {
            this.completed.push(this.stages[this.currentStage - 1].id);
        }
        
        // Find stage by name if provided
        if (stageName) {
            const stageIndex = this.stages.findIndex(s => s.id === stageName);
            if (stageIndex !== -1) {
                this.currentStage = stageIndex + 1;
            }
        } else {
            this.currentStage++;
        }
        
        this.stageStartTime = Date.now();
    }

    /**
     * Get current progress status
     */
    getStatus(actualProgress = null) {
        if (this.currentStage === 0 || this.currentStage > this.stages.length) {
            return {
                message: '',
                subMessage: '',
                stages: this.getStageList(),
                isComplete: this.currentStage > this.stages.length
            };
        }

        const stage = this.stages[this.currentStage - 1];
        const elapsedTotal = (Date.now() - this.overallStartTime) / 1000;
        
        let message = stage.name;
        let subMessage = '';

        // Handle the variable transcription stage
        if (stage.id === 'transcribing') {
            const audioDurationFormatted = this.formatAudioDuration(this.audioDuration);
            message = `Processing ${audioDurationFormatted} of audio...`;
            
            // Show time estimate range
            if (this.audioDuration > 30) {
                const lowerTime = this.formatTime(this.lowerBound);
                const upperTime = this.formatTime(this.upperBound);
                subMessage = `Typically takes ${lowerTime} to ${upperTime}`;
            } else {
                subMessage = `Processing medical dictation...`;
            }
            
            // If we have actual progress, show it subtly
            if (actualProgress && actualProgress > 0) {
                const processedSeconds = Math.round(this.audioDuration * (actualProgress / 100));
                const processedTime = this.formatAudioDuration(processedSeconds);
                message = `Processing audio (${processedTime} of ${audioDurationFormatted})...`;
            }
        } else if (stage.deterministic) {
            message = `${stage.name}...`;
        }

        return {
            message,
            subMessage,
            stages: this.getStageList(),
            showSpinner: !stage.deterministic,
            isComplete: false
        };
    }

    /**
     * Get visual stage list for UI
     */
    getStageList() {
        return this.stages.map((stage, index) => {
            let icon = stage.icon;
            let status = 'pending';
            
            if (this.completed.includes(stage.id)) {
                icon = '✓';
                status = 'completed';
            } else if (index === this.currentStage - 1) {
                icon = '⟳';
                status = 'active';
            }
            
            return {
                icon,
                name: stage.name,
                status,
                id: stage.id
            };
        });
    }

    /**
     * Get progress for renderer
     */
    getProgress(whisperStage = null, whisperProgress = null) {
        // Map Whisper stages to our stages
        const stageMap = {
            'preprocessing': 'preparing',
            'transcribing': 'transcribing',
            'processing': 'medical',
            'formatting': 'medical',
            'complete': 'finalizing'
        };

        if (whisperStage && stageMap[whisperStage]) {
            const targetStage = stageMap[whisperStage];
            
            // Move to the appropriate stage if needed
            if (this.stages[this.currentStage - 1]?.id !== targetStage) {
                this.nextStage(targetStage);
            }
        }

        return this.getStatus(whisperProgress);
    }

    /**
     * Mark as complete
     */
    complete() {
        this.currentStage = this.stages.length + 1;
        this.completed = this.stages.map(s => s.id);
        
        const totalTime = (Date.now() - this.overallStartTime) / 1000;
        
        return {
            message: 'Transcript ready',
            subMessage: `Completed in ${this.formatTime(totalTime)}`,
            stages: this.getStageList(),
            isComplete: true
        };
    }
}

module.exports = { TranscriptionProgress };
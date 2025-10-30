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
            'small.en': 0.4,   // ~0.4x realtime for small model (high accuracy)
            'tiny.en': 0.2,    // ~0.2x realtime for tiny model (fast)
            'base.en': 0.3     // ~0.3x realtime for base model (fallback)
        };
        
        // Default to small model rate (high accuracy default)
        this.baselineRate = this.processingRates['small.en'];
        
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
            const previousStage = this.stages[this.currentStage - 1];
            if (previousStage && !this.completed.includes(previousStage.id)) {
                this.completed.push(previousStage.id);
            }
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
        const stage = this.getActiveStage();
        const stageProgress = this.calculateStageProgress(stage, actualProgress);
        const progressMeta = this.buildProgressMeta(stage, stageProgress);

        if (this.currentStage === 0) {
            return {
                message: '',
                subMessage: '',
                stages: this.getStageList(),
                isComplete: false,
                showSpinner: true,
                progress: progressMeta
            };
        }

        if (this.currentStage > this.stages.length) {
            return {
                message: '',
                subMessage: '',
                stages: this.getStageList(),
                isComplete: true,
                showSpinner: false,
                progress: this.buildProgressMeta(this.getLastStage(), 1, { forceComplete: true })
            };
        }

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

        const showSpinner = !stage.deterministic && stageProgress === 0;

        return {
            message,
            subMessage,
            stages: this.getStageList(),
            showSpinner,
            isComplete: false,
            progress: progressMeta
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
            isComplete: true,
            showSpinner: false,
            progress: this.buildProgressMeta(this.getLastStage(), 1, { forceComplete: true })
        };
    }

    /**
     * Get the stage currently in progress
     */
    getActiveStage() {
        if (this.currentStage === 0 || this.currentStage > this.stages.length) {
            return null;
        }
        return this.stages[this.currentStage - 1];
    }

    /**
     * Safely retrieve the final stage definition
     */
    getLastStage() {
        return this.stages[this.stages.length - 1];
    }

    /**
     * Calculate progress for the active stage
     */
    calculateStageProgress(stage, actualProgress) {
        if (!stage) {
            return 0;
        }

        if (typeof actualProgress === 'number' && Number.isFinite(actualProgress)) {
            return this.clampPercent(actualProgress / 100);
        }

        if (stage.deterministic && this.stageStartTime) {
            const elapsedSeconds = (Date.now() - this.stageStartTime) / 1000;
            if (stage.duration <= 0) {
                return 1;
            }
            return this.clampPercent(elapsedSeconds / stage.duration);
        }

        return 0;
    }

    /**
     * Build unified progress metadata for renderer consumption
     */
    buildProgressMeta(stage, stageProgress, options = {}) {
        const totalEstimated = this.getTotalExpectedDuration();
        const completedDuration = this.completed.reduce((sum, stageId) => {
            const completedStage = this.stages.find(s => s.id === stageId);
            return completedStage ? sum + completedStage.duration : sum;
        }, 0);

        const activeContribution = stage ? stage.duration * stageProgress : 0;
        const elapsedSeconds = Math.max(0, Math.round((Date.now() - this.overallStartTime) / 1000));
        const rawPercent = totalEstimated > 0
            ? ((completedDuration + activeContribution) / totalEstimated) * 100
            : 0;

        const clampedPercent = options.forceComplete ? 100 : this.clampPercent(rawPercent / 100) * 100;
        const roundedPercent = Number(clampedPercent.toFixed(1));

        const remainingSeconds = options.forceComplete
            ? 0
            : Math.max(0, Math.round(totalEstimated - (completedDuration + activeContribution)));

        return {
            stageId: stage ? stage.id : null,
            stagePercent: Number((stageProgress * 100).toFixed(1)),
            percent: roundedPercent,
            elapsedSeconds,
            estimatedTotalSeconds: Math.round(totalEstimated),
            estimatedRemainingSeconds: remainingSeconds,
            lowerBoundSeconds: this.lowerBound,
            upperBoundSeconds: this.upperBound
        };
    }

    /**
     * Aggregate total expected duration across stages
     */
    getTotalExpectedDuration() {
        return this.stages.reduce((sum, stage) => sum + stage.duration, 0);
    }

    /**
     * Clamp a fractional value between 0 and 1
     */
    clampPercent(value) {
        if (!Number.isFinite(value)) {
            return 0;
        }
        return Math.min(1, Math.max(0, value));
    }
}

module.exports = { TranscriptionProgress };

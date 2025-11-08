export type ProgressStageId = 'preparing' | 'transcribing' | 'medical' | 'finalizing';

type ProgressStage = {
  id: ProgressStageId;
  name: string;
  duration: number;
  deterministic: boolean;
  icon: string;
};

type StageStatus = 'pending' | 'active' | 'completed';

type StageListEntry = {
  icon: string;
  name: string;
  status: StageStatus;
  id: string;
};

type ProgressSnapshot = {
  message: string;
  subMessage: string;
  stages: StageListEntry[];
  showSpinner?: boolean;
  isComplete: boolean;
};

export class TranscriptionProgress {
  private readonly audioDuration: number;

  private readonly processingRates: Record<string, number> = {
    'small.en': 0.4,
    'tiny.en': 0.2,
    'base.en': 0.3,
  };

  private baselineRate: number;

  private estimatedSeconds: number;

  private lowerBound: number;

  private upperBound: number;

  private readonly stages: ProgressStage[];

  private currentStage = 0;

  private readonly completed: string[] = [];

  private readonly overallStartTime: number;

  private stageStartTime: number | null = null;

  constructor(audioDurationSeconds: number) {
    this.audioDuration = audioDurationSeconds;
    this.baselineRate = this.processingRates['small.en'];
    this.estimatedSeconds = Math.ceil(audioDurationSeconds / this.baselineRate);
    this.lowerBound = Math.ceil(this.estimatedSeconds * 0.7);
    this.upperBound = Math.ceil(this.estimatedSeconds * 1.5);
    this.stages = this.createStages();
    this.overallStartTime = Date.now();
  }

  setModel(model: string): void {
    if (!this.processingRates[model]) {
      return;
    }
    this.baselineRate = this.processingRates[model];
    this.estimatedSeconds = Math.ceil(this.audioDuration / this.baselineRate);
    this.lowerBound = Math.ceil(this.estimatedSeconds * 0.7);
    this.upperBound = Math.ceil(this.estimatedSeconds * 1.5);
    const transcribing = this.stages.find((stage) => stage.id === 'transcribing');
    if (transcribing) {
      transcribing.duration = this.estimatedSeconds;
    }
  }

  nextStage(stageName?: ProgressStageId): void {
    if (this.currentStage > 0 && this.currentStage <= this.stages.length) {
      this.completed.push(this.stages[this.currentStage - 1].id);
    }

    if (stageName) {
      const stageIndex = this.stages.findIndex((stage) => stage.id === stageName);
      if (stageIndex !== -1) {
        this.currentStage = stageIndex + 1;
      }
    } else {
      this.currentStage += 1;
    }

    this.stageStartTime = Date.now();
  }

  getStatus(actualProgressPercent: number | null = null): ProgressSnapshot {
    if (this.currentStage === 0 || this.currentStage > this.stages.length) {
      return {
        message: '',
        subMessage: '',
        stages: this.getStageList(),
        isComplete: this.currentStage > this.stages.length,
      };
    }

    const stage = this.stages[this.currentStage - 1];
    let message = stage.name;
    let subMessage = '';

    if (stage.id === 'transcribing') {
      const formattedDuration = this.formatAudioDuration(this.audioDuration);
      message = `Processing ${formattedDuration} of audio...`;

      if (this.audioDuration > 30) {
        const lowerTime = this.formatTime(this.lowerBound);
        const upperTime = this.formatTime(this.upperBound);
        subMessage = `Typically takes ${lowerTime} to ${upperTime}`;
      } else {
        subMessage = 'Processing medical dictation...';
      }

      if (actualProgressPercent && actualProgressPercent > 0) {
        const processedSeconds = Math.round(this.audioDuration * (actualProgressPercent / 100));
        const processedTime = this.formatAudioDuration(processedSeconds);
        message = `Processing audio (${processedTime} of ${formattedDuration})...`;
      }
    } else if (stage.deterministic) {
      message = `${stage.name}...`;
    }

    return {
      message,
      subMessage,
      stages: this.getStageList(),
      showSpinner: !stage.deterministic,
      isComplete: false,
    };
  }

  getStageList(): StageListEntry[] {
    return this.stages.map((stage, index) => {
      let icon = stage.icon;
      let status: StageStatus = 'pending';

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
        id: stage.id,
      };
    });
  }

  getProgress(whisperStage: string | null = null, whisperProgress: number | null = null): ProgressSnapshot {
    const stageMap: Record<string, ProgressStageId> = {
      preprocessing: 'preparing',
      transcribing: 'transcribing',
      processing: 'medical',
      formatting: 'medical',
      complete: 'finalizing',
    };

    if (whisperStage && stageMap[whisperStage]) {
      const targetStage = stageMap[whisperStage];
      if (this.stages[this.currentStage - 1]?.id !== targetStage) {
        this.nextStage(targetStage);
      }
    }

    return this.getStatus(whisperProgress);
  }

  complete(): ProgressSnapshot {
    this.currentStage = this.stages.length + 1;
    this.completed.splice(0, this.completed.length, ...this.stages.map((stage) => stage.id));
    const totalTime = (Date.now() - this.overallStartTime) / 1000;
    return {
      message: 'Transcript ready',
      subMessage: `Completed in ${this.formatTime(totalTime)}`,
      stages: this.getStageList(),
      isComplete: true,
    };
  }

  private createStages(): ProgressStage[] {
    return [
      {
        id: 'preparing',
        name: 'Preparing audio file',
        duration: 2,
        deterministic: true,
        icon: '○',
      },
      {
        id: 'transcribing',
        name: 'Processing audio',
        duration: this.estimatedSeconds,
        deterministic: false,
        icon: '⟳',
      },
      {
        id: 'medical',
        name: 'Verifying medical terminology',
        duration: 5,
        deterministic: true,
        icon: '○',
      },
      {
        id: 'finalizing',
        name: 'Finalizing transcript',
        duration: 2,
        deterministic: true,
        icon: '○',
      },
    ];
  }

  private formatTime(seconds: number): string {
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

  private formatAudioDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

export default TranscriptionProgress;

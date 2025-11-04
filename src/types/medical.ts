export type CorrectionMap = Record<string, string>;

export type MedicationEntry = {
  brandNames?: string[];
  commonDosages?: string[];
  category?: string;
  typicalUse?: string;
  notes?: string;
  commonErrors?: string[];
  dosageErrors?: string[];
  rxNormId?: string;
  [key: string]: unknown;
};

export type MedicationCategoryMap = Record<string, MedicationEntry>;

export type TranscriptionCorrectionType = 'medication' | 'dosage';
export type TranscriptionCorrectionConfidence = 'high' | 'medium' | 'low';

export type TranscriptionCorrection = {
  original: string;
  corrected: string;
  type: TranscriptionCorrectionType;
  confidence: TranscriptionCorrectionConfidence;
};

export type TranscriptionAccuracyResult = {
  accuracy: number;
  correctCount: number;
  totalCount: number;
  corrections: TranscriptionCorrection[];
  passed: boolean;
};

export type MedicalDictionaryValidate = {
  isMedication: (name: string) => boolean;
  getMedicationInfo: (name: string) => (MedicationEntry & { correctedName?: string; wasError?: boolean }) | null;
  isValidDosage: (dosage: string) => boolean;
  getCorrectedMedicationName: (errorName: string) => string | null;
  getCorrectedDosage: (dosage: string) => string;
  checkTranscriptionErrors: (text: string) => TranscriptionCorrection[];
  getTranscriptionAccuracy: (transcript: string, expectedTerms: string[]) => TranscriptionAccuracyResult;
  isCondition: (name: string) => boolean;
  getConditionInfo: (name: string) => Record<string, unknown> | null;
  getMedicationsByCategory: (category: string) => MedicationCategoryMap;
  searchMedications: (query: string) => Array<MedicationEntry & { name: string; category: string }>;
};

type ConditionEntry = Record<string, unknown>;
type ConditionCategory = Record<string, ConditionEntry>;

export type MedicalDictionary = {
  preservationRules: {
    medications: string;
    dosing: string;
    format: string;
  };
  corrections: {
    medications: CorrectionMap;
    abbreviations: CorrectionMap;
    phrases: CorrectionMap;
    numbers: CorrectionMap;
  };
  medications: Record<string, MedicationCategoryMap>;
  conditions: Record<string, ConditionCategory>;
  terminology: {
    abbreviations: CorrectionMap;
    units: CorrectionMap;
    frequency: CorrectionMap;
  };
  transcriptionErrors: {
    commonMistakes: Record<string, string[]>;
    dosageErrors: Record<string, string[]>;
    [key: string]: Record<string, string[]>;
  };
  validate: MedicalDictionaryValidate;
};

export type ManifestEntry = {
  key?: string;
  title?: string;
  detectedTitle?: string;
  format?: string;
  contentRange?: {
    start?: number;
    end?: number;
  };
  [key: string]: unknown;
};

export type StructuredSection = {
  key: string;
  title?: string;
  body?: string;
  confidence?: number;
  manifestEntry?: ManifestEntry;
};

export type StructuredNoteReport = {
  isValid: boolean;
  missingSections: string[];
  extraSections: string[];
  coverageIssues: Array<{ key?: string; title: string; coverage: number; missingSentences: Array<{ text: string; missingWords: string[]; position: number }> }>;
  sectionCoverages: Array<{ key?: string; title: string; coverage: number; details: unknown }>;
};

export type FormatterResponseSuccess = {
  success: true;
  formatted: string;
  model?: string;
  promptVersion?: string;
  manifest?: unknown;
  verification?: StructuredNoteReport;
};

export type FormatterResponseFailure = {
  success: false;
  formatted: string;
  error?: string;
  model?: string;
};

export type FormatterResponse = FormatterResponseSuccess | FormatterResponseFailure;

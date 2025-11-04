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

export type SectionFormat = 'paragraph' | 'bullet-list' | 'numbered-list' | 'single-line' | 'table' | string;

export type TemplateSection = {
  id: string;
  title: string;
  required?: boolean;
  format: SectionFormat;
  patterns?: string[];
  itemFormat?: string;
  description?: string;
  example?: string | string[];
  autoFill?: boolean;
  templateSpecific?: string[];
  constraints?: string[];
  [key: string]: unknown;
};

export type TemplateFormatting = {
  sectionHeaderLevel?: number;
  sectionHeaderPrefix?: string;
  sectionSeparator?: string;
  listItemPrefix?: Record<string, string>;
  listSeparators?: Record<string, string>;
  [key: string]: unknown;
};

export type PromptTemplate = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  sections: TemplateSection[];
  formatting?: TemplateFormatting;
  templateSpecificRules?: Array<{ section: string; rule: string }>;
};

export type ManifestRange = {
  start: number;
  end: number | null;
};

export type ManifestEntry = {
  order: number;
  key: string;
  id: string | null;
  title: string;
  detectedTitle?: string;
  type: 'known' | 'smart' | 'speaker-defined-section' | 'unsectioned' | string;
  confidence: number;
  position: number;
  lineNumber: number;
  lineText: string;
  format: SectionFormat;
  templateSection: {
    id: string;
    required: boolean;
    format?: SectionFormat;
  } | null;
  range: ManifestRange;
  contentRange: ManifestRange;
  lineRange: ManifestRange;
  [key: string]: unknown;
};

export type SectionManifestSummary = {
  textLength: number;
  totalDetected: number;
  knownCount: number;
  unknownCount: number;
  missingRequired: string[];
  hasFallback: boolean;
};

export type SectionManifest = {
  entries: ManifestEntry[];
  summary: SectionManifestSummary;
};

export type StructuredSection = {
  key: string;
  title?: string;
  body?: string;
  confidence?: number | null;
  manifestEntry?: ManifestEntry;
};

export type StructuredPayload = {
  sections: StructuredSection[];
  uncategorized: string[];
  raw: unknown;
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
  manifest?: SectionManifest;
  verification?: StructuredNoteReport;
  structured?: StructuredPayload;
};

export type FormatterResponseFailure = {
  success: false;
  formatted: string;
  error?: string;
  model?: string;
  manifest?: SectionManifest;
};

export type FormatterResponse = FormatterResponseSuccess | FormatterResponseFailure;

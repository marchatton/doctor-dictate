import { MedicalPromptV7, TemplateLoader } from './medical-prompt-v7';
import { SectionDetector } from './section-detector';
import { SectionManifestBuilder } from './section-manifest-builder';

const CURRENT_VERSION = '7.0';
const CURRENT_PROMPT_FILE = 'medical-prompt-v7.ts';

const MedicalPrompt = MedicalPromptV7;
const MedicalPromptV5 = MedicalPromptV7;

export {
  MedicalPrompt,
  MedicalPromptV5,
  MedicalPromptV7,
  TemplateLoader,
  SectionDetector,
  SectionManifestBuilder,
  CURRENT_VERSION,
  CURRENT_PROMPT_FILE,
};

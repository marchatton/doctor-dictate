import * as fs from 'fs';
import * as path from 'path';

import { ContentVerifier } from './content-verifier';
import { parseStructuredResponse } from './structured-response-parser';
import { renderStructuredMarkdown } from './structured-renderer';
import type {
  FormatterResponse,
  PromptTemplate,
  SectionManifest,
  StructuredNoteReport,
  StructuredPayload,
} from '../../types/medical';

type PromptGenerator = {
  generatePrompt: (dictationText: string, options?: { manifest?: SectionManifest }) => string;
  postProcess: (text: string) => string;
};

type PromptModule = {
  MedicalPrompt: new (template: PromptTemplate) => PromptGenerator;
  TemplateLoader: {
    load: (templateName: string) => PromptTemplate;
  };
};

type FormatOptions = {
  manifest?: SectionManifest;
  dictationText?: string;
  timeout?: number;
};

type StructuredSuccess = FormatterResponse & {
  success: true;
  structured: StructuredPayload;
  verification: StructuredNoteReport;
};

export class OllamaFormatter {
  private baseUrl: string;

  private model: string;

  private isAvailable: boolean | null;

  private temperature: number;

  private readonly config: Record<string, unknown>;

  private readonly contentVerifier: ContentVerifier;

  private staticPrompt: string | null;

  private promptGenerator?: PromptGenerator;

  private template?: PromptTemplate;

  private promptModule?: PromptModule;

  constructor(config: { model?: string; temperature?: number } = {}) {
    this.baseUrl = 'http://localhost:11434';
    this.model = config.model || this.selectOptimalModel();
    this.isAvailable = null;
    this.temperature = config.temperature ?? 0.1;
    this.config = config;
    this.staticPrompt = this.loadStaticPrompt();
    this.contentVerifier = new ContentVerifier();
  }

  private loadStaticPrompt(): string | null {
    try {
      const mdPath = path.join(__dirname, '../../prompts/compiled/medicine-management-prompt.md');
      if (fs.existsSync(mdPath)) {
        const prompt = fs.readFileSync(mdPath, 'utf8');
        console.log('✅ Static prompt loaded successfully from .md');
        return prompt;
      }

      const txtPath = path.join(__dirname, '../../prompts/compiled/medicine-management-prompt.txt');
      const prompt = fs.readFileSync(txtPath, 'utf8');
      console.log('✅ Static prompt loaded successfully from .txt');
      return prompt;
    } catch (error) {
      console.warn('⚠️ Static prompt not found, will use dynamic generation');
      console.warn('  Run "pnpm run build-prompt" to generate static prompt');
      return null;
    }
  }

  private selectOptimalModel(): string {
    const preferredModels = [
      'llama3.2:latest',
      'llama3.2:3b',
      'qwen2.5:3b',
      'qwen2.5:1.5b',
      'mistral:latest',
      'mistral:7b-instruct',
      'mistral:7b',
      'qwen2.5:0.5b',
    ];

    return preferredModels[0];
  }

  private async loadPromptModule(): Promise<PromptModule> {
    if (!this.promptModule) {
      const module = await import('../../prompts');
      this.promptModule = module as PromptModule;
    }
    return this.promptModule;
  }

  async isOllamaAvailable(): Promise<boolean> {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      this.isAvailable = response.ok;

      if (this.isAvailable) {
        await this.selectBestAvailableModel();
      }

      return this.isAvailable;
    } catch (error) {
      console.warn('Ollama not available:', error instanceof Error ? error.message : error);
      this.isAvailable = false;
      return false;
    }
  }

  private async getAvailableModels(): Promise<Array<{ name: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) throw new Error('Failed to fetch models');

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      return data.models || [];
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      return [];
    }
  }

  private async selectBestAvailableModel(): Promise<void> {
    const availableModels = await this.getAvailableModels();
    const modelNames = availableModels.map((m) => m.name);

    const preferredModels = [
      'llama3.2:latest',
      'llama3.2:3b',
      'qwen2.5:3b',
      'qwen2.5:1.5b',
      'mistral:latest',
      'mistral:7b-instruct',
      'mistral:7b',
      'qwen2.5:0.5b',
    ];

    for (const preferred of preferredModels) {
      if (modelNames.includes(preferred)) {
        this.model = preferred;
        console.log(`✅ Selected optimal model: ${preferred}`);

        if (preferred.includes('0.5b')) {
          console.warn('⚠️ Using small model (0.5B) - may have issues with complex prompts');
        }
        return;
      }
    }

    if (modelNames.length > 0) {
      this.model = modelNames[0];
      console.log(`🔄 Using available model: ${this.model}`);
    }
  }

  setModel(modelName: string): void {
    this.model = modelName;
    console.log(`Ollama model set to: ${modelName}`);
  }

  private async generateCompletion(prompt: string, options: Record<string, unknown> = {}): Promise<string> {
    const requestBody = {
      model: this.model,
      prompt,
      stream: false,
      options: {
        temperature: this.temperature,
        top_p: 0.9,
        repeat_penalty: 1.0,
        num_predict: 12000,
        num_ctx: 32768,
        stop: [],
        ...options,
      },
    };

    console.log('\n🌐 OLLAMA REQUEST CONFIG:');
    console.log('  Model:', this.model);
    console.log('  Temperature:', requestBody.options.temperature);

    try {
      const controller = new AbortController();
      const timeoutMs = typeof options.timeout === 'number' ? options.timeout : 120000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        response?: string;
        eval_count?: number;
        total_duration?: number;
        done_reason?: string;
      };

      console.log('\n📥 OLLAMA API RESPONSE:');
      console.log('  - Response length:', data.response?.length || 0, 'characters');
      console.log('  - Tokens generated:', data.eval_count || 'unknown');
      console.log('  - Duration:', data.total_duration ? `${(data.total_duration / 1_000_000_000).toFixed(2)}s` : 'unknown');

      if (data.done_reason === 'length') {
        console.warn('⚠️ Response was truncated due to token limit');
      }

      if (!data.response) {
        console.error('❌ No response field in Ollama response!');
        throw new Error('Empty response from Ollama');
      }

      return data.response?.trim() || '';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      console.error('Ollama generation error:', error);
      throw error;
    }
  }

  async formatMedicalDictation(messyText: string, options: FormatOptions = {}): Promise<FormatterResponse> {
    try {
      const available = await this.isOllamaAvailable();
      if (!available) {
        return {
          success: false,
          formatted: messyText,
          error: 'Ollama service is not available',
          model: 'none',
          manifest: options.manifest,
        };
      }

      return this.formatWithSimpleHandling(messyText, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown formatting error';
      console.error('Ollama formatting error:', message);
      return {
        success: false,
        formatted: messyText,
        error: message,
        model: this.model || 'unknown',
        manifest: options.manifest,
      };
    }
  }

  private async formatWithSimpleHandling(messyText: string, options: FormatOptions = {}): Promise<FormatterResponse> {
    console.log('\n📊 OLLAMA FORMATTING - INPUT ANALYSIS:');
    console.log('  Input length:', messyText.length, 'characters');

    if (messyText.length < 10) {
      console.log('⚠️ Input too short - returning as-is');
      return {
        success: true,
        formatted: messyText,
        model: this.model,
        promptVersion: 'none',
        manifest: options.manifest,
      };
    }

    const manifest = options.manifest;
    const useStructuredPipeline = Boolean(manifest && manifest.entries && manifest.entries.length > 0);
    const forceDynamicPrompt = useStructuredPipeline;

    let prompt: string;
    let promptVersion: string;

    if (this.staticPrompt && !forceDynamicPrompt) {
      prompt = this.staticPrompt.replace('[INSERT_DICTATION_HERE]', messyText);
      promptVersion = 'static-v1';
      console.log('🔍 Using static prompt');
    } else {
      const { promptGenerator } = await this.initializePrompt();
      if (!promptGenerator) {
        console.error('❌ Failed to initialize prompt generator');
        return {
          success: false,
          formatted: messyText,
          error: 'Failed to initialize prompt generator',
          model: this.model,
          manifest,
        };
      }
      prompt = promptGenerator.generatePrompt(messyText, { manifest });
      promptVersion = 'v7';
      console.log('🔍 Using v7 dynamic prompt system');
    }

    console.log(`🔍 Model: ${this.model}, Temperature: ${this.temperature}`);
    console.log('📝 PROMPT LENGTH:', prompt.length, 'characters');

    try {
      const formattedText = await this.generateCompletion(prompt, {
        temperature: this.temperature,
        num_predict: 4000,
        timeout: options.timeout,
      });

      console.log('\n🎯 OLLAMA RESPONSE:');
      console.log(`  - Response length: ${formattedText.length} chars`);

      if (!formattedText || formattedText.length < 10) {
        console.error('❌ Empty or too short response from Ollama');
        return {
          success: false,
          formatted: messyText,
          error: 'Empty response from Ollama',
          model: this.model,
          manifest,
        };
      }

      if (useStructuredPipeline) {
        console.log(
          '🧭 Structured manifest sections:',
          manifest?.entries.map((entry) => entry.title || entry.detectedTitle || entry.key).join(', '),
        );
        const template = await this.getTemplate();
        return this.handleStructuredResponse(
          formattedText,
          messyText,
          manifest!,
          promptVersion,
          template,
          options,
        );
      }

      const cleanedText = this.postProcessResponse(formattedText);

      return {
        success: true,
        formatted: cleanedText,
        model: this.model,
        promptVersion,
        manifest,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown formatting error';
      console.error('❌ Formatting failed:', message);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          formatted: messyText,
          error: 'Request timed out - try a smaller model',
          model: this.model,
          manifest,
        };
      }

      return {
        success: false,
        formatted: messyText,
        error: message,
        model: this.model,
        manifest,
      };
    }
  }

  private handleStructuredResponse(
    responseText: string,
    originalText: string,
    manifest: SectionManifest,
    promptVersion: string,
    template: PromptTemplate,
    options: FormatOptions = {},
  ): StructuredSuccess | FormatterResponse {
    try {
      const parsed = parseStructuredResponse(responseText, manifest);
      const rendered = renderStructuredMarkdown(parsed, manifest, template);
      const verification = this.contentVerifier.verifyStructuredNote({
        dictationText: options.dictationText || originalText,
        manifest,
        markdown: rendered,
        structured: parsed,
      });

      if (!verification.isValid) {
        console.warn('⚠️ Structured verification issues detected:', {
          missingSections: verification.missingSections,
          extraSections: verification.extraSections,
          coverageIssues: verification.coverageIssues.map((issue) => ({
            key: issue.key,
            coverage: issue.coverage,
          })),
        });
      } else {
        console.log('✅ Structured verification passed with sections:', manifest.entries.length);
      }

      return {
        success: true,
        formatted: rendered,
        structured: parsed,
        verification,
        model: this.model,
        promptVersion,
        manifest,
      } satisfies StructuredSuccess;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to parse structured response:', message);
      return {
        success: false,
        formatted: originalText,
        error: `Failed to parse structured response: ${message}`,
        model: this.model,
        manifest,
      };
    }
  }

  private async initializePrompt(): Promise<{ promptGenerator?: PromptGenerator; template?: PromptTemplate }> {
    if (!this.promptGenerator) {
      console.log('🔧 Initializing v7 prompt generator...');
      const { MedicalPrompt, TemplateLoader } = await this.loadPromptModule();

      const template = TemplateLoader.load('medicine-management');
      console.log('  ✓ Template loaded:', template.name || 'medicine-management');

      this.promptGenerator = new MedicalPrompt(template);
      this.template = template;
      console.log('  ✓ V7 prompt generator initialized');
    }
    return { promptGenerator: this.promptGenerator, template: this.template };
  }

  private async getTemplate(): Promise<PromptTemplate> {
    if (this.template) {
      return this.template;
    }
    const { TemplateLoader } = await this.loadPromptModule();
    this.template = TemplateLoader.load('medicine-management');
    return this.template;
  }

  private postProcessResponse(response: string): string {
    console.log('🔧 POST-PROCESSING: Starting...');
    let processed = response;

    processed = processed.replace(/^(Here is|Here's|The formatted|Formatted)[^#]*?(?=###|\n\n)/i, '').trim();

    if (!processed.startsWith('###') && processed.includes('###')) {
      const firstHeaderIndex = processed.indexOf('###');
      const beforeHeader = processed.substring(0, firstHeaderIndex);
      if (beforeHeader.length < 100 && !beforeHeader.match(/\d+\.|diagnosis|patient|medication/i)) {
        processed = processed.substring(firstHeaderIndex);
      }
    }

    processed = processed.replace(/^```[\w]*\n/, '').replace(/\n```$/, '').trim();

    console.log(`  - Cleaned text: ${response.length} -> ${processed.length} chars`);
    return processed;
  }

  async testConnection(): Promise<{
    success: boolean;
    message: string;
    model?: string;
    availableModels?: string[];
    testResponse?: string;
  }> {
    try {
      const available = await this.isOllamaAvailable();
      if (!available) {
        return {
          success: false,
          message: 'Ollama service is not running or accessible',
        };
      }

      const models = await this.getAvailableModels();
      if (models.length === 0) {
        return {
          success: false,
          message: 'No models installed. Please install a model first.',
        };
      }

      const testResult = await this.generateCompletion('Say "Hello, medical formatting is ready!"', {
        num_predict: 50,
      });

      return {
        success: true,
        message: 'Ollama is ready',
        model: this.model,
        availableModels: models.map((m) => m.name),
        testResponse: testResult,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Connection test failed: ${message}`,
      };
    }
  }

  async getModelInfo(): Promise<{
    currentModel?: string;
    modelDetails?: { name: string };
    availableModels?: number;
    status: string;
    error?: string;
  }> {
    try {
      const models = await this.getAvailableModels();
      const currentModel = models.find((m) => m.name === this.model);

      return {
        currentModel: this.model,
        modelDetails: currentModel,
        availableModels: models.length,
        status: (await this.isOllamaAvailable()) ? 'ready' : 'unavailable',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        error: message,
        status: 'error',
      };
    }
  }
}

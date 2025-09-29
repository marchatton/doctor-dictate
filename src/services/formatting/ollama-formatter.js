/**
 * Ollama LLM Integration for Medical Text Formatting
 * Simplified version - trusts LLM and v7 prompt to handle medical formatting properly
 */

const { MedicalPrompt, SectionManifestBuilder } = require('../../prompts');
const { parseStructuredResponse } = require('./structured-response-parser');
const { renderStructuredMarkdown } = require('./structured-renderer');
const { ContentVerifier } = require('./content-verifier');
const fs = require('fs');
const path = require('path');

class OllamaFormatter {
    constructor(config = {}) {
        this.baseUrl = 'http://localhost:11434';
        this.model = config.model || this.selectOptimalModel();
        this.isAvailable = null; // Cache availability status
        this.temperature = config.temperature || 0.1;

        // Store config for dynamic adjustment
        this.config = config;

        // Try to load static prompt
        this.staticPrompt = this.loadStaticPrompt();
        this.manifestBuilder = null;
        this.contentVerifier = new ContentVerifier();
    }

    /**
     * Load the pre-built static prompt
     */
    loadStaticPrompt() {
        try {
            // Try .md file first (user's updated version)
            const mdPath = path.join(__dirname, '../../prompts/compiled/medicine-management-prompt.md');
            if (fs.existsSync(mdPath)) {
                const prompt = fs.readFileSync(mdPath, 'utf8');
                console.log('✅ Static prompt loaded successfully from .md');
                return prompt;
            }

            // Fallback to .txt file
            const txtPath = path.join(__dirname, '../../prompts/compiled/medicine-management-prompt.txt');
            const prompt = fs.readFileSync(txtPath, 'utf8');
            console.log('✅ Static prompt loaded successfully from .txt');
            return prompt;
        } catch (error) {
            console.warn('⚠️ Static prompt not found, will use dynamic generation');
            console.warn('  Run "npm run build-prompt" to generate static prompt');
            return null;
        }
    }

    /**
     * Select optimal model based on what's available
     */
    selectOptimalModel() {
        const preferredModels = [
            'llama3.2:latest',
            'llama3.2:3b',
            'qwen2.5:3b',
            'qwen2.5:1.5b',
            'mistral:latest',
            'mistral:7b-instruct',
            'mistral:7b',
            'qwen2.5:0.5b'
        ];
        
        return preferredModels[0];
    }

    /**
     * Check if Ollama is available and responsive
     */
    async isOllamaAvailable() {
        if (this.isAvailable !== null) {
            return this.isAvailable;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            this.isAvailable = response.ok;
            
            if (this.isAvailable) {
                await this.selectBestAvailableModel();
            }
            
            return this.isAvailable;
        } catch (error) {
            console.warn('Ollama not available:', error.message);
            this.isAvailable = false;
            return false;
        }
    }

    /**
     * Get available models from Ollama
     */
    async getAvailableModels() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) throw new Error('Failed to fetch models');
            
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error fetching Ollama models:', error);
            return [];
        }
    }
    
    /**
     * Select the best available model from preferred list
     */
    async selectBestAvailableModel() {
        const availableModels = await this.getAvailableModels();
        const modelNames = availableModels.map(m => m.name);
        
        const preferredModels = [
            'llama3.2:latest',
            'llama3.2:3b',
            'qwen2.5:3b',
            'qwen2.5:1.5b',
            'mistral:latest',
            'mistral:7b-instruct',
            'mistral:7b',
            'qwen2.5:0.5b'
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

    /**
     * Set the model to use for formatting
     */
    setModel(modelName) {
        this.model = modelName;
        console.log(`Ollama model set to: ${modelName}`);
    }

    /**
     * Generate completion using Ollama
     */
    async generateCompletion(prompt, options = {}) {
        const requestBody = {
            model: this.model,
            prompt: prompt,
            stream: false,
            options: {
                temperature: this.temperature,
                top_p: 0.9,
                repeat_penalty: 1.0,
                num_predict: 12000,
                num_ctx: 32768,
                stop: [],
                ...options
            }
        };
        
        console.log('\n🌐 OLLAMA REQUEST CONFIG:');
        console.log('  Model:', this.model);
        console.log('  Temperature:', requestBody.options.temperature);

        try {
            const controller = new AbortController();
            const timeoutMs = options.timeout || 120000;
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();
            
            console.log('\n📥 OLLAMA API RESPONSE:');
            console.log('  - Response length:', data.response?.length || 0, 'characters');
            console.log('  - Tokens generated:', data.eval_count || 'unknown');
            console.log('  - Duration:', data.total_duration ? (data.total_duration / 1000000000).toFixed(2) + 's' : 'unknown');
            
            if (data.done_reason === 'length') {
                console.warn('⚠️ Response was truncated due to token limit');
            }
            
            if (!data.response) {
                console.error('❌ No response field in Ollama response!');
                throw new Error('Empty response from Ollama');
            }
            
            return data.response?.trim() || '';
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            console.error('Ollama generation error:', error);
            throw error;
        }
    }

    /**
     * Format medical dictation using Ollama with simple error handling
     */
    async formatMedicalDictation(messyText, options = {}) {
        try {
            const available = await this.isOllamaAvailable();
            if (!available) {
                return {
                    success: false,
                    formatted: messyText,
                    error: 'Ollama service is not available',
                    model: 'none'
                };
            }

            return await this.formatWithSimpleHandling(messyText, options);
        } catch (error) {
            console.error('Ollama formatting error:', error.message);
            return {
                success: false,
                formatted: messyText,
                error: error.message,
                model: this.model || 'unknown'
            };
        }
    }

    /**
     * Format with simplified error handling
     */
    async formatWithSimpleHandling(messyText, options = {}) {
        console.log('\n📊 OLLAMA FORMATTING - INPUT ANALYSIS:');
        console.log('  Input length:', messyText.length, 'characters');
        
        // Trust the user's input - process everything that comes in
        if (messyText.length < 10) {
            console.log('⚠️ Input too short - returning as-is');
            return {
                success: true,
                formatted: messyText,
                model: this.model,
                promptVersion: 'none'
            };
        }
        
        const manifest = options.manifest || null;
        const useStructuredPipeline = Boolean(manifest && manifest.entries && manifest.entries.length > 0);
        const forceDynamicPrompt = useStructuredPipeline;

        // Use static prompt if available, otherwise fall back to dynamic
        let prompt;
        let promptVersion;

        if (this.staticPrompt && !forceDynamicPrompt) {
            // Use pre-built static prompt
            prompt = this.staticPrompt.replace('[INSERT_DICTATION_HERE]', messyText);
            promptVersion = 'static-v1';
            console.log('🔍 Using static prompt');
        } else {
            // Fall back to dynamic generation
            const { promptGenerator } = await this.initializePrompt();
            if (!promptGenerator) {
                console.error('❌ Failed to initialize prompt generator');
                return {
                    success: false,
                    formatted: messyText,
                    error: 'Failed to initialize prompt generator',
                    model: this.model
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
                num_predict: 4000
            });
            
            console.log(`\n🎯 OLLAMA RESPONSE:`);
            console.log(`  - Response length: ${formattedText.length} chars`);
            
            if (!formattedText || formattedText.length < 10) {
                console.error('❌ Empty or too short response from Ollama');
                return {
                    success: false,
                    formatted: messyText,
                    error: 'Empty response from Ollama',
                    model: this.model
                };
            }

            if (useStructuredPipeline) {
                console.log('🧭 Structured manifest sections:', manifest.entries.map((entry) => entry.title || entry.detectedTitle || entry.key).join(', '));
                const template = await this.getTemplate();
                return this.handleStructuredResponse(formattedText, messyText, manifest, promptVersion, template, options);
            }

            const cleanedText = this.postProcessResponse(formattedText);
            
            return {
                success: true,
                formatted: cleanedText,
                model: this.model,
                promptVersion: promptVersion
            };
        } catch (error) {
            console.error('❌ Formatting failed:', error.message);
            
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    formatted: messyText,
                    error: 'Request timed out - try a smaller model',
                    model: this.model
                };
            }
            
            return {
                success: false,
                formatted: messyText,
                error: error.message,
                model: this.model
            };
        }
    }

    handleStructuredResponse(responseText, originalText, manifest, promptVersion, template, options = {}) {
        try {
            const parsed = parseStructuredResponse(responseText, manifest);
            const rendered = renderStructuredMarkdown(parsed, manifest, template);
            const verification = this.contentVerifier.verifyStructuredNote({
                dictationText: options.dictationText || originalText,
                manifest,
                markdown: rendered,
                structured: parsed
            });

            if (!verification.isValid) {
                console.warn('⚠️ Structured verification issues detected:', {
                    missingSections: verification.missingSections,
                    extraSections: verification.extraSections,
                    coverageIssues: verification.coverageIssues.map((issue) => ({
                        key: issue.key,
                        coverage: issue.coverage
                    }))
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
                manifest
            };
        } catch (error) {
            console.error('❌ Failed to parse structured response:', error.message);
            return {
                success: false,
                formatted: originalText,
                error: `Failed to parse structured response: ${error.message}`,
                model: this.model,
                manifest
            };
        }
    }

    /**
     * Initialize prompt system if not already initialized
     */
    async initializePrompt() {
        if (!this.promptGenerator) {
            console.log('🔧 Initializing v7 prompt generator...');
            const { MedicalPrompt, TemplateLoader } = require('../../prompts');
            
            const template = TemplateLoader.load('medicine-management');
            console.log('  ✓ Template loaded:', template.name || 'medicine-management');
            
            this.promptGenerator = new MedicalPrompt(template);
            this.template = template;
            console.log('  ✓ V7 prompt generator initialized');
        }
        return { promptGenerator: this.promptGenerator, template: this.template };
    }

    async getTemplate() {
        if (this.template) {
            return this.template;
        }
        const { TemplateLoader } = require('../../prompts');
        this.template = TemplateLoader.load('medicine-management');
        return this.template;
    }
    
    /**
     * Post-process the response from Ollama
     */
    postProcessResponse(response) {
        console.log('🔧 POST-PROCESSING: Starting...');
        let processed = response;
        
        // Remove wrapper text
        processed = processed.replace(/^(Here is|Here's|The formatted|Formatted)[^#]*?(?=###|\n\n)/i, '').trim();
        
        // If still starts with non-header text, find first ###
        if (!processed.startsWith('###') && processed.includes('###')) {
            const firstHeaderIndex = processed.indexOf('###');
            const beforeHeader = processed.substring(0, firstHeaderIndex);
            if (beforeHeader.length < 100 && !beforeHeader.match(/\d+\.|diagnosis|patient|medication/i)) {
                processed = processed.substring(firstHeaderIndex);
            }
        }
        
        // Remove code blocks
        processed = processed.replace(/^```[\w]*\n/, '').replace(/\n```$/, '').trim();
        
        console.log(`  - Cleaned text: ${response.length} -> ${processed.length} chars`);
        return processed;
    }

    /**
     * Test Ollama connection and model
     */
    async testConnection() {
        try {
            const available = await this.isOllamaAvailable();
            if (!available) {
                return {
                    success: false,
                    message: 'Ollama service is not running or accessible'
                };
            }

            const models = await this.getAvailableModels();
            if (models.length === 0) {
                return {
                    success: false,
                    message: 'No models installed. Please install a model first.'
                };
            }

            const testResult = await this.generateCompletion('Say "Hello, medical formatting is ready!"', {
                num_predict: 50
            });

            return {
                success: true,
                message: 'Ollama is ready',
                model: this.model,
                availableModels: models.map(m => m.name),
                testResponse: testResult
            };
        } catch (error) {
            return {
                success: false,
                message: `Connection test failed: ${error.message}`
            };
        }
    }

    /**
     * Get model info and performance metrics
     */
    async getModelInfo() {
        try {
            const models = await this.getAvailableModels();
            const currentModel = models.find(m => m.name === this.model);
            
            return {
                currentModel: this.model,
                modelDetails: currentModel,
                availableModels: models.length,
                status: await this.isOllamaAvailable() ? 'ready' : 'unavailable'
            };
        } catch (error) {
            return {
                error: error.message,
                status: 'error'
            };
        }
    }
}

module.exports = { OllamaFormatter };

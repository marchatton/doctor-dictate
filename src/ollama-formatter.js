/**
 * Ollama LLM Integration for Medical Text Formatting
 * Uses local LLM to clean up medical dictation transcripts
 * Provides ChatGPT-level formatting while keeping data private
 */

class OllamaFormatter {
    constructor() {
        this.baseUrl = 'http://localhost:11434';
        this.model = 'llama3.2'; // Default model, can be changed
        this.isAvailable = null; // Cache availability status
        
        // Comprehensive psychiatric note template for longer notes
        this.medicalTemplate = `
# Identification
**CC:** [Chief complaint/reason for visit]

## Problem List
1. [Condition] – stable, improving, worsening
2. [Condition] – stable, improving, worsening

## Current Meds
[List medications with dosages]

## Interim History
[Patient status, medication tolerance, therapy participation, new complaints]

## Past Medical History
[Any changes or "No changes"]

## Social History
[Relevant social factors]

## Family History
[Relevant family history]

## ROS (Review of Systems)
General: [Weight changes]
CVS: [Cardiac symptoms]
CNS: [Neurological symptoms]
[Other systems as mentioned]

## MSE (Mental Status Exam)
[Appearance, behavior, speech, mood, affect, thought process, thought content, perception, cognition, insight/judgment]

## Risk Assessment
[Suicidal/homicidal ideation assessment, risk factors, protective factors, overall risk level]

## Assessment
[Clinical assessment, stressors, symptom changes, treatment response]

## Plan
> [Treatment decisions, medication changes, therapy recommendations, follow-up]
        `.trim();
    }

    /**
     * Check if Ollama is available and responsive
     */
    async isOllamaAvailable() {
        if (this.isAvailable !== null) {
            return this.isAvailable;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            this.isAvailable = response.ok;
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
                temperature: 0.1, // Low temperature for consistent formatting
                top_p: 0.9,
                max_tokens: 2000,
                ...options
            }
        };

        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();
            return data.response?.trim() || '';
        } catch (error) {
            console.error('Ollama generation error:', error);
            throw error;
        }
    }

    /**
     * Format medical dictation using LLM
     */
    async formatMedicalDictation(messyText, options = {}) {
        const available = await this.isOllamaAvailable();
        if (!available) {
            throw new Error('Ollama is not available. Please ensure Ollama is running and models are installed.');
        }

        const prompt = this.createFormattingPrompt(messyText, options);
        
        try {
            const formattedText = await this.generateCompletion(prompt, {
                temperature: 0.1, // Very low for consistent medical formatting
                max_tokens: 3000
            });
            
            return {
                original: messyText,
                formatted: formattedText,
                model: this.model,
                success: true
            };
        } catch (error) {
            console.error('Medical formatting error:', error);
            return {
                original: messyText,
                formatted: messyText, // Fallback to original
                model: this.model,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create specialized prompt for medical dictation formatting
     */
    createFormattingPrompt(messyText, options = {}) {
        const { 
            includeTemplate = true, 
            preserveStyle = true,
            focusAreas = ['punctuation', 'structure', 'medical_terms']
        } = options;

        let prompt = `You are a medical transcription specialist. Please clean up this psychiatric dictation transcript.

CRITICAL RULES:
1. Fix punctuation and capitalization
2. Structure into proper psychiatric note format following the template structure
3. Preserve ALL medical information exactly as spoken
4. Convert spoken dictation commands (like "comma", "period", "next paragraph") to proper formatting
5. NEVER change medication names - keep exactly as dictated (e.g. if "Prozac" is said, keep "Prozac", do NOT change to "fluoxetine")
6. Only fix obvious spelling/pronunciation errors in medication names
7. Keep the psychiatrist's original meaning and clinical observations unchanged
8. Use proper medical terminology for conditions but preserve medication brand/generic names as spoken
9. Organize content into appropriate sections (Problem List, Current Meds, Interim History, MSE, Risk Assessment, Assessment, Plan, etc.) when applicable
10. Use markdown formatting for headers and structure
11. Return ONLY the cleaned transcript, no explanations

`;

        if (includeTemplate) {
            prompt += `DESIRED FORMAT EXAMPLE:
${this.medicalTemplate}

`;
        }

        prompt += `MESSY TRANSCRIPT TO CLEAN:
"${messyText}"

CLEANED TRANSCRIPT:`;

        return prompt;
    }

    /**
     * Quick format for short text snippets
     */
    async quickFormat(text, focusArea = 'general') {
        const available = await this.isOllamaAvailable();
        if (!available) {
            return text; // Fallback to original
        }

        const prompt = `Fix this medical text (punctuation, capitalization, structure):
"${text}"

Return only the corrected text:`;

        try {
            const result = await this.generateCompletion(prompt, {
                temperature: 0.1,
                max_tokens: 500
            });
            return result || text;
        } catch (error) {
            console.error('Quick format error:', error);
            return text; // Fallback
        }
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

            // Test with simple prompt
            const testResult = await this.generateCompletion('Say "Hello, medical formatting is ready!"', {
                max_tokens: 50
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
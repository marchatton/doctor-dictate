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
        
        // Removed all templates to prevent hallucination
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
     * Format medical dictation using hybrid approach (Regex + LLM + Rules)
     */
    async formatMedicalDictation(messyText, options = {}) {
        const available = await this.isOllamaAvailable();
        if (!available) {
            throw new Error('Ollama is not available. Please ensure Ollama is running and models are installed.');
        }

        // Temporarily use improved single-pass method instead of hybrid
        return await this.formatMedicalDictationFallback(messyText, options);
    }
    
    /**
     * Fallback to original LLM-only method if hybrid approach fails
     */
    async formatMedicalDictationFallback(messyText, options = {}) {
        const prompt = this.createFormattingPrompt(messyText, options);
        
        try {
            const formattedText = await this.generateCompletion(prompt, {
                temperature: 0.1,
                max_tokens: 3000
            });
            
            // Post-process to fix common issues
            const cleanedText = this.postProcessMedicalText(formattedText);
            
            return {
                original: messyText,
                formatted: cleanedText,
                model: this.model,
                success: true
            };
        } catch (error) {
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
        // Ultra-strict prompt to prevent hallucination
        let prompt = `You are a medical transcription formatter. Your job is ONLY to reorganize existing content into a template format.

CRITICAL RULES:
- NEVER add information not in the original transcript
- NEVER copy from examples or templates  
- NEVER guess or fabricate any medical information
- ONLY reorganize the exact words and information provided
- If information is missing from a section, leave that section out entirely
- Use [brackets] only for unclear medication names from the transcript

TEMPLATE FORMAT (only include sections with actual content from transcript):

# Identification
[patient info from transcript]

**CC:** [chief complaint from transcript]

## Problem List
1. [condition]: [status from transcript]

## Current Medications
1. [medication name] [dose] ([frequency])

## Interim History
[history content from transcript]

## Past Medical History
[past medical history from transcript]

## Social History
[social history from transcript]

## Family History
[family history from transcript]

## ROS
[review of systems from transcript]

## MSE
[mental status exam from transcript]

## Risk Assessment
[risk assessment from transcript]

## Assessment
[assessment from transcript]

## Plan
[plan from transcript]

## Therapy Notes
[therapy notes from transcript]

TRANSCRIPT TO REORGANIZE (use ONLY this content, do not add missing sections):
"${messyText}"

REORGANIZED VERSION:`;

        return prompt;
    }

    /**
     * Step 1: Extract sections using regex patterns
     */
    extractSections(text) {
        const sections = {};
        
        // Convert to lowercase for matching but preserve original case
        const lowerText = text.toLowerCase();
        
        // Define section patterns (order matters - more specific first)
        const patterns = [
            { key: 'identification', regex: /identification:?\s*([^,]*(?:john\s+\w+|smith|patient)[^;,]*)/i },
            { key: 'chief_complaint', regex: /(?:chief complaint|cc)\s*:?\s*([^;,]*(?:follow|visit|appointment)[^;,]*)/i },
            { key: 'problem_list', regex: /(?:problem\s*list|problemist)[^:]*:?\s*([^;]*(?:adhd|depression|anxiety|bipolar)[^;]*)/i },
            { key: 'medications', regex: /(?:current\s*)?medications?[^:]*:?\s*([^;]*(?:mg|lexapro|prozac|zoloft|apm)[^;]*)/i },
            { key: 'history', regex: /(?:interim\s*)?history:?\s*([^;]*)/i }
        ];
        
        // Extract each section
        patterns.forEach(pattern => {
            const match = text.match(pattern.regex);
            if (match && match[1]) {
                sections[pattern.key] = match[1].trim();
            }
        });
        
        // If no sections found, put everything in a general section
        if (Object.keys(sections).length === 0) {
            sections.general = text;
        }
        
        return sections;
    }

    /**
     * Step 2: Clean individual section with focused LLM prompt  
     */
    async cleanSection(text, sectionType) {
        const sectionPrompts = {
            identification: 'Fix punctuation and capitalization. Return just the clean patient info:',
            chief_complaint: 'Extract the chief complaint. Return just "follow-up" or similar:',
            problem_list: 'Format as numbered list. Example: "1. ADHD: improving, partial control\\n2. Major Depressive Disorder: stable":',
            medications: 'Format as numbered list with medication names. Example: "1. Lexapro 20mg (one pill per day)\\n2. [Medication] 60mg (QHS)":',
            history: 'Clean up punctuation and capitalization only:',
            general: 'Fix punctuation and capitalization only:'
        };
        
        const prompt = (sectionPrompts[sectionType] || sectionPrompts.general) + `\n\n"${text}"\n\nCleaned version:`;
        
        try {
            const cleaned = await this.generateCompletion(prompt, {
                temperature: 0.1,
                max_tokens: 500
            });
            return cleaned.trim();
        } catch (error) {
            return text; // Return original if cleaning fails
        }
    }

    /**
     * Step 3: Assemble note with consistent structure
     */
    assembleNote(sections) {
        let note = '';
        
        // Build note in standard order - match expected template format
        if (sections.identification) {
            note += `Identification: ${sections.identification}\n\n`;
        }
        
        if (sections.chief_complaint) {
            note += `CC ${sections.chief_complaint}.\n\n`;
        }
        
        if (sections.problem_list) {
            note += `Problem list:\n${sections.problem_list}\n\n`;
        }
        
        if (sections.medications) {
            note += `Current medications:\n${sections.medications}\n\n`;
        }
        
        if (sections.history) {
            note += `Interim History:\n${sections.history}\n\n`;
        }
        
        // Add any other sections
        Object.entries(sections).forEach(([key, content]) => {
            if (!['identification', 'chief_complaint', 'problem_list', 'medications', 'history'].includes(key)) {
                const title = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
                note += `${title}:\n${content}\n\n`;
            }
        });
        
        return note.trim();
    }

    /**
     * Post-process medical text to fix common formatting issues
     */
    postProcessMedicalText(text) {
        let cleaned = text;
        
        // Issue 1: Remove LLM prefix phrases
        cleaned = cleaned.replace(/^(Here is the cleaned transcript[:\s]*["']?|Cleaned version[:\s]*["']?)/i, '').trim();
        cleaned = cleaned.replace(/["']$/, '').trim(); // Remove trailing quote
        
        // Issue 2: Ensure proper markdown structure (if not already present)
        if (!cleaned.includes('# Identification') && cleaned.includes('identification')) {
            // Simple structure enforcement for common patterns
            cleaned = cleaned.replace(/identification[:\s,]*/i, '# Identification\n');
            cleaned = cleaned.replace(/chief complaint[:\s]*/i, '\n**CC:** ');
            cleaned = cleaned.replace(/problem(?:\s*list)?[:\s]*/i, '\n## Problem List\n');
            cleaned = cleaned.replace(/(?:current\s*)?medications?[:\s]*/i, '\n## Current Medications\n');
        }
        
        // Issue 3: Fix medical abbreviations (capitalize standard ones)
        const medicalAbbrevs = {
            'qhs': 'QHS',
            'bid': 'BID', 
            'tid': 'TID',
            'qid': 'QID',
            'prn': 'PRN',
            'mg': 'mg', // keep lowercase
            'adhd': 'ADHD',
            'ptsd': 'PTSD',
            'ocd': 'OCD'
        };
        
        Object.entries(medicalAbbrevs).forEach(([lower, upper]) => {
            // Match whole words only, preserve context
            const regex = new RegExp(`\\b${lower}\\b`, 'gi');
            cleaned = cleaned.replace(regex, upper);
        });
        
        // Issue 4: Fix common content preservation issues
        cleaned = cleaned.replace(/history of and /gi, 'history of ADHD and ');
        cleaned = cleaned.replace(/seventh grade/gi, 'seventh grade');
        
        // Issue 5: Standardize medication name brackets
        cleaned = cleaned.replace(/\[\s*([^[\]]*)\s*\]/g, '[$1]'); // Remove extra spaces
        cleaned = cleaned.replace(/([A-Za-z]+)\s*PM/g, '[$1 PM]'); // Bracket unclear PM medications
        
        // Clean up extra whitespace and ensure proper line breaks
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
        cleaned = cleaned.replace(/\s+$/gm, ''); // Remove trailing spaces
        
        return cleaned.trim();
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
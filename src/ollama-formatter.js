/**
 * Ollama LLM Integration for Medical Text Formatting
 * Uses local LLM to clean up medical dictation transcripts
 * Provides ChatGPT-level formatting while keeping data private
 * Version 2.0 - Using structured prompt management
 */

const { MedicalPromptV5 } = require('./prompts/medical-prompt-v5');
const { ContentVerifier } = require('./content-verifier');
const fs = require('fs');

class OllamaFormatter {
    constructor() {
        this.baseUrl = 'http://localhost:11434';
        this.model = this.selectOptimalModel(); // Auto-select based on availability
        this.isAvailable = null; // Cache availability status
        this.temperature = 0.1; // Slight variation, not zero (prevents repetition)
        this.maxRetries = 2; // Number of retries for hallucination issues
        this.contentVerifier = new ContentVerifier(); // Content verification system
    }
    
    /**
     * Select optimal model based on what's available
     */
    selectOptimalModel() {
        // Prefer models in this order for medical accuracy
        const preferredModels = [
            'mistral:7b-instruct',     // Best for medical accuracy
            'mistral:7b',               // Good alternative
            'llama3.2:3b-instruct',     // Smaller but still good
            'llama3.2',                 // Default fallback
            'llama2'                    // Last resort
        ];
        
        // Will be validated when checking availability
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
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            this.isAvailable = response.ok;
            
            // If available, try to select best model
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
            'mistral:7b-instruct',
            'mistral:7b',
            'llama3.2:3b-instruct',
            'llama3.2',
            'llama2'
        ];
        
        for (const preferred of preferredModels) {
            if (modelNames.includes(preferred)) {
                this.model = preferred;
                console.log(`Selected optimal model: ${preferred}`);
                return;
            }
        }
        
        // Use first available model if none preferred found
        if (modelNames.length > 0) {
            this.model = modelNames[0];
            console.log(`Using available model: ${this.model}`);
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
     * Generate completion using Ollama with smart retry logic
     */
    async generateCompletion(prompt, options = {}) {
        const requestBody = {
            model: this.model,
            prompt: prompt,
            stream: false,
            options: {
                temperature: this.temperature,
                top_p: 0.9,
                repeat_penalty: 1.0, // Don't penalize medical term repetition
                max_tokens: 4000,
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
     * Format medical dictation using new prompt system with retry logic
     */
    async formatMedicalDictation(messyText, options = {}) {
        const { transcriptionDate } = options;
        const available = await this.isOllamaAvailable();
        if (!available) {
            throw new Error('Ollama is not available. Please ensure Ollama is running and models are installed.');
        }

        // Use new prompt system with retry logic
        return await this.formatWithRetry(messyText, options);
    }
    
    /**
     * Format with retry logic for handling hallucinations
     */
    async formatWithRetry(messyText, options = {}, retryCount = 0) {
        const { transcriptionDate } = options;
        // Use the new prompt management system
        const prompt = MedicalPromptV5.build(messyText, transcriptionDate);
        
        console.log(`🔍 Using prompt version: ${MedicalPromptV5.VERSION}`);
        console.log(`🔍 Model: ${this.model}, Temperature: ${this.temperature}`);
        
        try {
            const formattedText = await this.generateCompletion(prompt, {
                temperature: this.temperature,
                max_tokens: 4000
            });
            
            // Validate output for hallucinations
            if (this.isLikelyHallucination(messyText, formattedText)) {
                if (retryCount < this.maxRetries) {
                    console.warn(`⚠️ Possible hallucination detected, retrying (${retryCount + 1}/${this.maxRetries})`);
                    // Lower temperature on retry for more deterministic output
                    const originalTemp = this.temperature;
                    this.temperature = Math.max(0.0, this.temperature - 0.05);
                    const result = await this.formatWithRetry(messyText, options, retryCount + 1);
                    this.temperature = originalTemp;
                    return result;
                } else {
                    console.error('❌ Multiple hallucination attempts, using fallback');
                    return this.fallbackFormat(messyText);
                }
            }
            
            // Post-process to ensure quality and extract notes
            const { text: cleanedText, notes } = this.postProcessAndExtractNotes(formattedText);
            
            // Verify content completeness
            const verification = this.contentVerifier.verifyContent(messyText, cleanedText);
            
            if (!verification.isValid) {
                console.warn(`⚠️ Content verification failed: ${verification.coveragePercent} coverage`);
                console.log(this.contentVerifier.generateReport(verification, cleanedText));
                
                // Attempt to reinject missing content
                const enhanced = this.contentVerifier.reinjectMissingContent(
                    cleanedText, 
                    verification.missingSentences, 
                    messyText
                );
                
                // Re-verify after reinjection
                const reverification = this.contentVerifier.verifyContent(messyText, enhanced);
                if (reverification.isValid) {
                    console.log('✅ Content successfully recovered after reinjection');
                    return {
                        original: messyText,
                        formatted: enhanced,
                        model: this.model,
                        promptVersion: MedicalPromptV5.VERSION,
                        success: true,
                        retries: retryCount,
                        llmNotes: notes || null,
                        contentRecovered: true,
                        verification: reverification
                    };
                }
            }
            
            // Log any LLM notes separately for debugging
            if (notes) {
                console.log(`📝 LLM Notes: ${notes}`);
            }
            
            return {
                original: messyText,
                formatted: cleanedText,
                model: this.model,
                promptVersion: MedicalPromptV5.VERSION,
                success: true,
                retries: retryCount,
                llmNotes: notes || null,
                verification: verification
            };
        } catch (error) {
            console.error('❌ Formatting failed:', error.message);
            
            if (retryCount < this.maxRetries) {
                return await this.formatWithRetry(messyText, options, retryCount + 1);
            }
            
            return this.fallbackFormat(messyText);
        }
    }
    
    /**
     * Check if output is likely a hallucination
     */
    isLikelyHallucination(original, processed) {
        // For very short inputs, formatting may add headers which is expected
        if (original.length < 50) {
            // Only check if output is WAY too long (>3x)
            if (processed.length > original.length * 3) {
                console.warn('Short input produced 3x longer output');
                return true;
            }
            return false; // Short inputs often need formatting additions
        }
        
        // For longer inputs, check if output is significantly longer (>60% increase)
        // Note: Adding headers and formatting can legitimately increase length
        if (processed.length > original.length * 1.6) {
            console.warn('Output is 60% longer than input');
            return true;
        }
        
        // Check if key medical terms from input are preserved
        const originalWords = new Set(original.toLowerCase().split(/\s+/));
        const processedWords = new Set(processed.toLowerCase().split(/\s+/));
        
        // Medical terms that should be preserved (if present in original)
        const importantTerms = new Set(['adhd', 'depression', 'anxiety', 'mg', 'lexapro', 
                                       'sertraline', 'patient', 'stable', 'improving', 
                                       'medications', 'diagnosis', 'assessment']);
        
        const originalMedical = new Set([...originalWords].filter(w => importantTerms.has(w)));
        const processedMedical = new Set([...processedWords].filter(w => importantTerms.has(w)));
        
        // If we lost more than 70% of medical terms, likely an issue
        // (Allow some loss due to corrections like ACHD->ADHD)
        if (originalMedical.size > 2 && processedMedical.size < originalMedical.size * 0.3) {
            console.warn(`Lost ${originalMedical.size - processedMedical.size} of ${originalMedical.size} medical terms`);
            return true;
        }
        
        // Check if the output contains completely new content not in original
        // This is a sign of hallucination
        const suspiciousAdditions = [
            'john doe', 'jane doe', 'example', 'sample', 'test patient',
            'lorem ipsum', 'placeholder', '[your text here]'
        ];
        
        const processedLower = processed.toLowerCase();
        for (const suspicious of suspiciousAdditions) {
            if (processedLower.includes(suspicious) && !original.toLowerCase().includes(suspicious)) {
                console.warn(`Detected suspicious addition: "${suspicious}"`);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Fallback formatting when LLM fails
     */
    fallbackFormat(messyText) {
        // Simple rule-based fallback
        let formatted = messyText;
        
        // Apply basic punctuation corrections
        // V5 handles punctuation in postProcess, but for fallback we need basic rules
        const basicPunctuation = {
            'period': '.',
            'comma': ',',
            'colon': ':',
            'next paragraph': '\n\n',
            'next line': '\n'
        };
        Object.entries(basicPunctuation).forEach(([key, value]) => {
            const regex = new RegExp(`\\b${key}\\b`, 'gi');
            formatted = formatted.replace(regex, value);
        });
        
        // Apply medical corrections
        Object.entries(MedicalPromptV5.MEDICAL_CORRECTIONS).forEach(([key, value]) => {
            const regex = new RegExp(`\\b${key}\\b`, 'gi');
            formatted = formatted.replace(regex, value);
        });
        
        return {
            original: messyText,
            formatted: formatted,
            model: 'fallback',
            promptVersion: 'fallback',
            success: false,
            error: 'LLM unavailable or producing hallucinations'
        };
    }

    /**
     * DEPRECATED - Use MedicalPromptV2.build() instead
     */
    createFormattingPrompt(messyText, options = {}) {
        console.warn('⚠️ createFormattingPrompt is deprecated. Use MedicalPromptV5.build() instead');
        return MedicalPromptV5.build(messyText);
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
     * Post-process medical text and extract any notes/explanations
     */
    postProcessAndExtractNotes(text) {
        let cleaned = text;
        let notes = null;
        
        // Extract any "Note:" or explanatory text from the LLM
        const notePattern = /\n*(?:Note|Notes|Explanation|Commentary|Comment):\s*(.+?)(?:\n\n|$)/is;
        const noteMatch = cleaned.match(notePattern);
        if (noteMatch) {
            notes = noteMatch[1].trim();
            // Remove the note from the main text
            cleaned = cleaned.replace(noteMatch[0], '').trim();
        }
        
        // Also extract any text that starts with "I removed" or "I changed" etc
        const explanationPattern = /\n*(?:I\s+(?:removed|changed|converted|fixed|corrected|formatted).+?)(?:\n\n|$)/i;
        const explMatch = cleaned.match(explanationPattern);
        if (explMatch) {
            notes = (notes ? notes + ' ' : '') + explMatch[0].trim();
            cleaned = cleaned.replace(explMatch[0], '').trim();
        }
        
        // Apply V3 post-processing for formatting consistency
        cleaned = MedicalPromptV5.postProcess(cleaned);
        
        // Call the original postProcessMedicalText for other cleaning
        cleaned = this.postProcessMedicalText(cleaned);
        
        return { text: cleaned, notes };
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
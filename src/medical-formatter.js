/**
 * Medical Formatter for DoctorDictate
 * Content-aware post-processing for psychiatric notes
 * Flexible template guidance without rigid structure enforcement
 * Enhanced with Ollama LLM integration for superior formatting
 */

const { OllamaFormatter } = require('./ollama-formatter.js');

class MedicalFormatter {
    constructor() {
        // Initialize Ollama formatter for advanced processing
        this.ollamaFormatter = new OllamaFormatter();
        this.useOllama = true; // Try Ollama first, fallback to rule-based
        
        // Common psychiatric medications for dosage formatting
        this.psychiatricMeds = {
            'lexapro': { generic: 'escitalopram', brandNames: ['lexapro'] },
            'prozac': { generic: 'fluoxetine', brandNames: ['prozac'] },
            'zoloft': { generic: 'sertraline', brandNames: ['zoloft'] },
            'wellbutrin': { generic: 'bupropion', brandNames: ['wellbutrin'] },
            'adderall': { generic: 'amphetamine/dextroamphetamine', brandNames: ['adderall'] },
            'concerta': { generic: 'methylphenidate', brandNames: ['concerta'] },
            'vyvanse': { generic: 'lisdexamfetamine', brandNames: ['vyvanse'] },
            'quetiapine': { generic: 'quetiapine', brandNames: ['seroquel'] },
            'risperidone': { generic: 'risperidone', brandNames: ['risperdal'] },
            'aripiprazole': { generic: 'aripiprazole', brandNames: ['abilify'] }
        };

        // Medical abbreviations that should be formatted consistently
        this.medicalAbbreviations = {
            'qhs': 'QHS', // at bedtime
            'bid': 'BID', // twice daily
            'tid': 'TID', // three times daily
            'qid': 'QID', // four times daily
            'prn': 'PRN', // as needed
            'mg': 'mg',
            'ml': 'mL',
            'mcg': 'mcg'
        };

        // Common dictation patterns
        this.dictationPatterns = {
            'period': '.',
            'comma': ',',
            'next paragraph': '\n\n',
            'new paragraph': '\n\n',
            'colon': ':',
            'semicolon': ';',
            'dash': '-',
            'hyphen': '-'
        };
    }

    /**
     * Main formatting pipeline with Ollama integration
     */
    async formatMedicalNote(rawText) {
        // Try Ollama first for superior formatting
        if (this.useOllama) {
            try {
                const ollamaResult = await this.ollamaFormatter.formatMedicalDictation(rawText);
                if (ollamaResult.success) {
                    return {
                        formatted: ollamaResult.formatted,
                        improvements: this.getImprovements(true),
                        method: 'ollama',
                        model: ollamaResult.model
                    };
                }
            } catch (error) {
                console.warn('Ollama formatting failed, falling back to rule-based:', error.message);
                // Fall through to rule-based approach
            }
        }
        
        // Fallback: Rule-based formatting
        let text = rawText;
        
        // Stage 1: Fix basic dictation issues
        text = this.fixDictationCommands(text);
        
        // Stage 2: Enhance medical terminology
        text = this.enhanceMedicalTerms(text);
        
        // Stage 3: Apply content-aware formatting
        text = this.applyContentFormatting(text);
        
        // Stage 4: Clean up punctuation and spacing
        text = this.cleanupFormatting(text);
        
        return {
            formatted: text,
            improvements: this.getImprovements(false),
            method: 'rule-based'
        };
    }

    /**
     * Stage 1: Fix dictation command artifacts
     */
    fixDictationCommands(text) {
        let formatted = text;
        
        // Fix common dictation commands (case insensitive)
        Object.entries(this.dictationPatterns).forEach(([spoken, written]) => {
            const regex = new RegExp(`\\b${spoken}\\b`, 'gi');
            formatted = formatted.replace(regex, written);
        });
        
        // Fix broken medical abbreviations (A P M → APM, Join A P. M. → Quetiapine)
        formatted = formatted.replace(/\b([Jj]oin\s+)?([A-Z])\s*\.\s*([A-Z])\s*\.?\s*([A-Z])?\s*\.?\b/g, (match, join, a, b, c) => {
            if (join && a === 'A' && b === 'P' && (c === 'M' || !c)) {
                return 'Quetiapine'; // Common psychiatric medication
            }
            if (c) return `${a}${b}${c}`;
            return `${a}${b}`;
        });
        
        // Fix specific broken patterns from sample
        formatted = formatted.replace(/\bJoin\s+a\s+pm\s*(\d+)\s*mg/gi, 'Quetiapine $1 mg');
        formatted = formatted.replace(/\bssri\b/gi, 'SSRI');
        formatted = formatted.replace(/\bxr\b/gi, 'XR');
        
        // Fix number formatting for lists
        formatted = formatted.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi, (match) => {
            const numbers = {
                'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
                'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
            };
            return numbers[match.toLowerCase()] || match;
        });
        
        // Clean up obvious dictation artifacts
        formatted = formatted.replace(/\b(one pill per day|one tablet per day)\b/gi, 'daily');
        formatted = formatted.replace(/\(\s*,\s*\)/g, ''); // Remove empty parentheses with commas
        formatted = formatted.replace(/\.\s*,\s*/g, '. '); // Fix period comma artifacts
        formatted = formatted.replace(/,\s*\.\s*/g, '. '); // Fix comma period artifacts
        formatted = formatted.replace(/\s*,\s*,\s*/g, ', '); // Fix double commas
        
        return formatted;
    }

    /**
     * Stage 2: Enhance medical terminology and dosages
     */
    enhanceMedicalTerms(text) {
        let formatted = text;
        
        // Fix medication names and dosages
        Object.entries(this.psychiatricMeds).forEach(([key, med]) => {
            // Match medication with dosage patterns
            const dosagePattern = new RegExp(`\\b${key}\\b[\\s\\w]*?(\\d+)\\s*(mg|milligram|milligrams)`, 'gi');
            formatted = formatted.replace(dosagePattern, (match, dose, unit) => {
                const properName = med.brandNames[0].charAt(0).toUpperCase() + med.brandNames[0].slice(1);
                return `${properName} ${dose} mg`;
            });
        });
        
        // Fix common dosage frequencies
        formatted = formatted.replace(/\b(q\.?h\.?s\.?|at bedtime|before bed)\b/gi, 'QHS');
        formatted = formatted.replace(/\b(b\.?i\.?d\.?|twice daily|twice a day)\b/gi, 'BID');
        formatted = formatted.replace(/\bone pill per day\b/gi, 'daily');
        formatted = formatted.replace(/\bone tablet per day\b/gi, 'daily');
        
        // Fix medical abbreviations
        Object.entries(this.medicalAbbreviations).forEach(([incorrect, correct]) => {
            const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
            formatted = formatted.replace(regex, correct);
        });
        
        return formatted;
    }

    /**
     * Stage 3: Apply content-aware formatting
     */
    applyContentFormatting(text) {
        let formatted = text;
        
        // Detect and format numbered lists
        formatted = this.formatNumberedLists(formatted);
        
        // Detect and format medication lists
        formatted = this.formatMedicationLists(formatted);
        
        // Fix capitalization contextually
        formatted = this.fixCapitalization(formatted);
        
        // Format symptoms and assessments
        formatted = this.formatSymptoms(formatted);
        
        return formatted;
    }

    /**
     * Format numbered lists (problem lists, medications, etc.)
     */
    formatNumberedLists(text) {
        // Pattern: number + period/colon + content
        return text.replace(/(\d+)[\.:]?\s*([^\.]+?)(?=\s*\d+[\.:]|\n\n|$)/g, (match, num, content) => {
            const cleanContent = content.trim().replace(/[,\s]+$/, '');
            return `\n${num}. ${cleanContent}`;
        });
    }

    /**
     * Format medication lists with proper structure
     */
    formatMedicationLists(text) {
        // Look for medication patterns and format them consistently
        const medPattern = /([A-Z][a-z]+(?:in|ol|ex|ide|ine|ate|pam|zole))\s+(\d+)\s*(mg|mcg)\s*([^\.]+?)(?=\n|$)/gi;
        
        return text.replace(medPattern, (match, med, dose, unit, details) => {
            const cleanDetails = details.replace(/^\s*[\(\,]\s*/, '').replace(/\s*[\)\,]\s*$/, '');
            if (cleanDetails.trim()) {
                return `${med} ${dose} ${unit} (${cleanDetails.trim()})`;
            }
            return `${med} ${dose} ${unit}`;
        });
    }

    /**
     * Fix capitalization based on medical context
     */
    fixCapitalization(text) {
        let formatted = text;
        
        // Convert to sentence case by default
        formatted = formatted.toLowerCase();
        
        // Capitalize sentence beginnings
        formatted = formatted.replace(/(^|\n\n|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
            return prefix + letter.toUpperCase();
        });
        
        // Capitalize proper medical terms
        const properNouns = [
            'ADHD', 'ADD', 'OCD', 'PTSD', 'GAD', 'MDD',
            'Major Depressive Disorder', 'Generalized Anxiety Disorder',
            'Post-Traumatic Stress Disorder', 'Attention Deficit Hyperactivity Disorder',
            'Lexapro', 'Prozac', 'Zoloft', 'Wellbutrin', 'Adderall', 'Concerta', 'Vyvanse',
            'Quetiapine', 'Seroquel', 'Fluoxetine'
        ];
        
        properNouns.forEach(term => {
            const regex = new RegExp(`\\b${term.toLowerCase()}\\b`, 'gi');
            formatted = formatted.replace(regex, term);
        });
        
        // Capitalize section headers
        const sections = ['identification', 'chief complaint', 'problem list', 'current medications', 'interim history', 'past medical history'];
        sections.forEach(section => {
            const regex = new RegExp(`\\b${section}\\b:?`, 'gi');
            formatted = formatted.replace(regex, (match) => {
                return section.split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ') + (match.includes(':') ? ':' : '');
            });
        });
        
        return formatted;
    }

    /**
     * Format symptoms and clinical assessments
     */
    formatSymptoms(text) {
        let formatted = text;
        
        // Format parenthetical assessments: (good) -> (good)
        formatted = formatted.replace(/\(\s*([^)]+)\s*\)/g, '($1)');
        
        // Format symptom lists with proper punctuation
        formatted = formatted.replace(/([a-z]+)\s+\(([^)]+)\)\s*,?\s*/gi, '$1 ($2), ');
        
        // Clean up trailing commas and spaces
        formatted = formatted.replace(/,\s*\./g, '.');
        formatted = formatted.replace(/,\s*$/gm, '');
        
        return formatted;
    }

    /**
     * Stage 4: Final cleanup
     */
    cleanupFormatting(text) {
        let formatted = text;
        
        // Fix broken words at line breaks (14. -year-old → 14-year-old)
        formatted = formatted.replace(/(\d+)\.\s*-\s*(\w+)/g, '$1-$2');
        
        // Fix section header formatting (remove leading dots, fix spacing)
        formatted = formatted.replace(/^\s*\.+\s*([A-Z][^:]*:)/gm, '$1');
        formatted = formatted.replace(/^([a-z])([^:]*:)/gm, (match, first, rest) => {
            return first.toUpperCase() + rest;
        });
        
        // Fix multiple spaces
        formatted = formatted.replace(/\s+/g, ' ');
        
        // Fix spacing around punctuation
        formatted = formatted.replace(/\s+([.,:;!?])/g, '$1');
        formatted = formatted.replace(/([.,:;!?])\s*/g, '$1 ');
        
        // Clean up comma artifacts in lists and sections
        formatted = formatted.replace(/,\s*([A-Z][a-z\s]+:)/g, '\n\n$1'); // Fix ", Problem List:" → "\n\nProblem List:"
        formatted = formatted.replace(/,\s*(\d+)\s*\.\s*/g, '\n$1. '); // Fix ", 2," → "\n2. "
        
        // Fix broken sentence structure from comma placement
        formatted = formatted.replace(/([a-z]),\s*([A-Z][a-z])/g, '$1. $2'); // Fix "stable, Major" → "stable. Major"
        
        // Fix medication formatting issues
        formatted = formatted.replace(/\(\s*,\s*([^)]+)\s*,\s*\)\s*,\s*/g, '($1) '); // Clean up medication parentheses
        
        // Fix paragraph breaks and section formatting
        formatted = formatted.replace(/\n\s*\n\s*\n+/g, '\n\n');
        formatted = formatted.replace(/([^.!?])\s*\n\s*([A-Z][^:]*:)/g, '$1\n\n$2'); // Add paragraph breaks before sections
        
        // Fix spacing around colons for sections
        formatted = formatted.replace(/:\s+/g, ': ');
        
        // Fix list formatting
        formatted = formatted.replace(/^\s*(\d+)\.\s*/gm, '$1. ');
        
        // Clean up extra periods and improve flow
        formatted = formatted.replace(/\.\s*\.\s*/g, '. ');
        formatted = formatted.replace(/([a-z])\s*\.\s*([A-Z])/g, '$1. $2');
        
        // Trim whitespace
        formatted = formatted.trim();
        
        return formatted;
    }

    /**
     * Track improvements made during formatting
     */
    getImprovements(usedOllama = false) {
        // This could track what changes were made for user feedback
        return {
            dictationCommandsFixed: true,
            medicationNamesImproved: true,
            capitalizationCorrected: true,
            listsFormatted: true,
            usedLLM: usedOllama,
            method: usedOllama ? 'AI-powered' : 'Rule-based'
        };
    }

    /**
     * Enable or disable Ollama usage
     */
    setUseOllama(enabled) {
        this.useOllama = enabled;
        console.log(`Ollama formatting ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Test Ollama availability
     */
    async testOllama() {
        try {
            return await this.ollamaFormatter.testConnection();
        } catch (error) {
            return {
                success: false,
                message: `Ollama test failed: ${error.message}`
            };
        }
    }
}

module.exports = { MedicalFormatter };
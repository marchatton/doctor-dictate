/**
 * Dictation Command Processor for DoctorDictate
 * Converts voice dictation commands to formatted text
 * Enhanced with medical formatting for psychiatric notes
 */

const { MedicalFormatter } = require('./medical-formatter.js');

class DictationCommandProcessor {
    constructor() {
        this.medicalFormatter = new MedicalFormatter();
        // Define command mappings
        this.commands = {
            // Paragraph and line breaks
            'next paragraph': '\n\n',
            'new paragraph': '\n\n',
            'next line': '\n',
            'new line': '\n',
            'line break': '\n',
            
            // Punctuation
            'comma': ',',
            'period': '.',
            'full stop': '.',
            'colon': ':',
            'semicolon': ';',
            'exclamation mark': '!',
            'exclamation point': '!',
            'question mark': '?',
            'dash': '-',
            'hyphen': '-',
            'slash': '/',
            'forward slash': '/',
            'backslash': '\\',
            'ampersand': '&',
            'at sign': '@',
            'percent sign': '%',
            'dollar sign': '$',
            'number sign': '#',
            'hashtag': '#',
            'asterisk': '*',
            'plus sign': '+',
            'equals sign': '=',
            'apostrophe': "'",
            
            // Parentheses and brackets
            'open parenthesis': '(',
            'open paren': '(',
            'close parenthesis': ')',
            'close paren': ')',
            'open bracket': '[',
            'close bracket': ']',
            'open brace': '{',
            'close brace': '}',
            
            // Quotes
            'quote': '"',
            'open quote': '"',
            'unquote': '"',
            'close quote': '"',
            'single quote': "'",
            'open single quote': "'",
            'close single quote': "'",
            
            // Medical specific
            'milligrams': 'mg',
            'milligram': 'mg',
            'micrograms': 'mcg',
            'microgram': 'mcg',
            'milliliters': 'ml',
            'milliliter': 'ml',
            
            // Common medical abbreviations
            'times a day': 'x/day',
            'per day': '/day',
            'twice daily': 'BID',
            'three times daily': 'TID',
            'four times daily': 'QID',
            'once daily': 'QD',
            'at bedtime': 'QHS',
            'in the morning': 'QAM',
            'as needed': 'PRN',
            
            // Section headers (medical notes)
            'chief complaint': 'Chief Complaint:',
            'history of present illness': 'History of Present Illness:',
            'HPI': 'HPI:',
            'past medical history': 'Past Medical History:',
            'medications': 'Medications:',
            'current medications': 'Current Medications:',
            'allergies': 'Allergies:',
            'social history': 'Social History:',
            'family history': 'Family History:',
            'review of systems': 'Review of Systems:',
            'physical exam': 'Physical Exam:',
            'assessment': 'Assessment:',
            'plan': 'Plan:',
            'assessment and plan': 'Assessment and Plan:',
            'problem list': 'Problem List:',
            'diagnosis': 'Diagnosis:',
            'follow up': 'Follow-up:',
            'identification': 'Identification:'
        };
        
        // Compile regex patterns for efficient matching
        this.compilePatterns();
    }
    
    compilePatterns() {
        // Create patterns that match commands with word boundaries
        this.patterns = [];
        
        for (const [command, replacement] of Object.entries(this.commands)) {
            // Create pattern that matches the command as whole words
            // Allow for variations in spacing and capitalization
            const escapedCommand = command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(
                `\\b${escapedCommand}\\b`,
                'gi'
            );
            
            this.patterns.push({
                pattern,
                replacement,
                command
            });
        }
        
        // Sort patterns by length (longer patterns first to avoid partial matches)
        this.patterns.sort((a, b) => b.command.length - a.command.length);
    }
    
    /**
     * Detect if text contains dictation commands (signposts)
     * @param {string} text - Text to analyze
     * @returns {boolean} - True if dictation commands are detected
     */
    containsDictationCommands(text) {
        // Define CLEAR dictation command signposts that are unlikely to appear in natural speech
        const dictationSignposts = [
            // Explicit punctuation commands (strong indicators)
            /\bcomma\b(?!\s+(and|or|but|then|so|also|plus))/i,  // "comma" but not "comma and..."
            /\bperiod\b(?!\s+(of|from|in|to|for|with|during))/i,  // "period" but not "period of time"
            /\bfull stop\b/i,
            /\bcolon\b(?!\s+(and|or|the|a|an|of))/i,  // "colon" but not "colon and..."
            /\bsemicolon\b/i,
            
            // Navigation commands (strong indicators)
            /\bnext paragraph\b/i,
            /\bnew paragraph\b/i,
            /\bnext line\b/i,
            /\bnew line\b/i,
            
            // Parentheses commands (strong indicators)
            /\bopen parenthesis\b/i,
            /\bclose parenthesis\b/i,
            /\bopen paren\b/i,
            /\bclose paren\b/i,
            /\bin parenthesis\b/i,
            
            // Quote commands (strong indicators)
            /\bopen quote\b/i,
            /\bclose quote\b/i,
            /\bunquote\b/i
        ];
        
        // Count how many signposts are found
        let signpostCount = 0;
        for (const signpost of dictationSignposts) {
            if (signpost.test(text)) {
                signpostCount++;
            }
        }
        
        // Require multiple signposts OR very clear single indicators
        // This reduces false positives from natural medical language
        return signpostCount >= 2 || 
               /\bnext paragraph\b/i.test(text) || 
               /\bopen parenthesis\b/i.test(text) ||
               /\bclose parenthesis\b/i.test(text) ||
               /\bfull stop\b/i.test(text);
    }
    
    /**
     * Process text to convert dictation commands to formatting
     * @param {string} text - Raw transcribed text
     * @returns {object} - Processed text and list of applied commands
     */
    processCommands(text) {
        // First, detect if text contains dictation commands
        if (!this.containsDictationCommands(text)) {
            return {
                original: text,
                processed: text, // Return original text unchanged
                commands: [],
                commandCount: 0
            };
        }
        
        // Multi-Pass Processing with Validation
        return this.multiPassProcessing(text);
    }
    
    /**
     * Multi-pass processing with validation between stages
     * @param {string} text - Original text to process
     * @returns {object} - Processing results
     */
    multiPassProcessing(text) {
        const appliedCommands = [];
        let processedText = text;
        
        // PASS 1: Mark and validate voice commands
        const markedText = this.markVoiceCommands(processedText);
        
        // PASS 2: Apply punctuation replacements with medical grammar rules
        const punctuationResult = this.applyPunctuationCommands(markedText.text);
        processedText = punctuationResult.text;
        appliedCommands.push(...punctuationResult.commands);
        
        // PASS 3: Apply structural commands (paragraphs, lines)
        const structureResult = this.applyStructureCommands(processedText);
        processedText = structureResult.text;
        appliedCommands.push(...structureResult.commands);
        
        // PASS 4: Clean up and validate medical formatting
        processedText = this.medicalFormatCleanup(processedText);
        
        return {
            original: text,
            processed: processedText,
            commands: appliedCommands,
            commandCount: appliedCommands.reduce((sum, cmd) => sum + cmd.count, 0)
        };
    }
    
    /**
     * Clean up formatting issues after command processing
     */
    cleanupFormatting(text) {
        let cleaned = text;
        
        // Only apply cleanup if text was actually processed (contains replacements)
        // Remove extra spaces before punctuation (but be gentle)
        cleaned = cleaned.replace(/\s+([,.;:!?])/g, '$1');
        
        // Add space after punctuation if missing (except at end of line)
        cleaned = cleaned.replace(/([,.;:!?])(\w)/g, '$1 $2');
        
        // Fix double punctuation issues (e.g., ",," -> ",")
        cleaned = cleaned.replace(/([,.;:!?])\1+/g, '$1');
        
        // Fix spacing around parentheses
        cleaned = cleaned.replace(/\s*\(\s*/g, ' (');
        cleaned = cleaned.replace(/\s*\)\s*/g, ') ');
        
        // Remove multiple consecutive line breaks (max 2)
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        
        // Fix multiple spaces
        cleaned = cleaned.replace(/\s{2,}/g, ' ');
        
        // Trim whitespace
        cleaned = cleaned.trim();
        
        return cleaned;
    }
    
    /**
     * Process medical note formatting specifically
     * Enhanced with comprehensive medical formatting including Ollama LLM
     */
    async processMedicalNote(text) {
        // First pass: Handle dictation commands
        const dictationResult = this.processCommands(text);
        
        // Second pass: Apply comprehensive medical formatting (now async for Ollama)
        const medicalResult = await this.medicalFormatter.formatMedicalNote(dictationResult.processed);
        
        return {
            original: text,
            processed: medicalResult.formatted,
            commands: dictationResult.commands,
            commandCount: dictationResult.commandCount,
            improvements: medicalResult.improvements,
            method: medicalResult.method,
            model: medicalResult.model,
            formatted: true
        };
    }
    
    /**
     * Extract structured data from medical note
     */
    extractStructuredData(text) {
        const processed = this.processMedicalNote(text).processed;
        
        const sections = {};
        const sectionRegex = /^([A-Z][^:]+):\s*(.*)$/gm;
        let match;
        
        while ((match = sectionRegex.exec(processed)) !== null) {
            const sectionName = match[1].trim();
            const sectionContent = match[2].trim();
            sections[sectionName] = sectionContent;
        }
        
        // Extract medications specifically
        const medications = this.extractMedications(processed);
        
        return {
            fullText: processed,
            sections,
            medications,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Extract medication information from text
     */
    extractMedications(text) {
        const medications = [];
        
        // Pattern for medication: name dosage unit (instructions)
        const medPattern = /([A-Za-z]+)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|ml)\s*(?:\((.*?)\))?/gi;
        let match;
        
        while ((match = medPattern.exec(text)) !== null) {
            medications.push({
                name: match[1],
                dosage: match[2],
                unit: match[3],
                instructions: match[4] || ''
            });
        }
        
        return medications;
    }
    
    /**
     * PASS 1: Mark and validate voice commands in context
     * @param {string} text - Text to analyze
     * @returns {object} - Marked text and metadata
     */
    markVoiceCommands(text) {
        // This pass identifies potential voice commands and marks their confidence
        // For now, we'll keep it simple but this is where we'd add ML classification later
        return { text: text, markers: [] };
    }
    
    /**
     * PASS 2: Apply punctuation commands with medical grammar rules
     * @param {string} text - Text to process
     * @returns {object} - Result with applied commands
     */
    applyPunctuationCommands(text) {
        let processedText = text;
        const appliedCommands = [];
        
        // Medical Grammar Rules for Punctuation
        const punctuationRules = [
            // Standalone punctuation commands (high confidence)
            { pattern: /\bcomma\b(?=\s+[A-Za-z])/gi, replacement: ',', command: 'comma', medicalContext: false },
            { pattern: /\bperiod\b(?=\s+[A-Z])/gi, replacement: '.', command: 'period', medicalContext: false },
            { pattern: /\bcolon\b(?=\s+[A-Z])/gi, replacement: ':', command: 'colon', medicalContext: false },
            
            // Parentheses commands (very reliable)
            { pattern: /\bopen parenthes(is|es)\b/gi, replacement: ' (', command: 'open parenthesis', medicalContext: false },
            { pattern: /\bclose parenthes(is|es)\b/gi, replacement: ')', command: 'close parenthesis', medicalContext: false },
            { pattern: /\bin parenthes(is|es)\b/gi, replacement: ' (', command: 'in parenthesis', medicalContext: false },
            { pattern: /\band parenthes(is|es)\b/gi, replacement: ' (', command: 'and parenthesis', medicalContext: false },
            
            // Medical section headers (when clearly spoken as commands)
            { pattern: /\bidentification colon\b/gi, replacement: 'Identification:', command: 'identification', medicalContext: true },
            { pattern: /\bchief complaint colon\b/gi, replacement: 'Chief Complaint:', command: 'chief complaint', medicalContext: true },
            { pattern: /\bproblem list colon\b/gi, replacement: 'Problem List:', command: 'problem list', medicalContext: true },
            { pattern: /\bcurrent medications colon\b/gi, replacement: 'Current Medications:', command: 'current medications', medicalContext: true }
        ];
        
        // Apply punctuation rules with medical context awareness
        for (const rule of punctuationRules) {
            const matches = processedText.match(rule.pattern);
            if (matches) {
                // Additional validation for medical context
                if (rule.medicalContext) {
                    // Only apply if it looks like a section header (start of line or after paragraph)
                    const contextPattern = new RegExp(`(^|\\n\\n?)${rule.pattern.source}`, rule.pattern.flags);
                    if (contextPattern.test(processedText)) {
                        processedText = processedText.replace(rule.pattern, rule.replacement);
                        appliedCommands.push({
                            command: rule.command,
                            replacement: rule.replacement,
                            count: matches.length
                        });
                    }
                } else {
                    processedText = processedText.replace(rule.pattern, rule.replacement);
                    appliedCommands.push({
                        command: rule.command,
                        replacement: rule.replacement,
                        count: matches.length
                    });
                }
            }
        }
        
        return { text: processedText, commands: appliedCommands };
    }
    
    /**
     * PASS 3: Apply structural commands (paragraphs, lines, etc.)
     * @param {string} text - Text to process
     * @returns {object} - Result with applied commands
     */
    applyStructureCommands(text) {
        let processedText = text;
        const appliedCommands = [];
        
        // Structural commands
        const structureRules = [
            { pattern: /\bnext paragraph\b/gi, replacement: '\n\n', command: 'next paragraph' },
            { pattern: /\bnew paragraph\b/gi, replacement: '\n\n', command: 'new paragraph' },
            { pattern: /\bnext line\b/gi, replacement: '\n', command: 'next line' },
            { pattern: /\bnew line\b/gi, replacement: '\n', command: 'new line' }
        ];
        
        for (const rule of structureRules) {
            const matches = processedText.match(rule.pattern);
            if (matches) {
                processedText = processedText.replace(rule.pattern, rule.replacement);
                appliedCommands.push({
                    command: rule.command,
                    replacement: rule.replacement,
                    count: matches.length
                });
            }
        }
        
        return { text: processedText, commands: appliedCommands };
    }
    
    /**
     * PASS 4: Medical formatting cleanup with grammar rules
     * @param {string} text - Text to clean up
     * @returns {string} - Cleaned text
     */
    medicalFormatCleanup(text) {
        let cleaned = text;
        
        // Medical Grammar Rules
        
        // 1. Fix medication dosage formatting
        cleaned = cleaned.replace(/(\d+)\s*(mg|mcg|ml)\s*,/gi, '$1 $2,');  // "20 mg," not "20 mg ,"
        cleaned = cleaned.replace(/(\d+)\s*(mg|mcg|ml)\s*\./gi, '$1 $2.');  // "20 mg." not "20 mg ."
        
        // 2. Fix section header formatting - capitalize properly
        cleaned = cleaned.replace(/([A-Z][^:]*):+\s*,+/g, '$1:');  // "Chief Complaint:," → "Chief Complaint:"
        cleaned = cleaned.replace(/([A-Z][^:]*):+\s*:+/g, '$1:');  // "Chief Complaint:::" → "Chief Complaint:"
        
        // Capitalize common section headers that weren't caught
        cleaned = cleaned.replace(/\bchief complaint:/gi, 'Chief Complaint:');
        cleaned = cleaned.replace(/\bcurrent medications:/gi, 'Current Medications:');
        cleaned = cleaned.replace(/\bidentification:/gi, 'Identification:');
        cleaned = cleaned.replace(/\bproblem list:/gi, 'Problem List:');
        cleaned = cleaned.replace(/\bassessment:/gi, 'Assessment:');
        cleaned = cleaned.replace(/\bplan:/gi, 'Plan:');
        
        // 2.5. Medical List Formatting - Convert spoken lists to proper format
        cleaned = this.formatMedicalLists(cleaned);
        
        // 3. Fix parentheses with medical content - comprehensive approach
        cleaned = cleaned.replace(/\(\s*(\d+[^)]*)\s*\)/g, '($1)');  // Clean spacing in dosage parentheses
        cleaned = cleaned.replace(/and parenthes[ei]s\s*/gi, ' (');   // Fix leftover "and parenthesis"
        cleaned = cleaned.replace(/\s*\(\s*/g, ' (');                // Fix spacing before opening paren
        cleaned = cleaned.replace(/\s*\)\s*/g, ') ');                // Fix spacing after closing paren
        
        // Fix specific parentheses content issues
        cleaned = cleaned.replace(/\(\s*one\s+pill\s+per\s+day\s*\)/gi, '(1 pill per day)');
        cleaned = cleaned.replace(/\(\s*(\d+)\s+pill\s+per\s+day\s*\)/gi, '($1 pill per day)');
        cleaned = cleaned.replace(/\(\s*(\d+)\s+pill\s+\/\s*day\s*\)/gi, '($1 pill/day)');
        
        // 4. Fix punctuation clusters and leftover voice commands
        cleaned = cleaned.replace(/,{2,}/g, ',');   // Multiple commas → single comma
        cleaned = cleaned.replace(/\.{2,}/g, '.');  // Multiple periods → single period  
        cleaned = cleaned.replace(/:+/g, ':');      // Multiple colons → single colon
        
        // Remove leftover voice command words that didn't get processed
        cleaned = cleaned.replace(/\bcomma\b(?!\s+(and|or|but))/gi, ','); // leftover "comma" → ","
        cleaned = cleaned.replace(/\bcolon\b(?!\s+(and|or|the))/gi, ':'); // leftover "colon" → ":"
        
        // 5. Fix spacing issues
        cleaned = cleaned.replace(/\s*,\s*/g, ', '); // Proper comma spacing
        cleaned = cleaned.replace(/\s*\.\s*/g, '. '); // Proper period spacing
        cleaned = cleaned.replace(/\s*:\s*/g, ': '); // Proper colon spacing
        
        // 6. Medical abbreviations (capitalize properly)
        cleaned = cleaned.replace(/\bqhs\b/gi, 'QHS');
        cleaned = cleaned.replace(/\bbid\b/gi, 'BID');
        cleaned = cleaned.replace(/\btid\b/gi, 'TID');
        cleaned = cleaned.replace(/\bqid\b/gi, 'QID');
        cleaned = cleaned.replace(/\bprn\b/gi, 'PRN');
        
        // 7. Clean up multiple spaces
        cleaned = cleaned.replace(/\s{2,}/g, ' ');
        
        // 8. Clean up line breaks
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        
        // 9. Final capitalization pass for section headers
        // Capitalize headers at start of line or after sentence breaks
        cleaned = cleaned.replace(/(^|\. )([a-z][^:]*:)/gm, (match, prefix, header) => {
            const capitalizedHeader = header.split(' ').map(word => 
                word.replace(':', '').charAt(0).toUpperCase() + word.replace(':', '').slice(1).toLowerCase()
            ).join(' ') + ':';
            return prefix + capitalizedHeader;
        });
        
        // Also catch headers after periods followed by space
        cleaned = cleaned.replace(/(\. )([a-z][^:]*:)/g, (match, prefix, header) => {
            const capitalizedHeader = header.split(' ').map(word => 
                word.replace(':', '').charAt(0).toUpperCase() + word.replace(':', '').slice(1).toLowerCase()
            ).join(' ') + ':';
            return prefix + capitalizedHeader;
        });
        
        // 10. Trim and final cleanup
        cleaned = cleaned.trim();
        
        return cleaned;
    }
    
    /**
     * Format medical lists - convert spoken numbered lists to proper formatting
     * @param {string} text - Text to format
     * @returns {string} - Formatted text with proper medical lists
     */
    formatMedicalLists(text) {
        let formatted = text;
        
        // Pattern 1: Section headers followed by numbered items (most common medical pattern)
        // "Problem list: 1) ADHD: improving 2) depression: stable" 
        // → "Problem List:\n1. ADHD: improving\n2. Depression: stable"
        formatted = formatted.replace(
            /((?:Problem List|Current Medications|Assessment|Plan):\s*)([^.]*?)(?=\n\n|\n[A-Z]|$)/gi,
            (match, header, content) => {
                const listItems = this.extractNumberedItems(content);
                if (listItems.length > 1) {
                    return header + '\n' + listItems.map((item, i) => `${i + 1}. ${item.trim()}`).join('\n') + '\n';
                }
                return match; // Return unchanged if not a clear list
            }
        );
        
        // Pattern 2: Standalone numbered sequences anywhere in text
        // "1) item one 2) item two 3) item three" → "1. item one\n2. item two\n3. item three"
        formatted = formatted.replace(
            /(\d+\)\s*[^.]*?)(\d+\)\s*[^.]*?)/g,
            (match) => {
                const items = this.extractNumberedItems(match);
                if (items.length >= 2) {
                    return items.map((item, i) => `${i + 1}. ${item.trim()}`).join('\n');
                }
                return match;
            }
        );
        
        // Pattern 3: Convert number words to proper list format
        // Handle "one ADHD, two depression" patterns common in medical dictation
        formatted = formatted.replace(
            /(Problem List:|Current Medications:|Assessment:|Plan:)\s*(.+?)(?=\n[A-Z]|\n\n|$)/gi,
            (match, header, content) => {
                let listContent = content;
                
                // Convert number words to list format - capture until next sentence or section
                listContent = listContent.replace(/\bone\s+([A-Z][^.]*?)(?=\.\s*[A-Z]|\.\s*$)/gi, '\n1. $1');
                listContent = listContent.replace(/[,.\s]*two[,.\s]+([A-Z][^.]*?)(?=\.\s*[A-Z]|\.\s*Current|\.\s*$)/gi, '\n2. $1'); 
                listContent = listContent.replace(/[,.\s]*three[,.\s]+([A-Z][^.]*?)(?=\.\s*[A-Z]|\.\s*$)/gi, '\n3. $1');
                listContent = listContent.replace(/[,.\s]*four[,.\s]+([A-Z][^.]*?)(?=\.\s*[A-Z]|\.\s*$)/gi, '\n4. $1');
                listContent = listContent.replace(/[,.\s]*five[,.\s]+([A-Z][^.]*?)(?=\.\s*[A-Z]|\.\s*$)/gi, '\n5. $1');
                
                // Clean up any remaining stray periods at end of items
                listContent = listContent.replace(/(\d+\.\s+[^.\n]+)\.\s*(?=\n|$)/gi, '$1');
                
                // Also handle "problemist" transcription error
                listContent = listContent.replace(/\bproblemist\s+/gi, '1. ');
                
                return header + listContent;
            }
        );
        
        // Pattern 4: Medication lists with specific formatting
        // "Lexapro 20 mg (1 pill per day), Prozac 40 mg" → proper list format
        formatted = this.formatMedicationLists(formatted);
        
        return formatted;
    }
    
    /**
     * Extract numbered items from text like "1) item one 2) item two"
     * @param {string} text - Text containing numbered items
     * @returns {Array} - Array of item contents
     */
    extractNumberedItems(text) {
        const items = [];
        
        // Match patterns like "1) content" or "1. content" or just "content, content"
        const numberPattern = /(\d+[\)\.])\s*([^0-9\)\.]*)(?=\d+[\)\.]|$)/gi;
        let match;
        
        while ((match = numberPattern.exec(text)) !== null) {
            const content = match[2].trim().replace(/[,\.]+$/, ''); // Remove trailing punctuation
            if (content.length > 0) {
                items.push(content);
            }
        }
        
        // If no numbered patterns found, try comma-separated items
        if (items.length === 0) {
            const commaItems = text.split(/,(?![^()]*\))/) // Split on commas not inside parentheses
                .map(item => item.trim())
                .filter(item => item.length > 3); // Filter out very short items
            
            if (commaItems.length >= 2) {
                return commaItems;
            }
        }
        
        return items;
    }
    
    /**
     * Format medication lists specifically
     * @param {string} text - Text to format
     * @returns {string} - Formatted medication text
     */
    formatMedicationLists(text) {
        let formatted = text;
        
        // Look for medication patterns within Current Medications sections
        formatted = formatted.replace(
            /(Current Medications:\s*)(.*?)(?=\n[A-Z]|\n\n|$)/gi,
            (match, header, content) => {
                // Clean up the content first
                let cleanContent = content.replace(/[.,]+$/, ''); // Remove trailing punctuation
                
                // Split by commas but not inside parentheses
                const parts = cleanContent.split(/,(?![^()]*\))/);
                
                // Filter for medication-like patterns (name + dosage)
                const medications = parts
                    .map(part => part.trim())
                    .filter(part => {
                        // Must contain a drug name and dosage
                        return /[A-Za-z]+\s+\d+(?:\.\d+)?\s*(?:mg|mcg|ml)/i.test(part) ||
                               // OR be a recognized medication name with or without dosage
                               /^(lexapro|prozac|zoloft|paxil|celexa|wellbutrin|effexor|cymbalta|abilify|risperdal|seroquel|lithium|depakote|lamictal|tegretol|adderall|ritalin|concerta|strattera|vyvanse)/i.test(part);
                    });
                
                if (medications.length > 1) {
                    const formattedMeds = medications
                        .map((med, i) => `${i + 1}. ${med.trim()}`)
                        .join('\n');
                    return header + '\n' + formattedMeds;
                }
                
                return match;
            }
        );
        
        return formatted;
    }
}

// Export for use in other modules
module.exports = { DictationCommandProcessor };
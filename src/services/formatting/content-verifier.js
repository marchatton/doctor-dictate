/**
 * Content Verification and Recovery System
 * Ensures no content is lost during medical transcription formatting
 */

class ContentVerifier {
    constructor() {
        this.minWordLength = 5;  // Ignore small words like "a", "the", "is"
        this.minCoverage = 0.8;   // Require 80% of significant words
        this.contextWindow = 10;  // Words around missing content for context
    }

    /**
     * Check if formatted output contains sufficient content from input
     * @returns {Object} { isValid, coverage, missingWords, missingSentences }
     */
    verifyContent(input, output) {
        // Extract significant words from input
        const inputWords = this.extractSignificantWords(input);
        const outputLower = output.toLowerCase();
        
        // Check which words are present in output
        const foundWords = new Set();
        const missingWords = [];
        
        for (const word of inputWords) {
            if (outputLower.includes(word.toLowerCase())) {
                foundWords.add(word);
            } else {
                missingWords.push(word);
            }
        }
        
        // Calculate coverage
        const coverage = inputWords.length > 0 
            ? foundWords.size / inputWords.length 
            : 1;
        
        // Find missing sentences if coverage is low
        let missingSentences = [];
        if (coverage < this.minCoverage) {
            missingSentences = this.findMissingSentences(input, output, missingWords);
        }
        
        return {
            isValid: coverage >= this.minCoverage,
            coverage: coverage,
            coveragePercent: `${(coverage * 100).toFixed(1)}%`,
            missingWords: missingWords,
            missingSentences: missingSentences,
            foundWords: foundWords.size,
            totalWords: inputWords.length
        };
    }

    /**
     * Extract significant words (5+ characters) from text
     */
    extractSignificantWords(text) {
        const words = text.match(new RegExp(`\\b\\w{${this.minWordLength},}\\b`, 'g')) || [];
        // Remove duplicates but keep track of original
        return [...new Set(words)];
    }

    /**
     * Find complete sentences that might be missing
     */
    findMissingSentences(input, output, missingWords) {
        const sentences = this.splitIntoSentences(input);
        const outputLower = output.toLowerCase();
        const missingSentences = [];
        
        for (const sentence of sentences) {
            const sentenceWords = this.extractSignificantWords(sentence);
            if (sentenceWords.length === 0) continue;
            
            // Check how many words from this sentence are missing
            const missingFromSentence = sentenceWords.filter(word => 
                missingWords.includes(word)
            );
            
            // If >50% of sentence's words are missing, sentence is likely missing
            if (missingFromSentence.length > sentenceWords.length * 0.5) {
                // Double-check by looking for a unique phrase from the sentence
                const uniquePhrase = this.getUniquePhrase(sentence);
                if (uniquePhrase && !outputLower.includes(uniquePhrase.toLowerCase())) {
                    missingSentences.push({
                        text: sentence,
                        missingWords: missingFromSentence,
                        position: input.indexOf(sentence)
                    });
                }
            }
        }
        
        return missingSentences;
    }

    /**
     * Split text into sentences, handling medical dictation format
     */
    splitIntoSentences(text) {
        // Split on period followed by space and capital letter, or "period." marker
        const sentences = text.split(/\.(?:\s+[A-Z])|period\./gi)
            .map(s => s.trim())
            .filter(s => s.length > 10);  // Ignore very short segments
        
        return sentences;
    }

    /**
     * Get a unique 3-4 word phrase from sentence for verification
     */
    getUniquePhrase(sentence) {
        const words = sentence.split(/\s+/).filter(w => w.length > 3);
        if (words.length >= 3) {
            // Take 3 consecutive words from middle of sentence
            const start = Math.floor(words.length / 2) - 1;
            return words.slice(start, start + 3).join(' ');
        }
        return null;
    }

    /**
     * Attempt to reinject missing sentences into formatted output
     */
    reinjectMissingContent(formattedOutput, missingSentences, originalInput) {
        if (!missingSentences || missingSentences.length === 0) {
            return formattedOutput;
        }
        
        console.log(`\n⚠️ Attempting to reinject ${missingSentences.length} missing sentences...`);
        
        let enhanced = formattedOutput;
        
        for (const missing of missingSentences) {
            // Find the best section to inject the missing content
            const section = this.findBestSection(missing.text, originalInput, enhanced);
            
            if (section) {
                console.log(`  → Injecting into ${section.name} section`);
                enhanced = this.injectIntoSection(enhanced, section, missing.text);
            } else {
                console.log(`  → Could not find appropriate section for: "${missing.text.substring(0, 50)}..."`);
            }
        }
        
        return enhanced;
    }

    /**
     * Determine which section missing content belongs to
     */
    findBestSection(missingText, originalInput, formattedOutput) {
        const lowerText = missingText.toLowerCase();
        
        // Section indicators
        const sectionMap = {
            'Risk Assessment': ['suicide', 'risk', 'firearms', 'harm', 'safety', 'supportive family'],
            'MSE': ['mental status', 'oriented', 'mood', 'affect', 'thought'],
            'Interim History': ['interim', 'symptoms', 'medications', 'tolerating'],
            'Past Medical History': ['past', 'prior', 'history', 'previous'],
            'Plan': ['continue', 'start', 'follow up', 'psychoeducation'],
            'Assessment': ['diagnosis', 'stable', 'control'],
            'Current Meds': ['mg', 'daily', 'QHS', 'BID', 'TID']
        };
        
        // Score each section based on keyword matches
        let bestSection = null;
        let bestScore = 0;
        
        for (const [sectionName, keywords] of Object.entries(sectionMap)) {
            const score = keywords.filter(kw => lowerText.includes(kw)).length;
            if (score > bestScore) {
                bestScore = score;
                bestSection = sectionName;
            }
        }
        
        // Find section in formatted output
        if (bestSection) {
            const sectionRegex = new RegExp(`### ${bestSection}\\b`, 'i');
            const sectionMatch = formattedOutput.match(sectionRegex);
            if (sectionMatch) {
                return {
                    name: bestSection,
                    position: sectionMatch.index
                };
            }
        }
        
        return null;
    }

    /**
     * Inject missing text into the appropriate section
     */
    injectIntoSection(formattedOutput, section, missingText) {
        // Find the end of the section (next ### or end of document)
        const nextSectionRegex = /\n### /g;
        nextSectionRegex.lastIndex = section.position + 1;
        const nextSection = nextSectionRegex.exec(formattedOutput);
        
        const sectionEnd = nextSection ? nextSection.index : formattedOutput.length;
        
        // Clean up the missing text
        const cleanedText = this.cleanDictationText(missingText);
        
        // Inject before the end of section
        const before = formattedOutput.substring(0, sectionEnd);
        const after = formattedOutput.substring(sectionEnd);
        
        // Add as a bullet point if section uses bullets, otherwise as a sentence
        const sectionContent = formattedOutput.substring(section.position, sectionEnd);
        const separator = sectionContent.includes('\n- ') ? '\n- ' : '. ';
        
        return before + separator + cleanedText + after;
    }

    /**
     * Clean dictation artifacts from text
     */
    cleanDictationText(text) {
        let cleaned = text;
        
        // Remove dictation commands
        cleaned = cleaned.replace(/\b(period|comma|colon|next line|next paragraph)\b\.?/gi, '');
        
        // Fix spacing
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        // Capitalize first letter
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        
        // Ensure ends with period
        if (!cleaned.match(/[.!?]$/)) {
            cleaned += '.';
        }
        
        return cleaned;
    }

    /**
     * Generate a detailed report of verification results
     */
    generateReport(verificationResult, formattedOutput) {
        const report = [];
        
        report.push('\n📊 CONTENT VERIFICATION REPORT');
        report.push('=' .repeat(50));
        
        report.push(`\n✅ Coverage: ${verificationResult.coveragePercent}`);
        report.push(`   Found: ${verificationResult.foundWords}/${verificationResult.totalWords} significant words`);
        
        if (!verificationResult.isValid) {
            report.push(`\n⚠️ WARNING: Coverage below ${this.minCoverage * 100}% threshold`);
            
            if (verificationResult.missingWords.length > 0) {
                report.push(`\n❌ Missing Words (${verificationResult.missingWords.length}):`);
                // Show first 10 missing words
                const wordsToShow = verificationResult.missingWords.slice(0, 10);
                report.push(`   ${wordsToShow.join(', ')}`);
                if (verificationResult.missingWords.length > 10) {
                    report.push(`   ... and ${verificationResult.missingWords.length - 10} more`);
                }
            }
            
            if (verificationResult.missingSentences.length > 0) {
                report.push(`\n❌ Missing Sentences (${verificationResult.missingSentences.length}):`);
                verificationResult.missingSentences.forEach((sentence, i) => {
                    report.push(`   ${i + 1}. "${sentence.text.substring(0, 60)}..."`);
                });
            }
        } else {
            report.push('\n✅ All critical content preserved');
        }
        
        return report.join('\n');
    }
}

module.exports = { ContentVerifier };
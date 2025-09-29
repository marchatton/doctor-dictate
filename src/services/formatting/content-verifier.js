/**
 * Content Verification and Recovery System
 * Ensures no content is lost during medical transcription formatting
 */

class ContentVerifier {
    constructor() {
        this.minWordLength = 5;  // Ignore small words like "a", "the", "is"
        this.minCoverage = 0.8;   // Require 80% of significant words
    }

    /**
     * Verify structured manifest outputs against the rendered markdown.
     * Ensures each manifest section appears, unexpected sections are flagged,
     * and key phrases survive within each section body.
     */
    verifyStructuredNote({ dictationText = '', manifest = { entries: [] }, markdown = '', structured = {} }) {
        const report = {
            isValid: true,
            missingSections: [],
            extraSections: [],
            coverageIssues: [],
            sectionCoverages: []
        };

        const headings = this.extractHeadings(markdown);
        const manifestEntries = manifest.entries || [];
        const manifestTitles = manifestEntries.map((entry) => (entry.title || entry.detectedTitle || entry.key || '').trim());
        const manifestTitleSet = new Set(manifestTitles.map((title) => title.toLowerCase()));

        manifestEntries.forEach((entry) => {
            const title = (entry.title || entry.detectedTitle || entry.key || '').trim();
            const headingPresent = headings.some((heading) => heading.toLowerCase() === title.toLowerCase());
            if (!headingPresent) {
                report.isValid = false;
                report.missingSections.push(title);
            }

            const snippet = this.extractManifestSnippet(dictationText, entry);
            const structuredSection = (structured.sections || []).find((section) => section.key === entry.key);
            const sectionBody = structuredSection?.body || '';
            if (snippet && sectionBody) {
                const coverageResult = this.verifyContent(snippet, sectionBody);
                report.sectionCoverages.push({
                    key: entry.key,
                    title,
                    coverage: coverageResult.coverage,
                    details: coverageResult
                });

                if (!coverageResult.isValid) {
                    report.isValid = false;
                    report.coverageIssues.push({
                        key: entry.key,
                        title,
                        coverage: coverageResult.coverage,
                        missingSentences: coverageResult.missingSentences
                    });
                }
            }
        });

        headings.forEach((heading) => {
            const lower = heading.toLowerCase();
            if (!manifestTitleSet.has(lower) && lower !== 'uncategorized') {
                report.isValid = false;
                report.extraSections.push(heading);
            }
        });

        return report;
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

    extractHeadings(markdown) {
        const headings = [];
        const regex = /^#+\s+(.+)$/gm;
        let match;
        while ((match = regex.exec(markdown)) !== null) {
            const title = match[1].trim();
            if (title) headings.push(title);
        }
        return headings;
    }

    extractManifestSnippet(dictationText, entry) {
        if (!dictationText) return '';
        const range = entry.contentRange || {};
        const { start, end } = range;

        if (typeof start === 'number' && typeof end === 'number' && end > start) {
            return dictationText.slice(start, end);
        }

        const fallbackTitle = (entry.title || entry.detectedTitle || '').trim();
        if (!fallbackTitle) return '';

        const idx = dictationText.toLowerCase().indexOf(fallbackTitle.toLowerCase());
        if (idx === -1) return '';

        const snippetStart = idx + fallbackTitle.length;
        const snippetEnd = Math.min(dictationText.length, snippetStart + 400);
        return dictationText.slice(snippetStart, snippetEnd);
    }
}

module.exports = { ContentVerifier };

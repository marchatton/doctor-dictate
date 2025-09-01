/**
 * Tests for Medical Prompt V2
 */

const { MedicalPromptV2 } = require('../medical-prompt-v2');

describe('MedicalPromptV2', () => {
    describe('Metadata', () => {
        test('should return correct version', () => {
            expect(MedicalPromptV2.VERSION).toBe('2.0');
        });
        
        test('should return correct metadata', () => {
            const metadata = MedicalPromptV2.getMetadata();
            expect(metadata.version).toBe('2.0');
            expect(metadata.numExamples).toBeGreaterThan(0);
            expect(metadata.numPunctuationRules).toBeGreaterThan(0);
            expect(metadata.numMedicalCorrections).toBeGreaterThan(0);
        });
    });
    
    describe('Punctuation Rules', () => {
        test('should format punctuation rules correctly', () => {
            const rules = MedicalPromptV2.formatPunctuationRules();
            expect(rules).toContain('"period" → .');
            expect(rules).toContain('"comma" → ,');
            expect(rules).toContain('"new paragraph" → \\n\\n');
        });
        
        test('should have all essential punctuation mappings', () => {
            const rules = MedicalPromptV2.PUNCTUATION_RULES;
            expect(rules['period']).toBe('.');
            expect(rules['comma']).toBe(',');
            expect(rules['colon']).toBe(':');
            expect(rules['quote']).toBe('"');
            expect(rules['new paragraph']).toBe('\\n\\n');
        });
    });
    
    describe('Medical Corrections', () => {
        test('should format medical corrections correctly', () => {
            const corrections = MedicalPromptV2.formatMedicalCorrections();
            expect(corrections).toContain('ACHD → ADHD');
            expect(corrections).toContain('qhs → QHS');
            expect(corrections).toContain('jurn APM → {unclear: Journay PM?}');
        });
        
        test('should have all critical medical corrections', () => {
            const corrections = MedicalPromptV2.MEDICAL_CORRECTIONS;
            expect(corrections['ACHD']).toBe('ADHD');
            expect(corrections['qhs']).toBe('QHS');
            expect(corrections['bid']).toBe('BID');
            expect(corrections['prn']).toBe('PRN');
        });
    });
    
    describe('Examples', () => {
        test('should format examples correctly', () => {
            const examples = MedicalPromptV2.formatExamples();
            expect(examples).toContain('Example 1:');
            expect(examples).toContain('Example 2:');
            expect(examples).toContain('Input:');
            expect(examples).toContain('Output:');
        });
        
        test('should have diverse example types', () => {
            const exampleIds = MedicalPromptV2.EXAMPLES.map(e => e.id);
            expect(exampleIds).toContain('complex_full');
            expect(exampleIds).toContain('punctuation_quotes');
            expect(exampleIds).toContain('fillers_corrections');
            expect(exampleIds).toContain('numbered_lists');
        });
        
        test('examples should show proper transformations', () => {
            const complexExample = MedicalPromptV2.EXAMPLES.find(e => e.id === 'complex_full');
            expect(complexExample.input).toContain('ACHD');
            expect(complexExample.output).toContain('ADHD');
            expect(complexExample.output).toContain('**CC:**');
            expect(complexExample.output).toContain('## Problem List');
        });
    });
    
    describe('Prompt Building', () => {
        test('should build complete prompt with all components', () => {
            const testInput = "Test patient data period";
            const prompt = MedicalPromptV2.build(testInput);
            
            // Check all major sections are present
            expect(prompt).toContain('STRICT RULES - FOLLOW EXACTLY:');
            expect(prompt).toContain('PUNCTUATION COMMANDS');
            expect(prompt).toContain('FILLER REMOVAL');
            expect(prompt).toContain('MEDICAL CORRECTIONS');
            expect(prompt).toContain('SECTION HEADERS');
            expect(prompt).toContain('NUMBERED LISTS');
            expect(prompt).toContain('UNCLEAR CONTENT');
            expect(prompt).toContain('EXAMPLES SHOWING EXACT FORMATTING:');
            
            // Check the input is included
            expect(prompt).toContain(testInput);
        });
        
        test('should include all examples in prompt', () => {
            const prompt = MedicalPromptV2.build("test");
            MedicalPromptV2.EXAMPLES.forEach((example, i) => {
                expect(prompt).toContain(`Example ${i + 1}:`);
                expect(prompt).toContain(example.input);
                expect(prompt).toContain(example.output);
            });
        });
        
        test('should include all punctuation rules in prompt', () => {
            const prompt = MedicalPromptV2.build("test");
            Object.entries(MedicalPromptV2.PUNCTUATION_RULES).forEach(([key, value]) => {
                expect(prompt).toContain(`"${key}"`);
            });
        });
        
        test('should include all medical corrections in prompt', () => {
            const prompt = MedicalPromptV2.build("test");
            Object.entries(MedicalPromptV2.MEDICAL_CORRECTIONS).forEach(([key, value]) => {
                expect(prompt).toContain(key);
            });
        });
    });
    
    describe('Edge Cases', () => {
        test('should handle empty input', () => {
            const prompt = MedicalPromptV2.build("");
            expect(prompt).toContain('NOW PROCESS THIS TRANSCRIPT:');
            expect(prompt).toContain('OUTPUT (follow the examples EXACTLY):');
        });
        
        test('should handle very long input', () => {
            const longInput = "test ".repeat(1000);
            const prompt = MedicalPromptV2.build(longInput);
            expect(prompt).toContain(longInput);
        });
        
        test('should handle special characters in input', () => {
            const specialInput = "Patient's symptoms: \"anxiety\" & {depression}";
            const prompt = MedicalPromptV2.build(specialInput);
            expect(prompt).toContain(specialInput);
        });
    });
});
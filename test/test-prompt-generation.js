#!/usr/bin/env node

/**
 * Test the prompt generation to understand what's being sent to Ollama
 */

const fs = require('fs');
const path = require('path');
const { MedicalPrompt, TemplateLoader } = require('./src/prompts');

async function testPromptGeneration() {
    console.log('=' .repeat(80));
    console.log('🧪 PROMPT GENERATION TEST');
    console.log('=' .repeat(80));
    
    // Read the sample data
    const sampleFile = path.join(__dirname, 'docs/sample-data/mock recording-samir-temp.wav.txt');
    const rawText = fs.readFileSync(sampleFile, 'utf8');
    
    console.log('\n📄 INPUT TEXT:');
    console.log('  Length:', rawText.length, 'characters');
    console.log('  First 200 chars:', rawText.substring(0, 200) + '...\n');
    
    try {
        // Load the template
        console.log('📦 Loading template...');
        const template = TemplateLoader.load('medicine-management');
        console.log('  ✓ Template loaded:', template.name);
        console.log('  Sections:', template.sections.map(s => s.id).join(', '));
        
        // Create prompt generator
        console.log('\n🔧 Creating prompt generator...');
        const promptGenerator = new MedicalPrompt(template);
        
        // Generate the prompt
        console.log('\n📝 Generating prompt...');
        const prompt = promptGenerator.generatePrompt(rawText);
        
        console.log('\n📊 PROMPT ANALYSIS:');
        console.log('  - Total length:', prompt.length, 'characters');
        console.log('  - Lines:', prompt.split('\n').length);
        
        // Analyze prompt structure
        const sections = [
            '==== CONTEXT ====',
            '==== GLOBAL RULES ====',
            '==== TEMPLATE-SPECIFIC RULES ====',
            '==== EXAMPLES ====',
            '==== DATA REFERENCES ====',
            '==== CONSTRAINTS ====',
            '==== INPUT TO FORMAT ====',
            '==== INSTRUCTIONS ===='
        ];
        
        console.log('\n📋 PROMPT SECTIONS:');
        for (const section of sections) {
            const index = prompt.indexOf(section);
            if (index !== -1) {
                // Find the next section
                let nextIndex = prompt.length;
                for (const nextSection of sections) {
                    const ni = prompt.indexOf(nextSection, index + section.length);
                    if (ni !== -1 && ni < nextIndex) {
                        nextIndex = ni;
                    }
                }
                const sectionContent = prompt.substring(index, nextIndex);
                console.log(`  ✓ ${section}`);
                console.log(`    Position: ${index}`);
                console.log(`    Length: ${sectionContent.length} chars`);
            } else {
                console.log(`  ✗ ${section} - NOT FOUND`);
            }
        }
        
        // Save the full prompt for inspection
        const promptFile = path.join(__dirname, 'test-generated-prompt.txt');
        fs.writeFileSync(promptFile, prompt);
        console.log('\n💾 Full prompt saved to:', promptFile);
        
        // Show the input section
        const inputMarker = '==== INPUT TO FORMAT ====';
        const inputIndex = prompt.indexOf(inputMarker);
        if (inputIndex !== -1) {
            const instructionsMarker = '==== INSTRUCTIONS ====';
            const instructionsIndex = prompt.indexOf(instructionsMarker);
            if (instructionsIndex !== -1) {
                const inputSection = prompt.substring(inputIndex, instructionsIndex);
                console.log('\n📄 INPUT SECTION PREVIEW:');
                console.log(inputSection.substring(0, 500));
                console.log('...');
            }
        }
        
        // Test with simplified prompt for comparison
        console.log('\n' + '='.repeat(80));
        console.log('🔄 COMPARING WITH SIMPLE PROMPT');
        console.log('='.repeat(80));
        
        const simplePrompt = `Format this medical dictation into a structured note with proper markdown headers.

IMPORTANT RULES:
1. Include ALL sections that are present in the input text
2. Use ### for section headers
3. Clean up dictation commands ("comma" -> ",", "period" -> ".", "next paragraph" -> new paragraph)
4. Fix medication names ("Jordan APM" or "John APM" -> "Jornay PM")
5. Preserve all medical information exactly as stated

Expected sections (include only those present in input):
### Identification
### CC  
### Problem List
### Current Meds
### Interim History
### Past Medical History
### Social History
### Family History  
### Review of Systems
### Mental Status Exam
### Risk Assessment
### Assessment
### Plan
### Therapy Notes

INPUT TEXT:
${rawText}

FORMATTED OUTPUT:`;
        
        console.log('\n📊 PROMPT COMPARISON:');
        console.log('  Complex prompt length:', prompt.length, 'characters');
        console.log('  Simple prompt length:', simplePrompt.length, 'characters');
        console.log('  Ratio:', (prompt.length / simplePrompt.length).toFixed(2) + 'x larger');
        
        // Save simple prompt for comparison
        const simplePromptFile = path.join(__dirname, 'test-simple-prompt.txt');
        fs.writeFileSync(simplePromptFile, simplePrompt);
        console.log('\n💾 Simple prompt saved to:', simplePromptFile);
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(80));
}

// Run the test
testPromptGeneration().catch(console.error);
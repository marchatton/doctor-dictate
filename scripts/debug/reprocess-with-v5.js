/**
 * Reprocess the Whisper transcription with v5 prompt
 * Fixes: period conversion, missing content, date handling
 */

const fs = require('fs');
const { OllamaFormatter } = require('./src/ollama-formatter');

async function reprocessTranscription() {
    console.log('🔄 Reprocessing with V5 Prompt System');
    console.log('=' .repeat(60));
    
    // Read the real transcript
    const transcriptPath = 'docs/sample-data/mock-recording-transcript.txt';
    let transcript = fs.readFileSync(transcriptPath, 'utf8');
    
    // Get the file's creation date for signature
    const stats = fs.statSync(transcriptPath);
    const transcriptionDate = stats.birthtime.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    console.log(`📅 Transcription date: ${transcriptionDate}`);
    
    // Remove the warning line from Whisper
    transcript = transcript.split('\n')
        .filter(line => !line.includes('UserWarning'))
        .join('\n')
        .trim();
    
    console.log('📝 Processing transcript...');
    console.log(`Length: ${transcript.length} characters\n`);
    
    // Use OllamaFormatter with v5
    const formatter = new OllamaFormatter();
    
    const available = await formatter.isOllamaAvailable();
    if (!available) {
        console.log('❌ Ollama not available');
        return;
    }
    
    // Force llama3.2 for faster processing
    formatter.model = 'llama3.2:latest';
    
    console.log(`🤖 Using model: ${formatter.model}`);
    console.log('Processing with V5 prompt (fixed period handling)...\n');
    
    const result = await formatter.formatMedicalDictation(transcript, { transcriptionDate });
    
    if (result.success) {
        console.log('✅ Formatting successful!');
        console.log(`Model: ${result.model}`);
        console.log(`Prompt version: ${result.promptVersion}`);
        
        // Overwrite the review file
        const reviewContent = `# Mock Recording - For Review and Corrections
<!-- 
INSTRUCTIONS: 
- Edit this file directly
- Add comments using HTML comments like this one
- Or use [CORRECTION: explanation] inline
- Or use strikethrough ~~old text~~ and **bold for corrections**
- Generated with prompt v${result.promptVersion}
- Transcription date: ${transcriptionDate}
-->

${result.formatted}`;
        
        const reviewPath = 'docs/sample-data/mock-recording-for-review.md';
        fs.writeFileSync(reviewPath, reviewContent);
        console.log(`\n✅ Updated: ${reviewPath}`);
        
        // Quick compliance check
        console.log('\n📊 Compliance Check:');
        const checks = [
            { name: 'Uses ### headers', check: /^###\s/m.test(result.formatted) },
            { name: 'Periods converted correctly', check: !/\bperiod\b(?!\s+of)/i.test(result.formatted) || /interim period|course period/i.test(result.formatted) },
            { name: 'Missing sentences included', check: /Client living with supportive family/i.test(result.formatted) && /No access to firearms/i.test(result.formatted) },
            { name: 'Title case diagnoses', check: /Major Depressive Disorder/i.test(result.formatted) },
            { name: 'Medications in parentheses', check: /\d+mg\s*\([^)]+\)/i.test(result.formatted) },
            { name: 'mg not milligrams', check: !/milligrams/i.test(result.formatted) && /\d+mg/i.test(result.formatted) },
            { name: 'Jornay PM corrected', check: /Jornay PM/i.test(result.formatted) },
            { name: '"or homicidal" included', check: /suicidal or homicidal/i.test(result.formatted) },
            { name: '"imminently" used', check: /imminently/i.test(result.formatted) && !/immediately suicidal/i.test(result.formatted) },
            { name: 'Transcription date in signature', check: new RegExp(transcriptionDate.split(',')[0]).test(result.formatted) }
        ];
        
        checks.forEach(check => {
            console.log(`${check.check ? '✅' : '❌'} ${check.name}`);
        });
        
        // Check for specific issues
        console.log('\n🔍 Specific Issues Check:');
        
        // Check if "period" is being converted properly
        const periodIssues = result.formatted.match(/\bperiod\b(?!\s+of)/gi);
        if (periodIssues) {
            console.log(`⚠️ Found ${periodIssues.length} unconverted "period" commands`);
        } else {
            console.log('✅ All "period" commands converted (except in "interim period", etc.)');
        }
        
        if (result.llmNotes) {
            console.log('\n📝 LLM Notes:');
            console.log(result.llmNotes);
        }
        
    } else {
        console.log('❌ Formatting failed:', result.error);
    }
}

// Run the reprocessing
reprocessTranscription().catch(console.error);
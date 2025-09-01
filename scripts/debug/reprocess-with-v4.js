/**
 * Reprocess the Whisper transcription with v4 prompt
 */

const fs = require('fs');
const { OllamaFormatter } = require('./src/ollama-formatter');

async function reprocessTranscription() {
    console.log('🔄 Reprocessing with V4 Prompt System');
    console.log('=' .repeat(60));
    
    // Read the real transcript
    const transcriptPath = 'docs/sample-data/mock-recording-transcript.txt';
    let transcript = fs.readFileSync(transcriptPath, 'utf8');
    
    // Remove the warning line from Whisper
    transcript = transcript.split('\n')
        .filter(line => !line.includes('UserWarning'))
        .join('\n')
        .trim();
    
    console.log('📝 Processing transcript...');
    console.log(`Length: ${transcript.length} characters\n`);
    
    // Use OllamaFormatter with v4
    const formatter = new OllamaFormatter();
    
    const available = await formatter.isOllamaAvailable();
    // Force llama3.2 after checking availability
    formatter.model = 'llama3.2:latest';  // Use faster model
    if (!available) {
        console.log('❌ Ollama not available');
        return;
    }
    
    console.log(`🤖 Using model: ${formatter.model}`);
    console.log('Processing with V4 prompt system (with detailed rules)...\n');
    
    const result = await formatter.formatMedicalDictation(transcript);
    
    if (result.success) {
        console.log('✅ Formatting successful!');
        console.log(`Model: ${result.model}`);
        console.log(`Prompt version: ${result.promptVersion}`);
        
        // Save the formatted result
        const formattedPath = 'docs/sample-data/mock-recording-formatted-v4.md';
        fs.writeFileSync(formattedPath, result.formatted);
        console.log(`\n✅ Saved formatted output to: ${formattedPath}`);
        
        // Quick compliance check
        console.log('\n📊 Compliance Check:');
        const checks = [
            { name: 'Uses ### headers', check: /^###\s/m.test(result.formatted) },
            { name: 'Line breaks between sections', check: /### .+\n\n/m.test(result.formatted) },
            { name: 'Title case diagnoses', check: /Major Depressive Disorder/i.test(result.formatted) },
            { name: 'Medications in parentheses', check: /\d+mg\s*\([^)]+\)/i.test(result.formatted) },
            { name: 'mg not milligrams', check: !/milligrams/i.test(result.formatted) && /\d+mg/i.test(result.formatted) },
            { name: 'Jornay PM corrected', check: /Jornay PM/i.test(result.formatted) },
            { name: '"or homicidal" included', check: /suicidal or homicidal/i.test(result.formatted) },
            { name: '"imminently" not "immediately"', check: /imminently/i.test(result.formatted) && !/immediately suicidal/i.test(result.formatted) },
            { name: 'Today\'s date in signature', check: new RegExp(new Date().getFullYear()).test(result.formatted) }
        ];
        
        checks.forEach(check => {
            console.log(`${check.check ? '✅' : '❌'} ${check.name}`);
        });
        
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
/**
 * Reprocess the Whisper transcription with v3 prompt
 */

const fs = require('fs');
const { OllamaFormatter } = require('./src/ollama-formatter');

async function reprocessTranscription() {
    console.log('🔄 Reprocessing with V3 Prompt System');
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
    
    // Use OllamaFormatter with v3
    const formatter = new OllamaFormatter();
    
    const available = await formatter.isOllamaAvailable();
    if (!available) {
        console.log('❌ Ollama not available');
        return;
    }
    
    console.log(`🤖 Using model: ${formatter.model}`);
    console.log('Processing with V3 prompt system...\n');
    
    const result = await formatter.formatMedicalDictation(transcript);
    
    if (result.success) {
        console.log('✅ Formatting successful!');
        console.log(`Model: ${result.model}`);
        console.log(`Prompt version: ${result.promptVersion}`);
        
        // Overwrite the review file with new results
        const reviewContent = `# Mock Recording - For Review and Corrections
<!-- 
INSTRUCTIONS: 
- Edit this file directly
- Add comments using HTML comments like this one
- Or use [CORRECTION: explanation] inline
- Or use strikethrough ~~old text~~ and **bold for corrections**
- Generated with prompt v${result.promptVersion}
-->

${result.formatted}`;
        
        const reviewPath = 'docs/sample-data/mock-recording-for-review.md';
        fs.writeFileSync(reviewPath, reviewContent);
        console.log(`\n✅ Updated: ${reviewPath}`);
        
        // Quick compliance check
        console.log('\n📊 Quick Check:');
        const checks = [
            { name: 'Uses ### headers', check: /^###\s/m.test(result.formatted) },
            { name: 'Has CC section', check: /### CC/i.test(result.formatted) },
            { name: 'Uses numbered problem list', check: /### Problem List[\s\S]*?\d+\./i.test(result.formatted) },
            { name: 'Has ROS section', check: /### ROS/i.test(result.formatted) },
            { name: 'Jornay PM corrected', check: /Jornay PM/i.test(result.formatted) },
            { name: 'Signature formatted', check: /\*Signed by.*\*/i.test(result.formatted) }
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
/**
 * Test the content verification system with real transcription
 */

const fs = require('fs');
const { OllamaFormatter } = require('./src/ollama-formatter');

async function testWithVerification() {
    console.log('🔬 Testing Content Verification System');
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
    
    // Use OllamaFormatter with verification
    const formatter = new OllamaFormatter();
    
    const available = await formatter.isOllamaAvailable();
    if (!available) {
        console.log('❌ Ollama not available');
        return;
    }
    
    // Force llama3.2 for consistency
    formatter.model = 'llama3.2:latest';
    
    console.log(`🤖 Using model: ${formatter.model}`);
    console.log('Processing with content verification...\n');
    
    const result = await formatter.formatMedicalDictation(transcript, { transcriptionDate });
    
    if (result.success) {
        console.log('\n✅ Formatting successful!');
        console.log(`Model: ${result.model}`);
        console.log(`Prompt version: ${result.promptVersion}`);
        
        // Show verification results
        if (result.verification) {
            console.log('\n📊 Verification Results:');
            console.log(`  Coverage: ${result.verification.coveragePercent}`);
            console.log(`  Words found: ${result.verification.foundWords}/${result.verification.totalWords}`);
            console.log(`  Valid: ${result.verification.isValid ? '✅' : '❌'}`);
            
            if (result.contentRecovered) {
                console.log('  ✨ Missing content was recovered and reinjected');
            }
        }
        
        // Save the result
        const outputPath = 'docs/sample-data/mock-recording-verified.md';
        fs.writeFileSync(outputPath, result.formatted);
        console.log(`\n💾 Saved to: ${outputPath}`);
        
        // Specific checks
        console.log('\n🔍 Critical Content Checks:');
        const criticalPhrases = [
            'Client living with supportive family',
            'No access to firearms',
            'futuristic in thinking',
            'One prior suicide attempt',
            'Lexapro 20mg',
            'Jornay PM 60mg'
        ];
        
        criticalPhrases.forEach(phrase => {
            const found = result.formatted.toLowerCase().includes(phrase.toLowerCase());
            console.log(`  ${found ? '✅' : '❌'} "${phrase}"`);
        });
        
        if (result.llmNotes) {
            console.log('\n📝 LLM Notes:');
            console.log(result.llmNotes);
        }
        
    } else {
        console.log('❌ Formatting failed:', result.error);
    }
}

// Run the test
testWithVerification().catch(console.error);
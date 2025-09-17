#!/usr/bin/env node

/**
 * Test using the exact sample data file: mock recording-samir-temp.wav.txt
 */

const fs = require('fs');
const path = require('path');
const { OllamaFormatter } = require('./src/services/formatting/ollama-formatter');

async function testWithSampleData() {
    console.log('🔬 Testing with Sample Data File');
    console.log('=' .repeat(80));
    
    const sampleDataPath = path.join(__dirname, 'docs', 'sample-data', 'mock recording-samir-temp.wav.txt');
    
    // Read the sample data file
    console.log(`📁 Reading sample data from: ${sampleDataPath}`);
    
    let rawTranscript;
    try {
        rawTranscript = fs.readFileSync(sampleDataPath, 'utf8');
        console.log(`✅ Sample data loaded (${rawTranscript.length} characters)`);
    } catch (error) {
        console.error(`❌ Failed to read sample data file: ${error.message}`);
        return;
    }
    
    // Show first few lines of input
    console.log('\n📋 INPUT (First 500 characters):');
    console.log('-'.repeat(60));
    console.log(rawTranscript.substring(0, 500) + '...');
    
    // Initialize formatter
    const formatter = new OllamaFormatter();
    
    // Check if Ollama is available
    console.log('\n🔧 Checking Ollama availability...');
    const available = await formatter.isOllamaAvailable();
    if (!available) {
        console.log('❌ Ollama not available - cannot run test');
        console.log('💡 Make sure Ollama is running: ollama serve');
        return;
    }
    
    console.log(`✅ Ollama available with model: ${formatter.model}`);
    
    // Run the formatting test
    console.log('\n🚀 PROCESSING WITH OLLAMA...');
    console.log('-'.repeat(60));
    
    const startTime = Date.now();
    
    try {
        const result = await formatter.formatMedicalDictation(rawTranscript);
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log('\n📊 RESULTS:');
        console.log('=' .repeat(60));
        console.log(`⏱️  Processing time: ${duration} seconds`);
        console.log(`✅ Success: ${result.success}`);
        console.log(`🤖 Model: ${result.model}`);
        console.log(`📝 Prompt version: ${result.promptVersion}`);
        
        if (result.success) {
            console.log('\n📄 FORMATTED OUTPUT:');
            console.log('-'.repeat(60));
            console.log(result.formatted);
            
            // Analyze the formatting quality
            console.log('\n🔍 FORMATTING ANALYSIS:');
            console.log('-'.repeat(60));
            
            const inputLength = rawTranscript.length;
            const outputLength = result.formatted.length;
            
            console.log(`📏 Length: ${inputLength} → ${outputLength} characters (${outputLength > inputLength ? '+' : ''}${outputLength - inputLength})`);
            console.log(`📈 Compression ratio: ${(outputLength / inputLength * 100).toFixed(1)}%`);
            
            // Check for key medical formatting elements
            const checks = [
                { name: 'Contains headers (###)', check: result.formatted.includes('###') },
                { name: 'Proper patient identification', check: result.formatted.includes('John Smith') && result.formatted.includes('14-year-old') },
                { name: 'Problem list formatted', check: result.formatted.toLowerCase().includes('problem') || result.formatted.toLowerCase().includes('adhd') },
                { name: 'Medications section', check: result.formatted.toLowerCase().includes('medication') || result.formatted.includes('Lexapro') },
                { name: 'Assessment/Plan section', check: result.formatted.toLowerCase().includes('assessment') || result.formatted.toLowerCase().includes('plan') },
                { name: 'Proper medication formatting', check: result.formatted.includes('mg') && result.formatted.includes('daily') },
                { name: 'Clean paragraph structure', check: !result.formatted.includes('next paragraph') && !result.formatted.includes('Next paragraph') },
                { name: 'Medical terminology preserved', check: result.formatted.includes('ADHD') && result.formatted.includes('QHS') }
            ];
            
            let passedChecks = 0;
            checks.forEach(check => {
                const status = check.check ? '✅' : '❌';
                console.log(`${status} ${check.name}`);
                if (check.check) passedChecks++;
            });
            
            const score = (passedChecks / checks.length * 100).toFixed(0);
            console.log(`\n🎯 Quality Score: ${passedChecks}/${checks.length} (${score}%)`);
            
            // Save output for review
            const outputPath = path.join(__dirname, `test-output-${Date.now()}.md`);
            const outputContent = `# Test Output - ${new Date().toISOString()}

## Input File
\`${sampleDataPath}\`

## Processing Details
- Model: ${result.model}
- Prompt Version: ${result.promptVersion}
- Duration: ${duration}s
- Quality Score: ${score}%

## Raw Input
\`\`\`
${rawTranscript}
\`\`\`

## Formatted Output
${result.formatted}

## Analysis
${checks.map(check => `- ${check.check ? '✅' : '❌'} ${check.name}`).join('\n')}
`;
            
            fs.writeFileSync(outputPath, outputContent);
            console.log(`\n💾 Output saved to: ${outputPath}`);
            
        } else {
            console.log(`\n❌ FORMATTING FAILED:`);
            console.log(`Error: ${result.error}`);
            console.log('\nFallback output:');
            console.log(result.formatted);
        }
        
    } catch (error) {
        console.error(`\n❌ ERROR: ${error.message}`);
        console.error(error.stack);
    }
}

// Run the test
testWithSampleData().catch(console.error);
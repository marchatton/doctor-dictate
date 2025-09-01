/**
 * Test just the formatting with dual-mode using existing transcript
 */

const { ProcessingModes } = require('./src/processing-config');
const { OllamaFormatter } = require('./src/ollama-formatter');
const fs = require('fs');

async function testFormattingModes() {
  // Use existing transcript if available
  const transcriptPath = 'docs/sample-data/mock-recording-transcript.txt';
  
  if (!fs.existsSync(transcriptPath)) {
    console.log('❌ No transcript found. Please run transcription first.');
    return;
  }
  
  const transcript = fs.readFileSync(transcriptPath, 'utf8');
  console.log(`📝 Using existing transcript (${transcript.length} characters)`);
  console.log('=' .repeat(60));
  
  // Test Fast Mode Formatting
  console.log('\n1️⃣ FAST MODE FORMATTING (qwen2.5:0.5b):');
  console.log('-'.repeat(40));
  
  try {
    const fastFormatter = new OllamaFormatter({
      model: ProcessingModes.FAST.ollama.model,
      temperature: ProcessingModes.FAST.ollama.temperature,
      timeout: ProcessingModes.FAST.ollama.timeout
    });
    
    const fastStart = Date.now();
    const fastResult = await fastFormatter.formatMedicalDictation(transcript, {
      temperature: ProcessingModes.FAST.ollama.temperature,
      numPredict: ProcessingModes.FAST.ollama.numPredict,
      numCtx: ProcessingModes.FAST.ollama.numCtx
    });
    const fastTime = (Date.now() - fastStart) / 1000;
    
    if (fastResult.success) {
      console.log(`✅ Fast formatting completed in ${fastTime.toFixed(1)}s`);
      console.log(`Output length: ${fastResult.formatted.length} characters`);
      
      // Save output
      fs.writeFileSync('docs/sample-data/output-fast-mode.md', fastResult.formatted);
      
      // Check template compliance
      const templateSections = ['# Identification', '## Problem List', '## Assessment', '## Plan'];
      const foundSections = templateSections.filter(s => fastResult.formatted.includes(s));
      console.log(`Template compliance: ${foundSections.length}/${templateSections.length} sections`);
      
      console.log('\n📄 Sample output (first 300 chars):');
      console.log(fastResult.formatted.substring(0, 300) + '...');
    } else {
      console.error('❌ Fast formatting failed:', fastResult.error);
    }
    
  } catch (error) {
    console.error('❌ Fast mode error:', error.message);
  }
  
  // Test Accurate Mode Formatting
  console.log('\n2️⃣ ACCURATE MODE FORMATTING (qwen2.5:1.5b):');
  console.log('-'.repeat(40));
  
  try {
    const accurateFormatter = new OllamaFormatter({
      model: ProcessingModes.ACCURATE.ollama.model,
      temperature: ProcessingModes.ACCURATE.ollama.temperature,
      timeout: ProcessingModes.ACCURATE.ollama.timeout
    });
    
    const accurateStart = Date.now();
    const accurateResult = await accurateFormatter.formatMedicalDictation(transcript, {
      temperature: ProcessingModes.ACCURATE.ollama.temperature,
      numPredict: ProcessingModes.ACCURATE.ollama.numPredict,
      numCtx: ProcessingModes.ACCURATE.ollama.numCtx
    });
    const accurateTime = (Date.now() - accurateStart) / 1000;
    
    if (accurateResult.success) {
      console.log(`✅ Accurate formatting completed in ${accurateTime.toFixed(1)}s`);
      console.log(`Output length: ${accurateResult.formatted.length} characters`);
      
      // Save output
      fs.writeFileSync('docs/sample-data/output-accurate-mode.md', accurateResult.formatted);
      
      // Check template compliance
      const templateSections = ['# Identification', '## Problem List', '## Assessment', '## Plan'];
      const foundSections = templateSections.filter(s => accurateResult.formatted.includes(s));
      console.log(`Template compliance: ${foundSections.length}/${templateSections.length} sections`);
      
      console.log('\n📄 Sample output (first 300 chars):');
      console.log(accurateResult.formatted.substring(0, 300) + '...');
    } else {
      console.error('❌ Accurate formatting failed:', accurateResult.error);
    }
    
  } catch (error) {
    console.error('❌ Accurate mode error:', error.message);
  }
  
  console.log('\n📁 Outputs saved:');
  console.log('- docs/sample-data/output-fast-mode.md');
  console.log('- docs/sample-data/output-accurate-mode.md');
}

async function main() {
  console.log('🏥 Doctor-Dictate Dual-Mode Formatting Test');
  console.log('=' .repeat(60));
  
  // Check Ollama
  const formatter = new OllamaFormatter();
  const ollamaAvailable = await formatter.isOllamaAvailable();
  
  if (!ollamaAvailable) {
    console.log('❌ Ollama is not running. Please start it with:');
    console.log('   ollama serve');
    return;
  }
  
  console.log('✅ Ollama is available');
  console.log('\nConfiguration:');
  console.log('Fast mode:', {
    model: ProcessingModes.FAST.ollama.model,
    expected: ProcessingModes.FAST.expected.formatCompliance
  });
  console.log('Accurate mode:', {
    model: ProcessingModes.ACCURATE.ollama.model,
    expected: ProcessingModes.ACCURATE.expected.formatCompliance
  });
  
  await testFormattingModes();
  
  console.log('\n✅ Test complete!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testFormattingModes };
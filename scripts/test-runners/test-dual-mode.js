/**
 * Test the dual-mode processing system
 */

const { ProcessorFactory } = require('./src/unified-processor');
const { ProcessingModes } = require('./src/processing-config');
const fs = require('fs');

async function testDualMode() {
  const testAudio = 'docs/sample-data/mock recording-samir.m4a';
  
  console.log('🔬 DUAL-MODE PROCESSING TEST');
  console.log('=' .repeat(60));
  
  // Test Fast Mode
  console.log('\n1️⃣ FAST MODE TEST:');
  console.log('-'.repeat(40));
  console.log('Expected performance:', ProcessingModes.FAST.expected);
  console.log('Models:', {
    whisper: ProcessingModes.FAST.whisper.model,
    ollama: ProcessingModes.FAST.ollama.model
  });
  
  try {
    const fastProcessor = ProcessorFactory.createFast();
    const fastStart = Date.now();
    const fastResult = await fastProcessor.process(testAudio);
    const fastTime = (Date.now() - fastStart) / 1000;
    
    console.log(`\n✅ Fast mode completed in ${fastTime.toFixed(1)}s`);
    console.log(`Transcript length: ${fastResult.transcript?.length || 0} chars`);
    console.log(`Formatted length: ${fastResult.text?.length || 0} chars`);
    
    // Save output
    fs.writeFileSync('docs/sample-data/output-fast.md', fastResult.text || '');
    fs.writeFileSync('docs/sample-data/transcript-fast.txt', fastResult.transcript || '');
    
    console.log('\n📄 Sample output (first 300 chars):');
    console.log(fastResult.text?.substring(0, 300) + '...');
    
  } catch (error) {
    console.error('❌ Fast mode failed:', error.message);
  }
  
  // Test Accurate Mode
  console.log('\n2️⃣ ACCURATE MODE TEST:');
  console.log('-'.repeat(40));
  console.log('Expected performance:', ProcessingModes.ACCURATE.expected);
  console.log('Models:', {
    whisper: ProcessingModes.ACCURATE.whisper.model,
    ollama: ProcessingModes.ACCURATE.ollama.model
  });
  
  try {
    const accurateProcessor = ProcessorFactory.createAccurate();
    const accurateStart = Date.now();
    const accurateResult = await accurateProcessor.process(testAudio);
    const accurateTime = (Date.now() - accurateStart) / 1000;
    
    console.log(`\n✅ Accurate mode completed in ${accurateTime.toFixed(1)}s`);
    console.log(`Transcript length: ${accurateResult.transcript?.length || 0} chars`);
    console.log(`Formatted length: ${accurateResult.text?.length || 0} chars`);
    
    // Save output
    fs.writeFileSync('docs/sample-data/output-accurate.md', accurateResult.text || '');
    fs.writeFileSync('docs/sample-data/transcript-accurate.txt', accurateResult.transcript || '');
    
    console.log('\n📄 Sample output (first 300 chars):');
    console.log(accurateResult.text?.substring(0, 300) + '...');
    
  } catch (error) {
    console.error('❌ Accurate mode failed:', error.message);
  }
  
  console.log('\n📁 Outputs saved:');
  console.log('- docs/sample-data/output-fast.md');
  console.log('- docs/sample-data/output-accurate.md');
  console.log('- docs/sample-data/transcript-fast.txt');
  console.log('- docs/sample-data/transcript-accurate.txt');
}

async function checkDependencies() {
  console.log('\n🔍 CHECKING DEPENDENCIES:');
  console.log('-'.repeat(40));
  
  // Check Ollama
  const { OllamaFormatter } = require('./src/ollama-formatter');
  const formatter = new OllamaFormatter();
  const ollamaAvailable = await formatter.isOllamaAvailable();
  console.log(`Ollama: ${ollamaAvailable ? '✅ Available' : '❌ Not running'}`);
  
  if (ollamaAvailable) {
    // Check models
    const { spawn } = require('child_process');
    const checkModels = spawn('ollama', ['list']);
    
    let output = '';
    checkModels.stdout.on('data', (data) => output += data);
    
    await new Promise(resolve => {
      checkModels.on('close', () => {
        console.log('\nAvailable Ollama models:');
        const lines = output.split('\n');
        lines.forEach(line => {
          if (line.includes('qwen') || line.includes('mistral') || line.includes('llama')) {
            console.log('  ' + line);
          }
        });
        resolve();
      });
    });
  }
  
  // Check Whisper
  const { WhisperCpp } = require('./src/whisper-cpp');
  const whisper = new WhisperCpp();
  const whisperAvailable = await whisper.isAvailable();
  console.log(`\nWhisper.cpp: ${whisperAvailable ? '✅ Available' : '❌ Not installed'}`);
  
  if (!whisperAvailable) {
    console.log('⚠️ Falling back to Python whisper');
    // Check Python whisper
    const { spawn } = require('child_process');
    const pythonCheck = spawn('which', ['whisper']);
    await new Promise(resolve => {
      pythonCheck.on('close', (code) => {
        console.log(`Python Whisper: ${code === 0 ? '✅ Available' : '❌ Not installed'}`);
        resolve();
      });
    });
  }
  
  return { ollamaAvailable, whisperAvailable };
}

async function main() {
  console.log('🏥 Doctor-Dictate Dual-Mode Processing Test');
  console.log('=' .repeat(60));
  
  const deps = await checkDependencies();
  
  if (!deps.ollamaAvailable) {
    console.log('\n❌ Ollama is not running. Please start it with:');
    console.log('   ollama serve');
    return;
  }
  
  console.log('\n📝 Note: Using test audio file');
  console.log('   Path: docs/sample-data/mock recording-samir.m4a');
  
  await testDualMode();
  
  console.log('\n✅ Test complete!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testDualMode, checkDependencies };
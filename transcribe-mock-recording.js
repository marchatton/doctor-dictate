/**
 * Transcribe the mock recording using Whisper
 * Then test the medical formatting on the real transcription
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { OllamaFormatter } = require('./src/ollama-formatter');
const { MedicalFormatter } = require('./src/medical-formatter');

async function transcribeWithWhisper(audioPath, outputPath) {
    console.log('🎤 Transcribing mock recording with Whisper...');
    console.log('=' .repeat(60));
    
    return new Promise((resolve, reject) => {
        // Use whisper CLI directly
        const whisperProcess = spawn('whisper', [
            audioPath,
            '--model', 'small.en',  // Use small model for better accuracy
            '--language', 'en',
            '--output_format', 'txt',
            '--output_dir', path.dirname(outputPath),
            '--verbose', 'False'
        ]);
        
        let output = '';
        let error = '';
        
        whisperProcess.stdout.on('data', (data) => {
            output += data.toString();
            process.stdout.write('.');
        });
        
        whisperProcess.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        whisperProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('\n❌ Whisper failed:', error);
                reject(new Error(`Whisper exited with code ${code}`));
            } else {
                console.log('\n✅ Transcription complete');
                
                // Whisper creates a file with the base name + .txt
                const baseName = path.basename(audioPath, path.extname(audioPath));
                const transcriptPath = path.join(path.dirname(outputPath), baseName + '.txt');
                
                if (fs.existsSync(transcriptPath)) {
                    const transcript = fs.readFileSync(transcriptPath, 'utf8');
                    
                    // Save to our desired location
                    fs.writeFileSync(outputPath, transcript);
                    
                    // Clean up Whisper's output file if different
                    if (transcriptPath !== outputPath) {
                        fs.unlinkSync(transcriptPath);
                    }
                    
                    resolve(transcript);
                } else {
                    reject(new Error('Transcript file not found'));
                }
            }
        });
    });
}

async function testWithRealTranscription() {
    try {
        const audioPath = 'docs/sample-data/mock recording-samir.m4a';
        const transcriptPath = 'docs/sample-data/mock-recording-transcript.txt';
        
        let transcript;
        
        // Check if we already have a transcript
        if (fs.existsSync(transcriptPath)) {
            console.log('📄 Using existing transcript');
            transcript = fs.readFileSync(transcriptPath, 'utf8');
        } else {
            console.log('🎙️ Transcribing audio file (this may take a few minutes)...');
            transcript = await transcribeWithWhisper(audioPath, transcriptPath);
        }
        
        console.log('\n📝 WHISPER TRANSCRIPT:');
        console.log('-'.repeat(60));
        console.log(transcript.substring(0, 500) + '...');
        console.log('-'.repeat(60));
        console.log(`Length: ${transcript.length} characters`);
        
        // Now test the formatting
        console.log('\n🔧 TESTING MEDICAL FORMATTING:');
        console.log('=' .repeat(60));
        
        // Test with OllamaFormatter directly
        const formatter = new OllamaFormatter();
        const available = await formatter.isOllamaAvailable();
        
        if (!available) {
            console.log('❌ Ollama not available');
            return;
        }
        
        console.log(`✅ Using model: ${formatter.model}`);
        
        const result = await formatter.formatMedicalDictation(transcript);
        
        if (result.success) {
            console.log('\n📋 FORMATTED OUTPUT:');
            console.log('-'.repeat(60));
            console.log(result.formatted);
            console.log('-'.repeat(60));
            
            // Save the formatted output
            const formattedPath = 'docs/sample-data/mock-recording-formatted.md';
            fs.writeFileSync(formattedPath, result.formatted);
            console.log(`\n✅ Saved formatted output to: ${formattedPath}`);
            
            // Check template.md compliance
            console.log('\n🔍 TEMPLATE COMPLIANCE CHECK:');
            console.log('-'.repeat(60));
            
            const templateSections = [
                '# Identification',
                '**CC:**',
                '## Problem List',
                '## Current Meds',
                '## Interim History',
                '## Past Medical History',
                '## Social History',
                '## Family History',
                '## ROS',
                '## MSE',
                '## Risk Assessment',
                '## Assessment',
                '## Plan'
            ];
            
            const foundSections = [];
            const missingSections = [];
            
            templateSections.forEach(section => {
                if (result.formatted.includes(section)) {
                    foundSections.push(section);
                    console.log(`✅ ${section}`);
                } else {
                    missingSections.push(section);
                    console.log(`❌ ${section}`);
                }
            });
            
            console.log(`\nTemplate compliance: ${foundSections.length}/${templateSections.length} sections`);
            console.log(`Compliance rate: ${(foundSections.length/templateSections.length*100).toFixed(1)}%`);
            
            // Additional checks
            console.log('\n📊 ADDITIONAL CHECKS:');
            console.log('-'.repeat(60));
            
            const checks = [
                { name: 'Uses numbered lists', check: /\d+\.\s/.test(result.formatted) },
                { name: 'Medications formatted', check: /mg|mcg|ml/i.test(result.formatted) },
                { name: 'Has markdown headers', check: /^#{1,3}\s/m.test(result.formatted) },
                { name: 'Medical abbreviations capitalized', check: /\b(QHS|BID|TID|PRN)\b/.test(result.formatted) },
                { name: 'No raw dictation commands', check: !/\b(period|comma|colon)\b/i.test(result.formatted) }
            ];
            
            checks.forEach(check => {
                console.log(`${check.check ? '✅' : '❌'} ${check.name}`);
            });
            
            if (result.llmNotes) {
                console.log('\n📝 LLM Processing Notes:');
                console.log(result.llmNotes);
            }
            
        } else {
            console.log('❌ Formatting failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Check if Whisper is installed
async function checkWhisperInstalled() {
    return new Promise((resolve) => {
        const check = spawn('which', ['whisper']);
        check.on('close', (code) => {
            resolve(code === 0);
        });
    });
}

async function main() {
    console.log('🏥 End-to-End Test: Mock Recording → Transcription → Formatting');
    console.log('=' .repeat(60));
    
    // Check if Whisper is available
    const hasWhisper = await checkWhisperInstalled();
    
    if (!hasWhisper) {
        console.log('⚠️ Whisper not found. Installing with pip...');
        console.log('Run: pip install openai-whisper');
        console.log('\nOr if you have a transcript already, place it at:');
        console.log('docs/sample-data/mock-recording-transcript.txt');
    }
    
    await testWithRealTranscription();
}

main().catch(console.error);
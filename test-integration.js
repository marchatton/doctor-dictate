#!/usr/bin/env node
/**
 * Integration Test for DoctorDictate Whisper + Medical Dictionary
 * Tests the complete transcription workflow
 */

const { WhisperTranscriber } = require('./src/whisper.js');
const path = require('path');

async function testWhisperIntegration() {
    console.log('🧪 Testing DoctorDictate Whisper Integration...\n');
    
    const transcriber = new WhisperTranscriber();
    
    // Test 1: Initialize Whisper
    console.log('1️⃣ Initializing Whisper...');
    const initialized = await transcriber.initializeWhisper();
    if (initialized) {
        console.log('✅ Whisper initialized successfully');
    } else {
        console.log('❌ Failed to initialize Whisper');
        return;
    }
    
    // Test 2: Validate Installation
    console.log('\n2️⃣ Validating Whisper installation...');
    const isValid = await transcriber.validateWhisperInstallation();
    if (isValid) {
        console.log('✅ Whisper installation validated');
    } else {
        console.log('❌ Whisper installation invalid');
        return;
    }
    
    // Test 3: Test with existing audio file
    const testAudioPath = path.join(__dirname, 'whisper-testing', 'test-psychiatric-dictation.m4a');
    
    console.log('\n3️⃣ Testing transcription with existing audio file...');
    console.log(`Audio file: ${testAudioPath}`);
    
    try {
        const result = await transcriber.transcribeAudio(testAudioPath, (progress) => {
            console.log(`Progress: ${progress.stage} - ${progress.progress || 0}%`);
        });
        
        console.log('\n✅ Transcription completed successfully!');
        console.log('\n📊 Results:');
        console.log(`- Raw text length: ${result.raw.length} characters`);
        console.log(`- Corrected text length: ${result.corrected.length} characters`);
        console.log(`- Corrections applied: ${result.corrections.length}`);
        console.log(`- Medications found: ${result.medications.length}`);
        
        if (result.corrections.length > 0) {
            console.log('\n🔧 Corrections applied:');
            result.corrections.forEach((correction, i) => {
                console.log(`  ${i + 1}. "${correction.original}" → "${correction.corrected}" (${correction.type})`);
            });
        }
        
        if (result.medications.length > 0) {
            console.log('\n💊 Medications detected:');
            result.medications.forEach((med, i) => {
                const dosageText = med.dosage ? ` ${med.dosage} ${med.unit}` : '';
                console.log(`  ${i + 1}. ${med.name}${dosageText} (${med.category})`);
            });
        }
        
        // Test 4: Confidence Score
        console.log('\n4️⃣ Calculating confidence score...');
        const confidence = transcriber.getConfidenceScore(result.raw, result.corrected, result.corrections);
        console.log(`Overall confidence: ${confidence.overall}%`);
        console.log(`Word count: ${confidence.wordCount}`);
        console.log(`Corrections: ${confidence.correctionCount}`);
        
        console.log('\n🎉 All tests passed! DoctorDictate is ready to use.');
        
    } catch (error) {
        console.log('\n❌ Transcription test failed:', error.message);
    }
}

// Run the test
testWhisperIntegration().catch(console.error);
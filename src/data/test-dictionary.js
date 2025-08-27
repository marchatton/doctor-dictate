// Test script for the medical dictionary
// Run with: node src/data/test-dictionary.js

const medicalDictionary = require('./medical-dictionary.js');

console.log('🧪 Testing DoctorDictate Medical Dictionary\n');

// Test 1: Basic medication lookup
console.log('1. Testing medication lookup:');
const sertraline = medicalDictionary.validate.getMedicationInfo('sertraline');
if (sertraline) {
  console.log(`   ✅ Found sertraline: ${sertraline.category} - ${sertraline.typicalUse}`);
  console.log(`   📊 Common dosages: ${sertraline.commonDosages.join(', ')}`);
} else {
  console.log('   ❌ Sertraline not found');
}

// Test 2: Condition lookup
console.log('\n2. Testing condition lookup:');
const mdd = medicalDictionary.validate.getConditionInfo('major depressive disorder');
if (mdd) {
  console.log(`   ✅ Found MDD: ${mdd.category}`);
  console.log(`   📋 Symptoms: ${mdd.symptoms.slice(0, 5).join(', ')}...`);
} else {
  console.log('   ❌ Major depressive disorder not found');
}

// Test 3: Medication search
console.log('\n3. Testing medication search:');
const searchResults = medicalDictionary.validate.searchMedications('fluox');
if (searchResults.length > 0) {
  console.log(`   ✅ Found ${searchResults.length} medication(s):`);
  searchResults.forEach(med => {
    console.log(`      - ${med.name} (${med.category})`);
  });
} else {
  console.log('   ❌ No medications found for "fluox"');
}

// Test 4: Dosage validation
console.log('\n4. Testing dosage validation:');
const testDosages = ['100mg', '25mg', 'invalid', '2.5mg'];
testDosages.forEach(dosage => {
  const isValid = medicalDictionary.validate.isValidDosage(dosage);
  console.log(`   ${isValid ? '✅' : '❌'} "${dosage}" is ${isValid ? 'valid' : 'invalid'}`);
});

// Test 5: Category lookup
console.log('\n5. Testing category lookup:');
const ssris = medicalDictionary.validate.getMedicationsByCategory('ssris');
console.log(`   📚 Found ${Object.keys(ssris).length} SSRIs:`);
Object.keys(ssris).slice(0, 3).forEach(med => {
  console.log(`      - ${med}`);
});

// Test 6: Abbreviations
console.log('\n6. Testing abbreviations:');
const abbreviations = ['ADHD', 'OCD', 'PTSD', 'SSRI'];
abbreviations.forEach(abbr => {
  const fullName = medicalDictionary.terminology.abbreviations[abbr];
  if (fullName) {
    console.log(`   ✅ ${abbr}: ${fullName}`);
  } else {
    console.log(`   ❌ ${abbr}: Not found`);
  }
});

// Test 7: Performance test
console.log('\n7. Performance test:');
const startTime = Date.now();
for (let i = 0; i < 1000; i++) {
  medicalDictionary.validate.isMedication('sertraline');
}
const endTime = Date.now();
console.log(`   ⚡ 1000 medication lookups in ${endTime - startTime}ms`);

// Test 8: Coverage statistics
console.log('\n8. Dictionary coverage:');
let totalMeds = 0;
let totalConditions = 0;
let totalAbbreviations = 0;

Object.values(medicalDictionary.medications).forEach(category => {
  totalMeds += Object.keys(category).length;
});

Object.values(medicalDictionary.conditions).forEach(category => {
  totalConditions += Object.keys(category).length;
});

totalAbbreviations = Object.keys(medicalDictionary.terminology.abbreviations).length;

console.log(`   💊 Total medications: ${totalMeds}`);
console.log(`   🧠 Total conditions: ${totalConditions}`);
console.log(`   🔤 Total abbreviations: ${totalAbbreviations}`);

// Test 9: Error handling and corrections
console.log('\n9. Testing error handling and corrections:');
const testErrors = ['sertralene', 'fluoxitine', 'aripiprazol', 'lamotrigin'];
testErrors.forEach(error => {
  const correction = medicalDictionary.validate.getCorrectedMedicationName(error);
  if (correction) {
    console.log(`   ✅ "${error}" → "${correction}"`);
  } else {
    console.log(`   ❌ No correction found for "${error}"`);
  }
});

// Test 10: Dosage error corrections
console.log('\n10. Testing dosage error corrections:');
const testDosageErrors = ['100mgs', '25 mg', '2 tablets', '50mg.'];
testDosageErrors.forEach(dosage => {
  const corrected = medicalDictionary.validate.getCorrectedDosage(dosage);
  console.log(`   🔧 "${dosage}" → "${corrected}"`);
});

// Test 11: Transcription error detection
console.log('\n11. Testing transcription error detection:');
const testTranscript = 'Patient taking sertralene 100mgs daily and fluoxitine 20mgs';
const errors = medicalDictionary.validate.checkTranscriptionErrors(testTranscript);
console.log(`   🔍 Found ${errors.length} transcription errors:`);
errors.forEach(error => {
  console.log(`      - "${error.original}" → "${error.corrected}" (${error.type})`);
});

// Test 12: Transcription accuracy scoring
console.log('\n12. Testing transcription accuracy scoring:');
const expectedTerms = ['sertraline', '100mg', 'fluoxetine', '20mg'];
const accuracyResult = medicalDictionary.validate.getTranscriptionAccuracy(testTranscript, expectedTerms);
console.log(`   📊 Accuracy: ${accuracyResult.accuracy.toFixed(1)}%`);
console.log(`   ✅ Correct: ${accuracyResult.correctCount}/${accuracyResult.totalCount}`);
console.log(`   🎯 Passed 95% threshold: ${accuracyResult.passed ? 'YES' : 'NO'}`);

console.log('\n🎉 Enhanced medical dictionary test completed!');
console.log('📝 This dictionary now includes error handling, corrections, and accuracy scoring for Phase 0 testing.');

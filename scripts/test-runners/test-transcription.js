/**
 * Test script to simulate raw transcription output
 * This shows what a realistic dictation might look like
 */

// Simulated raw transcription from the mock recording
// Based on typical psychiatric follow-up dictation patterns
const rawTranscription = `
Sample progress note, identification: This is John Smith, a 14-year-old male with a history of ADHD and major depressive disorder. He's in the seventh grade. 

Chief complaint follow-up. 

Next paragraph. 

Problemist: ADHD. Improving: improving, partially, with two episodes this month of difficulty controlling himself. Major depressive disorder. Stable. 

Current medications. Lexapro [unclear_name] 20 mg, one pill per day. Chorn APM. Jordan APM, 60 mg, QHS. 

Interim history, The client is taking and tolerating medications without daytime sedation or other side effects. He's participating in recommended psychotherapies. There are no new complaints or problems reported. There are no new labs to review, period.

The patient's depression has been stable overall. His ADHD symptoms are showing improvement with better focus at school. Mother reports that homework completion has increased from 50% to about 80%. Still having some impulsivity issues, especially in the afternoons when medication wears off.

MSE: Patient is alert and fully oriented. Memory intact. Attention adequate during session. Well-groomed. Cooperative. Good eye contact. No psychomotor agitation. Speech normal rate and volume. Mood reported as 6 out of 10. No SI/HI. Thought process linear. No delusions or hallucinations. Insight and judgment intact.

Risk assessment: Current risk factors include depression in partial remission, history of self-injurious behavior - last episode was 3 weeks ago with superficial scratching. No prior suicide attempts. Denies current suicidal ideation. Living with supportive family. Parents have secured medications and sharps. Currently low risk.

Assessment: The patient has shown improvements in ADHD symptoms while on current regimen. Depression remains stable. Not imminently suicidal or homicidal. Can continue outpatient treatment.

Plan: Continue Lexapro 20mg daily. Continue quetiapine 60mg at bedtime for sleep. Consider increasing afternoon dose of stimulant if impulsivity persists. Follow up in 4 weeks. Continue weekly therapy. Parents to monitor for any mood changes.
`;

// This is what we get from whisper - messy, with dictation artifacts
const messyTranscription = `
Sample progress note comma identification colon John Smith is a 14 year old male with a history of ADHD and major depressive disorder period He's in the seventh grade period chief complaint follow up period next paragraph problemist colon ADHD period improving comma partial control period two comma major depressive disorder comma stable period current medications comma open bracket lexapro close bracket 20 mg comma open paren one pill per day close paren comma drawn APM comma 60 milli comma QHS period
`;

console.log("=== RAW TRANSCRIPTION (Natural speech) ===");
console.log(rawTranscription);
console.log("\n=== MESSY TRANSCRIPTION (With artifacts) ===");
console.log(messyTranscription);

// Export for testing
module.exports = { rawTranscription, messyTranscription };
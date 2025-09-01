/**
 * Medical Prompt Management System - Version 6.0
 * Fixed: Section headers, medication preservation, list formatting
 */

class MedicalPromptV6 {
    static VERSION = "6.0";
    
    // Template structure from template.md with line breaks
    static TEMPLATE_STRUCTURE = `
### Identification
{Patient demographics and history}

### CC 
Follow-up

### Problem List
1. {Diagnosis} – {stable, improving, worsening}
2. {Diagnosis} – {stable, improving, worsening}

### Current Meds
1. {Name} {Dosage} ({Frequency})
2. {Name} {Dosage} ({Frequency})

### Interim History
- {Clinical updates and symptoms}
- Taking and tolerating medications without daytime sedation or other side effects.
- Participating in recommended psychotherapies.

### Past Medical History
{History or "No changes."}

### Social History
{Details or "See HPI."}

### Family History
No changes. No knowledge of maternal/paternal family hx of sudden cardiac death/unexplained death or cardiac issues in relatives under age 50.

### ROS
- General: Denies weight changes.
- CVS: No CP or palpitations.
- CNS: No dizziness, lightheadedness, falls, or LOC.
- ROS negative except as noted above.

- Vital signs are stable.
- MM/DD/YYYY Height: {X}, Weight: {X}, BP: {X}, HR: {X}.

### MSE
{Mental status exam paragraph - include "suicidal or homicidal"}

### Risk Assessment
{Risk assessment paragraph - use "imminently" not "immediately"}

### Assessment
- {Clinical assessment points with Title Case diagnoses}

### Plan
- Discussed diagnoses, clinical impressions, and treatment recommendations.
- {Treatment plan items}
- Follow-up in {X} weeks; MMM/DD/YYYY.

### Therapy Notes
{Notes or "N/a"}

---

*Signed by {Name}, MD on MMM/DD/YYYY*`;

    // Medical corrections and abbreviations
    static MEDICAL_CORRECTIONS = {
        // Medication corrections - DO NOT change brand names to generics!
        'journey': 'Jornay PM',
        'journay': 'Jornay PM',
        'luxapro': 'Lexapro',
        'john apm': 'Jornay PM',
        'john a p m': 'Jornay PM',
        
        // Medical abbreviations - should be capitalized
        'adhd': 'ADHD',
        'mdd': 'MDD',
        'qhs': 'QHS',
        'bid': 'BID',
        'tid': 'TID',
        'prn': 'PRN',
        'ssri': 'SSRI',
        'cvs': 'CVS',
        'cns': 'CNS',
        'bp': 'BP',
        'hr': 'HR',
        'lOC': 'LOC',
        'cp': 'CP',
        
        // Common corrections
        'problemist': 'problem list',
        'violence': 'Vyvanse',
        'current meditations': 'current medications',
        'false': 'falls',
        'intend': 'intent',
        'coma of': 'comorbid',
        'achd': 'ADHD',
        'psych': 'Psychiatry',
        'generalize': 'Generalized',
        
        // Date/Number corrections
        'oh nine oh': '09/0',
        'oh seven': '07/',
    };

    // NEW: Section detection patterns
    static SECTION_PATTERNS = {
        'identification': /^(identification|patient|john smith|jane doe)/i,
        'cc': /^(chief complaint|cc|follow[- ]up)/i,
        'problem list': /^(problem list|problemist|problems)/i,
        'current meds': /^(current (meds|medications|meditations))/i,
        'interim history': /^(interim history|interim)/i,
        'past medical history': /^(past medical|pmh)/i,
        'social history': /^(social history|social)/i,
        'family history': /^(family history|family)/i,
        'ros': /^(ros|review of systems)/i,
        'mse': /^(mse|mental status)/i,
        'risk assessment': /^(risk assessment|risk)/i,
        'assessment': /^(assessment|clinical assessment)/i,
        'plan': /^(plan|treatment plan)/i,
        'therapy notes': /^(therapy notes|therapy)/i
    };

    // Updated critical rules
    static CRITICAL_RULES = `
CRITICAL FORMATTING RULES:

1. SECTION HEADERS - MUST format ALL sections with ### headers:
   When you detect any of these keywords, create a new section with ### header:
   - "identification" or patient name → ### Identification
   - "chief complaint" or "CC" or "follow-up" → ### CC
   - "problem list" → ### Problem List
   - "current meds" or "current medications" → ### Current Meds
   - "interim history" → ### Interim History
   - "past medical" → ### Past Medical History
   - "social history" → ### Social History
   - "family history" → ### Family History
   - "ROS" or "review of systems" → ### ROS
   - "MSE" or "mental status" → ### MSE
   - "risk assessment" → ### Risk Assessment
   - "assessment" → ### Assessment
   - "plan" → ### Plan
   - "therapy notes" → ### Therapy Notes

2. MEDICATION PRESERVATION - NEVER substitute brand names:
   ✗ WRONG: "escitalopram" instead of "Lexapro"
   ✓ RIGHT: Keep "Lexapro" as dictated
   - Keep brand names as brand names (Lexapro, Zoloft, Adderall)
   - Keep generic names as generic names (escitalopram, sertraline)
   - DO NOT interchange them

3. LIST FORMATTING:
   Problem List and Current Meds MUST use numbered lists:
   ### Problem List
   1. ADHD – improving, partial control
   2. Major Depressive Disorder – stable
   
   ### Current Meds
   1. Lexapro 20mg (one pill per day)
   2. Jornay PM 60mg (QHS)

4. INTERIM HISTORY FORMATTING:
   Use bullet points for Interim History:
   ### Interim History
   - ADHD in fair control in the interim period.
   - Mood: okay, interest: good, energy: good
   - No suicidal thoughts.

5. CONVERT DICTATION COMMANDS TO PUNCTUATION:
   - "period" or "Period" at end of sentence → "."
   BUT: Keep "period" when it's part of "interim period" or "course period"
   
   EXAMPLES:
   Input: "No suicidal thoughts period finds Lexapro helpful period"
   Output: "No suicidal thoughts. Finds Lexapro helpful."

6. NEVER OMIT CONTENT - Include EVERY sentence, even if awkwardly dictated

7. PRESERVE EXACT DOSING LANGUAGE:
   "one pill per day" → keep as "(one pill per day)" not "(daily)"

8. TITLE CASE FOR ALL DIAGNOSES:
   "major depressive disorder" → "Major Depressive Disorder"

9. MEDICATION FORMAT: Name Dosage (Frequency)
   "Lexapro 20mg (one pill per day)"

10. ALWAYS USE mg NOT milligrams:
    "60 milligrams" → "60mg"

11. ADD LINE BREAKS BETWEEN SECTIONS:
    Each ### section should have a blank line before it

12. STANDARD PAIRINGS: Always "suicidal or homicidal" together in MSE

13. USE "imminently" NOT "immediately" in risk assessment`;

    static EXAMPLES = [
        {
            input: "Identification. John Smith is a 14 year old male with a history of ADHD and major depressive disorder. He is in the 7th grade. Chief complaint. Follow-up.",
            output: `### Identification
John Smith is a 14 year old male with a history of ADHD and Major Depressive Disorder. He is in the 7th grade.

### CC
Follow-up`
        },
        {
            input: "Problem list. ADHD, improving. Major depressive disorder, stable.",
            output: `### Problem List
1. ADHD – improving
2. Major Depressive Disorder – stable`
        },
        {
            input: "Current medications. Lexapro 20 mg, one pill per day. Jornay PM 60 mg, QHS.",
            output: `### Current Meds
1. Lexapro 20mg (one pill per day)
2. Jornay PM 60mg (QHS)`
        },
        {
            input: "Interim history. ADHD in fair control in the interim period. Mood okay, interest good, energy good. No suicidal thoughts period Finds Lexapro helpful period",
            output: `### Interim History
- ADHD in fair control in the interim period.
- Mood: okay, interest: good, energy: good.
- No suicidal thoughts. Finds Lexapro helpful.`
        }
    ];

    static generatePrompt(dictationText, options = {}) {
        const currentDate = options.date || new Date().toLocaleDateString('en-US');
        
        return `You are a medical transcriptionist formatting a psychiatrist's clinical note.

${this.CRITICAL_RULES}

TEMPLATE STRUCTURE TO FOLLOW:
${this.TEMPLATE_STRUCTURE}

MEDICAL CORRECTIONS TO APPLY:
${JSON.stringify(this.MEDICAL_CORRECTIONS, null, 2)}

EXAMPLES:
${this.EXAMPLES.map(ex => `Input: "${ex.input}"\nOutput:\n${ex.output}`).join('\n\n')}

CONTEXT:
- Transcription Date: ${currentDate}
- Use this date for any signatures or date references

RAW DICTATION TO FORMAT:
${dictationText}

FORMAT THE ABOVE DICTATION following ALL critical rules. Ensure EVERY section that appears gets a ### header and proper formatting.`;
    }

    static postProcessAndExtractNotes(text) {
        // Extract any notes or warnings
        const notePattern = /\[Note:.*?\]|\(Note:.*?\)|Note:.*?(?=\n|$)/gi;
        const notes = [];
        let match;
        while ((match = notePattern.exec(text)) !== null) {
            notes.push(match[0]);
        }
        
        // Clean the text
        let cleanedText = text
            .replace(notePattern, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        
        return { 
            text: cleanedText, 
            notes: notes.length > 0 ? notes : null 
        };
    }
}

module.exports = { MedicalPromptV6 };
/**
 * Medical Prompt Management System - Version 5.0
 * Fixed: period conversion, missing content, date handling
 */

class MedicalPromptV5 {
    static VERSION = "5.0";
    
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
        // Medication corrections
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
        'chpi': 'See HPI',
        'samirid thapra': 'Samir V. Tarpara, MD',
        'samirid': 'Samir',
        'thapra': 'Tarpara',
        'immediately suicidal': 'imminently suicidal',
        'futuristic and thinking': 'futuristic in thinking'
    };

    static CRITICAL_RULES = `
CRITICAL FORMATTING RULES (MUST FOLLOW):

1. CONVERT DICTATION COMMANDS TO PUNCTUATION/FORMATTING:
   - "period" or "Period" at end of sentence → "."
   - "comma" → ","
   - "colon" → ":"
   - "next paragraph" → start new paragraph
   - "next line" → start new line
   BUT: Keep "period" when it's part of a word like "interim period" or "course period"
   
   EXAMPLES:
   Input: "No suicidal thoughts period finds Lexapro helpful period"
   Output: "No suicidal thoughts. Finds Lexapro helpful."
   
   Input: "ADHD in fair control in the interim period"
   Output: "ADHD in fair control in the interim period" (keep "period" as it's part of "interim period")

2. NEVER OMIT CONTENT - Include EVERY sentence, even if awkwardly dictated
   Example: "Client living with supportive family and is futuristic and thinking. No access to firearms."
   Must include BOTH sentences exactly.

3. PRESERVE DICTATION ORDER - Keep medications and problems in exact order
   If Lexapro mentioned first, list it first.

4. PRESERVE EXACT DOSING LANGUAGE
   "one pill per day" → keep as "(one pill per day)" not "(daily)"

5. DON'T ALTER UNCLEAR MEDICAL TERMS
   "increase in the course period" → keep as is

6. TITLE CASE FOR ALL DIAGNOSES
   "major depressive disorder" → "Major Depressive Disorder"
   "ADHD combined presentation" → "ADHD Combined Presentation"

7. PRESERVE EXPLICITLY DICTATED PUNCTUATION
   "MDD comma recurrent comma mild" → "MDD, recurrent, mild"

8. MEDICATION FORMAT: Name Dosage (Frequency)
   "Lexapro 20mg (one pill per day)"
   "Jornay PM 60mg (QHS)"

9. ALWAYS USE mg NOT milligrams
   "60 milligrams" → "60mg"

10. ADD LINE BREAKS BETWEEN SECTIONS
    Each ### section should have a blank line before it

11. SIGNATURE DATE = TRANSCRIPTION DATE
    Use the date when the transcription was created (provided in context)

12. STANDARD PAIRINGS: Always "suicidal or homicidal" together in MSE

13. USE "imminently" NOT "immediately" in risk assessment

14. HANDLE PAUSES AND PERIODS CAREFULLY:
    "Reduced. Control after 4 to 5 pm period" → "Reduced. Control after 4 to 5 pm." 
    (First period is a pause, second "period" means ".")`;

    static EXAMPLES = [
        {
            input: "No suicidal thoughts period finds Lexapro helpful period",
            output: "No suicidal thoughts. Finds Lexapro helpful."
        },
        {
            input: "ADHD in fair control in the interim period. Had improved symptoms after increase in the course period.",
            output: "ADHD in fair control in the interim period. Had improved symptoms after increase in the course period."
        },
        {
            input: "Reduced. Control after 4 to 5 pm period.",
            output: "Reduced. Control after 4 to 5 pm."
        },
        {
            input: "Client living with supportive family and is futuristic and thinking. No access to firearms. Period.",
            output: "Client living with supportive family and is futuristic in thinking. No access to firearms."
        },
        {
            input: "Major depressive disorder comma recurrent comma mild comma in full remission comma F32.4",
            output: "Major Depressive Disorder, recurrent, mild, in full remission, F32.4"
        },
        {
            input: "Without suicidal ideation, plan or intend period",
            output: "Without suicidal or homicidal ideation, plan, or intent."
        },
        {
            input: "current medications. Lexapro 20 mg. In parentheses, one pill per day. Close parentheses.",
            output: `### Current Meds
1. Lexapro 20mg (one pill per day)`
        }
    ];

    static build(text, transcriptionDate = null) {
        const examples = this.EXAMPLES.map(ex => 
            `Input: "${ex.input}"\nOutput: ${ex.output}`
        ).join('\n\n');

        // Use transcription date if provided, otherwise today
        const signatureDate = transcriptionDate || new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        return `You are a medical transcription formatter. Convert raw medical dictation into a properly formatted medical note.

${this.CRITICAL_RULES}

TEMPLATE STRUCTURE:
${this.TEMPLATE_STRUCTURE}

EXAMPLES:
${examples}

MEDICAL CORRECTIONS:
${JSON.stringify(this.MEDICAL_CORRECTIONS, null, 2)}

CRITICAL REMINDERS:
- "period" at end of sentence → "." BUT keep "period" in phrases like "interim period"
- Include EVERY sentence - never skip content
- Keep original order within sections
- Title Case for all medical conditions
- Preserve "(one pill per day)" don't change to "(daily)"
- Format: Name Dosage (Frequency) with frequency in parentheses
- "milligrams" → "mg"
- Preserve dictated commas
- Line breaks between ### sections
- Signature date: ${signatureDate}
- Include "or homicidal" with "suicidal" in MSE
- "imminently" not "immediately" in risk

Now format this dictation:

${text}

OUTPUT:
Return ONLY the formatted medical note. No explanations or commentary.`;
    }

    static postProcess(text) {
        let processed = text;
        
        // First pass: Handle "period" at end of sentences (but not in "interim period", "course period")
        // This regex looks for "period" that's NOT preceded by common medical terms
        processed = processed.replace(/(?<!\binterim|\bcourse|\bmenstrual|\bincubation|\blatent)\s+period\b(?!\s+of)/gi, '.');
        
        // Apply medical corrections
        Object.entries(this.MEDICAL_CORRECTIONS).forEach(([wrong, correct]) => {
            const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
            processed = processed.replace(regex, correct);
        });
        
        // Ensure proper header formatting (### not ## or #)
        processed = processed.replace(/^#{1,2}\s+(?=Identification|CC|Problem List|Current Meds|Interim History|Past Medical History|Social History|Family History|ROS|MSE|Risk Assessment|Assessment|Plan|Therapy Notes)/gm, '### ');
        
        // Ensure Title Case for medical conditions
        processed = processed.replace(/\b(major depressive disorder|Major depressive disorder)\b/g, 'Major Depressive Disorder');
        processed = processed.replace(/\b(adhd combined presentation|ADHD combined presentation)\b/gi, 'ADHD Combined Presentation');
        
        // Fix milligrams abbreviation
        processed = processed.replace(/(\d+)\s*milligrams?\b/gi, '$1mg');
        
        // Clean up any remaining dictation commands
        processed = processed.replace(/\bnext paragraph\b/gi, '\n\n');
        processed = processed.replace(/\bnext line\b/gi, '\n');
        processed = processed.replace(/\bcolon\b(?!\s*\w)/gi, ':');
        processed = processed.replace(/\bcomma\b(?!\s*\w)/gi, ',');
        
        // Ensure line breaks between sections
        processed = processed.replace(/(### [^\n]+\n)([^#\n])/g, '$1\n$2');
        
        // Clean up spacing
        processed = processed.replace(/\s+([.,;:!?])/g, '$1');
        processed = processed.replace(/([.,;:!?])\s*([.,;:!?])/g, '$1');
        processed = processed.replace(/\n{3,}/g, '\n\n');
        
        // Fix double periods
        processed = processed.replace(/\.\.+/g, '.');
        
        return processed.trim();
    }
}

module.exports = { MedicalPromptV5 };
/**
 * Medical Prompt Management System - Version 4.0
 * Based on template.md patterns with detailed correction rules
 */

class MedicalPromptV4 {
    static VERSION = "4.0";
    
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

    // Punctuation and command processing rules
    static PUNCTUATION_RULES = {
        'period': '.',
        'comma': ',',
        'colon': ':',
        'semicolon': ';',
        'question mark': '?',
        'exclamation point': '!',
        'open parenthesis': '(',
        'close parenthesis': ')',
        'open parentheses': '(',
        'close parentheses': ')',
        'in parentheses': '(',
        'dash': '-',
        'hyphen': '-',
        'slash': '/',
        'apostrophe': "'",
        'quote': '"',
        'open quote': '"',
        'close quote': '"'
    };

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
        'coma': 'comma',
        'achd': 'ADHD',
        'chpi': 'See HPI',
        'samirid thapra': 'Samir V. Tarpara, MD',
        'samirid': 'Samir',
        'thapra': 'Tarpara',
        'immediately suicidal': 'imminently suicidal'
    };

    // Commands to process
    static COMMANDS = {
        'next paragraph': '\n\n',
        'next line': '\n',
        'new paragraph': '\n\n',
        'new line': '\n'
    };

    static CRITICAL_RULES = `
CRITICAL FORMATTING RULES (MUST FOLLOW):

1. NEVER OMIT CONTENT - Include every sentence from the dictation, even if it seems redundant
   Example: If dictated "Client living with supportive family and is futuristic in thinking. No access to firearms."
   You MUST include both sentences.

2. PRESERVE DICTATION ORDER - Keep medications and problems in the exact order dictated
   Example: If Lexapro is mentioned first, then Jornay PM, keep that order.

3. PRESERVE EXACT DOSING LANGUAGE - Don't simplify medical dosing instructions
   WRONG: "20mg daily" 
   RIGHT: "20mg (one pill per day)" [if dictated as "one pill per day"]

4. DON'T ALTER UNCLEAR MEDICAL TERMS - If unsure, keep original
   Example: "increase in the course period" → keep as is, don't change to "dose"

5. TITLE CASE FOR ALL DIAGNOSES
   Example: "Major Depressive Disorder" not "major depressive disorder"
   Example: "ADHD Combined Presentation" not "ADHD combined presentation"

6. PRESERVE DICTATED PUNCTUATION - When narrator says "comma" write comma, not period
   Example: "MDD comma recurrent comma mild" → "MDD, recurrent, mild"

7. MEDICATION FORMAT: Name Dosage (Frequency)
   Example: "Lexapro 20mg (one pill per day)"
   Example: "Jornay PM 60mg (QHS)"

8. ALWAYS USE mg NOT milligrams
   Example: "60 milligrams" → "60mg"

9. ADD LINE BREAKS BETWEEN SECTIONS
   Each ### section should have a blank line before it

10. SIGNATURE DATE = TODAY'S DATE (transcription date, not appointment date)

11. STANDARD PAIRINGS IN MSE: Always "suicidal or homicidal" together

12. USE "imminently" NOT "immediately" in risk assessment`;

    static EXAMPLES = [
        {
            input: "Sample progress note. Identification colon. John Smith is a 14 year old male with a history of ADHD and major depressive disorder. He is in the 7th grade. Next paragraph. Chief complaint follow up.",
            output: `### Identification
John Smith is a 14 year old male with a history of ADHD and Major Depressive Disorder. He is in the 7th grade.

### CC 
Follow-up`
        },
        {
            input: "problemist. ADHD improving comma partial control. Next line. Two. Major depressive disorder. Stable.",
            output: `### Problem List
1. ADHD – improving, partial control
2. Major Depressive Disorder – stable`
        },
        {
            input: "current medications. Lexapro 20 mg. In parentheses, one pill per day. Close parentheses. Comma. John APM. 60 mg. QHS.",
            output: `### Current Meds
1. Lexapro 20mg (one pill per day)
2. Jornay PM 60mg (QHS)`
        },
        {
            input: "Major depressive disorder comma recurrent comma mild comma in full remission comma F32.4",
            output: `Major Depressive Disorder, recurrent, mild, in full remission, F32.4`
        },
        {
            input: "Without suicidal ideation, plan or intent",
            output: `Without suicidal or homicidal ideation, plan, or intent`
        }
    ];

    static build(text) {
        const examples = this.EXAMPLES.map(ex => 
            `Input: "${ex.input}"\nOutput:\n${ex.output}`
        ).join('\n\n');

        // Get current date for signature
        const today = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        return `You are a medical transcription formatter. Your task is to convert raw medical dictation into a properly formatted medical note following the exact template structure provided.

${this.CRITICAL_RULES}

TEMPLATE STRUCTURE:
${this.TEMPLATE_STRUCTURE}

EXAMPLES:
${examples}

MEDICAL CORRECTIONS TO APPLY:
${JSON.stringify(this.MEDICAL_CORRECTIONS, null, 2)}

IMPORTANT REMINDERS:
- Include EVERY sentence - never omit content
- Keep original order within sections
- Use Title Case for all medical conditions
- Preserve exact dosing language (e.g., "one pill per day")
- Format medications as: Name Dosage (Frequency)
- Always convert "milligrams" to "mg"
- Preserve dictated punctuation (comma means comma, not period)
- Add line breaks between ### sections
- Use today's date (${today}) for signature
- Include "or homicidal" with "suicidal" in MSE
- Use "imminently" not "immediately" in risk assessment

Now format this raw dictation following the template exactly:

${text}

OUTPUT FORMAT:
Return ONLY the formatted medical note. Do not include any explanations, notes, or commentary.`;
    }

    static postProcess(text) {
        let processed = text;
        
        // Apply medical corrections
        Object.entries(this.MEDICAL_CORRECTIONS).forEach(([wrong, correct]) => {
            const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
            processed = processed.replace(regex, correct);
        });
        
        // Ensure proper header formatting (### not ## or #)
        processed = processed.replace(/^#{1,2}\s+(?=Identification|CC|Problem List|Current Meds|Interim History|Past Medical History|Social History|Family History|ROS|MSE|Risk Assessment|Assessment|Plan|Therapy Notes)/gm, '### ');
        
        // Ensure Title Case for medical conditions in key sections
        processed = processed.replace(/\b(major depressive disorder|Major depressive disorder)\b/g, 'Major Depressive Disorder');
        processed = processed.replace(/\b(adhd combined presentation|ADHD combined presentation)\b/gi, 'ADHD Combined Presentation');
        
        // Fix milligrams abbreviation
        processed = processed.replace(/(\d+)\s*milligrams?\b/gi, '$1mg');
        
        // Clean up any remaining dictation artifacts
        Object.entries(this.PUNCTUATION_RULES).forEach(([command, punct]) => {
            const regex = new RegExp(`\\s*\\b${command}\\b\\s*`, 'gi');
            processed = processed.replace(regex, punct === '.' || punct === ',' || punct === ':' || punct === ';' ? `${punct} ` : punct);
        });
        
        // Ensure line breaks between sections
        processed = processed.replace(/(### [^\n]+\n)([^#\n])/g, '$1\n$2');
        
        // Clean up spacing
        processed = processed.replace(/\s+([.,;:!?])/g, '$1');
        processed = processed.replace(/([.,;:!?])\s*([.,;:!?])/g, '$1');
        processed = processed.replace(/\n{3,}/g, '\n\n');
        
        // Fix signature date to today
        const today = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        processed = processed.replace(/(\*Signed by .+, MD)(,\s*MD)* on .+?\*/gi, `$1 on ${today}*`);
        
        return processed.trim();
    }
}

module.exports = { MedicalPromptV4 };
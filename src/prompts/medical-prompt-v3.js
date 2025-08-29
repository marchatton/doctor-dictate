/**
 * Medical Prompt Management System - Version 3.0
 * Based on template.md patterns
 */

class MedicalPromptV3 {
    static VERSION = "3.0";
    
    // Template structure from template.md
    static TEMPLATE_STRUCTURE = `
### Identification
{Patient demographics and history}

### CC 
Follow-up

### Problem List
1. {Diagnosis} – {stable, improving, worsening}
2. {Diagnosis} – {stable, improving, worsening}

### Current Meds
1. {Name} {Dosage} {Frequency}
2. {Name} {Dosage} {Frequency}

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
{Mental status exam paragraph}

### Risk Assessment
{Risk assessment paragraph}

### Assessment
- {Clinical assessment points}

### Plan
- Discussed diagnoses, clinical impressions, and treatment recommendations.
- {Treatment plan items}
- Follow-up in {X} weeks; MM/DD/YYYY.

### Therapy Notes
{Notes or "N/a"}

---

*Signed by {Name}, MD on MM/DD/YYYY*`;

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
        'thapra': 'Tarpara'
    };

    // Commands to process
    static COMMANDS = {
        'next paragraph': '\n\n',
        'next line': '\n',
        'new paragraph': '\n\n',
        'new line': '\n'
    };

    static EXAMPLES = [
        {
            input: "Sample progress note. Identification colon. John Smith is a 14 year old male with a history of ADHD and major depressive disorder. He is in the 7th grade. Next paragraph. Chief complaint follow up.",
            output: `### Identification
John Smith is a 14 year old male with a history of ADHD and major depressive disorder. He is in the 7th grade.

### CC 
Follow-up`
        },
        {
            input: "problemist. ADHD improving comma partial control. Next line. Two. Major depressive disorder. Stable.",
            output: `### Problem List
1. ADHD – improving, partial control
2. Major depressive disorder – stable`
        },
        {
            input: "current medications. Lexapro 20 mg. In parentheses, one pill per day. Close parentheses. Comma. John APM. 60 mg. QHS.",
            output: `### Current Meds
1. Lexapro 20mg daily
2. Jornay PM 60mg QHS`
        }
    ];

    static build(text) {
        const examples = this.EXAMPLES.map(ex => 
            `Input: "${ex.input}"\nOutput:\n${ex.output}`
        ).join('\n\n');

        return `You are a medical transcription formatter. Your task is to convert raw medical dictation into a properly formatted medical note following the exact template structure provided.

CRITICAL INSTRUCTIONS:
1. Use ### for ALL section headers (not # or ##)
2. Follow the exact section order from the template
3. Format medications as: Name Dosage Frequency
4. Convert all dictation commands (period, comma, colon, next line, etc.) to proper punctuation
5. Correct common transcription errors (e.g., "journey" -> "Jornay PM", "luxapro" -> "Lexapro")
6. Capitalize all medical abbreviations (ADHD, MDD, QHS, etc.)
7. Use numbered lists for Problem List and Current Meds
8. Use bullet points for other list sections
9. End with signature line using markdown italics

TEMPLATE STRUCTURE:
${this.TEMPLATE_STRUCTURE}

EXAMPLES:
${examples}

MEDICAL CORRECTIONS TO APPLY:
${JSON.stringify(this.MEDICAL_CORRECTIONS, null, 2)}

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
        
        // Clean up any remaining dictation artifacts
        Object.entries(this.PUNCTUATION_RULES).forEach(([command, punct]) => {
            const regex = new RegExp(`\\s*\\b${command}\\b\\s*`, 'gi');
            processed = processed.replace(regex, punct === '.' || punct === ',' || punct === ':' || punct === ';' ? `${punct} ` : punct);
        });
        
        // Clean up spacing
        processed = processed.replace(/\s+([.,;:!?])/g, '$1');
        processed = processed.replace(/([.,;:!?])\s*([.,;:!?])/g, '$1');
        processed = processed.replace(/\n{3,}/g, '\n\n');
        
        return processed.trim();
    }
}

module.exports = { MedicalPromptV3 };
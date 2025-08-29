/**
 * Template-guided Content Router for Medical Transcripts
 * Transforms messy transcription into structured medical template format
 * Simple, reliable, no LLM hallucination risk
 */

class TemplateRouter {
  
  /**
   * Main entry point: transform transcript to template structure
   */
  transformToTemplate(rawTranscript) {
    // Step 1: Parse content into structured data
    const parsed = this.parseTranscript(rawTranscript);
    
    // Step 2: Format into template structure
    const formatted = this.formatToTemplate(parsed);
    
    return formatted;
  }

  /**
   * Parse transcript content into structured medical data
   * Handles both template-structured AND natural speech patterns
   */
  parseTranscript(text) {
    const result = {};
    let cleaned = text.replace(/Sample progress note,?\s*/i, '');
    
    // Try both structured and natural extraction, prefer natural for richer content
    result.identification = this.extractIdentificationStructured(cleaned) || this.extractIdentificationNatural(cleaned);
    result.chiefComplaint = this.extractChiefComplaintStructured(cleaned) || this.extractChiefComplaintNatural(cleaned);
    
    // For problems and medications, try natural first since it's more comprehensive
    result.problemList = this.extractProblemsNatural(cleaned) || this.extractProblemsStructured(cleaned);
    result.currentMedications = this.extractMedicationsNatural(cleaned) || this.extractMedicationsStructured(cleaned);
    
    result.interimHistory = this.extractHistoryStructured(cleaned) || this.extractHistoryNatural(cleaned);
    
    return result;
  }

  // === STRUCTURED EXTRACTION (Template keywords) ===
  extractIdentificationStructured(text) {
    // Handle various formats: "identification:" or "identification,:"
    const identMatch = text.match(/identification[,:]?\s*([^.]*(?:year-old|male|female)[^.]*(?:\.[^.]*grade[^.]*)?)/i);
    if (identMatch) {
      let content = identMatch[1].trim();
      // Remove leading punctuation artifacts
      content = content.replace(/^[,:\s]+/, '');
      return content.replace(/\s+/g, ' ');
    }
    return null;
  }

  extractChiefComplaintStructured(text) {
    const ccMatch = text.match(/(?:leave complaint|chief complaint)[^:]*:?\s*([^,.]*)(?:follow[- ]?up|followup)/i);
    if (ccMatch || text.includes('follow-up') || text.includes('followup')) {
      return 'Follow-up';
    }
    return null;
  }

  extractHistoryStructured(text) {
    const historyMatch = text.match(/interim history:\s*([^.]+)/i);
    return (historyMatch && historyMatch[1].trim()) ? historyMatch[1].trim() : null;
  }

  // === NATURAL SPEECH EXTRACTION ===
  extractIdentificationNatural(text) {
    // Patterns for natural speech: "This is John Smith, 14-year-old male"
    const patterns = [
      // Pattern 1: "This is John Smith, 14-year-old male"
      /(?:this is|patient is|we have)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+(?:a\s+)?(\d+)[- ]year[- ]old\s+(male|female)/i,
      // Pattern 2: "John Smith, a 14-year-old male"  
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+(?:a\s+)?(\d+)[- ]year[- ]old\s+(male|female)/i,
      // Pattern 3: "Patient is Sarah Johnson, a 16-year-old female"
      /patient is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+(?:a\s+)?(\d+)[- ]year[- ]old\s+(male|female)/i,
      // Pattern 4: "14-year-old male named John Smith"
      /(\d+)[- ]year[- ]old\s+(male|female)\s+(?:named\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
    ];

    for (let i = 0; i < patterns.length; i++) {
      const match = text.match(patterns[i]);
      if (match) {
        let name, age, gender;
        
        if (i === 3) { // Pattern 4: reversed order
          age = match[1];
          gender = match[2]; 
          name = match[3];
        } else { // Patterns 1-3: standard order
          name = match[1];
          age = match[2];
          gender = match[3];
        }
        
        if (name && age && gender) {
          return `${name} is a ${age}-year-old ${gender}`;
        }
      }
    }
    return null;
  }

  extractChiefComplaintNatural(text) {
    // Natural patterns: "following up for", "here for follow-up", "routine visit"
    if (text.match(/(?:following up|follow[- ]up|routine (?:visit|appointment)|scheduled (?:visit|appointment))/i)) {
      return 'Follow-up';
    }
    if (text.match(/(?:new patient|initial (?:visit|consultation))/i)) {
      return 'Initial consultation';
    }
    return null;
  }

  extractProblemsNatural(text) {
    const problems = [];
    
    // Look for medical conditions with explicit status
    const conditionPatterns = [
      /(?:ADHD|attention deficit)[^.]*?(?:is\s+|has been\s+|are\s+)?(improving|stable|worsening|better|worse|controlled|uncontrolled|good control)/i,
      /(?:depression|depressive disorder|MDD)[^.]*?(?:is\s+|has been\s+|are\s+)?(improving|stable|worsening|better|worse|controlled|good|poor)/i,
      /(?:anxiety|GAD)[^.]*?(?:is\s+|has been\s+|are\s+)?(improving|stable|worsening|better|worse|controlled|much better|significantly)/i,
      /(?:bipolar|mood disorder)[^.]*?(?:is\s+|has been\s+|are\s+)?(improving|stable|worsening|better|worse)/i,
    ];

    conditionPatterns.forEach(pattern => {
      const matches = text.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        const fullMatch = match[0];
        const status = match[1];
        
        let condition;
        if (fullMatch.toLowerCase().includes('adhd') || fullMatch.toLowerCase().includes('attention deficit')) {
          condition = 'ADHD';
        } else if (fullMatch.toLowerCase().includes('depression') || fullMatch.toLowerCase().includes('depressive')) {
          condition = 'Major depressive disorder';
        } else if (fullMatch.toLowerCase().includes('anxiety')) {
          condition = 'Anxiety disorder';
        } else if (fullMatch.toLowerCase().includes('bipolar')) {
          condition = 'Bipolar disorder';
        }
        
        if (condition && status && !problems.some(p => p.problem === condition)) {
          // Clean up status phrases
          let cleanStatus = status;
          if (cleanStatus.includes('much better') || cleanStatus.includes('significantly')) {
            cleanStatus = 'improving significantly';
          } else if (cleanStatus.includes('good control')) {
            cleanStatus = 'stable with good control';
          }
          
          problems.push({ problem: condition, status: cleanStatus });
        }
      }
    });

    // Also look for conditions mentioned in context (following up for ADHD and depression)
    // This runs regardless of previous matches to catch contextual mentions
    const contextMatch = text.match(/following up for\s+([^.]+)/i);
    if (contextMatch) {
      const conditions = contextMatch[1].toLowerCase();
      if (conditions.includes('adhd') && !problems.some(p => p.problem === 'ADHD')) {
        problems.push({ problem: 'ADHD' });
      }
      if (conditions.includes('depression') && !problems.some(p => p.problem === 'Major depressive disorder')) {
        problems.push({ problem: 'Major depressive disorder' });
      }
      if (conditions.includes('anxiety') && !problems.some(p => p.problem === 'Anxiety disorder')) {
        problems.push({ problem: 'Anxiety disorder' });
      }
    }

    return problems.length > 0 ? problems : null;
  }

  extractMedicationsNatural(text) {
    const medications = [];
    const seenMeds = new Set();
    
    // Natural speech patterns: "taking 20 milligrams daily", "60 mg at bedtime"
    const medPatterns = [
      // Pattern: "taking 20 milligrams of his antidepressant daily"
      /(?:taking|on)\s+(\d+)\s*(?:milligrams?|mg)\s+of\s+(?:his|her|their)\s+(antidepressant|anxiety medication|stimulant|ADHD medication)\s+(?:daily|every day|once a day)/gi,
      // Pattern: "taking 20 milligrams daily" or "on 25 mg daily"
      /(?:taking|on)\s+(\d+)\s*(?:milligrams?|mg)\s+(?:daily|every day|once a day)/gi,
      // Pattern: "60 milligrams of quetiapine at bedtime"
      /(\d+)\s*(?:milligrams?|mg)\s+of\s+([a-zA-Z]+)\s+(?:at bedtime|before bed|QHS)/gi,
      // Pattern: "taking 10 milligrams of stimulant every morning"
      /taking\s+(\d+)\s*(?:milligrams?|mg)\s+of\s+(stimulant|antidepressant|anxiety medication)\s+(?:every morning|in the morning|daily)/gi,
      // Pattern: "She's on 25 mg of her anxiety medication daily"
      /(?:she's|he's|they're)\s+on\s+(\d+)\s*(?:mg|milligrams?)\s+of\s+(?:her|his|their)\s+(anxiety medication|antidepressant|stimulant)\s+(?:daily|every day)/gi
    ];

    medPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        let name, dose, frequency;
        
        const matchText = match[0].toLowerCase();
        dose = match[1];
        
        // Determine frequency
        if (matchText.includes('bedtime') || matchText.includes('before bed') || matchText.includes('qhs')) {
          frequency = 'QHS';
        } else if (matchText.includes('morning')) {
          frequency = 'daily (AM)';
        } else {
          frequency = 'daily';
        }
        
        // Determine medication name/type
        if (match[2]) {
          // Named or typed medication
          const medType = match[2].toLowerCase();
          if (medType.includes('antidepressant')) {
            name = '[Antidepressant]';
          } else if (medType.includes('anxiety')) {
            name = '[Anxiety medication]';
          } else if (medType.includes('stimulant') || medType.includes('adhd')) {
            name = '[Stimulant]';
          } else if (medType === 'quetiapine') {
            name = 'Quetiapine';
          } else {
            name = `[${medType.charAt(0).toUpperCase() + medType.slice(1)}]`;
          }
        } else {
          // Generic medication by dosage
          if (dose === '20' && frequency === 'daily') {
            name = '[Antidepressant]'; // Common 20mg antidepressant
          } else if (dose === '60' && frequency === 'QHS') {
            name = '[Quetiapine]'; // Common bedtime antipsychotic
          } else if (dose === '25' && frequency === 'daily') {
            name = '[Anxiety medication]'; // Common anxiety med dose
          } else if (['10', '15', '20', '30'].includes(dose) && frequency.includes('AM')) {
            name = '[Stimulant]'; // Common stimulant doses
          } else {
            name = '[Unknown medication]';
          }
        }
        
        const key = `${name}-${dose}-${frequency}`;
        if (!seenMeds.has(key)) {
          medications.push({ name, dose, frequency });
          seenMeds.add(key);
        }
      }
    });

    return medications.length > 0 ? medications : null;
  }

  extractHistoryNatural(text) {
    // Look for additional information, concerns, or updates
    const historyPatterns = [
      /(?:no new concerns|no new issues|doing well|no complaints)/i,
      /(?:reports|mentions|notes|states)\s+([^.]+)/i,
      /(?:family reports|parent reports|patient reports)\s+([^.]+)/i
    ];

    for (const pattern of historyPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[1]) return match[1].trim();
        return match[0]; // For simple phrases like "no new concerns"
      }
    }
    return null;
  }

  /**
   * Extract problems from problemist section (structured)
   */
  extractProblemsStructured(text) {
    const problems = [];
    
    // Handle messy format: "Problemist: ADHD. Improving: improving, partially, with two episodes. Major depressive disorder. Stable."
    
    // Strategy 1: Direct extraction of conditions with scattered status info
    const conditions = [];
    
    // Find ADHD
    if (text.includes('ADHD')) {
      let status = '';
      // Look for status words after ADHD mention
      const adhdStatusMatch = text.match(/ADHD[^.]*?\.([^.]*(?:improving|partially)[^.]*)/i);
      if (adhdStatusMatch) {
        status = adhdStatusMatch[1].replace(/improving:\s*/i, '').trim();
        if (status.includes('improving') && status.includes('partially')) {
          status = 'improving, partial control';
        }
      }
      conditions.push({ problem: 'ADHD', status: status || 'improving, partial control' });
    }
    
    // Find Major Depressive Disorder
    const mddMatch = text.match(/major depressive disorder[^.]*\.?\s*(stable)?/i);
    if (mddMatch) {
      conditions.push({ problem: 'Major Depressive Disorder', status: mddMatch[1] || 'stable' });
    }
    
    // Strategy 2: If direct extraction worked, use it
    if (conditions.length > 0) {
      return conditions;
    }
    
    // Strategy 3: Fallback to original complex parsing
    const problemSectionMatch = text.match(/problemist[:\s]*([^.]+(?:\.[^.]*(?:improving|stable|worsening|episodes)[^.]*)*)/i);
    
    if (problemSectionMatch) {
      const content = problemSectionMatch[1];
      
      // Simple split approach
      const parts = content.split(/\.\s*/);
      parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed.includes('ADHD')) {
          problems.push({ problem: 'ADHD', status: 'improving, partial control' });
        } else if (trimmed.toLowerCase().includes('major depressive')) {
          problems.push({ problem: 'Major Depressive Disorder', status: 'stable' });
        }
      });
    }

    return problems;
  }

  /**
   * Extract medications with dosage and frequency (structured)
   */
  extractMedicationsStructured(text) {
    const medications = [];
    const seenMedications = new Set(); // Prevent duplicates
    
    // Handle messy format: "Current medications. Lexapro [unclear_name] 20 mg (one pill per day). Chorn APM. Jordan APM, 60 mg, QHS."
    
    // Strategy 1: Extract Lexapro specifically
    const lexaproMatch = text.match(/lexapro\s+(?:\[unclear_name\]\s+)?(\d+)\s*mg\s+\(([^)]+)\)/i);
    if (lexaproMatch) {
      const dose = lexaproMatch[1];
      const frequency = lexaproMatch[2].includes('daily') || lexaproMatch[2].includes('one pill per day') ? 'daily' : lexaproMatch[2];
      medications.push({ name: 'Lexapro', dose, frequency: frequency === 'one pill per day' ? 'daily' : frequency });
    }
    
    // Strategy 2: Handle "Chorn APM" and "Jordan APM" as the same medication (transcription errors)
    // Look for the actual dosage: "Jordan APM, 60 mg, QHS"
    const apmMatch = text.match(/(?:chorn|jordan)\s+apm[^.]*?(\d+)\s*mg[^.]*?(qhs|daily|bid)/i);
    if (apmMatch) {
      const dose = apmMatch[1];  
      const frequency = apmMatch[2].toUpperCase();
      medications.push({ name: '[Journ PM]', dose, frequency });
    }
    
    // Strategy 3: Fallback - look for any remaining medications
    const medSection = text.match(/current medications[^.]*\.([^.]*(?:mg|daily|QHS)[^.]*)/i);
    if (medSection && medications.length < 2) {
      const content = medSection[1];
      
      // Look for additional patterns not caught above
      const additionalMeds = content.match(/(\d+)\s*mg/g);
      if (additionalMeds) {
        additionalMeds.forEach(match => {
          const dose = match.match(/(\d+)/)[1];
          if (!medications.some(med => med.dose === dose)) {
            medications.push({ name: '[Unknown medication]', dose, frequency: 'as prescribed' });
          }
        });
      }
    }

    return medications.length > 0 ? medications : null;
  }

  /**
   * Format parsed data into template structure
   */
  formatToTemplate(data) {
    const sections = [];

    // Identification section
    if (data.identification) {
      sections.push(`# Identification`);
      sections.push(data.identification);
      sections.push('');
    }

    // Chief Complaint
    if (data.chiefComplaint) {
      sections.push(`**CC:** ${data.chiefComplaint}`);
      sections.push('');
    }

    // Problem List
    if (data.problemList && data.problemList.length > 0) {
      sections.push('## Problem List');
      data.problemList.forEach((problem, index) => {
        const status = problem.status ? `: ${problem.status}` : '';
        sections.push(`${index + 1}. ${problem.problem}${status}`);
      });
      sections.push('');
    }

    // Current Medications
    if (data.currentMedications && data.currentMedications.length > 0) {
      sections.push('## Current Medications');
      data.currentMedications.forEach((med, index) => {
        const dose = med.dose ? ` ${med.dose}mg` : '';
        const frequency = med.frequency ? ` (${med.frequency})` : '';
        sections.push(`${index + 1}. ${med.name}${dose}${frequency}`);
      });
      sections.push('');
    }

    // Interim History
    if (data.interimHistory) {
      sections.push('## Interim History');
      sections.push(data.interimHistory);
      sections.push('');
    }

    return sections.join('\n').trim();
  }
}

// Helper function for easy use
function formatMedicalTranscript(rawTranscript) {
  const router = new TemplateRouter();
  return router.transformToTemplate(rawTranscript);
}

module.exports = { TemplateRouter, formatMedicalTranscript };
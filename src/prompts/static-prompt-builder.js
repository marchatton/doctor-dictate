#!/usr/bin/env node

/**
 * Static Prompt Builder
 * Generates a comprehensive static prompt from template files and medical dictionary
 * Run manually: pnpm run build-prompt
 */

const fs = require('fs');
const path = require('path');

class StaticPromptBuilder {
  constructor() {
    this.basePath = path.dirname(__dirname);
    this.outputDir = path.join(__dirname, 'compiled');

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Load all required files
   */
  loadResources() {
    console.log('📚 Loading resources...');

    // 1. Load medical dictionary
    const dictionary = require('../data/medical-dictionary');
    console.log('  ✓ Medical dictionary loaded');

    // 2. Load template JSON
    const templateJson = require('../templates/format/medicine-management.json');
    console.log('  ✓ Template JSON loaded');

    // 3. Load example MD
    const exampleMdPath = path.join(this.basePath, 'templates/example/medicine-management.md');
    const exampleMd = fs.readFileSync(exampleMdPath, 'utf8');
    console.log('  ✓ Example MD loaded');

    return { dictionary, templateJson, exampleMd };
  }

  /**
   * Build corrections section from dictionary
   */
  buildCorrections(dictionary) {
    const sections = [];

    // Medication corrections
    const medCorrections = Object.entries(dictionary.corrections.medications || {})
      .map(([wrong, right]) => `  "${wrong}" → "${right}"`)
      .join('\n');

    sections.push(`Medication name corrections:
${medCorrections}`);

    // Abbreviation corrections
    const abbrevCorrections = Object.entries(dictionary.corrections.abbreviations || {})
      .map(([lower, upper]) => `  "${lower}" → "${upper}"`)
      .join('\n');

    sections.push(`Abbreviations (always uppercase):
${abbrevCorrections}`);

    // Capitalization rules
    if (dictionary.capitalizations) {
      sections.push(`Always capitalize these conditions:
${dictionary.capitalizations.map(c => `  - ${c}`).join('\n')}`);
    }

    // Preservation rules
    if (dictionary.preservationRules) {
      sections.push(`Critical preservation rules:
  - ${dictionary.preservationRules.medications}
  - ${dictionary.preservationRules.dosing}
  - ${dictionary.preservationRules.format}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Build section-specific formatting rules
   */
  buildSectionRules(templateJson) {
    const sections = [];

    for (const section of templateJson.sections) {
      const rules = [];

      // Header
      rules.push(`=== ${section.title} ===`);
      rules.push(`Required: ${section.required ? 'Yes' : 'No'}`);
      rules.push(`Format: ${section.format}`);

      // Item format if applicable
      if (section.itemFormat) {
        rules.push(`Item Format: "${section.itemFormat}"`);
      }

      // Examples
      if (section.example) {
        if (Array.isArray(section.example)) {
          rules.push(`Examples:`);
          section.example.forEach((ex, i) => {
            rules.push(`  ${i + 1}. ${ex}`);
          });
        } else {
          rules.push(`Example: "${section.example}"`);
        }
      }

      // Pattern hints for section detection
      if (section.patterns && section.patterns.length > 0) {
        const patternHints = section.patterns
          .map(p => p.replace(/[\^\\]/g, ''))
          .join('", "');
        rules.push(`Listen for: "${patternHints}"`);
      }

      // Template-specific rules
      if (section.templateSpecific && section.templateSpecific.length > 0) {
        rules.push(`Special rules:`);
        section.templateSpecific.forEach(rule => {
          rules.push(`  - ${rule}`);
        });
      }

      // Critical rules for specific sections
      if (section.id === 'problem-list') {
        rules.push(`CRITICAL: Include ALL text after the diagnosis including status, do not omit anything`);
      }

      if (section.id === 'current-meds') {
        rules.push(`CRITICAL: ONLY list medications that were explicitly mentioned, NEVER add others`);
        rules.push(`CRITICAL: Do NOT add Vyvanse, Adderall, or other ADHD meds unless specifically stated`);
      }

      sections.push(rules.join('\n'));
    }

    // Add template-specific rules
    if (templateJson.templateSpecificRules) {
      sections.push('\n=== TEMPLATE-SPECIFIC RULES ===');
      templateJson.templateSpecificRules.forEach(rule => {
        sections.push(`${rule.section}: ${rule.rule}`);
      });
    }

    return sections.join('\n\n');
  }

  /**
   * Extract clean example from MD file
   */
  extractExample(exampleMd) {
    // Parse the MD to create a simulated input/output
    const lines = exampleMd.split('\n');
    const sections = [];
    let currentSection = null;

    // Extract actual content (skip comments and metadata)
    for (const line of lines) {
      if (line.startsWith('###')) {
        currentSection = line.replace('###', '').trim();
        sections.push({ name: currentSection, content: [] });
      } else if (currentSection && line.trim() && !line.startsWith('<!--') && !line.includes('{X}')) {
        const current = sections[sections.length - 1];
        if (current) {
          // Clean up example text
          const cleaned = line
            .replace(/^\d+\.\s*/, '') // Remove numbering
            .replace(/^-\s*/, '')      // Remove bullet points
            .trim();
          if (cleaned && !cleaned.includes('{') && cleaned !== 'N/a') {
            current.content.push(cleaned);
          }
        }
      }
    }

    // Build simulated raw input
    const rawInput = sections
      .filter(s => ['Identification', 'CC', 'Problem List', 'Current Meds'].includes(s.name))
      .map(s => {
        const sectionName = s.name.toLowerCase().replace(' ', ' ');
        const content = s.content.join(' ').toLowerCase()
          .replace(/[–-]/g, '') // Remove dashes
          .replace(/[()]/g, '') // Remove parentheses
          .replace(/\./g, ' period')
          .replace(/,/g, ' comma');
        return `${sectionName} ${content}`;
      })
      .join(' ');

    // Use first few sections as example output
    const exampleOutput = sections
      .filter(s => ['Identification', 'CC', 'Problem List', 'Current Meds'].includes(s.name))
      .map(s => {
        let content = '';
        if (s.name === 'Problem List' || s.name === 'Current Meds') {
          content = s.content.map((item, i) => `${i + 1}. ${item}`).join('\n');
        } else {
          content = s.content.join('\n');
        }
        return `### ${s.name}\n${content}`;
      })
      .join('\n\n');

    return { input: rawInput || this.getDefaultInput(), output: exampleOutput || this.getDefaultOutput() };
  }

  /**
   * Default input example if extraction fails
   */
  getDefaultInput() {
    return `identification john smith fourteen year old male history of adhd and major depressive disorder he's in the seventh grade chief complaint follow up problem list adhd improving partial control major depressive disorder stable current medications lexapro twenty milligrams daily jornay pm sixty milligrams qhs`;
  }

  /**
   * Default output example if extraction fails
   */
  getDefaultOutput() {
    return `### Identification
John Smith is a 14 year old male with a history of ADHD and Major Depressive Disorder. He's in the seventh grade.

### CC
Follow-up

### Problem List
1. ADHD – improving, partial control
2. Major Depressive Disorder – stable

### Current Meds
1. Lexapro 20mg (daily)
2. Jornay PM 60mg (QHS)`;
  }

  /**
   * Build the complete static prompt
   */
  buildPrompt(resources) {
    const { dictionary, templateJson, exampleMd } = resources;

    console.log('🔨 Building prompt sections...');

    // Extract components
    const corrections = this.buildCorrections(dictionary);
    const sectionRules = this.buildSectionRules(templateJson);
    const example = this.extractExample(exampleMd);
    const exampleInput = example.input || this.getDefaultInput();
    const exampleOutput = example.output || this.getDefaultOutput();

    // Build complete prompt
    const prompt = `You are a medical note formatter. Convert the raw medical dictation below into a properly formatted clinical note.

CRITICAL RULES - MUST FOLLOW:
1. NEVER hallucinate or add content that wasn't dictated
2. ONLY include sections that were explicitly mentioned in the dictation
3. DO NOT add sections that weren't mentioned (no "No X provided" statements)
4. DO NOT use information from the example - the example is ONLY to show format
5. Preserve ALL dictated information exactly - do not omit anything
6. Use ### for section headers
7. Follow the exact formatting rules for each section
8. When unclear about medication names, mark with {unclear: transcription}

CORRECTIONS TO APPLY:
${corrections}

SECTION-BY-SECTION FORMATTING RULES:
${sectionRules}

FORMATTING STANDARDS:
- Section headers: Use "###" followed by space and section name
- Problem List: Numbered list with format "{Diagnosis} – {status/description}"
- Current Meds: Numbered list with format "{Name} {Dosage} ({Frequency})"
- Lists: Use "1. ", "2. ", etc. for numbered lists
- Preserve exact medication names and dosages as dictated
- Include all status information after diagnoses

CRITICAL CONSTRAINTS:
1. MEDICATION RULE: Only include medications explicitly mentioned. Never add common medications like Vyvanse, Adderall, Concerta unless specifically stated
2. PROBLEM STATUS RULE: Always include the full status/description after each diagnosis (e.g., "improving, partial control")
3. COUNTING RULE: If 2 medications are mentioned, output exactly 2, not more
4. ORDER RULE: Preserve the exact order of problems and medications as dictated
5. NO DEFAULTS: Do not add default text for sections not mentioned
6. NO HALLUCINATION: Do not add age, grade, or other details unless explicitly stated
7. ONLY MENTIONED SECTIONS: If a section wasn't mentioned in the input, DO NOT include it

SECTION DETECTION HINTS:
- "problemist" or "problem list" → ### Problem List
- "current meds" or "current medications" → ### Current Meds
- "identification" or patient introduction → ### Identification
- "chief complaint" or "cc" or "follow up" → ### CC
- "interim history" or "interim" → ### Interim History

EXAMPLE (DO NOT COPY - ONLY FOR FORMAT REFERENCE):
IF INPUT WAS: "${exampleInput}"

THEN OUTPUT WOULD BE:
${exampleOutput}

NOTICE: Only sections mentioned in input are included. No extra diagnoses, medications, or details added.

NOW PROCESS THIS EXACT INPUT (DO NOT USE EXAMPLE DATA):
[INSERT_DICTATION_HERE]

REMEMBER:
- ONLY include what's in the above input
- DO NOT add information from the example
- DO NOT add sections not mentioned
- DO NOT hallucinate details

BEGIN YOUR OUTPUT WITH THE FIRST SECTION HEADER (###):`;

    console.log('  ✓ Prompt built successfully');
    console.log(`  📊 Prompt length: ${prompt.length} characters`);

    return prompt;
  }

  /**
   * Save prompt to file
   */
  savePrompt(prompt) {
    const outputPath = path.join(this.outputDir, 'medicine-management-prompt.txt');
    fs.writeFileSync(outputPath, prompt, 'utf8');
    console.log(`\n✅ Static prompt saved to: ${outputPath}`);

    // Also save metadata
    const metadata = {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      template: 'medicine-management',
      promptLength: prompt.length,
      sections: prompt.split('===').length - 1
    };

    const metadataPath = path.join(this.outputDir, 'prompt-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    console.log(`📋 Metadata saved to: ${metadataPath}`);
  }

  /**
   * Main build process
   */
  build() {
    console.log('🚀 Static Prompt Builder v1.0.0\n');

    try {
      // Load resources
      const resources = this.loadResources();

      // Build prompt
      const prompt = this.buildPrompt(resources);

      // Save to file
      this.savePrompt(prompt);

      console.log('\n📝 Summary:');
      console.log(`  - Sections defined: ${resources.templateJson.sections.length}`);
      console.log(`  - Corrections loaded: ${Object.keys(resources.dictionary.corrections.medications).length} medications`);
      console.log(`  - Prompt size: ${(prompt.length / 1024).toFixed(1)} KB`);
      console.log('\n✨ Build complete! Run with: pnpm run build-prompt');

    } catch (error) {
      console.error('\n❌ Build failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const builder = new StaticPromptBuilder();
  builder.build();
}

module.exports = StaticPromptBuilder;

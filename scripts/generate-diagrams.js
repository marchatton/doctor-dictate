#!/usr/bin/env node

/**
 * Generate Mermaid diagrams as images
 * Requires: npm install -g @mermaid-js/mermaid-cli
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docsDir = path.join(__dirname, '..', 'docs', 'specs');
const outputDir = path.join(docsDir, 'diagrams');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Extract Mermaid diagrams from the markdown file
const markdownFile = path.join(docsDir, 'system-architecture.md');
const content = fs.readFileSync(markdownFile, 'utf8');

// Find all mermaid code blocks
const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
let match;
let diagramIndex = 0;

while ((match = mermaidRegex.exec(content)) !== null) {
  const diagramCode = match[1];
  const diagramName = `diagram-${diagramIndex + 1}.mmd`;
  const diagramPath = path.join(outputDir, diagramName);
  
  // Write the diagram code to a .mmd file
  fs.writeFileSync(diagramPath, diagramCode);
  
  console.log(`Created ${diagramName}`);
  diagramIndex++;
}

console.log(`\nExtracted ${diagramIndex} Mermaid diagrams to ${outputDir}`);
console.log('\nTo generate images, run:');
console.log('npm install -g @mermaid-js/mermaid-cli');
console.log(`mmdc -i ${outputDir}/diagram-1.mmd -o ${outputDir}/architecture-overview.png`);
console.log(`mmdc -i ${outputDir}/diagram-2.mmd -o ${outputDir}/processing-pipeline.png`);
console.log(`mmdc -i ${outputDir}/diagram-3.mmd -o ${outputDir}/component-architecture.png`);
console.log(`mmdc -i ${outputDir}/diagram-4.mmd -o ${outputDir}/service-layer.png`);
console.log(`mmdc -i ${outputDir}/diagram-5.mmd -o ${outputDir}/prompt-system.png`);
console.log(`mmdc -i ${outputDir}/diagram-6.mmd -o ${outputDir}/data-flow.png`);
console.log(`mmdc -i ${outputDir}/diagram-7.mmd -o ${outputDir}/prompt-generation.png`);
console.log(`mmdc -i ${outputDir}/diagram-8.mmd -o ${outputDir}/error-handling.png`);

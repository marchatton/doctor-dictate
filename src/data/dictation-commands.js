/**
 * Dictation Commands Dictionary
 * Maps spoken commands to their text/formatting equivalents
 */

const dictationCommands = {
  punctuation: {
    // Basic punctuation
    "period": ".",
    "full stop": ".",
    "comma": ",",
    "colon": ":",
    "semicolon": ";",
    "question mark": "?",
    "exclamation mark": "!",
    "exclamation point": "!",
    
    // Dashes and hyphens
    "dash": "–",
    "hyphen": "-",
    "em dash": "—",
    "en dash": "–",
    
    // Quotes
    "open quote": '"',
    "close quote": '"',
    "single quote": "'",
    "apostrophe": "'",
    "open quotes": '"',
    "close quotes": '"',
    
    // Slashes
    "slash": "/",
    "forward slash": "/",
    "backslash": "\\"
  },
  
  formatting: {
    // Paragraph and line breaks
    "new paragraph": "\n\n",
    "next paragraph": "\n\n",
    "new line": "\n",
    "next line": "\n",
    "line break": "\n",
    
    // List formatting
    "bullet point": "• ",
    "bullet": "• ",
    "dash point": "- ",
    "new bullet": "\n• ",
    "next bullet": "\n• ",
    
    // Numbered lists
    "number one": "1. ",
    "number two": "2. ",
    "number three": "3. ",
    "number four": "4. ",
    "number five": "5. ",
    "number six": "6. ",
    "number seven": "7. ",
    "number eight": "8. ",
    "number nine": "9. ",
    "number ten": "10. ",
    "new item": "\n{next_number}. ",
    "next item": "\n{next_number}. ",
    "numbered list": "1. ",
    
    // Indentation
    "indent": "\t",
    "tab": "\t",
    "new section": "\n\n### ",
    "next section": "\n\n### "
  },
  
  parenthetical: {
    "open paren": "(",
    "close paren": ")",
    "open parenthesis": "(",
    "close parenthesis": ")",
    "open parentheses": "(",
    "close parentheses": ")",
    "in parentheses": "(...)",
    "open bracket": "[",
    "close bracket": "]",
    "open brace": "{",
    "close brace": "}"
  },
  
  special: {
    // Medical specific
    "milligrams": "mg",
    "milligram": "mg",
    "micrograms": "mcg",
    "microgram": "mcg",
    "milliliters": "ml",
    "milliliter": "ml",
    "percent": "%",
    "degree": "°",
    "degrees": "°",
    
    // Common symbols
    "at sign": "@",
    "and sign": "&",
    "ampersand": "&",
    "number sign": "#",
    "hashtag": "#",
    "dollar sign": "$",
    "percent sign": "%",
    "plus sign": "+",
    "minus sign": "-",
    "equal sign": "=",
    "asterisk": "*",
    "star": "*"
  },
  
  corrections: {
    // Common speech recognition errors
    "new lime": "new line",
    "next lime": "next line",
    "full stock": "full stop",
    "common": "comma",
    "calling": "colon",
    "semi colon": "semicolon",
    "open quote": '"',
    "clothes quote": '"',
    "in parenthesis": "in parentheses"
  }
};

/**
 * Apply dictation commands to text
 * @param {string} text - Input text with dictation commands
 * @returns {string} - Text with commands converted to formatting
 */
function applyDictationCommands(text) {
  let processed = text;
  
  // Apply all command categories
  for (const category of Object.values(dictationCommands)) {
    for (const [command, replacement] of Object.entries(category)) {
      // Create regex that matches the command as a standalone phrase
      // Case insensitive, with word boundaries
      const regex = new RegExp(`\\b${command}\\b`, 'gi');
      processed = processed.replace(regex, replacement);
    }
  }
  
  // Handle numbered list continuation
  let listCounter = 1;
  processed = processed.replace(/\{next_number\}/g, () => {
    return ++listCounter;
  });
  
  return processed;
}

/**
 * Get context-aware replacement
 * Some commands need context (e.g., "period" at end of sentence vs "interim period")
 */
function getContextAwareReplacement(text, position, command) {
  // Special handling for "period"
  if (command === "period") {
    // Check if it's part of a medical term
    const beforeText = text.substring(Math.max(0, position - 20), position);
    const afterText = text.substring(position, Math.min(text.length, position + 20));
    
    // Don't replace if part of medical terms
    if (beforeText.match(/\b(interim|course|menstrual|incubation|latent)\s+$/i)) {
      return null; // Don't replace
    }
    
    // Replace if at end of sentence-like position
    if (afterText.match(/^\s*([A-Z]|$)/)) {
      return ".";
    }
  }
  
  return null;
}

module.exports = {
  dictationCommands,
  applyDictationCommands,
  getContextAwareReplacement
};
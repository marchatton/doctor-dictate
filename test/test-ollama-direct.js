#!/usr/bin/env node

/**
 * Direct test of Ollama with a simple prompt
 */

async function testOllamaDirect() {
    console.log('Testing Ollama with mistral:latest...\n');
    
    const simplePrompt = `Format this medical note with proper headers:

Identification: John Smith, 14-year-old male with ADHD and depression.
Chief complaint: Follow-up.
Problem list: 1) ADHD improving, 2) Depression stable.
Current medications: Lexapro 20mg, Jornay PM 60mg.
Interim history: ADHD in fair control.

Output the formatted note with ### headers:`;

    console.log('Sending prompt (length:', simplePrompt.length, 'chars)');
    
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2:latest',
                prompt: simplePrompt,
                stream: false,
                options: {
                    temperature: 0.1,
                    num_predict: 2000,
                    num_ctx: 4096
                }
            })
        });
        
        if (!response.ok) {
            console.error('Error:', response.status, response.statusText);
            return;
        }
        
        const data = await response.json();
        console.log('\nResponse received!');
        console.log('Response length:', data.response?.length || 0, 'chars');
        console.log('Done reason:', data.done_reason || 'unknown');
        console.log('\nFormatted output:');
        console.log('---START---');
        console.log(data.response);
        console.log('---END---');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testOllamaDirect().catch(console.error);
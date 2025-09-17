#!/usr/bin/env node

/**
 * Check available Ollama models and their sizes
 */

async function checkModels() {
    console.log('=' .repeat(80));
    console.log('🤖 CHECKING AVAILABLE OLLAMA MODELS');
    console.log('=' .repeat(80));
    
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (!response.ok) {
            console.error('❌ Failed to fetch models');
            return;
        }
        
        const data = await response.json();
        const models = data.models || [];
        
        console.log('\n📊 AVAILABLE MODELS:');
        console.log('-'.repeat(80));
        
        for (const model of models) {
            const sizeGB = (model.size / (1024 * 1024 * 1024)).toFixed(2);
            const sizeMB = (model.size / (1024 * 1024)).toFixed(0);
            console.log(`\n📦 ${model.name}`);
            console.log(`   Size: ${sizeGB} GB (${sizeMB} MB)`);
            console.log(`   Modified: ${new Date(model.modified_at).toLocaleString()}`);
            
            // Extract parameter count from name if present
            if (model.name.includes(':')) {
                const parts = model.name.split(':');
                console.log(`   Version/Size: ${parts[1]}`);
            }
        }
        
        console.log('\n' + '-'.repeat(80));
        console.log(`Total models: ${models.length}`);
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS FOR MEDICAL FORMATTING:');
        console.log('-'.repeat(80));
        
        const recommendations = [
            { name: 'qwen2.5:3b', description: '3B parameters - Good balance of speed and quality' },
            { name: 'qwen2.5:7b', description: '7B parameters - Better comprehension of complex prompts' },
            { name: 'llama3.2:3b', description: '3B parameters - Alternative to Qwen' },
            { name: 'mistral:7b', description: '7B parameters - Excellent for structured tasks' },
            { name: 'phi3:medium', description: '14B parameters - Microsoft model, good for technical content' }
        ];
        
        console.log('\nRecommended models for complex medical prompts:');
        for (const rec of recommendations) {
            const installed = models.some(m => m.name.startsWith(rec.name.split(':')[0]));
            console.log(`${installed ? '✅' : '❌'} ${rec.name} - ${rec.description}`);
        }
        
        // Check which larger models to install
        const installedNames = models.map(m => m.name);
        const missingLarger = recommendations.filter(r => 
            !installedNames.some(n => n.startsWith(r.name.split(':')[0]))
        );
        
        if (missingLarger.length > 0) {
            console.log('\n📥 TO INSTALL LARGER MODELS:');
            console.log('-'.repeat(80));
            for (const model of missingLarger) {
                console.log(`ollama pull ${model.name}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ CHECK COMPLETE');
    console.log('='.repeat(80));
}

// Run the check
checkModels().catch(console.error);
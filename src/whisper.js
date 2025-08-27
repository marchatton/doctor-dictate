/**
 * Whisper AI Integration for DoctorDictate
 * Handles audio transcription with medical dictionary post-processing
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const medicalDictionary = require('./data/medical-dictionary.js');
const { DictationCommandProcessor } = require('./dictation-commands.js');

class WhisperTranscriber {
    constructor() {
        this.isProcessing = false;
        this.pythonPath = 'python3'; // Will auto-detect or allow user config
        this.whisperEnvPath = null; // Path to Python venv with Whisper
        this.dictationProcessor = new DictationCommandProcessor();
        
        // Model configuration - default to highest quality
        this.selectedModel = 'large'; // Default to maximum accuracy
        this.availableModels = {
            'large': { name: 'High Accuracy', speed: 'Slower', accuracy: 'Best', size: '2.9 GB' },
            'medium.en': { name: 'Balanced', speed: 'Fast', accuracy: 'High', size: '769 MB' }
        };
    }

    /**
     * Initialize Whisper environment
     * Sets up Python virtual environment and installs Whisper if needed
     */
    async initializeWhisper() {
        try {
            // Check if whisper-testing venv exists from Phase 0
            const testingVenvPath = path.join(__dirname, '..', 'whisper-testing', 'venv');
            if (fs.existsSync(testingVenvPath)) {
                this.whisperEnvPath = testingVenvPath;
                console.log('Using existing Whisper environment from testing');
                return true;
            }

            // TODO: Create new venv and install Whisper if testing env not available
            throw new Error('Whisper environment not found. Please run Phase 0 testing first.');
            
        } catch (error) {
            console.error('Failed to initialize Whisper:', error);
            return false;
        }
    }

    /**
     * Get available models for user selection
     */
    getAvailableModels() {
        return this.availableModels;
    }

    /**
     * Set the Whisper model to use
     * @param {string} model - Model name (e.g., 'base.en', 'medium.en')
     */
    setModel(model) {
        if (this.availableModels[model]) {
            this.selectedModel = model;
            console.log(`Whisper model set to: ${model}`);
            return true;
        }
        console.error(`Invalid model: ${model}`);
        return false;
    }

    /**
     * Get current model information
     */
    getCurrentModel() {
        return {
            model: this.selectedModel,
            info: this.availableModels[this.selectedModel]
        };
    }

    /**
     * Reset processing state - useful when errors occur
     */
    resetProcessingState() {
        this.isProcessing = false;
        console.log('Processing state reset');
    }

    /**
     * Check if currently processing
     */
    getProcessingState() {
        return this.isProcessing;
    }

    /**
     * Transcribe audio file using selected Whisper model
     * @param {string} audioFilePath - Path to audio file
     * @param {function} progressCallback - Called with progress updates
     * @returns {Promise<{raw: string, corrected: string, corrections: Array}>}
     */
    async transcribeAudio(audioFilePath, progressCallback = null) {
        if (this.isProcessing) {
            throw new Error('Already processing audio. Please wait.');
        }

        this.isProcessing = true;

        try {
            // Step 1: Run Whisper transcription
            if (progressCallback) progressCallback({ stage: 'transcribing', progress: 0 });
            
            const rawTranscript = await this.runWhisper(audioFilePath, progressCallback);
            
            if (progressCallback) progressCallback({ stage: 'processing', progress: 80 });

            // Step 2: Apply medical dictionary corrections
            const { correctedText, corrections, medicationsFound } = this.applyMedicalCorrections(rawTranscript);
            
            // Step 3: Process dictation commands (next paragraph, comma, etc.)
            if (progressCallback) progressCallback({ stage: 'formatting', progress: 90 });
            const dictationResult = this.dictationProcessor.processMedicalNote(correctedText);
            
            if (progressCallback) progressCallback({ stage: 'complete', progress: 100 });

            return {
                raw: rawTranscript,
                corrected: correctedText,
                formatted: dictationResult.processed,
                corrections: corrections,
                medications: medicationsFound,
                dictationCommands: dictationResult.commands,
                metadata: {
                    timestamp: new Date().toISOString(),
                    model: `whisper-${this.selectedModel}`,
                    modelInfo: this.availableModels[this.selectedModel],
                    audioFile: path.basename(audioFilePath),
                    correctionCount: corrections.length,
                    commandCount: dictationResult.commandCount
                }
            };

        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Run Whisper transcription on audio file
     * @private
     */
    async runWhisper(audioFilePath, progressCallback) {
        return new Promise((resolve, reject) => {
            const pythonExecutable = process.platform === 'win32' 
                ? path.join(this.whisperEnvPath, 'Scripts', 'python.exe')
                : path.join(this.whisperEnvPath, 'bin', 'python');

            const whisperCmd = spawn(pythonExecutable, [
                '-m', 'whisper',
                audioFilePath,
                '--model', this.selectedModel,
                '--language', 'English',
                '--output_format', 'txt',
                '--verbose', 'False'
            ]);

            let outputText = '';
            let errorText = '';

            whisperCmd.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('Whisper output:', output);
                
                if (progressCallback) {
                    // Parse progress from Whisper output if possible
                    const progressMatch = output.match(/(\d+)%/);
                    if (progressMatch) {
                        const progress = Math.min(75, parseInt(progressMatch[1]) * 0.75); // Reserve 25% for post-processing
                        progressCallback({ stage: 'transcribing', progress });
                    }
                }
            });

            whisperCmd.stderr.on('data', (data) => {
                errorText += data.toString();
            });

            whisperCmd.on('close', (code) => {
                if (code === 0) {
                    // Read the output file - Whisper creates files in the same directory as the audio
                    const audioDir = path.dirname(audioFilePath);
                    const audioBasename = path.basename(audioFilePath, path.extname(audioFilePath));
                    const outputFilePath = path.join(audioDir, `${audioBasename}.txt`);
                    
                    console.log(`Looking for output file: ${outputFilePath}`);
                    
                    if (fs.existsSync(outputFilePath)) {
                        const transcript = fs.readFileSync(outputFilePath, 'utf-8').trim();
                        // Clean up output file
                        fs.unlinkSync(outputFilePath);
                        resolve(transcript);
                    } else {
                        // Check current directory as well
                        const fallbackPath = path.join(process.cwd(), `${audioBasename}.txt`);
                        console.log(`Checking fallback path: ${fallbackPath}`);
                        
                        if (fs.existsSync(fallbackPath)) {
                            const transcript = fs.readFileSync(fallbackPath, 'utf-8').trim();
                            fs.unlinkSync(fallbackPath);
                            resolve(transcript);
                        } else {
                            reject(new Error(`Whisper output file not found. Expected: ${outputFilePath}`));
                        }
                    }
                } else {
                    reject(new Error(`Whisper failed with code ${code}: ${errorText}`));
                }
            });

            whisperCmd.on('error', (error) => {
                reject(new Error(`Failed to start Whisper: ${error.message}`));
            });
        });
    }

    /**
     * Apply medical dictionary corrections to raw transcript
     * @private
     */
    applyMedicalCorrections(rawText) {
        let correctedText = rawText;
        const corrections = [];
        const medicationsFound = [];

        // Apply corrections from medical dictionary
        if (medicalDictionary && medicalDictionary.medications) {
            for (const [categoryName, category] of Object.entries(medicalDictionary.medications)) {
                for (const [medName, medInfo] of Object.entries(category)) {
                    if (medInfo.commonErrors && Array.isArray(medInfo.commonErrors)) {
                        for (const errorTerm of medInfo.commonErrors) {
                            const regex = new RegExp(`\\b${escapeRegExp(errorTerm)}\\b`, 'gi');
                            const matches = correctedText.match(regex);
                            
                            if (matches) {
                                correctedText = correctedText.replace(regex, medName);
                                corrections.push({
                                    original: errorTerm,
                                    corrected: medName,
                                    type: 'medication',
                                    category: categoryName,
                                    confidence: 'high'
                                });
                            }
                        }
                    }
                }
            }
        }

        // Normalize dosage units
        const dosageNormalizations = [
            { from: /\b(\d+(?:\.\d+)?)\s*mgs?\b/gi, to: '$1 mg' },
            { from: /\b(\d+(?:\.\d+)?)\s*milligrams?\b/gi, to: '$1 mg' },
            { from: /\b(\d+(?:\.\d+)?)\s*mg's\b/gi, to: '$1 mg' }
        ];

        for (const norm of dosageNormalizations) {
            const matches = correctedText.match(norm.from);
            if (matches) {
                // Store the original matches before replacement
                const originalMatches = [...matches];
                correctedText = correctedText.replace(norm.from, norm.to);
                
                // Add proper correction entry for each match
                originalMatches.forEach(originalMatch => {
                    const correctedMatch = originalMatch.replace(norm.from, norm.to);
                    corrections.push({
                        original: originalMatch,
                        corrected: correctedMatch,
                        type: 'dosage_format',
                        description: 'Normalized dosage unit format',
                        confidence: 'high'
                    });
                });
            }
        }

        // Extract medications found
        if (medicalDictionary && medicalDictionary.medications) {
            for (const [categoryName, category] of Object.entries(medicalDictionary.medications)) {
                for (const medName of Object.keys(category)) {
                    const medRegex = new RegExp(`\\b${escapeRegExp(medName)}\\b`, 'i');
                    if (medRegex.test(correctedText)) {
                        // Try to extract dosage
                        const dosagePattern = new RegExp(`\\b${escapeRegExp(medName)}\\s+(\\d+(?:\\.\\d+)?)\\s*(mg|milligrams?)\\b`, 'i');
                        const dosageMatch = correctedText.match(dosagePattern);
                        
                        if (dosageMatch) {
                            medicationsFound.push({
                                name: medName,
                                dosage: dosageMatch[1],
                                unit: 'mg',
                                category: categoryName,
                                fullMatch: dosageMatch[0]
                            });
                        } else {
                            medicationsFound.push({
                                name: medName,
                                category: categoryName
                            });
                        }
                    }
                }
            }
        }

        return {
            correctedText,
            corrections,
            medicationsFound
        };
    }

    /**
     * Get transcription confidence score
     */
    getConfidenceScore(rawText, correctedText, corrections) {
        const totalWords = rawText.split(/\s+/).length;
        const correctionCount = corrections.length;
        
        // Simple confidence score based on correction ratio
        const baseScore = Math.max(0, 100 - (correctionCount / totalWords * 100));
        
        return {
            overall: Math.round(baseScore),
            medications: corrections.filter(c => c.type === 'medication').length,
            dosages: corrections.filter(c => c.type === 'dosage_format').length,
            wordCount: totalWords,
            correctionCount: correctionCount
        };
    }

    /**
     * Validate if Whisper is available and working
     */
    async validateWhisperInstallation() {
        try {
            const pythonExecutable = process.platform === 'win32' 
                ? path.join(this.whisperEnvPath, 'Scripts', 'python.exe')
                : path.join(this.whisperEnvPath, 'bin', 'python');

            return new Promise((resolve, reject) => {
                const testCmd = spawn(pythonExecutable, ['-m', 'whisper', '--help']);
                
                testCmd.on('close', (code) => {
                    resolve(code === 0);
                });
                
                testCmd.on('error', () => {
                    resolve(false);
                });
            });
        } catch (error) {
            return false;
        }
    }
}

// Utility function to escape special regex characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { WhisperTranscriber };
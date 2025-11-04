import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import medicalDictionaryData from '../../data/medical-dictionary';
import { DictationCommandProcessor } from '../../data/dictation-commands';
import type { MedicalDictionary } from '../../types/medical';

type AvailableModelInfo = {
    name: string;
    speed: string;
    accuracy: string;
    size: string;
};

type TranscriptionChunk = {
    path: string;
    overlap?: number;
    index: number;
};

type ProcessedAudio = {
    chunks: TranscriptionChunk[];
    duration?: number;
};

type ChunkTranscription = {
    text: string;
    overlap?: number;
    index: number;
};

type MedicalCorrection = {
    original: string;
    corrected: string;
    type: string;
    [key: string]: unknown;
};

type MedicationFinding = {
    name: string;
    dosage?: string;
    unit?: string;
    category?: string;
    fullMatch?: string;
};

type TranscriptionResult = {
    raw: string;
    corrected: string;
    formatted: string;
    corrections: MedicalCorrection[];
    medications: MedicationFinding[];
    dictationCommands: unknown;
    metadata: Record<string, unknown>;
};

type AudioProcessorLike = {
    getAudioDuration(filePath: string): Promise<number>;
    processAudio(filePath: string, onProgress: (stage: string, percent?: number) => void): Promise<ProcessedAudio>;
    combineTranscriptions(chunks: ChunkTranscription[]): string;
    cleanup(chunks: TranscriptionChunk[]): Promise<void>;
};

type AudioProcessorCtor = new () => AudioProcessorLike;

type TranscriptionProgressLike = {
    setModel(model: string): void;
    nextStage(stage: string): void;
    getProgress(stage?: string, percent?: number): unknown;
    complete(): unknown;
};

type TranscriptionProgressCtor = new (duration: number) => TranscriptionProgressLike;

type ProgressCallback = ((progress: unknown) => void) | null;

const { AudioProcessor }: { AudioProcessor: AudioProcessorCtor } = require('../audio/processor.js');
const { TranscriptionProgress }: { TranscriptionProgress: TranscriptionProgressCtor } = require('./progress-tracker.js');

const medicalDictionary = medicalDictionaryData as MedicalDictionary;

class WhisperTranscriber {
    private static readonly AUTOSAVE_INTERVAL_MS = 30 * 1000;

    private isProcessing: boolean;
    private whisperEnvPath: string | null;
    private readonly dictationProcessor: DictationCommandProcessor;
    private readonly audioProcessor: AudioProcessorLike;
    private selectedModel: string;
    private readonly availableModels: Record<string, AvailableModelInfo>;

    constructor() {
        this.isProcessing = false;
        this.whisperEnvPath = null;
        this.dictationProcessor = new DictationCommandProcessor();
        this.audioProcessor = new AudioProcessor();

        this.selectedModel = 'small.en';
        this.availableModels = {
            'small.en': { name: 'High Accuracy', speed: 'Moderate', accuracy: 'High', size: '244 MB' },
            'tiny.en': { name: 'Fast', speed: 'Fast', accuracy: 'Good', size: '39 MB' },
        };
    }

    /**
     * Initialize Whisper environment
     * Sets up Python virtual environment and installs Whisper if needed
     */
    async initializeWhisper(): Promise<boolean> {
        try {
            // Check if whisper-cpp is available
            const { execSync } = require('child_process');
            try {
                execSync('which whisper-cpp', { stdio: 'ignore' });
                this.whisperEnvPath = 'whisper-cpp'; // Just a flag that it's available
                console.log('whisper-cpp binary found');
                return true;
            } catch {
                console.warn('whisper-cpp not found, will try fallback methods');
            }

            // Check if models exist
            const modelsPath = path.join(require('os').homedir(), '.whisper-cpp', 'models');
            if (fs.existsSync(modelsPath)) {
                this.whisperEnvPath = 'whisper-models'; // Flag that models exist
                console.log('Whisper models found at:', modelsPath);
                return true;
            }

            // We can still work without the environment by using WhisperCpp directly
            this.whisperEnvPath = 'direct'; // Flag to use direct mode
            console.log('Will use WhisperCpp service directly');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize Whisper:', error);
            return false;
        }
    }

    /**
     * Get available models for user selection
     */
    getAvailableModels(): Record<string, AvailableModelInfo> {
        return this.availableModels;
    }

    /**
     * Set the Whisper model to use
     * @param {string} model - Model name (e.g., 'base.en', 'medium.en')
     */
    setModel(model: string): boolean {
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
    getCurrentModel(): { model: string; info: AvailableModelInfo } {
        return {
            model: this.selectedModel,
            info: this.availableModels[this.selectedModel]
        };
    }

    /**
     * Reset processing state - useful when errors occur
     */
    resetProcessingState(): void {
        this.isProcessing = false;
        console.log('Processing state reset');
    }

    /**
     * Check if currently processing
     */
    getProcessingState(): boolean {
        return this.isProcessing;
    }

    /**
     * Transcribe audio file using selected Whisper model
     * @param {string} audioFilePath - Path to audio file
     * @param {function} progressCallback - Called with progress updates
     * @returns {Promise<{raw: string, corrected: string, corrections: Array}>}
     */
    async transcribeAudio(audioFilePath: string, progressCallback: ProgressCallback = null): Promise<TranscriptionResult> {
        if (this.isProcessing) {
            throw new Error('Already processing audio. Please wait.');
        }

        // Validate Whisper environment is initialized before starting
        if (!this.whisperEnvPath) {
            throw new Error('Whisper environment not initialized. Please ensure initializeWhisper() was called successfully and whisper-testing/venv directory exists.');
        }

        this.isProcessing = true;
        let processedAudio: ProcessedAudio | null = null;
        let progressTracker: TranscriptionProgressLike | null = null;

        try {
            // Initialize progress tracker with audio duration
            const audioDuration = await this.audioProcessor.getAudioDuration(audioFilePath);
            progressTracker = new TranscriptionProgress(audioDuration || 60);
            progressTracker.setModel(this.selectedModel);
            
            // Stage 1: Preparing audio
            progressTracker.nextStage('preparing');
            if (progressCallback) {
                progressCallback(progressTracker.getProgress());
            }
            
            processedAudio = await this.audioProcessor.processAudio(
                audioFilePath,
                (stage: string, percent?: number) => {
                    if (!progressCallback || !progressTracker) {
                        return;
                    }
                    const progressStage = stage === 'chunking' ? 'chunking' : 'preprocessing';
                    progressCallback(progressTracker.getProgress(progressStage, percent));
                }
            );

            // Stage 2: Transcribing audio
            progressTracker.nextStage('transcribing');
            if (progressCallback) {
                progressCallback(progressTracker.getProgress());
            }
            
            const transcriptions: ChunkTranscription[] = [];
            const totalChunks = processedAudio.chunks.length;
            let lastSaveTime = Date.now();
            
            for (let i = 0; i < totalChunks; i++) {
                const chunk = processedAudio.chunks[i];
                const overallProgress = (i / totalChunks) * 100;
                
                if (progressCallback) {
                    progressCallback(progressTracker.getProgress('transcribing', overallProgress));
                }
                
                const chunkText = await this.runWhisper(chunk.path);
                transcriptions.push({
                    text: chunkText,
                    overlap: chunk.overlap || 0,
                    index: chunk.index
                });
                
                // Auto-save progress every 30 seconds
                const currentTime = Date.now();
                if (currentTime - lastSaveTime > WhisperTranscriber.AUTOSAVE_INTERVAL_MS) {
                    try {
                        const partialTranscript = this.audioProcessor.combineTranscriptions(transcriptions);
                        await this.savePartialProgress(audioFilePath, partialTranscript, i + 1, totalChunks);
                        lastSaveTime = currentTime;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : String(error);
                        console.warn('Auto-save failed:', message);
                    }
                }
            }
            
            // Combine chunk transcriptions
            console.log(`🔍 WHISPER - Combining ${transcriptions.length} chunks:`);
            transcriptions.forEach((chunkResult, index) => {
                console.log(`  Chunk ${index}: ${chunkResult.text.length} chars, overlap: ${chunkResult.overlap}`);
                console.log(`    Preview: ${chunkResult.text.substring(0, 50)}...`);
            });
            const rawTranscript = this.audioProcessor.combineTranscriptions(transcriptions);
            console.log(`🔍 WHISPER - Combined transcript: ${rawTranscript.length} chars`);
            
            // Stage 3: Verifying medical terminology
            progressTracker.nextStage('medical');
            if (progressCallback) {
                progressCallback(progressTracker.getProgress());
            }

            const { correctedText, corrections, medicationsFound } = this.applyMedicalCorrections(rawTranscript);
            const dictationResult = await this.dictationProcessor.processMedicalNote(correctedText);
            
            // Stage 4: Finalizing
            progressTracker.nextStage('finalizing');
            if (progressCallback) {
                progressCallback(progressTracker.getProgress());
            }
            
            // Cleanup temporary chunk files
            await this.audioProcessor.cleanup(processedAudio.chunks);
            
            // Complete
            if (progressCallback) {
                progressCallback(progressTracker.complete());
            }

            if (!processedAudio) {
                throw new Error('Audio processor did not return any chunks');
            }

            console.log('🔍 WHISPER FINAL RESULT:');
            console.log('  Raw transcript length:', rawTranscript.length);
            console.log('  Corrected transcript length:', correctedText.length);
            console.log('  Formatted transcript length:', dictationResult.processed.length);
            console.log('  Raw:', rawTranscript.substring(0, 100) + '...');
            console.log('  Corrected:', correctedText.substring(0, 100) + '...');
            console.log('  Formatted:', dictationResult.processed.substring(0, 100) + '...');

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
                    duration: processedAudio.duration,
                    chunks: totalChunks,
                    correctionCount: corrections.length,
                    commandCount: dictationResult.commandCount
                }
            };

        } catch (error) {
            // Cleanup on error
            if (processedAudio && processedAudio.chunks) {
            await this.audioProcessor.cleanup(processedAudio.chunks);
            }
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Run Whisper transcription on audio file
     * @private
     */
    async runWhisper(audioFilePath: string): Promise<string> {
        // Use WhisperCpp service instead of Python
        const { WhisperCpp } = require('./whisper-cpp');
        
        try {
            // Set the model based on selectedModel
            const modelMap: Record<string, string> = {
                'tiny': 'tiny.en',
                'base': 'base.en',
                'small': 'small.en',
                'tiny.en': 'tiny.en',
                'base.en': 'base.en',
                'small.en': 'small.en'
            };
            
            const model = modelMap[this.selectedModel as keyof typeof modelMap] || 'tiny.en';
            console.log(`Using WhisperCpp with model: ${model}`);
            
            // Create WhisperCpp with the correct model
            const whisperCpp = new WhisperCpp({ model });
            
            // Transcribe using WhisperCpp (second param is options, not model)
            const result = await whisperCpp.transcribe(audioFilePath, {});
            
            // WhisperCpp.transcribe returns the transcript string directly
            if (result && typeof result === 'string') {
                return result;
            } else if (result && result.text) {
                // In case it returns an object with text property
                return result.text;
            } else {
                throw new Error('No transcription text returned from WhisperCpp');
            }
        } catch (error) {
            console.error('WhisperCpp transcription failed:', error);
            throw error;
        }
        
        /* Old Python-based implementation - keeping for reference
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
        */
    }

    /**
     * Apply medical dictionary corrections to raw transcript
     * @private
     */
    applyMedicalCorrections(rawText: string): {
        correctedText: string;
        corrections: MedicalCorrection[];
        medicationsFound: MedicationFinding[];
    } {
        let correctedText = rawText;
        const corrections: MedicalCorrection[] = [];
        const medicationsFound: MedicationFinding[] = [];

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
                originalMatches.forEach((originalMatch) => {
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
    getConfidenceScore(rawText: string, _correctedText: string, corrections: MedicalCorrection[]): {
        overall: number;
        medications: number;
        dosages: number;
        wordCount: number;
        correctionCount: number;
    } {
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
    async validateWhisperInstallation(): Promise<boolean> {
        try {
            if (!this.whisperEnvPath) {
                return false;
            }
            const pythonExecutable = process.platform === 'win32' 
                ? path.join(this.whisperEnvPath, 'Scripts', 'python.exe')
                : path.join(this.whisperEnvPath, 'bin', 'python');

            return new Promise((resolve) => {
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

    /**
     * Save partial transcription progress for recovery
     * @param {string} originalFilePath - Original audio file path
     * @param {string} partialTranscript - Current transcription progress
     * @param {number} completedChunks - Number of chunks processed
     * @param {number} totalChunks - Total number of chunks
     * @private
     */
    async savePartialProgress(
        originalFilePath: string,
        partialTranscript: string,
        completedChunks: number,
        totalChunks: number,
    ): Promise<void> {
        try {
            const os = require('os');
            const timestamp = Date.now();
            const progressFile = path.join(os.tmpdir(), `doctordictate-progress-${timestamp}.json`);
            
            const progressData = {
                originalFile: originalFilePath,
                transcript: partialTranscript,
                completedChunks,
                totalChunks,
                progress: Math.round((completedChunks / totalChunks) * 100),
                timestamp: new Date().toISOString(),
                model: this.selectedModel
            };
            
            fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2));
            console.log(`Auto-saved progress: ${completedChunks}/${totalChunks} chunks (${progressData.progress}%)`);
            
            // Clean up old progress files (keep only last 3)
            this.cleanupOldProgressFiles();
            
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn('Failed to save progress:', message);
        }
    }

    /**
     * Clean up old progress files to prevent disk clutter
     * @private
     */
    cleanupOldProgressFiles(): void {
        try {
            const os = require('os');
            const tmpDir = os.tmpdir();
            const progressFiles = fs.readdirSync(tmpDir)
                .filter((file: string) => file.startsWith('doctordictate-progress-'))
                .map((file: string) => ({
                    name: file,
                    path: path.join(tmpDir, file),
                    mtime: fs.statSync(path.join(tmpDir, file)).mtime,
                }))
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // newest first
            
            // Keep only the 3 most recent progress files
            for (let i = 3; i < progressFiles.length; i++) {
                fs.unlinkSync(progressFiles[i].path);
            }
        } catch (error) {
            // Silent cleanup failure - not critical
        }
    }
}

// Utility function to escape special regex characters
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { WhisperTranscriber };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WhisperTranscriber };
}

/**
 * Audio Processing Pipeline for DoctorDictate
 * Handles preprocessing and chunking for optimal Whisper performance
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class AudioProcessor {
    constructor() {
        this.chunkDuration = 30; // seconds per chunk
        this.chunkOverlap = 2;   // seconds of overlap to avoid cutting words
        this.targetSampleRate = 16000; // Whisper's preferred sample rate
    }

    /**
     * Main processing pipeline
     * @param {string} inputPath - Path to original audio file
     * @param {function} onProgress - Progress callback (stage, percent, message)
     * @returns {Promise<{processedPath: string, chunks: Array}>}
     */
    async processAudio(inputPath, onProgress = () => {}) {
        try {
            onProgress('preprocessing', 0, 'Starting audio preprocessing...');
            
            // Step 1: Preprocess audio (downsample, convert to mono WAV)
            const preprocessedPath = await this.preprocessAudio(inputPath, onProgress);
            
            // Step 2: Get audio duration for chunking calculation
            const duration = await this.getAudioDuration(preprocessedPath);
            
            // Step 3: Create chunks if audio is longer than chunk duration
            const chunks = await this.createChunks(preprocessedPath, duration, onProgress);
            
            return {
                processedPath: preprocessedPath,
                chunks: chunks,
                duration: duration
            };
        } catch (error) {
            console.error('Audio processing pipeline error:', error);
            throw error;
        }
    }

    /**
     * Preprocess audio to optimal format for Whisper
     * Converts to 16kHz mono WAV to reduce file size and processing time
     */
    async preprocessAudio(inputPath, onProgress) {
        return new Promise((resolve, reject) => {
            const outputPath = path.join(
                os.tmpdir(), 
                `preprocessed-${Date.now()}.wav`
            );

            onProgress('preprocessing', 25, 'Converting to optimal format...');

            // Use ffmpeg to convert to 16kHz mono WAV
            const ffmpeg = spawn('ffmpeg', [
                '-i', inputPath,
                '-ar', this.targetSampleRate,  // Sample rate
                '-ac', '1',                     // Mono
                '-c:a', 'pcm_s16le',           // 16-bit PCM
                '-y',                           // Overwrite output
                outputPath
            ]);

            let errorOutput = '';
            
            ffmpeg.stderr.on('data', (data) => {
                errorOutput += data.toString();
                // Parse ffmpeg progress if needed
                const progress = this.parseFFmpegProgress(data.toString());
                if (progress) {
                    onProgress('preprocessing', 25 + (progress * 0.5), 'Converting audio...');
                }
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    onProgress('preprocessing', 75, 'Audio preprocessing complete');
                    resolve(outputPath);
                } else {
                    // Fallback: if ffmpeg fails, use original file
                    console.warn('FFmpeg preprocessing failed, using original file');
                    resolve(inputPath);
                }
            });

            ffmpeg.on('error', (err) => {
                console.warn('FFmpeg not available, using original file:', err.message);
                // If ffmpeg is not available, use original file
                resolve(inputPath);
            });
        });
    }

    /**
     * Get audio duration using ffprobe or fallback method
     */
    async getAudioDuration(audioPath) {
        return new Promise((resolve) => {
            const ffprobe = spawn('ffprobe', [
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'json',
                audioPath
            ]);

            let output = '';
            
            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobe.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        const duration = parseFloat(result.format.duration);
                        resolve(duration);
                    } catch {
                        // Default to 0 if parsing fails (will process as single chunk)
                        resolve(0);
                    }
                } else {
                    resolve(0); // Process as single chunk if duration unknown
                }
            });

            ffprobe.on('error', () => {
                resolve(0); // Process as single chunk if ffprobe not available
            });
        });
    }

    /**
     * Create audio chunks for processing
     * Uses overlap to avoid cutting words at boundaries
     */
    async createChunks(audioPath, duration, onProgress) {
        // If audio is short or duration unknown, return single chunk
        if (duration <= this.chunkDuration || duration === 0) {
            return [{
                path: audioPath,
                start: 0,
                duration: duration || this.chunkDuration,
                index: 0,
                isFullFile: true
            }];
        }

        const chunks = [];
        const effectiveChunkDuration = this.chunkDuration;
        const step = effectiveChunkDuration - this.chunkOverlap;
        const numChunks = Math.ceil(duration / step);

        onProgress('chunking', 0, `Splitting audio into ${numChunks} chunks...`);

        for (let i = 0; i < numChunks; i++) {
            const start = i * step;
            const chunkDuration = Math.min(effectiveChunkDuration, duration - start);
            
            const chunkPath = path.join(
                os.tmpdir(),
                `chunk-${Date.now()}-${i}.wav`
            );

            // Extract chunk using ffmpeg
            await this.extractChunk(audioPath, chunkPath, start, chunkDuration);
            
            chunks.push({
                path: chunkPath,
                start: start,
                duration: chunkDuration,
                index: i,
                overlap: i > 0 ? this.chunkOverlap : 0,
                isFullFile: false
            });

            const progress = ((i + 1) / numChunks) * 100;
            onProgress('chunking', progress, `Created chunk ${i + 1} of ${numChunks}`);
        }

        return chunks;
    }

    /**
     * Extract a single chunk from audio file
     */
    async extractChunk(inputPath, outputPath, start, duration) {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-i', inputPath,
                '-ss', start.toString(),
                '-t', duration.toString(),
                '-c', 'copy',
                '-y',
                outputPath
            ]);

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve(outputPath);
                } else {
                    reject(new Error(`Failed to extract chunk at ${start}s`));
                }
            });

            ffmpeg.on('error', reject);
        });
    }

    /**
     * Parse FFmpeg progress output
     */
    parseFFmpegProgress(output) {
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const seconds = parseInt(timeMatch[3]);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            // Return progress as percentage (rough estimate)
            return Math.min(totalSeconds / 10, 1); // Assume 10 seconds max for preprocessing
        }
        return null;
    }

    /**
     * Combine chunk transcriptions with overlap handling
     */
    combineTranscriptions(transcriptions) {
        if (transcriptions.length === 0) return '';
        if (transcriptions.length === 1) return transcriptions[0].text;

        let combined = transcriptions[0].text;
        
        for (let i = 1; i < transcriptions.length; i++) {
            const current = transcriptions[i];
            
            if (current.overlap > 0 && combined.length > 0) {
                // Find overlap point by looking for common words
                const overlapText = this.findOverlapPoint(
                    combined,
                    current.text,
                    current.overlap
                );
                
                if (overlapText) {
                    // Remove the overlapping portion from current text
                    const cleanText = current.text.substring(overlapText.length);
                    combined += ' ' + cleanText;
                } else {
                    // No overlap found, just append
                    combined += ' ' + current.text;
                }
            } else {
                combined += ' ' + current.text;
            }
        }

        return combined.trim();
    }

    /**
     * Find overlap point between two transcriptions
     */
    findOverlapPoint(endText, startText, overlapDuration) {
        // Simple approach: look for common words at boundaries
        const endWords = endText.split(' ').slice(-10); // Last 10 words
        const startWords = startText.split(' ').slice(0, 10); // First 10 words
        
        // Find longest common sequence
        for (let i = Math.min(5, startWords.length); i > 0; i--) {
            const startSequence = startWords.slice(0, i).join(' ');
            const endSequence = endWords.slice(-i).join(' ');
            
            if (endSequence === startSequence) {
                return startSequence;
            }
        }
        
        return null;
    }

    /**
     * Cleanup temporary files
     */
    async cleanup(chunks) {
        for (const chunk of chunks) {
            if (!chunk.isFullFile && fs.existsSync(chunk.path)) {
                try {
                    fs.unlinkSync(chunk.path);
                } catch (error) {
                    console.warn(`Failed to cleanup chunk file: ${chunk.path}`);
                }
            }
        }
    }
}

module.exports = { AudioProcessor };
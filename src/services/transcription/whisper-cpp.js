/**
 * whisper-cli integration for fast transcription
 * Uses native C++ implementation (Whisper.cpp) for better performance
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class WhisperCpp {
    constructor(config = {}) {
        this.model = config.model || 'base.en';
        this.threads = config.threads || Math.min(4, os.cpus().length - 2);
        this.chunkSize = config.chunkSize || 30; // seconds
        this.overlap = config.overlap || 5; // seconds
        
        // Check if whisper.cpp is installed
        this.whisperPath = this.findWhisperExecutable();
        this.modelsPath = path.join(process.env.HOME, '.whisper-cpp', 'models');
        
        this.config = config;
    }
    
    /**
     * Find whisper-cli executable
     */
    findWhisperExecutable() {
        // Check common locations (whisper-cli is the new name)
        const possiblePaths = [
            '/opt/homebrew/bin/whisper-cli',
            '/usr/local/bin/whisper-cli',
            '/opt/homebrew/bin/whisper',
            '/usr/local/bin/whisper',
            'whisper-cli' // Rely on PATH
        ];

        for (const execPath of possiblePaths) {
            if (fs.existsSync(execPath)) {
                return execPath;
            }
        }

        // Default to PATH lookup
        return 'whisper-cli';
    }
    
    /**
     * Check if model is downloaded
     */
    async ensureModel() {
        // Use the standard location for whisper models
        const modelFile = path.join(process.env.HOME, '.whisper-cpp', 'models', `ggml-${this.model}.bin`);
        
        if (!fs.existsSync(modelFile)) {
            console.log(`❌ Whisper model not found: ${this.model}`);
            console.log(`Please run: ./download-whisper-models.sh`);
            throw new Error(`Model ${this.model} not found at ${modelFile}`);
        }
        
        return modelFile;
    }
    
    /**
     * Download Whisper model
     */
    async downloadModel() {
        return new Promise((resolve, reject) => {
            const script = path.join(path.dirname(this.whisperPath), 'models', 'download-ggml-model.sh');
            
            if (!fs.existsSync(script)) {
                reject(new Error('Model download script not found. Please install whisper.cpp properly.'));
                return;
            }
            
            const download = spawn('bash', [script, this.model]);
            
            download.stdout.on('data', (data) => {
                process.stdout.write(data);
            });
            
            download.stderr.on('data', (data) => {
                process.stderr.write(data);
            });
            
            download.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Model download failed with code ${code}`));
                }
            });
        });
    }
    
    /**
     * Convert audio to WAV if needed
     */
    async convertToWav(audioPath) {
        const ext = path.extname(audioPath).toLowerCase();
        
        // If already WAV, return as-is
        if (ext === '.wav') {
            return audioPath;
        }
        
        // Convert to WAV using ffmpeg
        const wavPath = audioPath.replace(ext, '-temp.wav');
        
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-i', audioPath,
                '-ar', '16000',  // 16kHz sample rate
                '-ac', '1',      // Mono
                '-c:a', 'pcm_s16le',  // PCM 16-bit
                wavPath,
                '-y'  // Overwrite if exists
            ]);
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Audio converted to WAV');
                    resolve(wavPath);
                } else {
                    reject(new Error(`FFmpeg failed with code ${code}`));
                }
            });
            
            ffmpeg.on('error', (err) => {
                reject(new Error(`FFmpeg error: ${err.message}`));
            });
        });
    }
    
    /**
     * Transcribe audio file
     */
    async transcribe(audioPath, options = {}) {
        const modelPath = await this.ensureModel();
        
        // Convert to WAV if needed
        const wavPath = await this.convertToWav(audioPath);
        const isTemp = wavPath !== audioPath;
        
        return new Promise((resolve, reject) => {
            const args = [
                '-m', modelPath,
                '-f', wavPath,  // Use converted WAV file
                '-t', String(this.threads),
                '-l', 'en',
                '--no-timestamps',
                '-otxt'  // Output as text
            ];
            
            // Add VAD if enabled
            if (this.config.vad?.enabled) {
                args.push('--vad-thold', String(this.config.vad.threshold || 0.6));
            }
            
            // Add additional options
            if (options.maxContext) {
                args.push('--max-context', String(options.maxContext));
            }
            
            console.log(`🎤 Transcribing with whisper-cli (${this.model})...`);
            const whisper = spawn(this.whisperPath, args);
            
            let output = '';
            let error = '';
            
            whisper.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            whisper.stderr.on('data', (data) => {
                const message = data.toString();
                // Whisper.cpp outputs progress and info to stderr, not just errors
                // Only log actual errors
                if (message.includes('error') || message.includes('Error') || message.includes('failed')) {
                    error += message;
                    console.error('Whisper error:', message);
                }
                // Ignore normal progress/info messages
            });
            
            whisper.on('close', (code) => {
                // Clean up temp file if created
                if (isTemp && fs.existsSync(wavPath)) {
                    fs.unlinkSync(wavPath);
                }
                
                if (code === 0) {
                    // whisper-cli with -otxt outputs transcript directly to stdout
                    const transcript = output.trim();
                    console.log(`✅ Transcription complete (${transcript.length} chars)`);
                    resolve(transcript);
                } else {
                    reject(new Error(`Whisper failed with code ${code}: ${error}`));
                }
            });
        });
    }
    
    /**
     * Parse whisper output to extract transcript
     */
    parseWhisperOutput(output, audioPath) {
        // Whisper.cpp with --output-txt creates a .txt file
        const txtPath = audioPath.replace(/\.[^.]+$/, '.txt');
        
        if (fs.existsSync(txtPath)) {
            const transcript = fs.readFileSync(txtPath, 'utf8');
            // Clean up the file
            fs.unlinkSync(txtPath);
            return transcript.trim();
        }
        
        // Fallback: parse from stdout
        // Remove progress indicators and extract text
        const lines = output.split('\n');
        const transcript = lines
            .filter(line => !line.includes('[') && !line.includes('%') && line.trim())
            .join(' ')
            .trim();
        
        return transcript;
    }
    
    /**
     * Transcribe with chunking for long audio
     */
    async transcribeChunked(audioPath) {
        // For now, just use single transcription
        // TODO: Implement audio chunking with ffmpeg
        return this.transcribe(audioPath);
    }
    
    /**
     * Check if whisper-cli is available
     */
    async isAvailable() {
        return new Promise((resolve) => {
            const check = spawn('which', [this.whisperPath]);
            check.on('close', (code) => {
                resolve(code === 0);
            });
        });
    }
}

module.exports = { WhisperCpp };
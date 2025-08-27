// DoctorDictate Renderer Process
// Handles UI interactions and communicates with main process

class DoctorDictateApp {
    constructor() {
        this.isRecording = false;
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.whisperInitialized = false;
        this.currentTranscriptionResult = null;
        
        // Auto-save configuration
        this.autoSaveTimeout = null;
        this.lastAutoSaveContent = '';
        this.autoSaveDelay = 3000; // 3 seconds delay
        
        // Audio level monitoring
        this.audioContext = null;
        this.analyser = null;
        this.microphoneStream = null;
        this.audioLevelInterval = null;
        
        this.initializeApp();
        this.bindEvents();
    }

    async initializeApp() {
        try {
            // Get app information
            const appVersion = await window.electronAPI.getAppVersion();
            
            // Update UI with app info
            document.getElementById('app-version').textContent = `v${appVersion}`;
            
            // Ensure documents directory exists
            await window.electronAPI.ensureDocumentsDir();
            
            // Initialize Whisper
            await this.initializeWhisper();
            
            // Load available models
            await this.loadAvailableModels();
            
            console.log('DoctorDictate initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application');
        }
    }

    async initializeWhisper() {
        try {
            const statusElement = document.getElementById('app-status');
            statusElement.textContent = 'Initializing Whisper...';
            statusElement.className = 'status-loading';
            
            // Initialize Whisper transcriber
            const initResult = await window.electronAPI.initializeWhisper();
            
            if (initResult.success) {
                // Validate Whisper installation
                const validationResult = await window.electronAPI.validateWhisper();
                
                if (validationResult.available) {
                    this.whisperInitialized = true;
                    statusElement.textContent = 'Ready';
                    statusElement.className = 'status-online';
                    console.log('Whisper initialized and validated successfully');
                } else {
                    statusElement.textContent = 'Whisper Unavailable';
                    statusElement.className = 'status-error';
                    this.showError('Whisper is not available. Please ensure it is properly installed.');
                }
            } else {
                statusElement.textContent = 'Whisper Failed';
                statusElement.className = 'status-error';
                this.showError('Failed to initialize Whisper: ' + (initResult.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to initialize Whisper:', error);
            const statusElement = document.getElementById('app-status');
            statusElement.textContent = 'Error';
            statusElement.className = 'status-error';
            this.showError('Error initializing Whisper');
        }
    }

    bindEvents() {
        // Recording controls
        document.getElementById('record-btn').addEventListener('click', () => this.startRecording());
        document.getElementById('stop-btn').addEventListener('click', () => this.stopRecording());
        
        // Transcription actions
        document.getElementById('edit-btn').addEventListener('click', () => this.toggleEditMode());
        document.getElementById('save-btn').addEventListener('click', () => this.saveTranscript());
        document.getElementById('export-pdf-btn').addEventListener('click', () => this.exportPDF());
        
        // Template buttons (V1 feature)
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.loadTemplate(e.target.dataset.template));
        });
        
        // Modal controls
        document.getElementById('error-modal-close').addEventListener('click', () => this.hideErrorModal());
        document.getElementById('error-modal-ok').addEventListener('click', () => this.hideErrorModal());
        
        // Auto-save functionality
        document.getElementById('transcript-text').addEventListener('input', () => this.autoSave());
        
        // Model selection
        document.getElementById('model-toggle').addEventListener('change', (e) => this.toggleModel(e.target.checked));
    }

    async startRecording() {
        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Initialize MediaRecorder
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.audioChunks = [];
            
            // Handle data available
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            // Handle recording stop
            this.mediaRecorder.onstop = () => {
                this.handleRecordingComplete();
            };
            
            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.microphoneStream = stream;
            
            // Set up audio level monitoring
            this.setupAudioLevelMonitoring(stream);
            
            // Update UI
            this.updateRecordingUI(true);
            this.startRecordingTimer();
            
            console.log('Recording started');
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.showError('Failed to start recording. Please check microphone permissions.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Stop timer
            if (this.recordingTimer) {
                clearInterval(this.recordingTimer);
                this.recordingTimer = null;
            }
            
            // Clean up audio monitoring
            this.stopAudioLevelMonitoring();
            
            // Update UI
            this.updateRecordingUI(false);
            
            console.log('Recording stopped');
        }
    }

    handleRecordingComplete() {
        // Create audio blob
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Show transcription section
        document.getElementById('transcription-section').style.display = 'block';
        
        // Start transcription process
        this.startTranscription(audioBlob);
    }

    async startTranscription(audioBlob) {
        try {
            if (!this.whisperInitialized) {
                this.showError('Whisper is not initialized. Please restart the application.');
                return;
            }

            // Show progress
            this.showTranscriptionProgress();
            
            // Setup progress listener
            window.electronAPI.onTranscriptionProgress((progress) => {
                this.updateTranscriptionProgress(progress);
            });
            
            // Save audio blob to temporary file
            const audioFilePath = await this.saveAudioBlobToFile(audioBlob);
            
            // Start transcription
            const result = await window.electronAPI.transcribeAudio(audioFilePath);
            
            if (result.success) {
                this.currentTranscriptionResult = result;
                this.completeTranscription(result);
            } else {
                throw new Error(result.error || 'Transcription failed');
            }
            
        } catch (error) {
            console.error('Failed to start transcription:', error);
            this.showError('Failed to start transcription: ' + error.message);
            this.hideTranscriptionProgress();
            
            // Reset transcription state on error to prevent stuck state
            try {
                await window.electronAPI.resetTranscriptionState();
            } catch (resetError) {
                console.error('Failed to reset transcription state:', resetError);
            }
        } finally {
            window.electronAPI.removeTranscriptionProgressListener();
        }
    }

    async saveAudioBlobToFile(audioBlob) {
        // Convert blob to array buffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        
        // Save via main process
        const result = await window.electronAPI.saveAudioBlob(arrayBuffer);
        
        if (result.success) {
            return result.filePath;
        } else {
            throw new Error(result.error || 'Failed to save audio file');
        }
    }

    updateTranscriptionProgress(progress) {
        const progressContainer = document.getElementById('progress-container');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        // Handle new progress format with stages
        if (progress.message) {
            let displayText = progress.message;
            
            // Add sub-message if available
            if (progress.subMessage && progress.subMessage.trim()) {
                displayText += `\n${progress.subMessage}`;
            }
            
            progressText.innerHTML = displayText.replace('\n', '<br>');
            
            // Show/hide progress bar based on completion
            if (progress.isComplete) {
                progressFill.style.width = '100%';
                
                // Auto-hide progress after completion
                setTimeout(() => {
                    this.hideTranscriptionProgress();
                }, 1000);
            } else {
                // For non-deterministic stages (transcribing), don't show a progress bar
                if (progress.showSpinner || 
                    (progress.stages && progress.stages.some(s => s.status === 'active' && s.id === 'transcribing'))) {
                    // Hide progress bar and add spinner class for animation
                    progressContainer.classList.add('processing');
                    progressFill.style.width = '0%';
                } else {
                    // Show progress for deterministic stages
                    progressContainer.classList.remove('processing');
                    const activeStageIndex = progress.stages ? progress.stages.findIndex(s => s.status === 'active') : -1;
                    const stageProgress = activeStageIndex >= 0 ? ((activeStageIndex + 1) / progress.stages.length) * 100 : 25;
                    progressFill.style.width = `${stageProgress}%`;
                }
            }
            
            // Add stage indicators if available
            this.updateStageIndicators(progress.stages);
        } else {
            // Legacy format fallback
            this.handleLegacyProgress(progress);
        }
    }

    updateStageIndicators(stages) {
        // Create or update stage indicators
        let stageContainer = document.getElementById('stage-indicators');
        
        if (!stageContainer) {
            stageContainer = document.createElement('div');
            stageContainer.id = 'stage-indicators';
            stageContainer.className = 'stage-indicators';
            
            const progressContainer = document.getElementById('progress-container');
            progressContainer.appendChild(stageContainer);
        }
        
        if (stages && stages.length > 0) {
            stageContainer.style.display = 'flex';
            stageContainer.innerHTML = stages.map(stage => 
                `<div class="stage-indicator stage-${stage.status}">
                    <span class="stage-icon">${stage.icon}</span>
                    <span class="stage-name">${stage.name}</span>
                </div>`
            ).join('');
        } else {
            stageContainer.style.display = 'none';
        }
    }

    handleLegacyProgress(progress) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        let progressPercent = 0;
        let statusText = 'Processing...';
        
        switch (progress.stage) {
            case 'transcribing':
                progressPercent = progress.progress || 0;
                statusText = `Transcribing audio... ${Math.round(progressPercent)}%`;
                break;
            case 'processing':
                progressPercent = progress.progress || 80;
                statusText = 'Applying medical corrections...';
                break;
            case 'formatting':
                progressPercent = progress.progress || 90;
                statusText = 'Processing dictation commands...';
                break;
            case 'complete':
                progressPercent = 100;
                statusText = 'Finalizing...';
                setTimeout(() => {
                    this.hideTranscriptionProgress();
                }, 500);
                break;
        }
        
        progressFill.style.width = `${progressPercent}%`;
        progressText.textContent = statusText;
    }

    hideTranscriptionProgress() {
        document.getElementById('progress-container').style.display = 'none';
    }

    showTranscriptionProgress() {
        const progressContainer = document.getElementById('progress-container');
        const transcriptEditor = document.getElementById('transcript-editor');
        
        progressContainer.style.display = 'block';
        transcriptEditor.style.display = 'none';
        
        // Initialize progress display
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        progressFill.style.width = '0%';
        progressText.textContent = 'Preparing transcription...';
    }

    completeTranscription(result) {
        // Progress will auto-hide from the 'complete' stage update
        // Just show the transcript editor
        const transcriptEditor = document.getElementById('transcript-editor');
        transcriptEditor.style.display = 'block';
        
        // Set transcript text (use formatted version with dictation commands processed)
        const transcriptText = document.getElementById('transcript-text');
        transcriptText.value = result.formatted || result.corrected || result.raw;
        
        // Display transcription info
        this.displayTranscriptionInfo(result);
        
        console.log('Transcription completed with', result.corrections.length, 'corrections');
    }

    displayTranscriptionInfo(result) {
        // Create or update info panel
        let infoPanel = document.getElementById('transcription-info');
        if (!infoPanel) {
            infoPanel = document.createElement('div');
            infoPanel.id = 'transcription-info';
            infoPanel.className = 'transcription-info';
            document.getElementById('transcript-editor').insertBefore(infoPanel, document.getElementById('transcript-text'));
        }
        
        const corrections = result.corrections || [];
        const medications = result.medications || [];
        const commands = result.dictationCommands || [];
        
        const correctionsText = corrections.length > 0 
            ? `${corrections.length} medical corrections applied` 
            : 'No corrections needed';
        
        const medicationsText = medications.length > 0 
            ? `${medications.length} medications detected: ${medications.map(m => m.name).join(', ')}` 
            : 'No medications detected';
        
        const commandsText = result.metadata && result.metadata.commandCount > 0
            ? `${result.metadata.commandCount} dictation commands processed`
            : 'No dictation commands';
        
        infoPanel.innerHTML = `
            <div class="info-item">
                <span class="info-label">Model:</span> 
                <span class="info-value">${result.metadata?.model || 'Whisper'} + Medical Dictionary</span>
            </div>
            <div class="info-item">
                <span class="info-label">Corrections:</span> 
                <span class="info-value">${correctionsText}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Formatting:</span> 
                <span class="info-value">${commandsText}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Medications:</span> 
                <span class="info-value">${medicationsText}</span>
            </div>
        `;
        
        // Add corrections detail if any
        if (corrections.length > 0) {
            const correctionsDetail = document.createElement('details');
            correctionsDetail.innerHTML = `
                <summary>View Corrections (${corrections.length})</summary>
                <div class="corrections-list">
                    ${corrections.map(c => {
                        if (c.original && c.corrected) {
                            return `<div class="correction-item">
                                "${c.original}" → "${c.corrected}" (${c.type || 'correction'})
                            </div>`;
                        } else if (c.description) {
                            return `<div class="correction-item">
                                ${c.description} (${c.type || 'correction'})
                            </div>`;
                        } else {
                            return `<div class="correction-item">
                                ${c.type || 'Unknown correction type'}
                            </div>`;
                        }
                    }).join('')}
                </div>
            `;
            infoPanel.appendChild(correctionsDetail);
        }
    }

    updateRecordingUI(isRecording) {
        const recordBtn = document.getElementById('record-btn');
        const stopBtn = document.getElementById('stop-btn');
        const recordingIndicator = document.getElementById('recording-indicator');
        
        if (isRecording) {
            recordBtn.disabled = true;
            stopBtn.disabled = false;
            recordingIndicator.style.display = 'block';
        } else {
            recordBtn.disabled = false;
            stopBtn.disabled = true;
            recordingIndicator.style.display = 'none';
        }
    }

    startRecordingTimer() {
        this.recordingTimer = setInterval(() => {
            if (this.recordingStartTime) {
                const elapsed = Date.now() - this.recordingStartTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                
                document.getElementById('recording-timer').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    setupAudioLevelMonitoring(stream) {
        try {
            // Create audio context and analyser
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            
            // Configure analyser
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            
            // Connect microphone stream to analyser
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            
            // Start monitoring audio levels
            this.startAudioLevelAnimation();
            
            console.log('Audio level monitoring started');
        } catch (error) {
            console.error('Failed to setup audio level monitoring:', error);
            // Don't fail recording if audio monitoring fails
        }
    }

    startAudioLevelAnimation() {
        const levelBar = document.getElementById('level-bar');
        const audioLevelMeter = document.getElementById('audio-level-meter');
        
        // Show the audio level meter
        audioLevelMeter.style.display = 'flex';
        
        // Start animation loop
        this.audioLevelInterval = setInterval(() => {
            if (this.analyser) {
                const bufferLength = this.analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                this.analyser.getByteFrequencyData(dataArray);
                
                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;
                
                // Convert to percentage (0-100)
                const percentage = Math.min(100, (average / 128) * 100);
                
                // Update level bar
                levelBar.style.width = `${percentage}%`;
            }
        }, 50); // Update every 50ms for smooth animation
    }

    stopAudioLevelMonitoring() {
        // Stop animation interval
        if (this.audioLevelInterval) {
            clearInterval(this.audioLevelInterval);
            this.audioLevelInterval = null;
        }
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            this.analyser = null;
        }
        
        // Stop microphone stream
        if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop());
            this.microphoneStream = null;
        }
        
        // Hide audio level meter
        const audioLevelMeter = document.getElementById('audio-level-meter');
        audioLevelMeter.style.display = 'none';
        
        // Reset level bar
        const levelBar = document.getElementById('level-bar');
        levelBar.style.width = '0%';
        
        console.log('Audio level monitoring stopped');
    }

    toggleEditMode() {
        const transcriptText = document.getElementById('transcript-text');
        const isReadOnly = transcriptText.readOnly;
        
        transcriptText.readOnly = !isReadOnly;
        
        const editBtn = document.getElementById('edit-btn');
        if (isReadOnly) {
            editBtn.textContent = 'View Only';
            editBtn.classList.add('btn-secondary');
            editBtn.classList.remove('btn-outline');
        } else {
            editBtn.textContent = 'Edit';
            editBtn.classList.remove('btn-secondary');
            editBtn.classList.add('btn-outline');
        }
    }

    async saveTranscript() {
        try {
            const content = document.getElementById('transcript-text').value;
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `transcript-${timestamp}.txt`;
            
            const result = await window.electronAPI.saveTranscript({ filename, content });
            
            if (result.success) {
                this.showSuccess(`Transcript saved to: ${result.path}`);
            } else if (result.canceled) {
                console.log('Save operation canceled');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to save transcript:', error);
            this.showError('Failed to save transcript');
        }
    }

    async exportPDF() {
        try {
            const content = document.getElementById('transcript-text').value;
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `transcript-${timestamp}.pdf`;
            
            const result = await window.electronAPI.exportPDF({ filename, content });
            
            if (result.success) {
                this.showSuccess(`PDF exported to: ${result.path}`);
            } else if (result.canceled) {
                console.log('Export operation canceled');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to export PDF:', error);
            this.showError('Failed to export PDF');
        }
    }

    loadTemplate(templateType) {
        // TODO: Implement template loading (V1 feature)
        console.log(`Loading template: ${templateType}`);
        this.showError('Templates will be available in V1');
    }

    autoSave() {
        // Clear existing timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        // Set new timeout for auto-save
        this.autoSaveTimeout = setTimeout(() => {
            this.performAutoSave();
        }, this.autoSaveDelay);
    }
    
    async performAutoSave() {
        try {
            const content = document.getElementById('transcript-text').value;
            
            // Don't save if content hasn't changed or is empty
            if (!content.trim() || content === this.lastAutoSaveContent) {
                return;
            }
            
            // Save content
            const result = await window.electronAPI.autoSave({ content });
            
            if (result.success) {
                this.lastAutoSaveContent = content;
                console.log('Auto-saved transcript successfully');
                
                // Show subtle indication (optional - could add a small indicator)
                this.showAutoSaveIndicator();
            } else {
                console.warn('Auto-save failed:', result.error);
            }
            
        } catch (error) {
            console.error('Error during auto-save:', error);
        }
    }
    
    showAutoSaveIndicator() {
        // Find or create auto-save indicator
        let indicator = document.getElementById('auto-save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'auto-save-indicator';
            indicator.className = 'auto-save-indicator';
            indicator.textContent = 'Auto-saved';
            document.body.appendChild(indicator);
            
            // Add styles
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                opacity: 0;
                transition: opacity 0.3s;
                z-index: 1000;
            `;
        }
        
        // Show indicator briefly
        indicator.style.opacity = '0.8';
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 2000);
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-modal').style.display = 'flex';
    }

    hideErrorModal() {
        document.getElementById('error-modal').style.display = 'none';
    }

    showSuccess(message) {
        // TODO: Implement success notification
        console.log('Success:', message);
        // For now, just show in console
    }
    
    async loadAvailableModels() {
        try {
            const modelsResult = await window.electronAPI.getWhisperModels();
            if (modelsResult.success) {
                this.initializeModelToggle(modelsResult.models, modelsResult.current);
                this.updateModelInfo(modelsResult.current);
            }
        } catch (error) {
            console.error('Failed to load models:', error);
        }
    }
    
    initializeModelToggle(models, current) {
        const toggle = document.getElementById('model-toggle');
        // Set toggle based on current model - checked = high accuracy (medium.en), unchecked = lower accuracy (small.en)
        toggle.checked = current.model === 'medium.en';
        this.updateToggleInfo(toggle.checked);
    }
    
    updateModelInfo(currentModel) {
        // Update toggle state based on current model
        const toggle = document.getElementById('model-toggle');
        toggle.checked = currentModel.model === 'medium.en';
        this.updateToggleInfo(toggle.checked);
    }
    
    updateToggleInfo(isHighAccuracy) {
        const modelInfo = document.getElementById('model-info');
        modelInfo.textContent = isHighAccuracy ? 'High Accuracy (Slower)' : 'Balanced (Faster)';
    }
    
    async toggleModel(isHighAccuracy) {
        try {
            const selectedModel = isHighAccuracy ? 'medium.en' : 'small.en';
            const result = await window.electronAPI.setWhisperModel(selectedModel);
            if (result.success) {
                this.updateToggleInfo(isHighAccuracy);
                console.log(`Model changed to: ${selectedModel}`);
                
                // Update the model info in the transcription display too
                const modelInfo = document.querySelector('.info-value');
                if (modelInfo && modelInfo.textContent.includes('Whisper')) {
                    modelInfo.textContent = `Whisper ${result.current.model} + Medical Dictionary`;
                }
            } else {
                this.showError('Failed to change model');
            }
        } catch (error) {
            console.error('Error changing model:', error);
            this.showError('Error changing model');
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DoctorDictateApp();
});

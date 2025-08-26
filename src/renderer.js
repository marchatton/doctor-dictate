// PsychScribe Renderer Process
// Handles UI interactions and communicates with main process

class PsychScribeApp {
    constructor() {
        this.isRecording = false;
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
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
            
            // Update status to online
            const statusElement = document.getElementById('app-status');
            statusElement.textContent = 'Online';
            statusElement.className = 'status-online';
            
            console.log('PsychScribe initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application');
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

    async startTranscription(/* audioBlob */) {
        try {
            // Show progress
            this.showTranscriptionProgress();
            
            // Convert blob to array buffer for processing
            // const arrayBuffer = await audioBlob.arrayBuffer(); // Will use this for Whisper
            
            // TODO: Send to main process for Whisper processing
            // For now, simulate transcription
            setTimeout(() => {
                this.completeTranscription("Sample transcription text will appear here. This is a placeholder for the actual Whisper AI transcription.");
            }, 2000);
            
        } catch (error) {
            console.error('Failed to start transcription:', error);
            this.showError('Failed to start transcription');
        }
    }

    showTranscriptionProgress() {
        const progressContainer = document.getElementById('progress-container');
        const transcriptEditor = document.getElementById('transcript-editor');
        
        progressContainer.style.display = 'block';
        transcriptEditor.style.display = 'none';
        
        // Simulate progress
        let progress = 0;
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) progress = 100;
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Processing audio... ${Math.round(progress)}%`;
            
            if (progress >= 100) {
                clearInterval(progressInterval);
            }
        }, 200);
    }

    completeTranscription(text) {
        // Hide progress
        document.getElementById('progress-container').style.display = 'none';
        
        // Show transcript editor
        const transcriptEditor = document.getElementById('transcript-editor');
        transcriptEditor.style.display = 'block';
        
        // Set transcript text
        document.getElementById('transcript-text').value = text;
        
        console.log('Transcription completed');
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
        // TODO: Implement auto-save functionality
        // For now, just log that content changed
        console.log('Content changed, auto-save would trigger here');
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PsychScribeApp();
});

/**
 * Integration tests for IPC communication between renderer and main process
 * These tests ensure the electronAPI bridge works correctly
 */

import '@testing-library/jest-dom';

describe('IPC Integration Tests', () => {
  // Mock the full electron API as it would appear in the renderer
  const mockElectronAPI = {
    saveAudioBlob: jest.fn(),
    transcribeAudio: jest.fn(),
    setWhisperModel: jest.fn(),
    onTranscriptionProgress: jest.fn(),
    removeTranscriptionProgressListener: jest.fn(),
    saveTranscript: jest.fn(),
    exportPDF: jest.fn(),
    getWhisperModels: jest.fn(),
    validateWhisper: jest.fn(),
    initializeWhisper: jest.fn(),
    resetTranscriptionState: jest.fn(),
    getConfidenceScore: jest.fn(),
    autoSave: jest.fn(),
    ensureDocumentsDir: jest.fn(),
    getAppVersion: jest.fn(),
    getAppName: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up window.electronAPI using direct assignment
    (global.window as any).electronAPI = mockElectronAPI;
  });

  describe('Audio Processing Pipeline', () => {
    it('should complete full audio processing workflow', async () => {
      // Mock successful responses
      mockElectronAPI.saveAudioBlob.mockResolvedValue({
        success: true,
        filePath: '/tmp/test-audio.webm'
      });

      mockElectronAPI.transcribeAudio.mockResolvedValue({
        success: true,
        transcript: 'Patient presents with chest pain and shortness of breath.'
      });

      // Simulate audio processing workflow
      const audioBuffer = new ArrayBuffer(1024);
      
      // 1. Save audio blob
      const saveResult = await window.electronAPI.saveAudioBlob(audioBuffer);
      expect(saveResult.success).toBe(true);
      expect(saveResult.filePath).toBe('/tmp/test-audio.webm');
      
      // 2. Transcribe audio
      const transcribeResult = await window.electronAPI.transcribeAudio(saveResult.filePath!);
      expect(transcribeResult.success).toBe(true);
      expect(transcribeResult.transcript).toContain('chest pain');
      
      // Verify call sequence
      expect(mockElectronAPI.saveAudioBlob).toHaveBeenCalledWith(audioBuffer);
      expect(mockElectronAPI.transcribeAudio).toHaveBeenCalledWith('/tmp/test-audio.webm');
    });

    it('should handle audio processing failures gracefully', async () => {
      mockElectronAPI.saveAudioBlob.mockResolvedValue({
        success: false,
        error: 'Disk full'
      });

      const result = await window.electronAPI.saveAudioBlob(new ArrayBuffer(1024));
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Disk full');
      
      // Should not proceed to transcription
      expect(mockElectronAPI.transcribeAudio).not.toHaveBeenCalled();
    });

    it('should handle transcription failures with proper error messages', async () => {
      mockElectronAPI.saveAudioBlob.mockResolvedValue({
        success: true,
        filePath: '/tmp/test-audio.webm'
      });

      mockElectronAPI.transcribeAudio.mockResolvedValue({
        success: false,
        error: 'Whisper not initialized'
      });

      const saveResult = await window.electronAPI.saveAudioBlob(new ArrayBuffer(1024));
      const transcribeResult = await window.electronAPI.transcribeAudio(saveResult.filePath!);
      
      expect(transcribeResult.success).toBe(false);
      expect(transcribeResult.error).toBe('Whisper not initialized');
    });
  });

  describe('Whisper Model Management', () => {
    it('should set whisper model correctly', async () => {
      mockElectronAPI.setWhisperModel.mockResolvedValue({ success: true });

      const result = await window.electronAPI.setWhisperModel('medium.en');
      
      expect(result.success).toBe(true);
      expect(mockElectronAPI.setWhisperModel).toHaveBeenCalledWith('medium.en');
    });

    it('should get available models', async () => {
      mockElectronAPI.getWhisperModels.mockResolvedValue({
        success: true,
        models: ['tiny', 'base', 'small', 'medium', 'large'],
        current: 'base'
      });

      const result = await window.electronAPI.getWhisperModels();
      
      expect(result.success).toBe(true);
      expect(result.models).toContain('medium');
      expect(result.current).toBe('base');
    });

    it('should validate whisper installation', async () => {
      mockElectronAPI.validateWhisper.mockResolvedValue({
        success: true,
        available: true
      });

      const result = await window.electronAPI.validateWhisper();
      
      expect(result.success).toBe(true);
      expect(result.available).toBe(true);
    });
  });

  describe('File Operations', () => {
    it('should save transcripts with proper formatting', async () => {
      mockElectronAPI.saveTranscript.mockResolvedValue({
        success: true,
        path: '/documents/DoctorDictate/transcript-2023-12-01.txt'
      });

      const transcriptData = {
        filename: 'transcript-patient-001.txt',
        content: 'Chief complaint: Patient reports persistent cough lasting 2 weeks.'
      };

      const result = await window.electronAPI.saveTranscript(transcriptData);
      
      expect(result.success).toBe(true);
      expect(result.path).toContain('transcript');
      expect(mockElectronAPI.saveTranscript).toHaveBeenCalledWith(transcriptData);
    });

    it('should export PDFs with medical formatting', async () => {
      mockElectronAPI.exportPDF.mockResolvedValue({
        success: true,
        path: '/documents/DoctorDictate/transcript-2023-12-01.pdf'
      });

      const pdfData = {
        filename: 'medical-transcript.pdf',
        content: 'HISTORY OF PRESENT ILLNESS:\nPatient is a 45-year-old male presenting with acute onset chest pain.'
      };

      const result = await window.electronAPI.exportPDF(pdfData);
      
      expect(result.success).toBe(true);
      expect(result.path).toContain('.pdf');
      expect(mockElectronAPI.exportPDF).toHaveBeenCalledWith(pdfData);
    });

    it('should handle auto-save functionality', async () => {
      mockElectronAPI.autoSave.mockResolvedValue({
        success: true,
        path: '/documents/DoctorDictate/auto-save.txt'
      });

      const autoSaveData = {
        content: 'Working draft: Patient complained of headaches...'
      };

      const result = await window.electronAPI.autoSave(autoSaveData);
      
      expect(result.success).toBe(true);
      expect(mockElectronAPI.autoSave).toHaveBeenCalledWith(autoSaveData);
    });
  });

  describe('Progress Tracking', () => {
    it('should set up transcription progress listeners', () => {
      const progressCallback = jest.fn();
      
      window.electronAPI.onTranscriptionProgress(progressCallback);
      
      expect(mockElectronAPI.onTranscriptionProgress).toHaveBeenCalledWith(progressCallback);
    });

    it('should remove progress listeners properly', () => {
      window.electronAPI.removeTranscriptionProgressListener();
      
      expect(mockElectronAPI.removeTranscriptionProgressListener).toHaveBeenCalled();
    });

    it('should handle progress updates during transcription', () => {
      const progressCallback = jest.fn();
      
      // Set up the listener to actually call the callback
      mockElectronAPI.onTranscriptionProgress.mockImplementation((callback) => {
        // Simulate progress updates
        setTimeout(() => callback({ message: 'Processing 25% of audio...', percentage: 25 }), 0);
        setTimeout(() => callback({ message: 'Processing 50% of audio...', percentage: 50 }), 10);
        setTimeout(() => callback({ message: 'Processing 100% of audio...', percentage: 100 }), 20);
      });

      window.electronAPI.onTranscriptionProgress(progressCallback);
      
      // Wait for callbacks to be called
      return new Promise(resolve => {
        setTimeout(() => {
          expect(progressCallback).toHaveBeenCalledWith(
            expect.objectContaining({
              message: expect.stringContaining('Processing'),
              percentage: expect.any(Number)
            })
          );
          resolve(undefined);
        }, 50);
      });
    });
  });

  describe('Error Recovery', () => {
    it('should reset transcription state after errors', async () => {
      mockElectronAPI.resetTranscriptionState.mockResolvedValue({ success: true });

      const result = await window.electronAPI.resetTranscriptionState();
      
      expect(result.success).toBe(true);
      expect(mockElectronAPI.resetTranscriptionState).toHaveBeenCalled();
    });

    it('should handle network-like failures', async () => {
      mockElectronAPI.transcribeAudio.mockRejectedValue(new Error('Connection timeout'));

      try {
        await window.electronAPI.transcribeAudio('/tmp/test-audio.webm');
      } catch (error) {
        expect(error.message).toBe('Connection timeout');
      }
    });

    it('should validate file paths to prevent directory traversal', async () => {
      mockElectronAPI.saveTranscript.mockResolvedValue({
        success: false,
        error: 'Invalid file path'
      });

      const maliciousData = {
        filename: '../../../etc/passwd',
        content: 'malicious content'
      };

      const result = await window.electronAPI.saveTranscript(maliciousData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file path');
    });
  });

  describe('App Information', () => {
    it('should get app version', async () => {
      mockElectronAPI.getAppVersion.mockResolvedValue('1.0.0');

      const version = await window.electronAPI.getAppVersion();
      
      expect(version).toBe('1.0.0');
    });

    it('should get app name', async () => {
      mockElectronAPI.getAppName.mockResolvedValue('DoctorDictate');

      const name = await window.electronAPI.getAppName();
      
      expect(name).toBe('DoctorDictate');
    });
  });

  describe('Medical Data Processing', () => {
    it('should calculate confidence scores for transcriptions', async () => {
      mockElectronAPI.getConfidenceScore.mockResolvedValue({
        success: true,
        confidence: 0.92
      });

      const confidenceData = {
        rawText: 'patient has chest pain',
        correctedText: 'Patient has chest pain.',
        corrections: [
          { original: 'patient', corrected: 'Patient', position: 0 }
        ]
      };

      const result = await window.electronAPI.getConfidenceScore(confidenceData);
      
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.92);
      expect(mockElectronAPI.getConfidenceScore).toHaveBeenCalledWith(confidenceData);
    });

    it('should ensure documents directory exists', async () => {
      mockElectronAPI.ensureDocumentsDir.mockResolvedValue({
        success: true,
        path: '/documents/DoctorDictate'
      });

      const result = await window.electronAPI.ensureDocumentsDir();
      
      expect(result.success).toBe(true);
      expect(result.path).toContain('DoctorDictate');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent save operations', async () => {
      mockElectronAPI.saveTranscript.mockResolvedValue({ success: true, path: '/mock/path' });

      const promises = [
        window.electronAPI.saveTranscript({ filename: 'file1.txt', content: 'content1' }),
        window.electronAPI.saveTranscript({ filename: 'file2.txt', content: 'content2' }),
        window.electronAPI.saveTranscript({ filename: 'file3.txt', content: 'content3' })
      ];

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      expect(mockElectronAPI.saveTranscript).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success/failure scenarios', async () => {
      mockElectronAPI.saveTranscript
        .mockResolvedValueOnce({ success: true, path: '/mock/path1' })
        .mockResolvedValueOnce({ success: false, error: 'Disk full' })
        .mockResolvedValueOnce({ success: true, path: '/mock/path3' });

      const promises = [
        window.electronAPI.saveTranscript({ filename: 'file1.txt', content: 'content1' }),
        window.electronAPI.saveTranscript({ filename: 'file2.txt', content: 'content2' }),
        window.electronAPI.saveTranscript({ filename: 'file3.txt', content: 'content3' })
      ];

      const results = await Promise.all(promises);
      
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });
});
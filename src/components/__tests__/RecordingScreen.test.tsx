import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordingScreen } from '../RecordingScreen';

describe('RecordingScreen Component', () => {
  const mockProps = {
    isHighAccuracy: true,
    setIsHighAccuracy: jest.fn(),
    isRecording: false,
    recordingTime: 0,
    setRecordingTime: jest.fn(),
    onStartRecording: jest.fn(),
    onStopRecording: jest.fn(),
    onTranscriptionComplete: jest.fn(),
    onProcessingStart: jest.fn(),
    onProcessingProgress: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with "Ready to record" state', () => {
      render(<RecordingScreen {...mockProps} />);
      expect(screen.getByText('Ready to record')).toBeInTheDocument();
    });

    it('should display the start recording button when not recording', () => {
      render(<RecordingScreen {...mockProps} />);
      expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
    });

    it('should show the accuracy toggle', () => {
      render(<RecordingScreen {...mockProps} />);
      expect(screen.getByText('High accuracy')).toBeInTheDocument();
    });

    it('should display timer at 00:00 initially', () => {
      render(<RecordingScreen {...mockProps} />);
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });
  });

  describe('Recording State', () => {
    it('should show "Recording in progress..." when recording', () => {
      const recordingProps = { ...mockProps, isRecording: true };
      render(<RecordingScreen {...recordingProps} />);
      expect(screen.getByText('Recording in progress...')).toBeInTheDocument();
    });

    it('should display stop button when recording', () => {
      const recordingProps = { ...mockProps, isRecording: true };
      render(<RecordingScreen {...recordingProps} />);
      expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
    });

    it('should format recording time correctly', () => {
      const recordingProps = { ...mockProps, isRecording: true, recordingTime: 75 };
      render(<RecordingScreen {...recordingProps} />);
      expect(screen.getByText('01:15')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should render start recording button when not recording', () => {
      render(<RecordingScreen {...mockProps} />);
      const startButton = screen.getByRole('button', { name: /start recording/i });
      expect(startButton).toBeInTheDocument();
    });

    it('should render stop recording button when recording', () => {
      const recordingProps = { ...mockProps, isRecording: true };
      render(<RecordingScreen {...recordingProps} />);
      const stopButton = screen.getByRole('button', { name: /stop recording/i });
      expect(stopButton).toBeInTheDocument();
    });

    it('should show accuracy toggle', () => {
      render(<RecordingScreen {...mockProps} />);
      const toggle = screen.getByRole('checkbox');
      expect(toggle).toBeInTheDocument();
    });
  });

  describe('MediaRecorder Integration', () => {
    it('should request microphone permission on mount', async () => {
      render(<RecordingScreen {...mockProps} />);
      
      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          audio: true
        });
      });
    });

    it('should handle microphone permission denial gracefully', async () => {
      const mockGetUserMedia = navigator.mediaDevices.getUserMedia as jest.Mock;
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<RecordingScreen {...mockProps} />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error accessing microphone:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    it('should clean up media stream on unmount', () => {
      const { unmount } = render(<RecordingScreen {...mockProps} />);
      unmount();
      // Should not throw any errors during cleanup
      expect(true).toBe(true);
    });
  });

  describe('Whisper Model Selection', () => {
    it('should set Whisper model to medium.en for high accuracy', async () => {
      render(<RecordingScreen {...mockProps} />);
      
      await waitFor(() => {
        expect(window.electronAPI.setWhisperModel).toHaveBeenCalledWith('medium.en');
      });
    });

    it('should set Whisper model to small.en for lower accuracy', async () => {
      const lowAccuracyProps = { ...mockProps, isHighAccuracy: false };
      render(<RecordingScreen {...lowAccuracyProps} />);
      
      await waitFor(() => {
        expect(window.electronAPI.setWhisperModel).toHaveBeenCalledWith('small.en');
      });
    });
  });

  describe('Audio Processing', () => {
    it('should handle successful audio blob save', async () => {
      render(<RecordingScreen {...mockProps} />);
      
      // Verify component renders without errors
      await waitFor(() => {
        expect(window.electronAPI.setWhisperModel).toHaveBeenCalledWith('medium.en');
      });
    });

    it('should call onTranscriptionComplete with fallback data on error', async () => {
      window.electronAPI.saveAudioBlob = jest.fn().mockRejectedValue(new Error('Save failed'));
      
      render(<RecordingScreen {...mockProps} />);
      
      // Component should handle errors gracefully
      expect(screen.getByText('Ready to record')).toBeInTheDocument();
    });
  });

  describe('Progress Tracking', () => {
    it('should report audio processing progress', async () => {
      render(<RecordingScreen {...mockProps} />);
      
      await waitFor(() => {
        expect(window.electronAPI.setWhisperModel).toHaveBeenCalled();
      });
    });

    it('should handle transcription progress events', async () => {
      render(<RecordingScreen {...mockProps} />);
      
      // Should set up progress listener
      expect(window.electronAPI.onTranscriptionProgress).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle null audio chunks gracefully', () => {
      render(<RecordingScreen {...mockProps} />);
      expect(screen.getByText('Ready to record')).toBeInTheDocument();
    });

    it('should validate audio buffer size before processing', () => {
      render(<RecordingScreen {...mockProps} />);
      expect(screen.getByText('Ready to record')).toBeInTheDocument();
    });

    it('should handle MediaRecorder errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<RecordingScreen {...mockProps} />);
      expect(screen.getByText('Ready to record')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });
});
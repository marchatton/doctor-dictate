import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TranscriptScreen } from '../TranscriptScreen';

jest.mock('react-markdown', () => (props: { children: React.ReactNode }) => <>{props.children}</>);

describe('TranscriptScreen Component', () => {
  const baseMetadata = {
    duration: 0,
    medicalTermsCount: 0,
    correctionsCount: 0,
    corrections: [],
    medications: [],
    mode: 'accurate',
    formattingMetadata: undefined,
    modeDecision: undefined,
  };

  const mockProps = {
    transcript: 'Patient presents with mild anxiety and reports improved sleep patterns.',
    setTranscript: jest.fn(),
    onNewRecording: jest.fn(),
    patientName: 'John Doe',
    modeKey: 'accurate',
    modeLabel: 'Accurate mode',
    recordingMetadata: baseMetadata,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    });

    // Mock electronAPI
    window.electronAPI = {
      saveTranscript: jest.fn().mockResolvedValue({ success: true }),
      exportPDF: jest.fn().mockResolvedValue({ success: true })
    };
  });

  describe('Basic Rendering', () => {
    it('should render transcript content', () => {
      render(<TranscriptScreen {...mockProps} />);
      expect(screen.getByText(/Patient presents with mild anxiety/)).toBeInTheDocument();
    });

    it('should render without errors', () => {
      expect(() => render(<TranscriptScreen {...mockProps} />)).not.toThrow();
    });

    it('should show completion indicator', () => {
      render(<TranscriptScreen {...mockProps} />);
      expect(screen.getByText('Transcription complete')).toBeInTheDocument();
    });

    it('should display action buttons', () => {
      render(<TranscriptScreen {...mockProps} />);
      expect(screen.getByText('Copy text')).toBeInTheDocument();
      expect(screen.getByText('Record new note')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onNewRecording when new recording button is confirmed', () => {
      render(<TranscriptScreen {...mockProps} />);
      const newRecordingButton = screen.getByText('Record new note');

      fireEvent.click(newRecordingButton);
      const confirmButton = screen.getByText('Discard notes and create new recording');
      fireEvent.click(confirmButton);
      expect(mockProps.onNewRecording).toHaveBeenCalled();
    });

    it('should copy transcript to clipboard', async () => {
      render(<TranscriptScreen {...mockProps} />);
      const copyButton = screen.getByText('Copy text');
      
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockProps.transcript);
      });
    });

    it('should have save and export buttons', () => {
      render(<TranscriptScreen {...mockProps} />);
      
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
    });
  });

  describe('File Operations', () => {
    it('should save transcript when save button is clicked', async () => {
      render(<TranscriptScreen {...mockProps} />);
      const saveButton = screen.getByText('Save');
      
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(window.electronAPI.saveTranscript).toHaveBeenCalled();
      });
    });

    it('should export PDF when export button is clicked', async () => {
      render(<TranscriptScreen {...mockProps} />);
      const exportButton = screen.getByText('Export PDF');
      
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(window.electronAPI.exportPDF).toHaveBeenCalled();
      });
    });
  });

  describe('Basic Functionality', () => {
    it('should handle transcript display', () => {
      render(<TranscriptScreen {...mockProps} />);
      expect(screen.getByText(/Patient presents with mild anxiety/)).toBeInTheDocument();
    });

    it('should handle empty transcript gracefully', () => {
      const emptyProps = { ...mockProps, transcript: '' };
      expect(() => render(<TranscriptScreen {...emptyProps} />)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle save failures gracefully', async () => {
      window.electronAPI.saveTranscript = jest.fn().mockResolvedValue({ success: false });
      
      render(<TranscriptScreen {...mockProps} />);
      const saveButton = screen.getByText('Save');
      
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(window.electronAPI.saveTranscript).toHaveBeenCalled();
      });
    });

    it('should handle clipboard errors gracefully', async () => {
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Clipboard error'));

      render(<TranscriptScreen {...mockProps} />);
      const copyButton = screen.getByText('Copy text');

      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });
  });
});

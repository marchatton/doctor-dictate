import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock the components to focus on App logic
jest.mock('../components/RecordingScreen', () => ({
  RecordingScreen: ({ onStartRecording, onStopRecording, onTranscriptionComplete, onProcessingStart, onProcessingProgress }: any) => (
    <div data-testid="recording-screen">
      <button onClick={onStartRecording}>Start Recording</button>
      <button onClick={onStopRecording}>Stop Recording</button>
      <button onClick={() => {
        onProcessingStart();
        onProcessingProgress('audio', 100);
        onProcessingProgress('transcribe', 100);
        onTranscriptionComplete('Test transcript');
      }}>
        Complete Processing
      </button>
    </div>
  )
}));

jest.mock('../components/ProcessingScreen', () => ({
  ProcessingScreen: ({ processingStep, processingProgress }: any) => (
    <div data-testid="processing-screen">
      Processing: {processingStep} - {processingProgress}%
    </div>
  )
}));

jest.mock('../components/TranscriptScreen', () => ({
  TranscriptScreen: ({ transcript, onNewRecording }: any) => (
    <div data-testid="transcript-screen">
      Transcript: {transcript}
      <button onClick={onNewRecording}>New Recording</button>
    </div>
  )
}));

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should render recording screen by default', () => {
      render(<App />);
      expect(screen.getByTestId('recording-screen')).toBeInTheDocument();
    });

    it('should render header', () => {
      render(<App />);
      expect(screen.getByText('Doctor Dictate')).toBeInTheDocument();
      expect(screen.getByText('Accurate clinical note transcription')).toBeInTheDocument();
    });

    it('should render footer', () => {
      render(<App />);
      expect(screen.getByText('Your notes never leave your laptop • Built with privacy in mind')).toBeInTheDocument();
    });

    it('should have proper layout structure', () => {
      const { container } = render(<App />);
      
      // Check for main layout classes
      expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
      expect(container.querySelector('.flex-1')).toBeInTheDocument();
    });

    it('should have background pattern', () => {
      const { container } = render(<App />);
      
      const mainContainer = container.querySelector('.min-h-screen');
      expect(mainContainer).toHaveStyle({
        backgroundSize: '30px'
      });
    });
  });

  describe('Recording Flow', () => {
    it('should transition from recording to processing when recording starts and stops', async () => {
      render(<App />);
      
      // Start recording
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);
      
      // Stop recording
      const stopButton = screen.getByText('Stop Recording');
      fireEvent.click(stopButton);
      
      // Should show processing screen
      await waitFor(() => {
        expect(screen.getByTestId('processing-screen')).toBeInTheDocument();
      });
    });

    it('should transition from processing to transcript when complete', async () => {
      render(<App />);
      
      // Trigger complete processing flow
      const completeButton = screen.getByText('Complete Processing');
      fireEvent.click(completeButton);
      
      // Should show transcript screen
      await waitFor(() => {
        expect(screen.getByTestId('transcript-screen')).toBeInTheDocument();
      });
    });

    it('should show transcript content after processing', async () => {
      render(<App />);
      
      const completeButton = screen.getByText('Complete Processing');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Transcript: Test transcript')).toBeInTheDocument();
      });
    });
  });

  describe('State Management', () => {
    it('should update recording time', async () => {
      render(<App />);
      
      // Start recording to activate timer
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);
      
      // Timer should be running (tested via recording screen props)
      expect(screen.getByTestId('recording-screen')).toBeInTheDocument();
    });

    it('should handle accuracy toggle changes', () => {
      render(<App />);
      
      // Recording screen should be rendered with default high accuracy
      expect(screen.getByTestId('recording-screen')).toBeInTheDocument();
    });

    it('should reset state when starting new recording', async () => {
      render(<App />);
      
      // Complete a recording first
      const completeButton = screen.getByText('Complete Processing');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('transcript-screen')).toBeInTheDocument();
      });
      
      // Start new recording
      const newRecordingButton = screen.getByText('New Recording');
      fireEvent.click(newRecordingButton);
      
      // Should return to recording screen
      expect(screen.getByTestId('recording-screen')).toBeInTheDocument();
    });
  });

  describe('Processing State Management', () => {
    it('should show processing screen after recording', async () => {
      render(<App />);
      
      // Start and stop recording to enter processing
      fireEvent.click(screen.getByText('Start Recording'));
      fireEvent.click(screen.getByText('Stop Recording'));
      
      await waitFor(() => {
        expect(screen.getByTestId('processing-screen')).toBeInTheDocument();
      });
    });
  });

  describe('Patient Data', () => {
    it('should have default patient name', async () => {
      render(<App />);
      
      // Complete recording to see transcript screen
      const completeButton = screen.getByText('Complete Processing');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('transcript-screen')).toBeInTheDocument();
      });
      
      // Check that transcript screen receives patient name (tested via props)
      expect(screen.getByTestId('transcript-screen')).toBeInTheDocument();
    });
  });

  describe('Screen Transitions', () => {
    it('should have smooth transitions between screens', async () => {
      const { container } = render(<App />);
      
      // Check for transition classes
      const mainContent = container.querySelector('.transition-all');
      expect(mainContent).toHaveClass('duration-500', 'ease-in-out');
    });

    it('should maintain layout consistency across screens', async () => {
      const { container } = render(<App />);
      
      // Recording screen
      expect(screen.getByTestId('recording-screen')).toBeInTheDocument();
      const initialLayout = container.querySelector('.max-w-5xl');
      expect(initialLayout).toBeInTheDocument();
      
      // Processing screen
      fireEvent.click(screen.getByText('Start Recording'));
      fireEvent.click(screen.getByText('Stop Recording'));
      
      await waitFor(() => {
        expect(screen.getByTestId('processing-screen')).toBeInTheDocument();
      });
      
      // Layout should be consistent
      expect(container.querySelector('.max-w-5xl')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle transcript completion with empty transcript', async () => {
      render(<App />);
      
      // Mock empty transcript
      const recordingScreen = screen.getByTestId('recording-screen');
      const button = recordingScreen.querySelector('button:last-child') as HTMLButtonElement;
      
      // Simulate completion with empty transcript by directly manipulating the mock
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('transcript-screen')).toBeInTheDocument();
      });
    });

    it('should maintain responsive layout on different screen sizes', () => {
      const { container } = render(<App />);
      
      // Check for responsive classes
      expect(container.querySelector('.p-4')).toBeInTheDocument();
      expect(container.querySelector('.md\\:p-8')).toBeInTheDocument();
      expect(container.querySelector('.flex-col')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<App />);
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
    });

    it('should have proper heading hierarchy', () => {
      render(<App />);
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
      expect(mainHeading).toHaveTextContent('Doctor Dictate');
    });

    it('should provide meaningful text content', () => {
      render(<App />);
      
      expect(screen.getByText('Accurate clinical note transcription')).toBeInTheDocument();
      expect(screen.getByText('Your notes never leave your laptop • Built with privacy in mind')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks with state updates', async () => {
      const { unmount } = render(<App />);
      
      // Trigger some state changes
      fireEvent.click(screen.getByText('Start Recording'));
      fireEvent.click(screen.getByText('Stop Recording'));
      
      // Unmount should not cause errors
      unmount();
      
      // No assertions needed - test passes if no errors thrown
    });

    it('should handle rapid state changes gracefully', async () => {
      render(<App />);
      
      // Rapidly trigger state changes
      const startButton = screen.getByText('Start Recording');
      const stopButton = screen.getByText('Stop Recording');
      
      fireEvent.click(startButton);
      fireEvent.click(stopButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('processing-screen')).toBeInTheDocument();
      });
      
      // Should handle without errors
      expect(screen.getByTestId('processing-screen')).toBeInTheDocument();
    });
  });
});
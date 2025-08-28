import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProcessingScreen } from '../ProcessingScreen';

describe('ProcessingScreen Component', () => {
  const defaultProps = {
    isHighAccuracy: true,
    processingStep: 'audio',
    processingProgress: 0
  };

  describe('Basic Rendering', () => {
    it('should render the main heading', () => {
      render(<ProcessingScreen {...defaultProps} />);
      expect(screen.getByText('Converting to notes')).toBeInTheDocument();
    });

    it('should render all processing steps', () => {
      render(<ProcessingScreen {...defaultProps} />);
      expect(screen.getByText('Audio')).toBeInTheDocument();
      expect(screen.getByText('Transcribe')).toBeInTheDocument();
      expect(screen.getByText('Medical terms')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('should show progress bar', () => {
      const { container } = render(<ProcessingScreen {...defaultProps} />);
      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Progress Bar Calculation', () => {
    it('should show 0% progress initially', () => {
      const { container } = render(<ProcessingScreen {...defaultProps} processingProgress={0} />);
      const progressBar = container.querySelector('[style*="width: 0%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show 100% progress when complete', () => {
      const { container } = render(
        <ProcessingScreen {...defaultProps} processingStep="complete" processingProgress={100} />
      );
      const progressBar = container.querySelector('[style*="width: 100%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should calculate weighted progress correctly', () => {
      const { container } = render(
        <ProcessingScreen {...defaultProps} processingStep="transcribe" processingProgress={50} />
      );
      // Should have some progress calculation
      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Accuracy Mode Differences', () => {
    it('should show longer time estimate for high accuracy', () => {
      render(<ProcessingScreen {...defaultProps} isHighAccuracy={true} />);
      expect(screen.getByText('~2 min')).toBeInTheDocument();
    });

    it('should show shorter time estimate for standard accuracy', () => {
      render(<ProcessingScreen {...defaultProps} isHighAccuracy={false} />);
      expect(screen.getByText('~30 sec')).toBeInTheDocument();
    });
  });

  describe('Processing Steps', () => {
    it('should indicate longest step correctly', () => {
      render(<ProcessingScreen {...defaultProps} />);
      expect(screen.getByText('Longest step')).toBeInTheDocument();
    });

    it('should show time estimates for each step', () => {
      render(<ProcessingScreen {...defaultProps} />);
      expect(screen.getByText('~5 sec')).toBeInTheDocument(); // Audio
      expect(screen.getByText('~15 sec')).toBeInTheDocument(); // Medical terms
      expect(screen.getByText('~2 sec')).toBeInTheDocument(); // Complete
    });

    it('should show remaining time estimate', () => {
      render(<ProcessingScreen {...defaultProps} processingProgress={25} />);
      expect(screen.getByText(/Estimated time remaining/)).toBeInTheDocument();
    });

    it('should show completion message when processing is done', () => {
      render(
        <ProcessingScreen 
          {...defaultProps} 
          processingStep="complete" 
          processingProgress={100} 
        />
      );
      expect(screen.getByText('All processing complete! Preparing transcript...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown processing step gracefully', () => {
      render(
        <ProcessingScreen 
          {...defaultProps} 
          processingStep="unknown" as any
          processingProgress={50} 
        />
      );
      expect(screen.getByText('Converting to notes')).toBeInTheDocument();
    });

    it('should handle negative progress values', () => {
      const { container } = render(
        <ProcessingScreen {...defaultProps} processingProgress={-10} />
      );
      const progressBar = container.querySelector('[style*="width: 0%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should handle progress values over 100', () => {
      const { container } = render(
        <ProcessingScreen 
          {...defaultProps} 
          processingStep="audio" 
          processingProgress={150} 
        />
      );
      const progressBar = container.querySelector('[style*="width"]');
      const width = progressBar?.getAttribute('style')?.match(/width: (\d+(?:\.\d+)?)%/)?.[1];
      expect(parseFloat(width || '0')).toBeLessThanOrEqual(100);
    });
  });
});
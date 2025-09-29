import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProcessingScreen } from '../ProcessingScreen';

const renderProcessing = (props: Partial<React.ComponentProps<typeof ProcessingScreen>> = {}) =>
  render(
    <ProcessingScreen
      isHighAccuracy
      processingStep="audio"
      processingProgress={0}
      {...props}
    />
  );

describe('ProcessingScreen', () => {
  it('renders the primary heading', () => {
    renderProcessing();
    expect(screen.getByText('Converting to notes')).toBeInTheDocument();
  });

  it('lists every processing step with default statuses', () => {
    renderProcessing();

    expect(screen.getByText('Preparing audio')).toBeInTheDocument();
    expect(screen.getByText('Transcribing speech')).toBeInTheDocument();
    expect(screen.getByText('Medical formatting')).toBeInTheDocument();
    expect(screen.getByText('Finalizing')).toBeInTheDocument();

    expect(screen.getAllByText('Pending')).toHaveLength(3);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('shows high-accuracy time remaining copy', () => {
    renderProcessing({ processingProgress: 10 });
    expect(screen.getByText(/Estimated time remaining: ~3 minutes/)).toBeInTheDocument();
  });

  it('switches to standard accuracy timing when requested', () => {
    renderProcessing({ isHighAccuracy: false });
    expect(screen.getByText(/Estimated time remaining: ~1 minute/)).toBeInTheDocument();
  });

  it('marks previous steps as completed when progressing', () => {
    renderProcessing({ processingStep: 'medical', processingProgress: 50 });

    const completedBadges = screen.getAllByText('Completed');
    expect(completedBadges.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('shows completion message when final step is reached', () => {
    renderProcessing({ processingStep: 'complete', processingProgress: 100 });
    expect(
      screen.getByText('All processing complete! Preparing transcript...')
    ).toBeInTheDocument();
  });
});

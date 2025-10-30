import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranscriptionModeSelector } from '../ui/TranscriptionModeSelector';

describe('TranscriptionModeSelector', () => {
  const modes = [
    {
      key: 'fast',
      label: 'Fast',
      description: 'Quick whisper.cpp mode',
      details: ['Base.en model', '≤2GB RAM'],
    },
    {
      key: 'accurate',
      label: 'Accurate',
      description: 'Faster-Whisper bridge',
      details: ['Small.en model', 'VAD enabled'],
    },
  ];

  it('renders provided modes and highlights the selected one', () => {
    const handleSelect = jest.fn();
    render(
      <TranscriptionModeSelector
        modes={modes}
        selectedKey="fast"
        onSelect={handleSelect}
      />
    );

    const buttons = screen.getAllByRole('button');
    const fastButton = buttons.find((button) => button.textContent?.includes('Fast'));
    const accurateButton = buttons.find((button) => button.textContent?.startsWith('Accurate'));

    expect(fastButton).toHaveAttribute('aria-pressed', 'true');
    expect(accurateButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Quick whisper.cpp mode')).toBeInTheDocument();
  });

  it('calls onSelect when a new mode is chosen', () => {
    const handleSelect = jest.fn();
    render(
      <TranscriptionModeSelector
        modes={modes}
        selectedKey="fast"
        onSelect={handleSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /accurate/i }));
    expect(handleSelect).toHaveBeenCalledWith('accurate');
  });
});

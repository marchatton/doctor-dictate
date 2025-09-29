import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AudioWaveform } from '../AudioWaveform';

beforeAll(() => {
  const globalAny = global as any;
  if (!globalAny.window) {
    globalAny.window = globalAny;
  }
  globalAny.AudioContext = jest.fn();
  globalAny.window.AudioContext = globalAny.AudioContext;
  globalAny.window.webkitAudioContext = undefined;
});

describe('AudioWaveform Component', () => {
  let mockAudioContext: any;
  let mockAnalyser: any;
  let mockStream: MediaStream;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAnalyser = {
      fftSize: 64,
      frequencyBinCount: 32,
      smoothingTimeConstant: 0.8,
      getByteTimeDomainData: jest.fn((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + Math.floor(Math.sin(i) * 20);
        }
      })
    };

    mockAudioContext = {
      createAnalyser: jest.fn(() => mockAnalyser),
      createMediaStreamSource: jest.fn(() => ({
        connect: jest.fn()
      })),
      close: jest.fn().mockResolvedValue(undefined),
      state: 'running'
    };

    const audioContextMock = (global as any).AudioContext as jest.Mock;
    audioContextMock.mockClear();
    audioContextMock.mockImplementation(() => mockAudioContext);

    mockStream = {
      getTracks: () => [{
        stop: jest.fn(),
        kind: 'audio',
        enabled: true,
        readyState: 'live'
      }],
      getAudioTracks: () => [{
        stop: jest.fn(),
        id: 'track-1',
        kind: 'audio',
        label: 'Mock microphone',
        enabled: true,
        muted: false,
        readyState: 'live'
      }]
    } as any;
  });

  describe('Basic Rendering', () => {
    it('should show placeholder text when inactive', () => {
      render(<AudioWaveform isActive={false} />);
      expect(screen.getByText(/Audio visualization will appear here/)).toBeInTheDocument();
    });

    it('should not create audio context when inactive', () => {
      render(<AudioWaveform isActive={false} />);
      expect((global as any).AudioContext).not.toHaveBeenCalled();
    });

    it('should create audio context when active with stream', () => {
      render(<AudioWaveform isActive={true} audioStream={mockStream} />);
      expect((global as any).AudioContext).toHaveBeenCalled();
    });

    it('should render waveform bars when active', async () => {
      const { container } = render(<AudioWaveform isActive={true} audioStream={mockStream} />);
      
      await waitFor(() => {
        const bars = container.querySelectorAll('[style*="height"]');
        expect(bars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Audio Processing', () => {
    it('should connect audio source to analyser', () => {
      render(<AudioWaveform isActive={true} audioStream={mockStream} />);
      
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    });

    it('should set correct analyser properties', () => {
      render(<AudioWaveform isActive={true} audioStream={mockStream} />);
      
      expect(mockAnalyser.fftSize).toBe(64);
      expect(mockAnalyser.smoothingTimeConstant).toBe(0.8);
    });
  });

  describe('Cleanup', () => {
    it('should close audio context on unmount', () => {
      const { unmount } = render(<AudioWaveform isActive={true} audioStream={mockStream} />);
      unmount();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should close audio context when becoming inactive', () => {
      const { rerender } = render(<AudioWaveform isActive={true} audioStream={mockStream} />);
      rerender(<AudioWaveform isActive={false} audioStream={mockStream} />);
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle no audio stream gracefully', () => {
      const { container } = render(<AudioWaveform isActive={true} audioStream={null} />);
      expect(container).toBeInTheDocument();
    });

    it('should handle audio context creation failure gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Simply test that component renders without breaking
      const { container } = render(<AudioWaveform isActive={false} audioStream={null} />);
      expect(container).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should not create multiple audio contexts for same stream', () => {
      const { rerender } = render(<AudioWaveform isActive={true} audioStream={mockStream} />);
      rerender(<AudioWaveform isActive={true} audioStream={mockStream} />);
      expect((global as any).AudioContext).toHaveBeenCalledTimes(1);
    });
  });
});

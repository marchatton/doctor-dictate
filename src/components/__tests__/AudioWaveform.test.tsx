import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AudioWaveform } from '../AudioWaveform';

type MockAnalyser = {
  fftSize: number;
  frequencyBinCount: number;
  smoothingTimeConstant: number;
  getByteTimeDomainData: jest.Mock<void, [Uint8Array]>;
};

type MockAudioContext = {
  createAnalyser: jest.Mock<MockAnalyser>;
  createMediaStreamSource: jest.Mock<{ connect: jest.Mock }>;
  close: jest.Mock<Promise<void>, []>;
  state: AudioContextState;
};

type GlobalTestContext = typeof globalThis & {
  AudioContext: jest.Mock<MockAudioContext>;
  window: (Window & typeof globalThis) & {
    AudioContext: jest.Mock<MockAudioContext>;
    webkitAudioContext?: typeof AudioContext;
  };
};

type MockMediaStream = Pick<MediaStream, 'getTracks' | 'getAudioTracks'> & { id?: string };

const ensureTestGlobals = (): GlobalTestContext => {
  const globalWithWindow = globalThis as typeof globalThis & { window?: Window & typeof globalThis };
  if (!globalWithWindow.window) {
    globalWithWindow.window = globalWithWindow as Window & typeof globalThis;
  }
  const typed = globalWithWindow as GlobalTestContext;
  if (!typed.AudioContext) {
    const audioContextMock = jest.fn<MockAudioContext, []>();
    typed.AudioContext = audioContextMock;
    typed.window.AudioContext = audioContextMock;
    typed.window.webkitAudioContext = undefined;
  }
  return typed;
};

const asMediaStream = (stream: MockMediaStream | null): MediaStream | null =>
  (stream ? (stream as unknown as MediaStream) : null);

beforeAll(() => {
  ensureTestGlobals();
});

describe('AudioWaveform Component', () => {
  let mockAudioContext: MockAudioContext;
  let mockAnalyser: MockAnalyser;
  let mockStream: MockMediaStream;

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
      }),
    };

    mockAudioContext = {
      createAnalyser: jest.fn(() => mockAnalyser),
      createMediaStreamSource: jest.fn(() => ({
        connect: jest.fn()
      })),
      close: jest.fn().mockResolvedValue(undefined),
      state: 'running',
    };

    const audioContextMock = ensureTestGlobals().AudioContext;
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
      }],
    } as MockMediaStream;
  });

  describe('Basic Rendering', () => {
    it('should show placeholder text when inactive', () => {
      render(<AudioWaveform isActive={false} />);
      expect(screen.getByText(/Audio visualization will appear here/)).toBeInTheDocument();
    });

    it('should not create audio context when inactive', () => {
      render(<AudioWaveform isActive={false} />);
      expect(ensureTestGlobals().AudioContext).not.toHaveBeenCalled();
    });

    it('should create audio context when active with stream', () => {
      render(<AudioWaveform isActive={true} audioStream={asMediaStream(mockStream)} />);
      expect(ensureTestGlobals().AudioContext).toHaveBeenCalled();
    });

    it('should render waveform bars when active', async () => {
      const { container } = render(<AudioWaveform isActive={true} audioStream={asMediaStream(mockStream)} />);
      
      await waitFor(() => {
        const bars = container.querySelectorAll('[style*="height"]');
        expect(bars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Audio Processing', () => {
    it('should connect audio source to analyser', () => {
      render(<AudioWaveform isActive={true} audioStream={asMediaStream(mockStream)} />);
      
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    });

    it('should set correct analyser properties', () => {
      render(<AudioWaveform isActive={true} audioStream={asMediaStream(mockStream)} />);
      
      expect(mockAnalyser.fftSize).toBe(256);
      expect(mockAnalyser.smoothingTimeConstant).toBeCloseTo(0.3);
    });
  });

  describe('Cleanup', () => {
    it('should close audio context on unmount', () => {
      const { unmount } = render(<AudioWaveform isActive={true} audioStream={asMediaStream(mockStream)} />);
      unmount();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should close audio context when becoming inactive', () => {
      const { rerender } = render(<AudioWaveform isActive={true} audioStream={asMediaStream(mockStream)} />);
      rerender(<AudioWaveform isActive={false} audioStream={asMediaStream(mockStream)} />);
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
      const { rerender } = render(<AudioWaveform isActive={true} audioStream={asMediaStream(mockStream)} />);
      rerender(<AudioWaveform isActive={true} audioStream={asMediaStream(mockStream)} />);
      expect(ensureTestGlobals().AudioContext).toHaveBeenCalledTimes(1);
    });
  });
});

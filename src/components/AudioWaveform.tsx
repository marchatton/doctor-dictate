import React, { useEffect, useState, useRef } from 'react';
import { MicIcon } from 'lucide-react';

// Create unique IDs for tracking different instances
let instanceCounter = 0;
let loopCounter = 0;

interface AudioWaveformProps {
  isActive: boolean;
  audioStream?: MediaStream | null;
}
export function AudioWaveform({
  isActive,
  audioStream
}: AudioWaveformProps) {
  const [bars, setBars] = useState<number[]>([15, 20, 25, 20, 15]); // Lower default for better contrast
  const animationFrameRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const audioContextRef = useRef<AudioContext>();
  const isRunningRef = useRef<boolean>(false); // Use ref to persist across renders
  const sourceRef = useRef<MediaStreamAudioSourceNode>();
  const instanceIdRef = useRef<number>(++instanceCounter);
  const loopIdRef = useRef<number>(0);

  useEffect(() => {
    const effectId = Math.random().toString(36).substr(2, 9);
    console.log(`[Waveform-${instanceIdRef.current}] Effect START (${effectId})`, { 
      isActive, 
      hasAudioStream: !!audioStream,
      streamId: audioStream?.id,
      timestamp: new Date().toISOString()
    });
    
    // Clean up any previous animation frame first
    if (animationFrameRef.current) {
      console.log(`[Waveform-${instanceIdRef.current}] Cancelling previous animation frame (${animationFrameRef.current})`);
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    
    // Stop previous animation loop
    const wasRunning = isRunningRef.current;
    isRunningRef.current = false;
    console.log(`[Waveform-${instanceIdRef.current}] Setting isRunning to false (was: ${wasRunning})`);
    
    if (isActive && audioStream) {
      console.log(`[Waveform-${instanceIdRef.current}] Starting audio analysis setup`);
      
      try {
        // Verify audio stream has active tracks
        const audioTracks = audioStream.getAudioTracks();
        console.log(`[Waveform-${instanceIdRef.current}] Audio tracks analysis:`, {
          trackCount: audioTracks.length,
          tracks: audioTracks.map((t, i) => ({ 
            index: i,
            id: t.id,
            enabled: t.enabled, 
            muted: t.muted, 
            readyState: t.readyState,
            label: t.label,
            kind: t.kind
          }))
        });
        
        if (audioTracks.length === 0 || !audioTracks.some(t => t.enabled && t.readyState === 'live')) {
          console.error(`[Waveform-${instanceIdRef.current}] No active audio tracks in stream`);
          setBars([15, 20, 25, 20, 15]); // Keep default flat bars
          return;
        }
        
        // Clean up existing audio context if it exists
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          console.log(`[Waveform-${instanceIdRef.current}] Closing existing audio context (state: ${audioContextRef.current.state})`);
          audioContextRef.current.close();
        }
        
        // Create audio context and analyser
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        console.log(`[Waveform-${instanceIdRef.current}] Created AudioContext`, {
          state: audioContext.state,
          sampleRate: audioContext.sampleRate,
          baseLatency: (audioContext as any).baseLatency
        });
        
        // Create analyser and source
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(audioStream);
        
        analyser.fftSize = 256; // Higher resolution for time domain
        analyser.smoothingTimeConstant = 0.3; // Much less smoothing for responsiveness
        
        console.log(`[Waveform-${instanceIdRef.current}] Connecting audio pipeline`, {
          analyserCreated: !!analyser,
          sourceCreated: !!source,
          fftSize: analyser.fftSize,
          smoothingTimeConstant: analyser.smoothingTimeConstant
        });
        
        source.connect(analyser);
        
        analyserRef.current = analyser;
        sourceRef.current = source;
        
        console.log(`[Waveform-${instanceIdRef.current}] Audio pipeline connected`);
        
        // Resume context if it's suspended (required for some browsers)
        if (audioContext.state === 'suspended') {
          console.log(`[Waveform-${instanceIdRef.current}] AudioContext is suspended, attempting to resume...`);
          audioContext.resume().then(() => {
            console.log(`[Waveform-${instanceIdRef.current}] AudioContext resumed successfully, new state: ${audioContext.state}`);
          }).catch(err => {
            console.error(`[Waveform-${instanceIdRef.current}] Failed to resume AudioContext:`, err);
          });
        } else {
          console.log(`[Waveform-${instanceIdRef.current}] AudioContext state is already: ${audioContext.state}`);
        }
        
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        
        let frameCount = 0;
        let lastValidRMS = 0; // Track last valid RMS to detect stuck state
        let stuckCounter = 0; // Count consecutive frames with same RMS
        let noDataCounter = 0; // Track frames with no audio data
        
        // Create unique loop ID
        const currentLoopId = ++loopCounter;
        loopIdRef.current = currentLoopId;
        
        isRunningRef.current = true; // Set flag to start animation
        console.log(`[Waveform-${instanceIdRef.current}] Starting animation loop #${currentLoopId}`);
        
        const updateBars = () => {
          frameCount++;
          
          // Check if we should continue running
          if (!isRunningRef.current) {
            console.log(`[Waveform-${instanceIdRef.current}] Loop #${currentLoopId} stopped (isRunning false) at frame ${frameCount}`);
            return;
          }
          
          // Check if this is still the current loop
          if (currentLoopId !== loopIdRef.current) {
            console.log(`[Waveform-${instanceIdRef.current}] Loop #${currentLoopId} stopped (newer loop #${loopIdRef.current} exists)`);
            return;
          }
          
          // Check audio context state periodically and try to resume if suspended
          if (frameCount % 120 === 0 && audioContextRef.current) {
            if (audioContextRef.current.state === 'suspended') {
              console.warn(`[Waveform-${instanceIdRef.current}] Loop #${currentLoopId} AudioContext is suspended at frame ${frameCount}, attempting to resume...`);
              audioContextRef.current.resume().then(() => {
                console.log(`[Waveform-${instanceIdRef.current}] Loop #${currentLoopId} AudioContext resumed after suspension`);
              }).catch(err => {
                console.error(`[Waveform-${instanceIdRef.current}] Loop #${currentLoopId} Failed to resume suspended AudioContext:`, err);
              });
            }
          }
          
          // Always try to get audio data if analyser exists
          if (analyserRef.current && audioContextRef.current?.state === 'running') {
            try {
              // Use time domain data for better voice response
              analyserRef.current.getByteTimeDomainData(dataArray);
              
              // Check if we're getting actual data
              const firstFewSamples = Array.from(dataArray.slice(0, 10));
              const allSame = firstFewSamples.every(v => v === firstFewSamples[0]);
              
              if (allSame && firstFewSamples[0] === 128) {
                noDataCounter++;
                if (noDataCounter % 60 === 0) {
                  console.warn(`[Waveform-${instanceIdRef.current}] Loop #${currentLoopId} No audio data (silence) for ${noDataCounter} frames`);
                }
              } else {
                if (noDataCounter > 0) {
                  console.log(`[Waveform-${instanceIdRef.current}] Loop #${currentLoopId} Audio data resumed after ${noDataCounter} frames of silence`);
                  noDataCounter = 0;
                }
              }
              
              // Calculate RMS (Root Mean Square) for actual volume level
              let sumSquares = 0;
              for (let i = 0; i < bufferLength; i++) {
                const normalized = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
                sumSquares += normalized * normalized;
              }
              const rms = Math.sqrt(sumSquares / bufferLength);
              
              // Check if RMS is stuck (same value for too many frames)
              if (Math.abs(rms - lastValidRMS) < 0.0001) {
                stuckCounter++;
                if (stuckCounter > 180) { // Stuck for ~3 seconds
                  console.warn('Waveform appears stuck, adding variation');
                  // Add small random variation to unstick
                  const randomVariation = (Math.random() - 0.5) * 0.01;
                  lastValidRMS = rms + randomVariation;
                  stuckCounter = 0;
                }
              } else {
                lastValidRMS = rms;
                stuckCounter = 0;
              }
              
              // Convert RMS to a percentage (0-100)
              // Increased amplification for better visual response
              const volumeLevel = Math.min(100, rms * 500);
              
              // Lower threshold for more responsive visualization
              const threshold = 2; // Lower threshold to show more activity
              const gatedLevel = volumeLevel > threshold ? volumeLevel : Math.max(5, volumeLevel * 0.5);
              
              // Log periodically for debugging (every 60 frames = ~1 second)
              if (frameCount % 60 === 0) {
                console.log(`[Waveform-${instanceIdRef.current}] Loop #${currentLoopId} Frame ${frameCount} update:`, { 
                  rms: rms.toFixed(4), 
                  volumeLevel: volumeLevel.toFixed(1), 
                  gatedLevel: gatedLevel.toFixed(1),
                  audioContextState: audioContextRef.current?.state,
                  analyserConnected: !!analyserRef.current,
                  sourceConnected: !!sourceRef.current,
                  stuckCounter,
                  noDataCounter,
                  dataSample: `[${dataArray[0]}, ${dataArray[1]}, ${dataArray[2]}...${dataArray[253]}, ${dataArray[254]}, ${dataArray[255]}]`
                });
              }
              
              // Create dynamic bars with speech-responsive animation
              // Ensure minimum visible height even with no audio
              const baseHeight = Math.max(20, Math.min(95, gatedLevel + 10));
              
              // Add organic variation that's proportional to volume
              // Add more variation if stuck
              const variationMultiplier = stuckCounter > 60 ? 2 : 1;
              const variation = () => (Math.random() - 0.5) * Math.max(5, gatedLevel * 0.2) * variationMultiplier;
              
              // Create symmetrical pattern with more dynamic range
              const multipliers = [0.5, 0.75, 1.0, 0.75, 0.5];
              const newBars = multipliers.map(mult => 
                Math.max(15, Math.min(95, baseHeight * mult + variation()))
              );
              
              setBars(newBars);
            } catch (error) {
              console.error(`[Waveform-${instanceIdRef.current}] Loop #${currentLoopId} Error updating waveform:`, error);
              isRunningRef.current = false;
            }
          } else {
            if (frameCount % 60 === 0) {
              console.warn(`[Waveform-${instanceIdRef.current}] Loop #${currentLoopId} Frame ${frameCount} - Analyser not available or context not running:`, {
                hasAnalyser: !!analyserRef.current,
                hasAudioContext: !!audioContextRef.current,
                contextState: audioContextRef.current?.state,
                hasSource: !!sourceRef.current,
                isRunning: isRunningRef.current
              });
            }
            
            // Keep some subtle animation even if analyser is not working
            if (isRunningRef.current) {
              const fallbackBars = [15, 20, 25, 20, 15].map(base => 
                base + (Math.random() - 0.5) * 5
              );
              setBars(fallbackBars);
            }
          }
          
          // Continue animation loop while component is active
          if (isRunningRef.current) {
            animationFrameRef.current = requestAnimationFrame(updateBars);
          }
        };
        
        // Start the animation loop
        updateBars();
        
        // Cleanup function to stop the loop
        return () => {
          console.log(`[Waveform-${instanceIdRef.current}] Effect cleanup for loop #${currentLoopId} (effectId: ${effectId})`);
          isRunningRef.current = false; // Stop the animation loop
          
          if (animationFrameRef.current) {
            console.log(`[Waveform-${instanceIdRef.current}] Cancelling animation frame in cleanup`);
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = undefined;
          }
          
          if (sourceRef.current) {
            console.log(`[Waveform-${instanceIdRef.current}] Disconnecting source in cleanup`);
            sourceRef.current.disconnect();
            sourceRef.current = undefined;
          }
          
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            console.log(`[Waveform-${instanceIdRef.current}] Closing audio context in cleanup (state: ${audioContextRef.current.state})`);
            audioContextRef.current.close().catch(err => {
              console.error(`[Waveform-${instanceIdRef.current}] Error closing audio context:`, err);
            });
          }
        };
      } catch (error) {
        console.error(`[Waveform-${instanceIdRef.current}] Error initializing audio analysis:`, error);
        setBars([15, 20, 25, 20, 15]); // Reset to default on error
      }
    } else {
      // Not recording - reset to default bars
      console.log(`[Waveform-${instanceIdRef.current}] Not recording, cleaning up (effectId: ${effectId})`);
      setBars([15, 20, 25, 20, 15]); // Reset to lower default bars
      
      // Clean up audio resources
      if (sourceRef.current) {
        console.log(`[Waveform-${instanceIdRef.current}] Disconnecting source (not recording)`);
        sourceRef.current.disconnect();
        sourceRef.current = undefined;
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        console.log(`[Waveform-${instanceIdRef.current}] Closing audio context (not recording, state: ${audioContextRef.current.state})`);
        audioContextRef.current.close().catch(err => {
          console.error(`[Waveform-${instanceIdRef.current}] Error closing audio context:`, err);
        });
      }
    }
    
    // Return cleanup for effect END logging
    return () => {
      console.log(`[Waveform-${instanceIdRef.current}] Effect END (${effectId})`);
    };
  }, [isActive, audioStream]);
  if (!isActive) {
    return <div className="text-stone-400 italic flex items-center gap-2 px-4 py-2 bg-white bg-opacity-50 rounded-full">
        <MicIcon className="w-4 h-4" />
        Audio visualization will appear here during recording
      </div>;
  }
  return <div className="flex items-center justify-center gap-4 h-full w-full px-8 py-4">
      {bars.map((height, i) => <div key={i} className="flex items-center justify-center" style={{
      height: '100%'
    }}>
          <div className="bg-[#6B1F1F] rounded-full" style={{
        height: `${height}%`,
        width: '8px',
        transition: 'height 0.05s ease-out' // Faster transition for more responsive feel
      }}></div>
        </div>)}
    </div>;
}
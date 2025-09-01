import { useState, useEffect, useCallback } from 'react';

interface Settings {
  isHighAccuracy: boolean;
  autoSave: boolean;
  outputFormat: 'markdown' | 'text' | 'json';
  whisperModel: 'tiny.en' | 'base.en' | 'small.en';
  ollamaModel: 'qwen2.5:0.5b' | 'qwen2.5:1.5b';
  templatePreference: string;
}

const DEFAULT_SETTINGS: Settings = {
  isHighAccuracy: false,
  autoSave: true,
  outputFormat: 'markdown',
  whisperModel: 'tiny.en',
  ollamaModel: 'qwen2.5:0.5b',
  templatePreference: 'medicine-management'
};

const STORAGE_KEY = 'doctor-dictate-settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        } catch (error) {
          console.error('Failed to parse stored settings:', error);
        }
      }
    }
    return DEFAULT_SETTINGS;
  });
  
  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);
  
  const updateSetting = useCallback(<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);
  
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);
  
  return {
    settings,
    updateSetting,
    resetSettings
  };
}
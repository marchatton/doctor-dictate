import React, { useState, useMemo } from 'react';
import { EditIcon, SaveIcon, FileTextIcon, PlusIcon, CheckIcon, ClipboardIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Modal } from './Modal';
import { filterTemplate, extractMedications, countMedicalTerms, extractMedicalTerms, extractPatientName } from '../utils/templateFilter';

declare global {
  interface Window {
    electronAPI: {
      saveTranscript: (data: {filename: string, content: string}) => Promise<{success: boolean}>;
      exportPDF: (data: {filename: string, content: string}) => Promise<{success: boolean}>;
    };
  }
}
interface RecordingMetadata {
  duration: number;
  medicalTermsCount: number;
  correctionsCount: number;
  corrections: {original: string, corrected: string, context: string}[];
  medications: string[];
}

interface TranscriptScreenProps {
  transcript: string;
  setTranscript: (value: string) => void;
  onNewRecording: () => void;
  patientName: string;
  isHighAccuracy: boolean;
  recordingMetadata: RecordingMetadata;
}
export function TranscriptScreen({
  transcript,
  setTranscript,
  onNewRecording,
  patientName,
  isHighAccuracy,
  recordingMetadata
}: TranscriptScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCorrections, setShowCorrections] = useState(false);
  const [showMedicalTerms, setShowMedicalTerms] = useState(false);
  const [showMedications, setShowMedications] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Process transcript with template filtering
  const filteredTranscript = useMemo(() => {
    return filterTemplate(transcript, {
      removeEmptySections: true,
      removePlaceholders: true,
      removeHeaders: false
    });
  }, [transcript]);
  
  // Extract additional metadata from transcript if not provided
  const computedMetadata = useMemo(() => {
    const medications = recordingMetadata.medications.length > 0 
      ? recordingMetadata.medications 
      : extractMedications(filteredTranscript); // Use filtered transcript
    
    const medicalTermsCount = recordingMetadata.medicalTermsCount > 0
      ? recordingMetadata.medicalTermsCount
      : countMedicalTerms(filteredTranscript); // Use filtered transcript
    
    const medicalTerms = extractMedicalTerms(filteredTranscript); // Extract actual terms
    
    return {
      ...recordingMetadata,
      medications,
      medicalTermsCount,
      medicalTerms
    };
  }, [filteredTranscript, recordingMetadata]);
  
  // Extract patient name from transcript
  const actualPatientName = useMemo(() => {
    const extractedName = extractPatientName(transcript);
    return extractedName !== 'Unknown' ? extractedName : patientName;
  }, [transcript, patientName]);
  // Helper function to format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(filteredTranscript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveTranscript = async () => {
    try {
      const filename = `transcript-${patientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
      await window.electronAPI?.saveTranscript({ filename, content: filteredTranscript });
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const filename = `transcript-${patientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      await window.electronAPI?.exportPDF({ filename, content: filteredTranscript });
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };
  // Format date in US format MM/DD/YYYY
  const formatDate = () => {
    const date = new Date();
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };
  const handleNewRecordingClick = () => {
    setShowConfirmModal(true);
  };
  const handleConfirmNewRecording = () => {
    setShowConfirmModal(false);
    onNewRecording();
  };
  return <div className="bg-white rounded-xl shadow-xl overflow-hidden transition-all duration-300">
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} onConfirm={handleConfirmNewRecording} title="Discard current transcript?" message="Starting a new recording will discard your current transcript. This action cannot be undone." cancelText="Go back" confirmText="Discard notes and create new recording" />
      <div className="p-6 border-b border-stone-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h2 className="font-serif text-3xl text-stone-900 font-semibold flex items-center gap-2">
            <CheckIcon className="w-6 h-6 text-amber-700" />
            Transcription complete
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleCopyTranscript} className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-md transition-colors ${copied ? 'bg-amber-700 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
            {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy text'}
          </button>
          <button onClick={handleSaveTranscript} className="flex items-center gap-1 text-sm text-stone-600 hover:bg-stone-100 px-3 py-1.5 rounded-md transition-colors">
            <SaveIcon className="w-4 h-4" />
            Save
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-1 text-sm text-stone-600 hover:bg-stone-100 px-3 py-1.5 rounded-md transition-colors">
            <FileTextIcon className="w-4 h-4" />
            Export PDF
          </button>
          <button onClick={handleNewRecordingClick} className="flex items-center gap-1 text-sm text-stone-600 hover:bg-stone-100 px-3 py-1.5 rounded-md transition-colors">
            <PlusIcon className="w-4 h-4" />
            Record new note
          </button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row">
        {/* Sidebar with metadata */}
        <div className="w-full md:w-1/4 p-4 bg-stone-50 border-r border-stone-200">
          <div className="mb-6">
            <h3 className="font-medium text-sm text-stone-500 uppercase tracking-wider mb-2">
              Recording details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                <span className="text-stone-500">Patient:</span>
                <span className="font-medium text-stone-800">
                  {actualPatientName}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                <span className="text-stone-500">Duration:</span>
                <span className="font-medium text-stone-800">{formatDuration(computedMetadata.duration)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                <span className="text-stone-500">Date:</span>
                <span className="font-medium text-stone-800">
                  {formatDate()}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                <span className="text-stone-500">Model:</span>
                <span className="font-medium text-stone-800">
                  {isHighAccuracy ? 'High accuracy' : 'Standard'}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-sm text-stone-500 uppercase tracking-wider mb-2">
              Processing
            </h3>
            <div className="space-y-2 text-sm">
              {/* Medical Terms Dropdown */}
              <div className="p-2 bg-white rounded-md cursor-pointer" onClick={() => setShowMedicalTerms(!showMedicalTerms)}>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Medical terms:</span>
                  <div className="flex items-center">
                    <span className="font-medium text-[#1B4332] mr-1">
                      {computedMetadata.medicalTermsCount} detected
                    </span>
                    {showMedicalTerms ? <ChevronUpIcon className="w-4 h-4 text-stone-500" /> : <ChevronDownIcon className="w-4 h-4 text-stone-500" />}
                  </div>
                </div>
                {showMedicalTerms && <div className="mt-2 border-t border-stone-200 pt-2 space-y-2">
                    {computedMetadata.medicalTerms.length > 0 ? (
                      computedMetadata.medicalTerms.map((term, index) => (
                        <div key={index} className="text-xs bg-stone-100 p-2 rounded">
                          <span className="text-[#1B4332] font-medium">{term}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-stone-500 p-2 italic">
                        No medical terms detected in this transcript
                      </div>
                    )}
                  </div>}
              </div>
              
              {/* Medications Dropdown */}
              {computedMetadata.medications.length > 0 && (
                <div className="p-2 bg-white rounded-md cursor-pointer" onClick={() => setShowMedications(!showMedications)}>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">Medications:</span>
                    <div className="flex items-center">
                      <span className="font-medium text-[#1B4332] mr-1">
                        {computedMetadata.medications.length} found
                      </span>
                      {showMedications ? <ChevronUpIcon className="w-4 h-4 text-stone-500" /> : <ChevronDownIcon className="w-4 h-4 text-stone-500" />}
                    </div>
                  </div>
                  {showMedications && <div className="mt-2 border-t border-stone-200 pt-2 space-y-2">
                      {computedMetadata.medications.map((medication, index) => (
                        <div key={index} className="text-xs bg-stone-100 p-2 rounded">
                          <span className="text-[#1B4332] font-medium">{medication}</span>
                        </div>
                      ))}
                    </div>}
                </div>
              )}
              
              {/* Corrections Dropdown */}
              {computedMetadata.corrections.length > 0 && (
                <div className="p-2 bg-white rounded-md cursor-pointer" onClick={() => setShowCorrections(!showCorrections)}>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">Corrections:</span>
                    <div className="flex items-center">
                      <span className="font-medium text-stone-800 mr-1">
                        {computedMetadata.corrections.length} applied
                      </span>
                      {showCorrections ? <ChevronUpIcon className="w-4 h-4 text-stone-500" /> : <ChevronDownIcon className="w-4 h-4 text-stone-500" />}
                    </div>
                  </div>
                  {showCorrections && <div className="mt-2 border-t border-stone-200 pt-2 space-y-2">
                      {computedMetadata.corrections.map((correction, index) => (
                        <div key={index} className="text-xs bg-stone-100 p-2 rounded">
                          <div className="flex">
                            <span className="line-through text-stone-500 mr-1">
                              {correction.original}
                            </span>
                            <span className="text-[#1B4332]">
                              → {correction.corrected}
                            </span>
                          </div>
                          <div className="text-stone-600 mt-1 italic">
                            "{correction.context}"
                          </div>
                        </div>
                      ))}
                    </div>}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Main transcript area */}
        <div className="w-full md:w-3/4 p-6">
          {isEditing ? (
            <textarea 
              value={transcript} 
              onChange={e => setTranscript(e.target.value)} 
              className="w-full h-64 p-4 border border-stone-300 rounded-md focus:ring-2 focus:ring-[#6B1F1F] focus:border-[#6B1F1F] outline-none font-sans text-stone-800" 
              placeholder="Edit your transcript here..." 
            />
          ) : (
            <div className="w-full h-64 p-5 border border-stone-200 rounded-md bg-white overflow-y-auto font-sans text-stone-800 leading-relaxed prose prose-stone max-w-none prose-headings:text-stone-900 prose-strong:text-stone-900 prose-p:text-stone-800 prose-li:text-stone-800">
              <ReactMarkdown 
                components={{
                  h1: ({children}) => <h1 className="text-xl font-bold text-stone-900 mb-3">{children}</h1>,
                  h2: ({children}) => <h2 className="text-lg font-semibold text-stone-900 mb-2">{children}</h2>,
                  h3: ({children}) => <h3 className="text-base font-medium text-stone-900 mb-2">{children}</h3>,
                  p: ({children}) => <p className="mb-2 text-stone-800 leading-relaxed">{children}</p>,
                  ul: ({children}) => <ul className="mb-2 ml-4 list-disc text-stone-800">{children}</ul>,
                  li: ({children}) => <li className="mb-1">{children}</li>,
                  strong: ({children}) => <strong className="font-semibold text-stone-900">{children}</strong>
                }}
              >
                {filteredTranscript}
              </ReactMarkdown>
            </div>
          )}
          <div className="mt-8 text-center">
            <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2 bg-[#6B1F1F] hover:bg-[#5a1a1a] text-white py-3 px-6 rounded-full mx-auto transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              <EditIcon className="w-4 h-4" />
              {isEditing ? 'Save changes' : 'Edit transcript'}
            </button>
          </div>
        </div>
      </div>
    </div>;
}
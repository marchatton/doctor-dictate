import React, { useState } from 'react';
import { EditIcon, SaveIcon, FileTextIcon, PlusIcon, CheckIcon, ClipboardIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Modal } from './Modal';

declare global {
  interface Window {
    electronAPI: {
      saveTranscript: (data: {filename: string, content: string}) => Promise<{success: boolean}>;
      exportPDF: (data: {filename: string, content: string}) => Promise<{success: boolean}>;
    };
  }
}
interface TranscriptScreenProps {
  transcript: string;
  setTranscript: (value: string) => void;
  onNewRecording: () => void;
  patientName: string;
  isHighAccuracy: boolean;
}
export function TranscriptScreen({
  transcript,
  setTranscript,
  onNewRecording,
  patientName,
  isHighAccuracy
}: TranscriptScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCorrections, setShowCorrections] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Sample corrections data
  const corrections = [{
    original: 'serotonin',
    corrected: 'sertraline',
    context: 'Patient stable on sertraline 100mg daily...'
  }, {
    original: 'lamictal',
    corrected: 'lamotrigine',
    context: '...Continuing lamotrigine 200mg for mood stabilization.'
  }];
  // Function no longer highlights medical terms
  const highlightMedicalTerms = (text: string) => {
    return text;
  };
  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveTranscript = async () => {
    try {
      const filename = `transcript-${patientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
      await window.electronAPI?.saveTranscript({ filename, content: transcript });
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const filename = `transcript-${patientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      await window.electronAPI?.exportPDF({ filename, content: transcript });
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
                  {patientName}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                <span className="text-stone-500">Duration:</span>
                <span className="font-medium text-stone-800">01:25</span>
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
              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                <span className="text-stone-500">Medical terms:</span>
                <span className="font-medium text-[#1B4332]">6 detected</span>
              </div>
              <div className="p-2 bg-white rounded-md cursor-pointer" onClick={() => setShowCorrections(!showCorrections)}>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Corrections:</span>
                  <div className="flex items-center">
                    <span className="font-medium text-stone-800 mr-1">
                      2 applied
                    </span>
                    {showCorrections ? <ChevronUpIcon className="w-4 h-4 text-stone-500" /> : <ChevronDownIcon className="w-4 h-4 text-stone-500" />}
                  </div>
                </div>
                {showCorrections && <div className="mt-2 border-t border-stone-200 pt-2 space-y-2">
                    {corrections.map((correction, index) => <div key={index} className="text-xs bg-stone-100 p-2 rounded">
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
                      </div>)}
                  </div>}
              </div>
            </div>
          </div>
        </div>
        {/* Main transcript area */}
        <div className="w-full md:w-3/4 p-6">
          {isEditing ? <textarea value={transcript} onChange={e => setTranscript(e.target.value)} className="w-full h-64 p-4 border border-stone-300 rounded-md focus:ring-2 focus:ring-[#6B1F1F] focus:border-[#6B1F1F] outline-none font-sans text-stone-800" placeholder="Edit your transcript here..." /> : <div className="w-full h-64 p-5 border border-stone-200 rounded-md bg-white overflow-y-auto font-sans text-stone-800 leading-relaxed" dangerouslySetInnerHTML={{
          __html: highlightMedicalTerms(transcript)
        }} />}
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
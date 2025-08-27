import React from 'react';
import { MicIcon } from 'lucide-react';
export function Header() {
  return <header className="bg-stone-900 text-white py-5 px-6 shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md">
            <MicIcon className="w-6 h-6 text-stone-900" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight">
              Doctor Dictate
            </h1>
            <p className="text-stone-300 text-sm">
              Accurate clinical note transcription
            </p>
          </div>
        </div>
      </div>
    </header>;
}
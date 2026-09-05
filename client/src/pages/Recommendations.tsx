import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { NextProblems } from './recommendations/NextProblems';
import { Roadmap } from './recommendations/Roadmap';
import { Revise } from './recommendations/Revise';

type Tab = 'next' | 'roadmap' | 'revise';

const TABS: { id: Tab; label: string; icon: string; description: string }[] = [
  { id: 'next',    label: 'Next Problems', icon: '🎯', description: 'Personalised problems to solve now' },
  { id: 'roadmap', label: 'Roadmap',       icon: '🗺️', description: 'Week-by-week improvement plan' },
  { id: 'revise',  label: 'Revise',        icon: '🔁', description: 'Failed problems worth revisiting' }
];

export function Recommendations() {
  const [activeTab, setActiveTab] = useState<Tab>('next');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Recommendations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Powered by your skill scores, weakness analysis, and failure patterns.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex" aria-label="Tabs">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 flex flex-col items-center py-4 px-3 text-sm font-medium border-b-2 transition-colors
                    ${activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="text-xl mb-1">{tab.icon}</span>
                  <span className="font-semibold">{tab.label}</span>
                  <span className="text-xs text-gray-400 hidden sm:block mt-0.5">{tab.description}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'next'    && <NextProblems />}
            {activeTab === 'roadmap' && <Roadmap />}
            {activeTab === 'revise'  && <Revise />}
          </div>
        </div>
      </div>
    </div>
  );
}

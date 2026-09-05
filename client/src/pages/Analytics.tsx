import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Skills } from './analytics/Skills';
import { Weaknesses } from './analytics/Weaknesses';
import { Failures } from './analytics/Failures';
import { Progress } from './analytics/Progress';
import { Contests } from './analytics/Contests';

type TabType = 'skills' | 'weaknesses' | 'failures' | 'progress' | 'contests';

export function Analytics() {
  const [activeTab, setActiveTab] = useState<TabType>('skills');

  const tabs = [
    { id: 'skills' as TabType, name: 'Skills', icon: '📊' },
    { id: 'weaknesses' as TabType, name: 'Weaknesses', icon: '⚠️' },
    { id: 'failures' as TabType, name: 'Failures', icon: '🔍' },
    { id: 'progress' as TabType, name: 'Progress', icon: '📈' },
    { id: 'contests' as TabType, name: 'Contests', icon: '🏆' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                      ${activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <span>{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'skills' && <Skills />}
              {activeTab === 'weaknesses' && <Weaknesses />}
              {activeTab === 'failures' && <Failures />}
              {activeTab === 'progress' && <Progress />}
              {activeTab === 'contests' && <Contests />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

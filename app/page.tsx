'use client';

import { useState } from 'react';
import CallControl from '@/components/CallControl';
import CallHistory from '@/components/CallHistory';
import { Toaster } from 'react-hot-toast';
import { Phone, History } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'control' | 'history'>('control');

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-black">CallConnect Pro</h1>
                <p className="text-sm text-gray-600">Enterprise call automation platform</p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-green-100 border border-green-300 rounded-md flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs font-semibold text-black">Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('control')}
              className={`${
                activeTab === 'control'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-black hover:bg-gray-50'
              } flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2`}
            >
              <Phone className="w-4 h-4" />
              Make Call
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-black hover:bg-gray-50'
              } flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2`}
            >
              <History className="w-4 h-4" />
              Call History
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'control' ? <CallControl /> : <CallHistory />}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-blue-600 text-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm">
          <p className="font-semibold">CallConnect Pro - Enterprise Call Automation Platform</p>
          <p className="text-white/80 mt-1">Built with React, TypeScript, Twilio, and advanced ML models</p>
        </div>
      </footer>

      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1f2937',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            border: '2px solid #e5e7eb',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
            style: {
              border: '2px solid #10b981',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              border: '2px solid #ef4444',
            },
          },
        }}
      />
    </main>
  );
}

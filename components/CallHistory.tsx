'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import type { CallLog, CallStatus, AmdStrategy, AmdResult } from '@prisma/client';

interface CallHistoryData extends CallLog {
  events: unknown[];
}

const STATUS_COLORS: Record<CallStatus, { bg: string; icon: React.ReactNode; label: string }> = {
  INITIATED: { bg: 'bg-gray-100 border-gray-300', icon: <Phone className="w-3 h-3" />, label: 'Initiated' },
  RINGING: { bg: 'bg-blue-100 border-blue-300', icon: <Phone className="w-3 h-3" />, label: 'Ringing' },
  ANSWERED: { bg: 'bg-yellow-100 border-yellow-300', icon: <CheckCircle className="w-3 h-3" />, label: 'Answered' },
  HUMAN_DETECTED: { bg: 'bg-green-100 border-green-300', icon: <CheckCircle className="w-3 h-3" />, label: 'Human' },
  MACHINE_DETECTED: { bg: 'bg-red-100 border-red-300', icon: <XCircle className="w-3 h-3" />, label: 'Machine' },
  FAILED: { bg: 'bg-red-100 border-red-300', icon: <XCircle className="w-3 h-3" />, label: 'Failed' },
  COMPLETED: { bg: 'bg-gray-100 border-gray-300', icon: <CheckCircle className="w-3 h-3" />, label: 'Completed' },
  NO_ANSWER: { bg: 'bg-orange-100 border-orange-300', icon: <AlertCircle className="w-3 h-3" />, label: 'No Answer' },
  BUSY: { bg: 'bg-slate-100 border-slate-300', icon: <AlertCircle className="w-3 h-3" />, label: 'Busy' },
};

const STRATEGY_LABELS: Record<AmdStrategy, { label: string; color: string }> = {
  TWILIO_NATIVE: { label: 'Twilio', color: 'bg-blue-600' },
  JAMBONZ: { label: 'Jambonz', color: 'bg-green-600' },
  HUGGINGFACE: { label: 'Hugging Face', color: 'bg-purple-600' },
  GEMINI_FLASH: { label: 'Gemini', color: 'bg-orange-600' },
};

const RESULT_LABELS: Record<AmdResult, { label: string; icon: React.ReactNode; color: string }> = {
  HUMAN: { label: 'Human', icon: <CheckCircle className="w-3 h-3" />, color: 'bg-green-500' },
  MACHINE: { label: 'Machine', icon: <XCircle className="w-3 h-3" />, color: 'bg-red-500' },
  UNCERTAIN: { label: 'Uncertain', icon: <AlertCircle className="w-3 h-3" />, color: 'bg-yellow-500' },
  TIMEOUT: { label: 'Timeout', icon: <AlertCircle className="w-3 h-3" />, color: 'bg-orange-500' },
  ERROR: { label: 'Error', icon: <XCircle className="w-3 h-3" />, color: 'bg-red-500' },
};

export default function CallHistory() {
  const [calls, setCalls] = useState<CallHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchCalls = async () => {
    try {
      const response = await axios.get('/api/calls?limit=50');
      setCalls(response.data.calls);
    } catch (error) {
      console.error('Error fetching calls:', error);
      toast.error('Failed to load call history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCalls();
  };

  const filteredCalls = calls.filter(call => {
    const matchesSearch = !searchTerm || 
      call.phoneNumber.includes(searchTerm) ||
      call.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || call.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: calls.length,
    human: calls.filter(c => c.amdResult === 'HUMAN').length,
    machine: calls.filter(c => c.amdResult === 'MACHINE').length,
    accuracy: calls.length > 0 
      ? ((calls.filter(c => c.amdResult === 'HUMAN' || c.amdResult === 'MACHINE').length / calls.length) * 100).toFixed(0)
      : '0',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="font-semibold text-black">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-black">Call History</h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-black ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-black">{stats.total}</div>
            <div className="text-xs font-semibold text-gray-600">Total</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-black">{stats.human}</div>
            <div className="text-xs font-semibold text-gray-600">Human</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-black">{stats.machine}</div>
            <div className="text-xs font-semibold text-gray-600">Machine</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-black">{stats.accuracy}%</div>
            <div className="text-xs font-semibold text-gray-600">Accuracy</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by phone or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-black font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white appearance-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              {Object.entries(STATUS_COLORS).map(([status, { label }]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredCalls.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
          <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="font-bold text-black mb-2">No calls found</p>
          <p className="text-sm text-gray-600">
            {calls.length === 0 
              ? 'Initiate a call to see results here'
              : 'Try adjusting your search or filter'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-black text-xs uppercase">Time</th>
                <th className="text-left py-3 px-4 font-semibold text-black text-xs uppercase">Number</th>
                <th className="text-left py-3 px-4 font-semibold text-black text-xs uppercase">Strategy</th>
                <th className="text-left py-3 px-4 font-semibold text-black text-xs uppercase">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-black text-xs uppercase">Result</th>
                <th className="text-left py-3 px-4 font-semibold text-black text-xs uppercase">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCalls.map((call) => {
                const statusInfo = STATUS_COLORS[call.status];
                const strategyInfo = STRATEGY_LABELS[call.amdStrategy];
                const resultInfo = call.amdResult ? RESULT_LABELS[call.amdResult] : null;
                
                return (
                  <tr
                    key={call.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm font-medium text-black">
                          {new Date(call.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-black text-sm">{call.phoneNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold text-white ${strategyInfo.color}`}>
                        {strategyInfo.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-black border ${statusInfo.bg}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {resultInfo ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-white ${resultInfo.color}`}>
                          {resultInfo.icon}
                          {resultInfo.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-black bg-gray-200">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {call.amdConfidence !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                call.amdConfidence >= 0.8
                                  ? 'bg-green-500'
                                  : call.amdConfidence >= 0.6
                                  ? 'bg-yellow-500'
                                  : call.amdConfidence >= 0.4
                                  ? 'bg-orange-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${call.amdConfidence * 100}%` }}
                            />
                          </div>
                          <span className="font-bold text-black text-xs w-10">
                            {(call.amdConfidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

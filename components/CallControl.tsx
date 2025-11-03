'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Phone, 
  Loader2, 
  Globe, 
  TrendingUp, 
  Zap, 
  Brain, 
  Sparkles,
  ChevronDown,
  Check,
  Play,
  Info
} from 'lucide-react';
import type { AmdStrategy } from '@/lib/types';
import { COUNTRIES, type Country } from '@/lib/data/countries';
import LiveCallSession from './LiveCallSession';

const STRATEGIES: { 
  value: AmdStrategy; 
  label: string; 
  description: string; 
  accuracy: number;
  latency: string;
  icon: React.ReactNode;
  color: string;
  badge: string;
}[] = [
  {
    value: 'TWILIO_NATIVE',
    label: 'Twilio Native',
    description: 'Fast built-in detection',
    accuracy: 83,
    latency: '<2s',
    icon: <Zap className="w-5 h-5" />,
    color: 'blue',
    badge: 'Fastest',
  },
  {
    value: 'JAMBONZ',
    label: 'Jambonz',
    description: 'Enterprise AMD',
    accuracy: 90,
    latency: '1-3s',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'green',
    badge: 'Recommended',
  },
  {
    value: 'HUGGINGFACE',
    label: 'Hugging Face',
    description: 'ML-powered model',
    accuracy: 93,
    latency: '2-5s',
    icon: <Brain className="w-5 h-5" />,
    color: 'purple',
    badge: 'Most Accurate',
  },
  {
    value: 'GEMINI_FLASH',
    label: 'Gemini Flash',
    description: 'Advanced AI',
    accuracy: 87,
    latency: '3-8s',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'orange',
    badge: 'Intelligent',
  },
];

export default function CallControl() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [strategy, setStrategy] = useState<AmdStrategy>('TWILIO_NATIVE');
  const [loading, setLoading] = useState(false);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [callStatus, setCallStatus] = useState<string>('INITIATED');
  const [amdResult, setAmdResult] = useState<'HUMAN' | 'MACHINE' | 'UNCERTAIN' | undefined>();
  const [showLiveSession, setShowLiveSession] = useState(false);

  const filteredCountries = COUNTRIES.filter(country => {
    const matchesSearch = !searchQuery || 
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialCode.includes(searchQuery);
    return matchesSearch;
  });

  const handleCall = async () => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
      toast.error('Please enter a valid international phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/calls', {
        phoneNumber,
        strategy,
      });

      if (response.data.success) {
        toast.success('Call initiated successfully!');
        setActiveCall(response.data.callId);
        setShowLiveSession(true);
        pollCallStatus(response.data.callId);
      } else {
        throw new Error(response.data.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Call error:', error);
      
      let errorMessage = 'Failed to initiate call';
      
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data;
        
        // Use the detailed message if available
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        // Include details in development
        if (errorData.details && process.env.NODE_ENV === 'development') {
          console.error('Error details:', errorData.details);
        }
      }
      
      toast.error(errorMessage, {
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const pollCallStatus = (callId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/calls/${callId}`);
        if (response.data.call) {
          const call = response.data.call;
          setCallStatus(call.status);
          setAmdResult(call.amdResult);
          
          if (call.status === 'COMPLETED' || call.status === 'FAILED' || call.amdResult) {
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error polling call status:', error);
        clearInterval(interval);
      }
    }, 2000);
  };

  const isValidPhone = phoneNumber.match(/^\+?[1-9]\d{1,14}$/);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-black">Initiate Call</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="px-3 py-1 bg-blue-100 rounded-full flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-semibold text-black">2 Countries</span>
          </div>
          <div className="px-3 py-1 bg-green-100 rounded-full flex items-center gap-1.5">
            <Check className="w-3 h-3 text-green-600" />
            <span className="text-xs font-semibold text-black">93% Accuracy</span>
          </div>
          <div className="px-3 py-1 bg-slate-100 rounded-full flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-slate-600" />
            <span className="text-xs font-semibold text-black">&lt;3s Latency</span>
          </div>
        </div>
      </div>

      {/* Country Selection */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-black mb-2">
          Select Country
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg hover:border-blue-400 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedCountry.flag}</span>
              <div className="text-left">
                <div className="font-semibold text-black">{selectedCountry.name}</div>
                <div className="text-xs text-gray-600">{selectedCountry.dialCode}</div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-black transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showCountryDropdown && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all mb-2 bg-white"
                />
              </div>

              <div className="max-h-64 overflow-y-auto">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => {
                      setSelectedCountry(country);
                      setShowCountryDropdown(false);
                      setPhoneNumber(country.dialCode);
                      setSearchQuery('');
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${
                      selectedCountry.code === country.code ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="text-2xl">{country.flag}</span>
                    <span className="flex-1 text-left font-medium text-black">
                      {country.name}
                    </span>
                    <span className="text-xs font-semibold text-black bg-gray-100 px-2 py-1 rounded">
                      {country.dialCode}
                    </span>
                    {selectedCountry.code === country.code && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-600 flex items-center gap-1">
          <Info className="w-3 h-3" />
          <strong>Format:</strong> {selectedCountry.format}
        </p>
      </div>

      {/* Phone Number Input */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-black mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder={selectedCountry.format}
          className="w-full px-4 py-3 border-2 rounded-lg text-base font-semibold text-black transition-all bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {phoneNumber && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-600">Enter full international number</span>
            <span className="font-bold text-black bg-gray-100 px-2 py-1 rounded">{phoneNumber.length} digits</span>
          </div>
        )}
      </div>

      {/* Strategy Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-black mb-3">
          Detection Strategy
        </label>
        <div className="grid grid-cols-2 gap-3">
          {STRATEGIES.map((strat) => {
            const isSelected = strategy === strat.value;
            const colorClasses: Record<string, string> = {
              blue: 'bg-blue-600 border-blue-600',
              green: 'bg-green-600 border-green-600',
              purple: 'bg-purple-600 border-purple-600',
              orange: 'bg-orange-600 border-orange-600',
            };
            const bgColor = colorClasses[strat.color] || colorClasses.blue;
            
            return (
              <button
                key={strat.value}
                onClick={() => setStrategy(strat.value)}
                className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
                }`}
              >
                <div className={`absolute -top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-sm ${bgColor}`}>
                  {strat.badge}
                </div>

                <div className="flex items-start gap-3 mb-2">
                  <div className={`p-2 rounded-lg text-white ${bgColor}`}>
                    {strat.icon}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="font-bold text-black text-sm mb-1">
                      {strat.label}
                    </div>
                    <div className="text-xs text-gray-600">
                      {strat.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 px-2 py-1 bg-white rounded shadow-sm border border-gray-200">
                    <span className="font-bold text-black">{strat.accuracy}%</span>
                    <span className="text-gray-600">acc</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-white rounded shadow-sm border border-gray-200">
                    <span className="font-bold text-black">{strat.latency}</span>
                    <span className="text-gray-600">lat</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Call Button */}
      <button
        onClick={handleCall}
        disabled={loading || !isValidPhone}
        className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-bold text-base hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Initiating Call...</span>
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            <span>Launch Call</span>
          </>
        )}
      </button>

      {/* Live Session */}
      {showLiveSession && activeCall && (
        <LiveCallSession
          callId={activeCall}
          phoneNumber={phoneNumber}
          status={callStatus}
          amdResult={amdResult}
          onEndCall={() => {
            setShowLiveSession(false);
            setActiveCall(null);
            setCallStatus('INITIATED');
            setAmdResult(undefined);
          }}
        />
      )}
    </div>
  );
}

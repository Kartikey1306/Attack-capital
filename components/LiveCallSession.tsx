'use client';

import { useEffect, useState } from 'react';
import { 
  Phone, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  User, 
  MessageSquare,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface LiveCallSessionProps {
  callId: string;
  phoneNumber: string;
  status: string;
  amdResult?: 'HUMAN' | 'MACHINE' | 'UNCERTAIN';
  onEndCall: () => void;
  onMute?: () => void;
  onUnmute?: () => void;
  transcript?: string;
}

export default function LiveCallSession({
  callId,
  phoneNumber,
  amdResult,
  onEndCall,
  onMute,
  onUnmute,
  transcript,
}: LiveCallSessionProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isMutedRemote, setIsMutedRemote] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  // Simulate call duration counter
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (amdResult) {
      case 'HUMAN':
        return 'bg-green-600';
      case 'MACHINE':
        return 'bg-red-600';
      case 'UNCERTAIN':
        return 'bg-yellow-600';
      default:
        return 'bg-blue-600';
    }
  };

  const getStatusIcon = () => {
    switch (amdResult) {
      case 'HUMAN':
        return <User className="w-6 h-6" />;
      case 'MACHINE':
        return <MessageSquare className="w-6 h-6" />;
      case 'UNCERTAIN':
        return <AlertCircle className="w-6 h-6" />;
      default:
        return <Phone className="w-6 h-6" />;
    }
  };

  const getStatusLabel = () => {
    switch (amdResult) {
      case 'HUMAN':
        return 'Human Detected - Live Session Active';
      case 'MACHINE':
        return 'Voicemail Detected - Terminating Call';
      case 'UNCERTAIN':
        return 'Detection Uncertain - Analyzing...';
      default:
        return 'Connecting...';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className={`${getStatusColor()} p-6 text-white`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                {getStatusIcon()}
              </div>
              <div>
                <h3 className="text-2xl font-black mb-1">Live Call Session</h3>
                <p className="text-white/90 font-medium">
                  {amdResult === 'HUMAN' ? 'Connected' : getStatusLabel()}
                </p>
              </div>
            </div>
            <button
              onClick={onEndCall}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all backdrop-blur-sm"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Call Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wide">Number</span>
              </div>
              <p className="text-lg font-bold">{phoneNumber}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wide">Duration</span>
              </div>
              <p className="text-lg font-bold">{formatDuration(callDuration)}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {amdResult === 'HUMAN' ? (
            <>
              {/* Human Detected - Active Call Controls */}
              <div className="text-center mb-8">
                <div className="inline-block p-6 bg-green-100 rounded-full mb-4 animate-pulse">
                  <User className="w-16 h-16 text-green-600" />
                </div>
                <h4 className="text-2xl font-black text-black mb-2">Human on the Line</h4>
                <p className="text-black/70">
                  You&apos;re connected and ready to speak
                </p>
              </div>

              {/* Audio Controls */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (isMuted) onUnmute?.();
                    else onMute?.();
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    isMuted
                      ? 'bg-red-50 border-red-300'
                      : 'bg-green-50 border-green-300 hover:bg-green-100'
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  ) : (
                    <Mic className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  )}
                  <div className="font-bold text-black">
                    {isMuted ? 'Unmute' : 'Mute'}
                  </div>
                  <div className="text-xs text-black/60 mt-1">Local</div>
                </button>

                <button
                  onClick={() => setIsMutedRemote(!isMutedRemote)}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    isMutedRemote
                      ? 'bg-red-50 border-red-300'
                      : 'bg-blue-50 border-blue-300 hover:bg-blue-100'
                  }`}
                >
                  {isMutedRemote ? (
                    <VolumeX className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  ) : (
                    <Volume2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  )}
                  <div className="font-bold text-black">
                    {isMutedRemote ? 'Unmute' : 'Mute'}
                  </div>
                  <div className="text-xs text-black/60 mt-1">Remote</div>
                </button>
              </div>

              {/* Transcript Toggle */}
              {transcript && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-slate-600" />
                        <span className="font-bold text-black">
                          {showTranscript ? 'Hide' : 'Show'} Transcript
                        </span>
                      </div>
                      <div className="text-sm text-black/60">
                        {transcript.split(' ').length} words
                      </div>
                    </div>
                  </button>

                  {showTranscript && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200 max-h-48 overflow-y-auto">
                      <p className="text-sm text-black leading-relaxed whitespace-pre-wrap">
                        {transcript}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : amdResult === 'MACHINE' ? (
            <>
              {/* Machine/Voicemail Detected */}
              <div className="text-center py-8">
                <div className="inline-block p-8 bg-red-100 rounded-full mb-6">
                  <MessageSquare className="w-20 h-20 text-red-600" />
                </div>
                <h4 className="text-3xl font-black text-black mb-4">Voicemail Detected</h4>
                <p className="text-lg text-black/70 mb-6">
                  Hanging up call to avoid leaving a message
                </p>
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-red-100 rounded-full">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-black">Call Terminating...</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Connecting/Processing */}
              <div className="text-center py-8">
                <div className="inline-block p-8 bg-blue-100 rounded-full mb-6 animate-pulse">
                  <AlertCircle className="w-20 h-20 text-blue-600" />
                </div>
                <h4 className="text-3xl font-black text-black mb-4">Analyzing Audio...</h4>
                <p className="text-lg text-black/70">
                  Using Machine Learning to detect human vs machine
                </p>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={onEndCall}
              className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              End Call
            </button>
          </div>
        </div>

        {/* Call ID Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-black/60">Call ID:</span>
            <code className="font-mono text-black font-bold">{callId}</code>
          </div>
        </div>
      </div>
    </div>
  );
}


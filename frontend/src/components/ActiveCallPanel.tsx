import React, { useState, useEffect } from 'react';
import { PhoneIcon, MicrophoneIcon, SpeakerWaveIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Call } from '@twilio/voice-sdk';

interface ActiveCallPanelProps {
  call: Call | null;
  onHangup: () => void;
}

export default function ActiveCallPanel({ call, onHangup }: ActiveCallPanelProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!call) return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [call]);

  if (!call) return null;

  const callerNumber = call.parameters.From || 'Unknown';
  const callerName = call.customParameters?.get('caller_name') || 'Unknown Caller';

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    call.mute(newMutedState);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all duration-200"
        >
          <PhoneIcon className="w-5 h-5" />
          <span className="font-medium">{formatDuration(callDuration)}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-2xl p-6 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-700">Active Call</span>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Caller Info */}
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-3">
          <PhoneIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{callerName}</h3>
        <p className="text-sm text-gray-500">{callerNumber}</p>
        <p className="text-2xl font-mono font-bold text-gray-700 mt-2">
          {formatDuration(callDuration)}
        </p>
      </div>

      {/* Call Controls */}
      <div className="flex justify-center gap-4 mb-4">
        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all duration-200 ${
            isMuted
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <MicrophoneIcon className={`w-6 h-6 ${isMuted ? 'line-through' : ''}`} />
        </button>

        {/* Speaker Button (placeholder) */}
        <button
          className="p-4 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
          title="Speaker"
        >
          <SpeakerWaveIcon className="w-6 h-6" />
        </button>

        {/* Hangup Button */}
        <button
          onClick={onHangup}
          className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all duration-200 transform hover:scale-110"
          title="Hang up"
        >
          <PhoneIcon className="w-6 h-6 rotate-135" />
        </button>
      </div>

      {/* Status */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          {isMuted ? '🔇 Microphone muted' : '🎤 Microphone active'}
        </p>
      </div>
    </div>
  );
}

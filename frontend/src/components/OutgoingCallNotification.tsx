import React, { useState, useEffect } from 'react';
import { PhoneIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Call } from '@twilio/voice-sdk';

interface OutgoingCallNotificationProps {
  call: Call | null;
  phoneNumber: string;
  contactName?: string;
  onHangup: () => void;
}

export default function OutgoingCallNotification({ 
  call, 
  phoneNumber, 
  contactName,
  onHangup 
}: OutgoingCallNotificationProps) {
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected'>('connecting');
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (!call) return;

    // Listen for call status changes
    const handleAccept = () => {
      setCallStatus('connected');
    };

    call.on('accept', handleAccept);

    // Start timer when connected
    let interval: number | undefined;
    if (callStatus === 'connected') {
      interval = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    // Set to ringing after a short delay
    const ringTimeout = setTimeout(() => {
      if (callStatus === 'connecting') {
        setCallStatus('ringing');
      }
    }, 1000);

    return () => {
      call.off('accept', handleAccept);
      clearInterval(interval);
      clearTimeout(ringTimeout);
    };
  }, [call, callStatus]);

  if (!call) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'connected':
        return formatDuration(callDuration);
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connecting':
        return 'text-yellow-600';
      case 'ringing':
        return 'text-blue-600';
      case 'connected':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Call Info */}
        <div className="text-center mb-8">
          <div className={`mx-auto w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-4 ${
            callStatus === 'ringing' ? 'animate-pulse' : ''
          }`}>
            <PhoneIcon className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {callStatus === 'connected' ? 'Call in Progress' : 'Calling...'}
          </h2>
          <p className="text-lg text-gray-700 font-medium">
            {contactName || phoneNumber}
          </p>
          {contactName && (
            <p className="text-sm text-gray-500">{phoneNumber}</p>
          )}
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          <p className={`text-xl font-mono font-bold ${getStatusColor()}`}>
            {getStatusText()}
          </p>
        </div>

        {/* Status Indicator */}
        {callStatus !== 'connected' && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}

        {/* Hangup Button */}
        <div className="flex justify-center">
          <button
            onClick={onHangup}
            className="flex flex-col items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
          >
            <PhoneIcon className="w-8 h-8 text-white rotate-135" />
            <span className="text-xs text-white mt-1">End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}

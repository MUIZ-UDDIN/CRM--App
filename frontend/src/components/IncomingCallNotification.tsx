import React, { useState, useEffect } from 'react';
import { PhoneIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Call } from '@twilio/voice-sdk';
import { twilioVoiceService } from '../services/twilioVoiceService';

interface IncomingCallNotificationProps {
  call: Call | null;
  onAnswer: () => void;
  onReject: () => void;
}

export default function IncomingCallNotification({ call, onAnswer, onReject }: IncomingCallNotificationProps) {
  const [isRinging, setIsRinging] = useState(false);

  useEffect(() => {
    if (call) {
      setIsRinging(true);
      // Play ringtone (optional)
      const audio = new Audio('/ringtone.mp3');
      audio.loop = true;
      audio.play().catch(e => console.log('Could not play ringtone:', e));

      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    } else {
      setIsRinging(false);
    }
  }, [call]);

  if (!call) return null;

  const callerNumber = call.parameters.From || 'Unknown';
  const callerName = call.customParameters?.get('caller_name') || 'Unknown Caller';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-bounce-slow">
        {/* Caller Info */}
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <PhoneIcon className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Incoming Call</h2>
          <p className="text-lg text-gray-700 font-medium">{callerName}</p>
          <p className="text-sm text-gray-500">{callerNumber}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {/* Reject Button */}
          <button
            onClick={onReject}
            className="flex flex-col items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
          >
            <XMarkIcon className="w-8 h-8 text-white" />
            <span className="text-xs text-white mt-1">Decline</span>
          </button>

          {/* Answer Button */}
          <button
            onClick={onAnswer}
            className="flex flex-col items-center justify-center w-20 h-20 bg-green-500 hover:bg-green-600 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 animate-pulse"
          >
            <PhoneIcon className="w-8 h-8 text-white" />
            <span className="text-xs text-white mt-1">Answer</span>
          </button>
        </div>

        {/* Ringing Indicator */}
        {isRinging && (
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Ringing...</p>
          </div>
        )}
      </div>
    </div>
  );
}

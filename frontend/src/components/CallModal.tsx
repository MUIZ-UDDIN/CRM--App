import React, { useState, useEffect } from 'react';
import {
  PhoneIcon,
  PhoneXMarkIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  MicrophoneIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface CallModalProps {
  isOpen: boolean;
  callState: 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended';
  contactName?: string;
  contactNumber: string;
  duration?: number;
  isIncoming?: boolean;
  onAnswer?: () => void;
  onReject?: () => void;
  onHangup?: () => void;
  onMute?: (muted: boolean) => void;
  onSpeaker?: (enabled: boolean) => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  callState,
  contactName,
  contactNumber,
  duration = 0,
  isIncoming = false,
  onAnswer,
  onReject,
  onHangup,
  onMute,
  onSpeaker
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    onMute?.(newMuted);
  };

  const handleSpeaker = () => {
    const newSpeaker = !isSpeaker;
    setIsSpeaker(newSpeaker);
    onSpeaker?.(newSpeaker);
  };

  if (!isOpen) return null;

  const getCallStateText = () => {
    switch (callState) {
      case 'ringing':
        return isIncoming ? 'Incoming Call...' : 'Calling...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call Ended';
      default:
        return '';
    }
  };

  const getCallStateColor = () => {
    switch (callState) {
      case 'ringing':
        return 'bg-blue-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'connected':
        return 'bg-green-500';
      case 'ended':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-96 overflow-hidden">
        {/* Header */}
        <div className={`${getCallStateColor()} text-white px-6 py-8 text-center`}>
          <div className="mb-4">
            <div className="w-24 h-24 mx-auto bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <PhoneIcon className="w-12 h-12" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-2">
            {contactName || contactNumber}
          </h2>
          
          {contactName && (
            <p className="text-sm opacity-90 mb-2">{contactNumber}</p>
          )}
          
          <p className="text-lg font-medium">
            {getCallStateText()}
          </p>
        </div>

        {/* Call Controls */}
        <div className="px-6 py-6 bg-gray-50">
          {callState === 'ringing' && isIncoming ? (
            /* Incoming Call - Answer/Reject */
            <div className="flex justify-center space-x-4">
              <button
                onClick={onReject}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110"
              >
                <PhoneXMarkIcon className="w-8 h-8" />
              </button>
              <button
                onClick={onAnswer}
                className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 animate-pulse"
              >
                <PhoneIcon className="w-8 h-8" />
              </button>
            </div>
          ) : callState === 'ringing' || callState === 'connecting' ? (
            /* Outgoing Call - Cancel */
            <div className="flex justify-center">
              <button
                onClick={onHangup}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110"
              >
                <PhoneXMarkIcon className="w-8 h-8" />
              </button>
            </div>
          ) : callState === 'connected' ? (
            /* Active Call - Mute, Speaker, Hangup */
            <div className="space-y-4">
              <div className="flex justify-center space-x-6">
                <button
                  onClick={handleMute}
                  className={`w-14 h-14 ${isMuted ? 'bg-red-500' : 'bg-gray-300'} hover:bg-gray-400 text-white rounded-full flex items-center justify-center shadow transition-all`}
                >
                  <MicrophoneIcon className="w-6 h-6" />
                </button>
                <button
                  onClick={handleSpeaker}
                  className={`w-14 h-14 ${isSpeaker ? 'bg-blue-500' : 'bg-gray-300'} hover:bg-gray-400 text-white rounded-full flex items-center justify-center shadow transition-all`}
                >
                  {isSpeaker ? (
                    <SpeakerWaveIcon className="w-6 h-6" />
                  ) : (
                    <SpeakerXMarkIcon className="w-6 h-6" />
                  )}
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={onHangup}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110"
                >
                  <PhoneXMarkIcon className="w-8 h-8" />
                </button>
              </div>
            </div>
          ) : callState === 'ended' ? (
            /* Call Ended - Close */
            <div className="flex justify-center">
              <button
                onClick={onHangup}
                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

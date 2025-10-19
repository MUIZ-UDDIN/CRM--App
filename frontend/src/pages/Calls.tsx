import React, { useState, useEffect } from 'react';
import { PhoneIcon, PlusIcon, TrashIcon, PlayIcon, StopIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Call {
  id: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'missed' | 'busy' | 'no-answer' | 'failed';
  from_address: string;
  to_address: string;
  duration: number;
  recording_url?: string;
  started_at: string;
  ended_at?: string;
  notes?: string;
}

export default function Calls() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCallModal, setShowCallModal] = useState(false);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [callForm, setCallForm] = useState({
    to: '',
    notes: ''
  });
  const { token } = useAuth();

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/calls`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCalls(data);
      } else {
        // Mock data for development
        setCalls([
          {
            id: '1',
            direction: 'outbound',
            status: 'completed',
            from_address: '+0987654321',
            to_address: '+1234567890',
            duration: 180, // 3 minutes
            recording_url: 'https://api.twilio.com/recordings/RE12345678',
            started_at: new Date(Date.now() - 1800000).toISOString(),
            ended_at: new Date(Date.now() - 1620000).toISOString(),
            notes: 'Discussed service requirements'
          },
          {
            id: '2',
            direction: 'inbound',
            status: 'missed',
            from_address: '+1555123456',
            to_address: '+0987654321',
            duration: 0,
            started_at: new Date(Date.now() - 7200000).toISOString(),
            notes: 'Missed call from potential client'
          },
          {
            id: '3',
            direction: 'outbound',
            status: 'completed',
            from_address: '+0987654321',
            to_address: '+1555987654',
            duration: 420, // 7 minutes
            recording_url: 'https://api.twilio.com/recordings/RE87654321',
            started_at: new Date(Date.now() - 14400000).toISOString(),
            ended_at: new Date(Date.now() - 14100000).toISOString(),
            notes: 'Demo call - very interested'
          },
          {
            id: '4',
            direction: 'inbound',
            status: 'completed',
            from_address: '+1444555666',
            to_address: '+0987654321',
            duration: 120, // 2 minutes
            started_at: new Date(Date.now() - 21600000).toISOString(),
            ended_at: new Date(Date.now() - 21480000).toISOString(),
            notes: 'Follow-up call'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching calls:', error);
      toast.error('Failed to load calls');
    } finally {
      setLoading(false);
    }
  };

  const makeCall = async () => {
    if (!callForm.to.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/calls/make`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: callForm.to,
          notes: callForm.notes
        })
      });

      if (response.ok) {
        toast.success('Call initiated');
        setShowCallModal(false);
        setCallForm({ to: '', notes: '' });
        fetchCalls();
      } else {
        toast.error('Failed to make call');
      }
    } catch (error) {
      console.error('Error making call:', error);
      toast.error('Failed to make call');
    }
  };

  const deleteCall = async (callId: string) => {
    if (!confirm('Are you sure you want to delete this call record?')) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/calls/${callId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setCalls(calls.filter(call => call.id !== callId));
        toast.success('Call record deleted');
      }
    } catch (error) {
      console.error('Error deleting call:', error);
      toast.error('Failed to delete call');
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const playRecording = (recordingUrl: string, callId: string) => {
    if (playingRecording === callId) {
      setPlayingRecording(null);
      toast('Recording stopped');
    } else {
      setPlayingRecording(callId);
      // In a real app, you would implement audio playback here
      toast.success('Playing recording...');
      // Simulate recording playback
      setTimeout(() => setPlayingRecording(null), 5000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'missed':
        return 'bg-red-100 text-red-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'no-answer':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <PhoneIcon className="w-8 h-8 text-primary-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Voice Calls</h1>
                  <p className="text-gray-600">Voice calls and recordings via Twilio Voice</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCallModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Make Call
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calls List */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="divide-y divide-gray-200">
            {calls.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <PhoneIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p>No calls found</p>
              </div>
            ) : (
              calls.map((call) => (
                <div key={call.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-full ${getDirectionColor(call.direction)}`}>
                        <PhoneIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-sm font-medium ${
                            call.direction === 'inbound' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {call.direction === 'inbound' ? 'From' : 'To'}: {
                              call.direction === 'inbound' ? call.from_address : call.to_address
                            }
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(call.started_at)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(call.status)}`}>
                            {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Duration:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatDuration(call.duration)}
                            </span>
                          </div>
                          
                          {call.recording_url && (
                            <>
                              <span className="text-gray-400">•</span>
                              <button 
                                className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-800 font-medium"
                                onClick={() => playRecording(call.recording_url!, call.id)}
                              >
                                {playingRecording === call.id ? (
                                  <StopIcon className="w-4 h-4" />
                                ) : (
                                  <PlayIcon className="w-4 h-4" />
                                )}
                                <span>{playingRecording === call.id ? 'Stop' : 'Play'} Recording</span>
                              </button>
                            </>
                          )}
                        </div>
                        
                        {call.notes && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <span className="font-medium">Notes:</span> {call.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => deleteCall(call.id)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                        title="Delete call record"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Make Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Make Phone Call</h3>
              <button 
                onClick={() => setShowCallModal(false)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+1234567890"
                  value={callForm.to}
                  onChange={(e) => setCallForm({...callForm, to: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea 
                  rows={3}
                  placeholder="Add notes about this call..."
                  value={callForm.notes}
                  onChange={(e) => setCallForm({...callForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCallModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={makeCall}
                  disabled={!callForm.to.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Make Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
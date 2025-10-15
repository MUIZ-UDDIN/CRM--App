import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  QuestionMarkCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { healthService } from '../../services/health';

export default function BackendStatus() {
  const [status, setStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Set up periodic health checks
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      await healthService.checkBackendHealth();
      setStatus(healthService.getBackendStatus());
    } finally {
      setIsChecking(false);
    }
  };

  const handleManualCheck = async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      await healthService.forceHealthCheck();
      setStatus(healthService.getBackendStatus());
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          text: 'Backend Connected',
          description: 'API is responding normally'
        };
      case 'disconnected':
        return {
          icon: XCircleIcon,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          text: 'Backend Disconnected',
          description: 'Using mock data'
        };
      default:
        return {
          icon: QuestionMarkCircleIcon,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          text: 'Backend Status Unknown',
          description: 'Checking connection...'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const Icon = statusConfig.icon;

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${statusConfig.bgColor} border border-gray-200`}>
      <div className="relative">
        <Icon className={`h-4 w-4 ${statusConfig.color}`} />
        {isChecking && (
          <ArrowPathIcon className="h-3 w-3 text-gray-400 animate-spin absolute -top-0.5 -right-0.5" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${statusConfig.color}`}>
          {statusConfig.text}
        </p>
        <p className="text-xs text-gray-500">
          {statusConfig.description}
        </p>
      </div>
      
      {status !== 'unknown' && (
        <button
          onClick={handleManualCheck}
          disabled={isChecking}
          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
          title="Refresh status"
        >
          <ArrowPathIcon className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}
import React from 'react';
import InboxView from '../components/inbox/InboxView';
import { InboxIcon } from '@heroicons/react/24/outline';

export default function Inbox() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <InboxIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
            <p className="text-gray-600">Manage your SMS and Email communications</p>
          </div>
        </div>
      </div>
      
      {/* Inbox Component */}
      <InboxView />
    </div>
  );
};

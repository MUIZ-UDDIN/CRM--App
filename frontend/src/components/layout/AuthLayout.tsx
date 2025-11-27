import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-500 opacity-95"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl font-bold">CRM</span>
            </div>
          </div>
          
          {/* Heading */}
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Welcome to Sales CRM
            </h1>
            <p className="text-xl text-primary-100 mb-8 max-w-md">
              The powerful CRM solution for modern sales teams. Manage your pipeline, 
              track performance, and close more deals.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Advanced Analytics</h3>
              <p className="text-sm text-primary-100">Deep insights into your sales performance</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Team Collaboration</h3>
              <p className="text-sm text-primary-100">Work together seamlessly</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Automation</h3>
              <p className="text-sm text-primary-100">Streamline your workflow</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Secure</h3>
              <p className="text-sm text-primary-100">Enterprise-grade security</p>
            </div>
          </div>
        </div>

        {/* Background pattern */}
        <div className="absolute bottom-0 right-0 opacity-10">
          <svg width="404" height="404" fill="none" viewBox="0 0 404 404">
            <defs>
              <pattern
                id="85737c0e-0916-41d7-917f-596dc7edfa27"
                x={0}
                y={0}
                width={20}
                height={20}
                patternUnits="userSpaceOnUse"
              >
                <rect x={0} y={0} width={4} height={4} className="text-primary-300" fill="currentColor" />
              </pattern>
            </defs>
            <rect width={404} height={404} fill="url(#85737c0e-0916-41d7-917f-596dc7edfa27)" />
          </svg>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
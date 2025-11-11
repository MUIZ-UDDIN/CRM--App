import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress Twilio SDK and AudioContext console logs globally
const originalLog = console.log;
const originalWarn = console.warn;
const originalInfo = console.info;
const originalError = console.error;

// Suppress specific console messages
const shouldSuppress = (message: string): boolean => {
  return message.includes('[TwilioVoice]') || 
         message.includes('AudioContext') ||
         message.includes('TwilioVoice') ||
         message.includes('WSTransport') ||
         message.includes('AudioHelper') ||
         message.includes('PStream') ||
         message.includes('OutputDeviceCollection') ||
         message.includes('EventPublisher') ||
         message.includes('AudioProcessorEventObserver') ||
         message.includes('audio output devices') ||
         message.includes('Devices not found') ||
         message.includes('was not allowed to start') ||
         message.includes('must be resumed');
};

console.log = function(...args: any[]) {
  const message = args.join(' ');
  if (!shouldSuppress(message)) {
    originalLog.apply(console, args);
  }
};

console.warn = function(...args: any[]) {
  const message = args.join(' ');
  if (!shouldSuppress(message)) {
    originalWarn.apply(console, args);
  }
};

console.info = function(...args: any[]) {
  const message = args.join(' ');
  if (!shouldSuppress(message)) {
    originalInfo.apply(console, args);
  }
};

console.error = function(...args: any[]) {
  const message = args.join(' ');
  if (!shouldSuppress(message)) {
    originalError.apply(console, args);
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress Twilio SDK console logs globally
const originalLog = console.log;
const originalWarn = console.warn;
const originalInfo = console.info;

console.log = function(...args: any[]) {
  const message = args.join(' ');
  if (message.includes('[TwilioVoice]') || 
      message.includes('AudioContext') ||
      message.includes('TwilioVoice') ||
      message.includes('WSTransport') ||
      message.includes('AudioHelper') ||
      message.includes('PStream') ||
      message.includes('OutputDeviceCollection') ||
      message.includes('EventPublisher') ||
      message.includes('AudioProcessorEventObserver')) {
    return;
  }
  originalLog.apply(console, args);
};

console.warn = function(...args: any[]) {
  const message = args.join(' ');
  if (message.includes('[TwilioVoice]') || 
      message.includes('AudioContext') ||
      message.includes('TwilioVoice') ||
      message.includes('audio output devices') ||
      message.includes('Devices not found')) {
    return;
  }
  originalWarn.apply(console, args);
};

console.info = function(...args: any[]) {
  const message = args.join(' ');
  if (message.includes('[TwilioVoice]') || message.includes('TwilioVoice')) {
    return;
  }
  originalInfo.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

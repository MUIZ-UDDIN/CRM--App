import { Device, Call } from '@twilio/voice-sdk';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class TwilioVoiceService {
  private device: Device | null = null;
  private currentCall: Call | null = null;
  private onIncomingCallCallback: ((call: Call) => void) | null = null;
  private onCallEndedCallback: (() => void) | null = null;

  async initialize() {
    try {
      // Get access token from backend
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/twilio/client/token`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { token: twilioToken, identity } = response.data;

      // Request microphone permissions explicitly before initializing
      await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Initialize Twilio Device with TwiML URL for outgoing calls
      this.device = new Device(twilioToken, {
        logLevel: 1,
        // codecPreferences removed - let Twilio use defaults
        // Set the TwiML URL for outgoing calls
        edge: 'ashburn' // Use closest edge location
      });

      // Set up event listeners
      this.setupEventListeners();

      // Register the device
      await this.device.register();

      console.log('Twilio Device registered successfully');
      return true;
    } catch (error: any) {
      // Silently ignore 404 errors (Twilio not configured for this company)
      if (error?.response?.status === 404) {
        return false;
      }
      console.error('Failed to initialize Twilio Device:', error);
      throw error;
    }
  }

  private setupEventListeners() {
    if (!this.device) return;

    // Incoming call
    this.device.on('incoming', (call: Call) => {
      console.log('Incoming call from:', call.parameters.From);
      this.currentCall = call;

      // Set up call event listeners
      call.on('accept', () => {
        console.log('Call accepted');
      });

      call.on('disconnect', () => {
        console.log('Call ended');
        this.currentCall = null;
        if (this.onCallEndedCallback) {
          this.onCallEndedCallback();
        }
      });

      call.on('cancel', () => {
        console.log('Call cancelled');
        this.currentCall = null;
        if (this.onCallEndedCallback) {
          this.onCallEndedCallback();
        }
      });

      call.on('reject', () => {
        console.log('Call rejected');
        this.currentCall = null;
        if (this.onCallEndedCallback) {
          this.onCallEndedCallback();
        }
      });

      // Notify the UI
      if (this.onIncomingCallCallback) {
        this.onIncomingCallCallback(call);
      }
    });

    // Device ready
    this.device.on('registered', () => {
      console.log('Twilio Device is ready to receive calls');
    });

    // Device errors
    this.device.on('error', (error: any) => {
      console.error('Twilio Device error:', error);
    });

    // Token will expire
    this.device.on('tokenWillExpire', async () => {
      console.log('Token will expire, refreshing...');
      await this.refreshToken();
    });
  }

  private async refreshToken() {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/twilio/client/token`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { token: twilioToken } = response.data;
      this.device?.updateToken(twilioToken);
      console.log('Token refreshed successfully');
    } catch (error: any) {
      // Silently ignore 404 errors (Twilio not configured)
      if (error?.response?.status === 404) {
        return;
      }
      console.error('Failed to refresh token:', error);
    }
  }

  async answerCall() {
    if (this.currentCall) {
      try {
        // Ensure microphone access before accepting
        await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        this.currentCall.accept();
        console.log('Call answered with microphone access');
      } catch (error) {
        console.error('Failed to get microphone access:', error);
        // Still try to accept the call
        this.currentCall.accept();
      }
    }
  }

  rejectCall() {
    if (this.currentCall) {
      this.currentCall.reject();
    }
  }

  hangupCall() {
    if (this.currentCall) {
      this.currentCall.disconnect();
    }
  }

  muteCall(muted: boolean) {
    if (this.currentCall) {
      this.currentCall.mute(muted);
    }
  }

  onIncomingCall(callback: (call: Call) => void) {
    this.onIncomingCallCallback = callback;
  }

  onCallEnded(callback: () => void) {
    this.onCallEndedCallback = callback;
  }

  getCurrentCall() {
    return this.currentCall;
  }

  isCallActive() {
    return this.currentCall !== null;
  }

  async makeOutboundCall(phoneNumber: string, fromNumber?: string) {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    try {
      // Connect using Twilio Device SDK
      // The TwiML URL is configured in the backend token endpoint
      const call = await this.device.connect({
        params: {
          To: phoneNumber,
          from_number: fromNumber || '', // Pass the from number
          CallerId: fromNumber || '' // Set caller ID
        },
        rtcConfiguration: {
          iceServers: [
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.currentCall = call;

      // Set up call event listeners
      call.on('accept', () => {
        console.log('Outbound call accepted');
      });

      call.on('disconnect', () => {
        console.log('Call ended');
        this.currentCall = null;
        if (this.onCallEndedCallback) {
          this.onCallEndedCallback();
        }
      });

      call.on('cancel', () => {
        console.log('Call cancelled');
        this.currentCall = null;
        if (this.onCallEndedCallback) {
          this.onCallEndedCallback();
        }
      });

      call.on('reject', () => {
        console.log('Call rejected');
        this.currentCall = null;
        if (this.onCallEndedCallback) {
          this.onCallEndedCallback();
        }
      });

      return call;
    } catch (error) {
      console.error('Failed to make outbound call:', error);
      throw error;
    }
  }

  destroy() {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.currentCall = null;
  }
}

export const twilioVoiceService = new TwilioVoiceService();

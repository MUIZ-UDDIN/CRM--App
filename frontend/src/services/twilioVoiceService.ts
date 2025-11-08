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

      // Initialize Twilio Device
      this.device = new Device(twilioToken, {
        logLevel: 1,
        codecPreferences: ['opus', 'pcmu'],
      });

      // Set up event listeners
      this.setupEventListeners();

      // Register the device
      await this.device.register();

      console.log('Twilio Device registered successfully');
      return true;
    } catch (error) {
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
    this.device.on('error', (error) => {
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
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }

  answerCall() {
    if (this.currentCall) {
      this.currentCall.accept();
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

  async makeOutboundCall(phoneNumber: string) {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    try {
      const call = await this.device.connect({
        params: {
          To: phoneNumber,
        },
      });

      this.currentCall = call;

      // Set up call event listeners
      call.on('disconnect', () => {
        console.log('Call ended');
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

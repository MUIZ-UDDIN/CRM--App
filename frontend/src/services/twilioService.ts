import apiClient from './apiClient';

export interface TwilioSettings {
  account_sid: string;
  auth_token: string;
  phone_number?: string;
  sms_enabled?: boolean;
  voice_enabled?: boolean;
}

export interface TwilioSettingsResponse {
  id: string;
  company_id: string;
  account_sid: string;
  phone_number?: string;
  sms_enabled: boolean;
  voice_enabled: boolean;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_verified_at?: string;
}

/**
 * Get current company's Twilio settings
 */
export const getTwilioSettings = async (): Promise<TwilioSettingsResponse | null> => {
  try {
    const response = await apiClient.get('/twilio-settings/');
    return response.data;
  } catch (error: any) {
    // Return null if no settings found (404)
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Create new Twilio settings
 */
export const createTwilioSettings = async (settings: TwilioSettings): Promise<TwilioSettingsResponse> => {
  const response = await apiClient.post('/twilio-settings/', settings);
  return response.data;
};

/**
 * Update existing Twilio settings
 */
export const updateTwilioSettings = async (settings: Partial<TwilioSettings>): Promise<TwilioSettingsResponse> => {
  const response = await apiClient.put('/twilio-settings/', settings);
  return response.data;
};

/**
 * Delete Twilio settings
 */
export const deleteTwilioSettings = async (): Promise<void> => {
  await apiClient.delete('/twilio-settings/');
};

/**
 * Verify Twilio credentials
 */
export const verifyTwilioSettings = async (): Promise<{ is_verified: boolean; message: string }> => {
  const response = await apiClient.post('/twilio-settings/verify');
  return response.data;
};

/**
 * Sync phone numbers from Twilio
 */
export const syncPhoneNumbers = async (): Promise<void> => {
  await apiClient.post('/twilio/sync/phone-numbers');
};

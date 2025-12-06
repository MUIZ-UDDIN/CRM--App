import apiClient from './apiClient';

export interface SendGridSettings {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface GmailSettings {
  email: string;
  syncEnabled: boolean;
  syncFrequency: string;
}

export interface EmailSettingsResponse {
  sendgrid_enabled: boolean;
  sendgrid_from_email?: string;
  sendgrid_from_name?: string;
  gmail_enabled: boolean;
  gmail_email?: string;
  gmail_sync_enabled?: boolean;
  gmail_sync_frequency?: string;
  default_provider: string;
}

// SendGrid API calls
export const saveSendGridSettings = async (settings: SendGridSettings) => {
  const response = await apiClient.post('/email-settings/sendgrid', {
    api_key: settings.apiKey,
    from_email: settings.fromEmail,
    from_name: settings.fromName,
  });
  return response.data;
};

export const getSendGridSettings = async () => {
  const response = await apiClient.get('/email-settings/sendgrid');
  return response.data;
};

export const deleteSendGridSettings = async () => {
  const response = await apiClient.delete('/email-settings/sendgrid');
  return response.data;
};

// Gmail API calls
export const getGmailAuthUrl = async () => {
  const response = await apiClient.get('/email-settings/gmail/auth-url');
  return response.data;
};

export const disconnectGmail = async () => {
  const response = await apiClient.delete('/email-settings/gmail');
  return response.data;
};

export const getGmailSettings = async () => {
  const response = await apiClient.get('/email-settings/gmail');
  return response.data;
};

export const updateGmailSettings = async (settings: Partial<GmailSettings>) => {
  const response = await apiClient.patch('/email-settings/gmail', settings);
  return response.data;
};

// Get all email settings
export const getEmailSettings = async (companyId?: string): Promise<EmailSettingsResponse> => {
  const params = companyId ? { company_id_filter: companyId } : {};
  const response = await apiClient.get('/email-settings', { params });
  return response.data;
};

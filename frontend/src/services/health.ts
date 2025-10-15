import apiService from './api';

export class HealthService {
  private static instance: HealthService;
  private backendStatus: 'unknown' | 'connected' | 'disconnected' = 'unknown';
  private lastCheck: number = 0;
  private checkInterval: number = 30000; // 30 seconds

  static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  async checkBackendHealth(): Promise<boolean> {
    const now = Date.now();
    
    // Only check if it's been more than checkInterval since last check
    if (now - this.lastCheck < this.checkInterval && this.backendStatus !== 'unknown') {
      return this.backendStatus === 'connected';
    }

    try {
      await apiService.healthCheck();
      this.backendStatus = 'connected';
      this.lastCheck = now;
      return true;
    } catch (error) {
      this.backendStatus = 'disconnected';
      this.lastCheck = now;
      
      console.warn('Backend health check failed:', error);
      return false;
    }
  }

  getBackendStatus(): 'unknown' | 'connected' | 'disconnected' {
    return this.backendStatus;
  }

  // Method to force a health check
  async forceHealthCheck(): Promise<boolean> {
    this.lastCheck = 0; // Reset last check time
    return this.checkBackendHealth();
  }
}

// Export singleton instance
export const healthService = HealthService.getInstance();
/**
 * WebSocket Service for Real-Time Updates
 * Provides real-time analytics updates when deals, activities, etc. change
 */

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(token: string) {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
    
    try {
      this.socket = new WebSocket(`${wsUrl}?token=${token}`);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('connected', {});
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      this.socket.onclose = () => {
        this.emit('disconnected', {});
        this.attemptReconnect(token);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      setTimeout(() => {
        this.connect(token);
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_failed', {});
    }
  }

  private handleMessage(data: any) {
    const { type, payload, entity_type, action, entity_id, data: entityData } = data;
    
    // Handle new entity_change format from backend
    if (type === 'entity_change') {
      // Emit generic entity_change event
      this.emit('entity_change', {
        entity_type,
        action,
        entity_id,
        data: entityData
      });
      
      // Emit specific events for backward compatibility and specific handlers
      this.emit(`${entity_type}_${action}`, {
        entity_type,
        action,
        entity_id,
        data: entityData
      });
      
      // Trigger analytics updates based on entity type
      switch (entity_type) {
        case 'deal':
          this.emit('analytics_update', { type: 'pipeline' });
          if (action === 'updated' && entityData?.status) {
            this.emit('analytics_update', { type: 'revenue' });
          }
          break;
        case 'activity':
          this.emit('analytics_update', { type: 'activities' });
          break;
        case 'contact':
          this.emit('analytics_update', { type: 'contacts' });
          break;
        case 'quote':
          this.emit('analytics_update', { type: 'quotes' });
          break;
        case 'pipeline':
        case 'pipeline_stage':
          this.emit('analytics_update', { type: 'pipeline' });
          break;
        case 'team':
        case 'user':
          this.emit('analytics_update', { type: 'team' });
          break;
      }
      return;
    }
    
    // Handle new_notification format
    if (type === 'new_notification') {
      this.emit('new_notification', data.notification);
      return;
    }
    
    // Legacy event handlers (keep for backward compatibility)
    switch (type) {
      case 'analytics_update':
        this.emit('analytics_update', payload);
        break;
      case 'deal_moved':
        this.emit('deal_moved', payload);
        this.emit('analytics_update', { type: 'pipeline' });
        break;
      case 'deal_created':
        this.emit('deal_created', payload);
        this.emit('analytics_update', { type: 'pipeline' });
        break;
      case 'deal_won':
      case 'deal_lost':
        this.emit('deal_status_changed', payload);
        this.emit('analytics_update', { type: 'pipeline' });
        this.emit('analytics_update', { type: 'revenue' });
        break;
      case 'activity_completed':
        this.emit('activity_completed', payload);
        this.emit('analytics_update', { type: 'activities' });
        break;
      case 'contact_created':
        this.emit('contact_created', payload);
        this.emit('analytics_update', { type: 'contacts' });
        break;
      case 'email_sent':
      case 'email_opened':
      case 'email_clicked':
        this.emit('email_event', payload);
        this.emit('analytics_update', { type: 'emails' });
        break;
      case 'document_signed':
        this.emit('document_signed', payload);
        this.emit('analytics_update', { type: 'documents' });
        break;
      case 'call_completed':
        this.emit('call_completed', payload);
        this.emit('analytics_update', { type: 'calls' });
        break;
      default:
        break;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  send(type: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

export default websocketService;

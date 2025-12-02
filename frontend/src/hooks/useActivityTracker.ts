/**
 * Activity Tracker Hook
 * Tracks user activity and extends session automatically
 * Prevents logout while user is actively working
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
const ACTIVITY_THROTTLE = 60000; // Check activity every 1 minute
const SESSION_WARNING_TIME = 15 * 60 * 1000; // Warn 15 minutes before expiry
const SESSION_EXTEND_THRESHOLD = 30 * 60 * 1000; // Extend if less than 30 min remaining

export function useActivityTracker() {
  const { isAuthenticated, logout } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasWarnedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Track user activity
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      hasWarnedRef.current = false; // Reset warning when user is active
    };

    // Add activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Check session status periodically
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      try {
        // Decode token to check expiration (without verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        // If user was active recently and token is expiring soon, try to refresh
        const timeSinceActivity = now - lastActivityRef.current;
        if (timeSinceActivity < ACTIVITY_THROTTLE && timeUntilExpiry < SESSION_EXTEND_THRESHOLD) {
          try {
            // Validate token with backend (this will extend session if valid)
            await apiService.getCurrentUser();
            console.log('✅ Session extended due to user activity');
          } catch (error) {
            // Token is invalid, logout will be handled by API interceptor
            console.log('⚠️ Session validation failed');
          }
        }

        // Warn user if session is about to expire and they haven't been warned
        if (timeUntilExpiry < SESSION_WARNING_TIME && timeUntilExpiry > 0 && !hasWarnedRef.current) {
          hasWarnedRef.current = true;
          const minutesLeft = Math.floor(timeUntilExpiry / 60000);
          console.log(`⚠️ Session will expire in ${minutesLeft} minutes`);
          // You can show a toast notification here if desired
          // toast.warning(`Your session will expire in ${minutesLeft} minutes. Click anywhere to extend.`);
        }
      } catch (error) {
        // Error decoding token or checking session
        console.error('Session check error:', error);
      }
    };

    // Start periodic session check
    activityCheckIntervalRef.current = setInterval(checkSession, ACTIVITY_THROTTLE);

    // Initial check
    checkSession();

    // Cleanup
    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current);
      }
    };
  }, [isAuthenticated, logout]);

  return {
    lastActivity: lastActivityRef.current,
  };
}

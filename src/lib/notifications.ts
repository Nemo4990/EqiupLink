import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

class NotificationService {
  private initialized = false;
  private userId: string | null = null;

  async initialize(userId: string) {
    if (this.initialized) return;

    this.userId = userId;

    if (!Capacitor.isNativePlatform()) {
      console.log('Not a native platform, skipping push notification setup');
      return;
    }

    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permission not granted');
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token: ' + token.value);
        await this.saveDeviceToken(token.value);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      PushNotifications.addListener(
        'pushNotificationReceived',
        async (notification: PushNotificationSchema) => {
          console.log('Push notification received: ' + JSON.stringify(notification));
          await this.handleNotificationReceived(notification);
        }
      );

      PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification: ActionPerformed) => {
          console.log('Push notification action performed', notification);
          this.handleNotificationAction(notification);
        }
      );

      await LocalNotifications.requestPermissions();

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  private async saveDeviceToken(token: string) {
    if (!this.userId) return;

    try {
      const { error } = await supabase
        .from('device_tokens')
        .upsert({
          user_id: this.userId,
          token,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,token',
        });

      if (error) {
        console.error('Error saving device token:', error);
      }
    } catch (error) {
      console.error('Error saving device token:', error);
    }
  }

  private async handleNotificationReceived(notification: PushNotificationSchema) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: notification.title || 'EquipLink',
          body: notification.body || '',
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 1000) },
          extra: notification.data,
        },
      ],
    });
  }

  private handleNotificationAction(notification: ActionPerformed) {
    const data = notification.notification.data;

    if (data?.type === 'message') {
      window.location.href = '/messages';
    } else if (data?.type === 'breakdown') {
      window.location.href = '/breakdown';
    } else if (data?.type === 'review') {
      window.location.href = '/profile';
    } else if (data?.type === 'announcement') {
      window.location.href = '/notifications';
    }
  }

  async scheduleLocalNotification(payload: NotificationPayload) {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: payload.title,
            body: payload.body,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 1000) },
            extra: payload.data,
          },
        ],
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  async cleanup() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await PushNotifications.removeAllListeners();
      this.initialized = false;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
    }
  }

  async setupNotificationListener(userId: string) {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const notification = payload.new;
          await this.scheduleLocalNotification({
            title: notification.title || 'EquipLink',
            body: notification.message || '',
            data: {
              type: notification.type,
              id: notification.id,
            },
          });
        }
      )
      .subscribe();

    return channel;
  }
}

export const notificationService = new NotificationService();

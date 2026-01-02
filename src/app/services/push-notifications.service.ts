import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ToastController } from '@ionic/angular';
import { catchError, of } from 'rxjs';

import { AuthService } from './auth.service';
import { apiConfig } from 'src/environments/environment';

export interface LocalReminderInput {
  title: string;
  body?: string;
  at: Date;
  extra?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationsService {
  private initialized = false;
  private currentUserId: number | null = null;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private toastController: ToastController
  ) {
    this.authService.currentUser.subscribe(user => {
      this.currentUserId = user?.id ?? null;
    });
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Push notifications are only supported on iOS/Android native builds.
    if (Capacitor.getPlatform() === 'web') return;

    this.addListeners();
    await this.registerForPushNotifications();
  }

  private addListeners(): void {
    PushNotifications.addListener('registration', token => {
      void this.onToken(token.value);
    });

    PushNotifications.addListener('registrationError', err => {
      // eslint-disable-next-line no-console
      console.error('Push registration error', err);
    });

    PushNotifications.addListener('pushNotificationReceived', notification => {
      // When the app is in foreground, iOS/Android might not show a system notification.
      // We show a lightweight toast instead.
      void this.showToast(notification.title ?? 'Notification', notification.body ?? '');
    });

    PushNotifications.addListener('pushNotificationActionPerformed', action => {
      // eslint-disable-next-line no-console
      console.log('Push action performed', action);
    });
  }

  private async registerForPushNotifications(): Promise<void> {
    const permissionStatus = await PushNotifications.checkPermissions();

    if (permissionStatus.receive !== 'granted') {
      const request = await PushNotifications.requestPermissions();
      if (request.receive !== 'granted') {
        // Permission denied.
        return;
      }
    }

    await PushNotifications.register();
  }

  private async onToken(token: string): Promise<void> {
    // Persist token locally (useful even in mock mode)
    const storageKey = this.getStorageKey();
    const previous = storageKey ? localStorage.getItem(storageKey) : null;

    if (storageKey) {
      localStorage.setItem(storageKey, token);
    }

    // Optionally sync to backend if configured.
    // Your backend should store (userId, token, platform) and use FCM/APNs to send pushes.
    if (apiConfig.apiUrl && this.currentUserId != null && previous !== token) {
      this.http
        .post(`${apiConfig.apiUrl}/device-tokens`, {
          userId: this.currentUserId,
          token,
          platform: Capacitor.getPlatform()
        })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
  }

  getSavedToken(): string | null {
    const storageKey = this.getStorageKey();
    return storageKey ? localStorage.getItem(storageKey) : null;
  }

  async scheduleLocalReminder(input: LocalReminderInput): Promise<void> {
    // Local notifications can be used for reminders even without a server.
    if (Capacitor.getPlatform() === 'web') return;

    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;

    const id = Math.floor(Date.now() / 1000);

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: input.title,
          body: input.body ?? '',
          schedule: { at: input.at },
          extra: input.extra
        }
      ]
    });
  }

  private async showToast(header: string, message: string): Promise<void> {
    const toast = await this.toastController.create({
      header,
      message,
      duration: 3500,
      position: 'top',
      buttons: [{ text: 'OK', role: 'cancel' }]
    });

    await toast.present();
  }

  private getStorageKey(): string | null {
    if (this.currentUserId == null) return null;
    return `pushToken:${this.currentUserId}`;
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Firebase Cloud Messaging via Admin SDK.
 * Set `GOOGLE_APPLICATION_CREDENTIALS` to the absolute path of the service account JSON (not committed to git).
 * @see https://firebase.google.com/docs/cloud-messaging/send-message
 */
@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private enabled = false;

  onModuleInit(): void {
    if (admin.apps.length > 0) {
      this.enabled = true;
      return;
    }
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
      this.logger.warn(
        'FCM disabled: set GOOGLE_APPLICATION_CREDENTIALS to the service account JSON file path',
      );
      return;
    }
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      this.enabled = true;
      this.logger.log('Firebase Admin initialized for FCM');
    } catch (e) {
      this.logger.error('Firebase Admin init failed', e instanceof Error ? e.stack : e);
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    if (!this.enabled || tokens.length === 0) {
      return;
    }
    const messages: admin.messaging.Message[] = tokens.map((token) => ({
      token,
      notification: { title, body },
      data,
    }));
    const result = await admin.messaging().sendEach(messages);
    this.logger.log(`FCM: ${result.successCount}/${tokens.length} sends succeeded`);
    if (result.failureCount > 0) {
      this.logger.warn(`FCM: ${result.failureCount}/${tokens.length} sends failed`);
    }
  }
}

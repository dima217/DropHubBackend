import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

/**
 * Firebase Cloud Messaging via Admin SDK.
 *
 * Local: `GOOGLE_APPLICATION_CREDENTIALS` — path to service account JSON file.
 * Railway: `GOOGLE_APPLICATION_CREDENTIALS_JSON` — full JSON content (Raw Editor in Variables).
 *
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

    const credential = this.resolveCredential();
    if (!credential) {
      this.logger.warn(
        'FCM disabled: set GOOGLE_APPLICATION_CREDENTIALS_JSON (Railway) or GOOGLE_APPLICATION_CREDENTIALS (file path)',
      );
      return;
    }

    try {
      admin.initializeApp({ credential });
      this.enabled = true;
      this.logger.log('Firebase Admin initialized for FCM');
    } catch (e) {
      this.logger.error('Firebase Admin init failed', e instanceof Error ? e.stack : e);
    }
  }

  private resolveCredential(): admin.credential.Credential | null {
    const jsonRaw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
    if (jsonRaw) {
      try {
        const serviceAccount = JSON.parse(jsonRaw) as ServiceAccount;
        return admin.credential.cert(serviceAccount);
      } catch (e) {
        this.logger.error(
          'Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON',
          e instanceof Error ? e.message : e,
        );
        return null;
      }
    }

    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    if (credentialsPath) {
      return admin.credential.applicationDefault();
    }

    return null;
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

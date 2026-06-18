import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { env } from '../config/env.js';

class LocalLogProvider {
  async send({ phone, orderId, total }) {
    process.stdout.write(
      `[SMS] Order confirmation to ${phone} — Order #${orderId}, Total ₹${(total / 100).toFixed(2)}\n`
    );
  }
}

class SnsSmsProvider {
  constructor() {
    this._sns = new SNSClient({
      region: env.AWS_DEFAULT_REGION,
      endpoint: env.AWS_ENDPOINT_URL || undefined,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
    this._topicArn = process.env.SNS_ORDER_TOPIC_ARN ?? '';
  }

  async send({ phone, orderId, total }) {
    if (!this._topicArn) {
      process.stdout.write(`[SNS] SNS_ORDER_TOPIC_ARN not set — skipping publish for order ${orderId}\n`);
      return;
    }
    await this._sns.send(new PublishCommand({
      TopicArn: this._topicArn,
      Message: JSON.stringify({ phone, orderId, total }),
      Subject: 'order.created',
    }));
  }
}

export class NotificationService {
  constructor() {
    const provider = env.NOTIFICATIONS_PROVIDER;
    this._provider = provider === 'sns' ? new SnsSmsProvider() : new LocalLogProvider();
    this._enabled = env.NOTIFICATIONS_ENABLED === 'true';
  }

  async sendOrderConfirmation({ phone, orderId, total }) {
    if (!this._enabled || !phone) return;
    try {
      await this._provider.send({ phone, orderId, total });
    } catch (err) {
      process.stderr.write(`[notifications] Failed to send order confirmation: ${err.message}\n`);
    }
  }
}

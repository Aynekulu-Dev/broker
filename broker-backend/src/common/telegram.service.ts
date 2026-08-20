import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot | null = null;
  private adminChatId: string | undefined;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    this.adminChatId = this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID');
    if (token) {
      // polling: false — this bot only sends outbound alerts, it doesn't
      // need to receive updates.
      this.bot = new TelegramBot(token, { polling: false });
    } else {
      console.warn(
        '[TelegramService] TELEGRAM_BOT_TOKEN not set — notifications disabled',
      );
    }
  }

  /** FR-04: instant alert to admin when an order/receipt is submitted. */
  async notifyAdmin(message: string) {
    if (!this.bot || !this.adminChatId) return;
    try {
      await this.bot.sendMessage(this.adminChatId, message, {
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.error('[TelegramService] Failed to send notification:', err);
    }
  }

  async notifyNewOrder(params: {
    storeName: string;
    ownerName: string;
    phoneNumber: string;
    totalAmount: string;
    orderId: string;
  }) {
    const { storeName, ownerName, phoneNumber, totalAmount, orderId } = params;
    await this.notifyAdmin(
      `🆕 *New Order*\n` +
        `Store: ${storeName} (${ownerName})\n` +
        `Phone: ${phoneNumber}\n` +
        `Total: ${totalAmount} Birr\n` +
        `Order ID: \`${orderId}\`\n` +
        `Please review the payment receipt in the admin dashboard.`,
    );
  }
}

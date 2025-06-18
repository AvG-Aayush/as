import { db, executeWithTimeout } from './db.js';
import { messages, messageDeliveryLog } from '../shared/schema.js';
import { eq, lt, and, or, isNull, sql, count } from 'drizzle-orm';

export class MessagingCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private retryInterval: NodeJS.Timeout | null = null;

  start() {
    if (this.cleanupInterval || this.retryInterval) {
      console.log('Messaging cleanup service is already running');
      return;
    }

    // Run cleanup every 24 hours
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 24 * 60 * 60 * 1000);

    // Retry failed messages every 30 minutes
    this.retryInterval = setInterval(() => {
      this.retryFailedMessages();
    }, 30 * 60 * 1000);

    console.log('Messaging cleanup service started');
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    
    console.log('Messaging cleanup service stopped');
  }

  private async performCleanup() {
    try {
      console.log('Starting messaging cleanup...');
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

      // Clean up deleted messages older than 30 days
      const deletedMessagesResult = await db
        .delete(messages)
        .where(
          and(
            eq(messages.isDeleted, true),
            lt(messages.deletedAt, thirtyDaysAgo)
          )
        );

      // Clean up old delivery logs older than 7 days
      const deliveryLogsResult = await db
        .delete(messageDeliveryLog)
        .where(
          and(
            or(
              eq(messageDeliveryLog.deliveryStatus, 'delivered'),
              eq(messageDeliveryLog.deliveryStatus, 'read')
            ),
            lt(messageDeliveryLog.lastAttemptAt, sevenDaysAgo)
          )
        );

      // Clean up orphaned delivery logs (messages that no longer exist)
      const orphanedLogsResult = await db
        .delete(messageDeliveryLog)
        .where(
          isNull(
            db.select().from(messages).where(eq(messages.id, messageDeliveryLog.messageId))
          )
        );

      console.log(`Messaging cleanup completed:
        - Deleted messages: ${deletedMessagesResult.rowCount || 0}
        - Delivery logs: ${deliveryLogsResult.rowCount || 0}
        - Orphaned logs: ${orphanedLogsResult.rowCount || 0}`);

    } catch (error) {
      console.error('Messaging cleanup error:', error);
    }
  }

  private async retryFailedMessages() {
    try {
      console.log('Starting failed message retry...');

      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));

      // Find failed messages that haven't been retried in the last 5 minutes
      const failedMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.deliveryStatus, 'failed'),
            lt(messages.retryCount, 3), // Max 3 retries
            or(
              isNull(messages.lastRetryAt),
              lt(messages.lastRetryAt, fiveMinutesAgo)
            )
          )
        )
        .limit(50); // Process max 50 messages at a time

      let retryCount = 0;
      for (const message of failedMessages) {
        try {
          // Update retry count and timestamp
          await db
            .update(messages)
            .set({
              retryCount: (message.retryCount || 0) + 1,
              lastRetryAt: now,
              deliveryStatus: 'sent' // Reset to sent for retry
            })
            .where(eq(messages.id, message.id));

          // Create new delivery log entry for retry
          await db
            .insert(messageDeliveryLog)
            .values({
              messageId: message.id,
              recipientId: message.recipientId!,
              deliveryStatus: 'pending',
              attemptCount: (message.retryCount || 0) + 1,
              lastAttemptAt: now
            });

          retryCount++;
        } catch (error) {
          console.error(`Failed to retry message ${message.id}:`, error);
        }
      }

      if (retryCount > 0) {
        console.log(`Retried ${retryCount} failed messages`);
      }

    } catch (error) {
      console.error('Failed message retry error:', error);
    }
  }

  async runCleanup() {
    await this.performCleanup();
  }

  async runRetry() {
    await this.retryFailedMessages();
  }

  // Mark message as delivered
  async markMessageDelivered(messageId: number, recipientId: number) {
    try {
      const now = new Date();

      // Update message delivery status
      await db
        .update(messages)
        .set({
          deliveryStatus: 'delivered'
        })
        .where(eq(messages.id, messageId));

      // Update delivery log
      await db
        .update(messageDeliveryLog)
        .set({
          deliveryStatus: 'delivered',
          deliveredAt: now
        })
        .where(
          and(
            eq(messageDeliveryLog.messageId, messageId),
            eq(messageDeliveryLog.recipientId, recipientId)
          )
        );

    } catch (error) {
      console.error('Error marking message as delivered:', error);
      throw error;
    }
  }

  // Mark message as failed
  async markMessageFailed(messageId: number, recipientId: number, errorMessage: string) {
    try {
      const now = new Date();

      // Update message delivery status
      await db
        .update(messages)
        .set({
          deliveryStatus: 'failed'
        })
        .where(eq(messages.id, messageId));

      // Update delivery log
      await db
        .update(messageDeliveryLog)
        .set({
          deliveryStatus: 'failed',
          errorMessage: errorMessage,
          lastAttemptAt: now
        })
        .where(
          and(
            eq(messageDeliveryLog.messageId, messageId),
            eq(messageDeliveryLog.recipientId, recipientId)
          )
        );

    } catch (error) {
      console.error('Error marking message as failed:', error);
      throw error;
    }
  }

  // Get message delivery statistics
  async getDeliveryStats() {
    try {
      const stats = await db
        .select({
          status: messageDeliveryLog.deliveryStatus,
          count: count()
        })
        .from(messageDeliveryLog)
        .groupBy(messageDeliveryLog.deliveryStatus);

      return stats.reduce((acc, stat) => {
        acc[stat.status] = stat.count;
        return acc;
      }, {} as Record<string, number>);

    } catch (error) {
      console.error('Error getting delivery stats:', error);
      return {};
    }
  }
}

export const messagingCleanupService = new MessagingCleanupService();
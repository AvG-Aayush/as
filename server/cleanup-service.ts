import { db } from "./db";
import { announcements, assignments, messages, routines, shifts } from "@shared/schema";
import { lt, sql, and, or, eq } from "drizzle-orm";

export class CleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;

  start() {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch(console.error);
    }, 60 * 60 * 1000); // 1 hour

    // Run initial cleanup
    this.performCleanup().catch(console.error);
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private async performCleanup() {
    console.log('Running automatic cleanup...');
    
    try {
      // Delete expired announcements
      const expiredAnnouncementsResult = await db
        .delete(announcements)
        .where(
          sql`${announcements.expiresAt} IS NOT NULL AND ${announcements.expiresAt} < NOW()`
        );
      
      // Delete overdue assignments (24 hours after due date)
      const overdueAssignmentsResult = await db
        .delete(assignments)
        .where(
          sql`${assignments.dueDate} IS NOT NULL AND ${assignments.dueDate} < NOW() - INTERVAL '1 day' AND ${assignments.status} != 'completed'`
        );

      // Delete expired routines (automatically expire after their date + 1 day)
      const expiredRoutinesResult = await db
        .delete(routines)
        .where(lt(routines.expiresAt, new Date()));

      // Delete messages older than 3 months (temporarily disabled due to schema mismatch)
      // const threeMonthsAgo = new Date();
      // threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      // const oldMessagesResult = await db
      //   .delete(messages)
      //   .where(lt(messages.sentAt, threeMonthsAgo));
      const oldMessagesResult = { rowCount: 0 };

      // Delete completed or cancelled shifts after 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const oldShiftsResult = await db
        .delete(shifts)
        .where(
          and(
            or(
              eq(shifts.status, 'completed'),
              eq(shifts.status, 'cancelled')
            ),
            lt(shifts.createdAt, threeDaysAgo)
          )
        );

      console.log('Cleanup completed:', {
        expiredAnnouncements: expiredAnnouncementsResult.rowCount || 0,
        overdueAssignments: overdueAssignmentsResult.rowCount || 0,
        expiredRoutines: expiredRoutinesResult.rowCount || 0,
        oldMessages: oldMessagesResult.rowCount || 0,
        oldShifts: oldShiftsResult.rowCount || 0
      });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // Manual cleanup method for immediate execution
  async runCleanup() {
    await this.performCleanup();
  }
}

export const cleanupService = new CleanupService();
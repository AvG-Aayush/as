import { db } from './db.js';
import { attendance, users } from '../shared/schema.js';
import { eq, and, isNull, isNotNull, lt } from 'drizzle-orm';

export class AttendanceScheduler {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    // Check every minute for automatic operations
    this.intervalId = setInterval(() => {
      this.performScheduledTasks();
    }, 60 * 1000); // Check every minute

    console.log('Attendance scheduler started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Attendance scheduler stopped');
    }
  }

  private async performScheduledTasks() {
    const now = new Date();
    const isMidnight = now.getHours() === 0 && now.getMinutes() === 0;

    if (isMidnight) {
      await this.handleMidnightReset();
    }
  }

  private async handleMidnightReset() {
    try {
      console.log('Processing midnight attendance reset...');
      
      // Find all uncompleted attendance records from previous day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);

      const uncompletedRecords = await db
        .select()
        .from(attendance)
        .where(
          and(
            isNull(attendance.checkOut),
            lt(attendance.checkIn, yesterday)
          )
        );

      // Auto-checkout with calculated work hours for incomplete records
      for (const record of uncompletedRecords) {
        if (record.checkIn) {
          const checkInTime = new Date(record.checkIn);
          const checkOutTime = yesterday;
          const workingMilliseconds = checkOutTime.getTime() - checkInTime.getTime();
          const workingHours = Math.max(0, workingMilliseconds / (1000 * 60 * 60));
          
          // Calculate overtime (over 8 hours) and TOIL eligibility
          const overtimeHours = workingHours > 8 ? workingHours - 8 : 0;
          const isWeekend = [0, 6].includes(checkInTime.getDay()); // Sunday = 0, Saturday = 6

          await db
            .update(attendance)
            .set({
              checkOut: yesterday,
              checkOutLocation: 'Auto Check-out (Midnight)',
              checkOutNotes: 'Automatically checked out at midnight - no manual checkout recorded',
              workingHours: Math.round(workingHours * 100) / 100,
              overtimeHours: Math.round(overtimeHours * 100) / 100,
              isToilEligible: overtimeHours > 0 || isWeekend,
              toilHoursEarned: Math.round(Math.max(overtimeHours, isWeekend ? workingHours : 0) * 100) / 100,
              isWeekendWork: isWeekend,
              isAutoCheckout: true,
              status: 'incomplete',
              adminNotes: 'Auto-checkout due to missing manual checkout',
              updatedAt: new Date()
            })
            .where(eq(attendance.id, record.id));

          console.log(`Auto-checkout applied for user ${record.userId} - attendance ID ${record.id} - working hours: ${Math.round(workingHours * 100) / 100}`);
        }
      }

      console.log(`Processed ${uncompletedRecords.length} incomplete attendance records`);
    } catch (error) {
      console.error('Error in midnight attendance reset:', error);
    }
  }

  // Manual trigger for testing
  async triggerMidnightReset() {
    await this.handleMidnightReset();
  }

  // Fix existing attendance records with incorrect working hours
  async fixIncorrectWorkingHours() {
    try {
      console.log('Fixing attendance records with incorrect working hours...');
      
      // Find all attendance records that have check-in and check-out but 0 working hours
      const allRecords = await db.select().from(attendance);
      const incorrectRecords = allRecords.filter(record => 
        record.workingHours === 0 && record.checkIn && record.checkOut
      );

      let fixedCount = 0;
      
      for (const record of incorrectRecords) {
        if (record.checkIn && record.checkOut) {
          const checkInTime = new Date(record.checkIn);
          const checkOutTime = new Date(record.checkOut);
          const workingMilliseconds = checkOutTime.getTime() - checkInTime.getTime();
          const workingHours = Math.max(0, workingMilliseconds / (1000 * 60 * 60));
          
          // Calculate overtime (over 8 hours) and TOIL eligibility
          const overtimeHours = workingHours > 8 ? workingHours - 8 : 0;
          const isWeekend = [0, 6].includes(checkInTime.getDay());

          await db
            .update(attendance)
            .set({
              workingHours: Math.round(workingHours * 100) / 100,
              overtimeHours: Math.round(overtimeHours * 100) / 100,
              isToilEligible: overtimeHours > 0 || isWeekend,
              toilHoursEarned: Math.round(Math.max(overtimeHours, isWeekend ? workingHours : 0) * 100) / 100,
              isWeekendWork: isWeekend,
              updatedAt: new Date()
            })
            .where(eq(attendance.id, record.id));

          fixedCount++;
          console.log(`Fixed attendance record ID ${record.id} for user ${record.userId} - working hours: ${Math.round(workingHours * 100) / 100}`);
        }
      }

      console.log(`Fixed ${fixedCount} attendance records with incorrect working hours`);
      return fixedCount;
    } catch (error) {
      console.error('Error fixing incorrect working hours:', error);
      return 0;
    }
  }
}

export const attendanceScheduler = new AttendanceScheduler();
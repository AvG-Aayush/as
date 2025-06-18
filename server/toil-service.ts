import { db } from './db';
import { attendance, toilBalance, holidays, users } from '../shared/schema';
import { eq, and, sql, gte, lte, isNull } from 'drizzle-orm';

export class ToilService {
  // Calculate working hours between check-in and check-out
  static calculateWorkingHours(checkIn: Date, checkOut: Date): number {
    const diffMs = checkOut.getTime() - checkIn.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
  }

  // Check if date is a weekend
  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  // Check if date is a company holiday
  static async isHoliday(date: Date): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const holidayCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(holidays)
      .where(
        and(
          gte(holidays.date, startOfDay),
          lte(holidays.date, endOfDay)
        )
      );

    return holidayCount[0]?.count > 0;
  }

  // Process attendance and calculate TOIL eligibility
  static async processAttendanceForToil(attendanceId: number): Promise<void> {
    const attendanceRecord = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, attendanceId))
      .limit(1);

    if (!attendanceRecord[0] || !attendanceRecord[0].checkIn || !attendanceRecord[0].checkOut) {
      return;
    }

    const record = attendanceRecord[0];
    if (!record.checkIn || !record.checkOut) return;
    
    const checkInDate = new Date(record.checkIn);
    const checkOutDate = new Date(record.checkOut);
    
    // Calculate total working hours
    const workingHours = this.calculateWorkingHours(checkInDate, checkOutDate);
    
    // Standard working day is 8 hours
    const standardHours = 8;
    const overtimeHours = Math.max(0, workingHours - standardHours);
    
    // Check if this qualifies for TOIL
    const isWeekendWork = this.isWeekend(checkInDate);
    const isHolidayWork = await this.isHoliday(checkInDate);
    
    // TOIL eligibility: overtime during weekdays OR any work on weekends/holidays
    const isToilEligible = (overtimeHours > 0) || isWeekendWork || isHolidayWork;
    
    // Calculate TOIL hours earned
    let toilHoursEarned = 0;
    if (isWeekendWork || isHolidayWork) {
      // Full hours count as TOIL for weekend/holiday work
      toilHoursEarned = workingHours;
    } else if (overtimeHours > 0) {
      // Only overtime hours count as TOIL for regular days
      toilHoursEarned = overtimeHours;
    }

    // Update attendance record
    await db
      .update(attendance)
      .set({
        workingHours,
        overtimeHours,
        isToilEligible,
        toilHoursEarned,
        isWeekendWork
      })
      .where(eq(attendance.id, attendanceId));

    // Create TOIL balance entry if eligible
    if (isToilEligible && toilHoursEarned > 0) {
      const earnedDate = new Date(checkInDate);
      const expiryDate = new Date(earnedDate);
      expiryDate.setDate(expiryDate.getDate() + 21); // 21 days expiry

      await db.insert(toilBalance).values({
        userId: record.userId,
        hoursEarned: toilHoursEarned,
        hoursUsed: 0,
        hoursRemaining: toilHoursEarned,
        earnedDate,
        expiryDate,
        attendanceId,
        notes: isWeekendWork || isHolidayWork ? 
          `TOIL earned for ${isWeekendWork ? 'weekend' : 'holiday'} work` : 
          `TOIL earned for ${overtimeHours} hours overtime`
      });
    }
  }

  // Get user's current TOIL balance
  static async getUserToilBalance(userId: number): Promise<{
    totalHours: number;
    expiringHours: number;
    expiringDate: Date | null;
  }> {
    const now = new Date();
    
    // Get all active TOIL records
    const toilRecords = await db
      .select()
      .from(toilBalance)
      .where(
        and(
          eq(toilBalance.userId, userId),
          eq(toilBalance.isExpired, false),
          sql`${toilBalance.hoursRemaining} > 0`
        )
      );

    let totalHours = 0;
    let expiringHours = 0;
    let expiringDate: Date | null = null;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    toilRecords.forEach(record => {
      totalHours += record.hoursRemaining;
      
      // Check for expiring TOIL (within 7 days)
      const expiry = new Date(record.expiryDate);
      if (expiry <= sevenDaysFromNow && expiry > now) {
        expiringHours += record.hoursRemaining;
        if (!expiringDate || expiry < expiringDate) {
          expiringDate = expiry;
        }
      }
    });

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      expiringHours: Math.round(expiringHours * 100) / 100,
      expiringDate
    };
  }

  // Use TOIL hours for time off
  static async useToilHours(userId: number, hoursToUse: number): Promise<boolean> {
    const toilRecords = await db
      .select()
      .from(toilBalance)
      .where(
        and(
          eq(toilBalance.userId, userId),
          eq(toilBalance.isExpired, false),
          sql`${toilBalance.hoursRemaining} > 0`
        )
      )
      .orderBy(toilBalance.expiryDate); // Use oldest TOIL first

    let remainingHours = hoursToUse;

    for (const record of toilRecords) {
      if (remainingHours <= 0) break;

      const hoursToDeduct = Math.min(remainingHours, record.hoursRemaining);
      const newRemaining = record.hoursRemaining - hoursToDeduct;

      await db
        .update(toilBalance)
        .set({
          hoursUsed: record.hoursUsed + hoursToDeduct,
          hoursRemaining: newRemaining
        })
        .where(eq(toilBalance.id, record.id));

      remainingHours -= hoursToDeduct;
    }

    return remainingHours === 0; // Return true if all hours were successfully used
  }

  // Expire old TOIL records (run daily)
  static async expireOldToil(): Promise<number> {
    const now = new Date();
    
    const result = await db
      .update(toilBalance)
      .set({ isExpired: true })
      .where(
        and(
          lte(toilBalance.expiryDate, now),
          eq(toilBalance.isExpired, false),
          sql`${toilBalance.hoursRemaining} > 0`
        )
      );

    return result.rowCount || 0;
  }

  // Check attendance eligibility based on TOIL and holidays
  static async checkAttendanceEligibility(userId: number, date: Date): Promise<{
    canAttend: boolean;
    reason?: string;
    isWeekend: boolean;
    isHoliday: boolean;
    hasApprovedToil: boolean;
  }> {
    const isWeekend = this.isWeekend(date);
    const isHoliday = await this.isHoliday(date);
    
    // Check if user has approved TOIL for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // This would need to be implemented with a timeoffs table query
    // For now, assuming no approved TOIL
    const hasApprovedToil = false; // TODO: Check timeoffs table

    let canAttend = true;
    let reason = '';

    if (isWeekend && !hasApprovedToil) {
      canAttend = false;
      reason = 'Weekend work requires approved TOIL request';
    } else if (isHoliday && !hasApprovedToil) {
      canAttend = false;
      reason = 'Holiday work requires approved TOIL request';
    }

    return {
      canAttend,
      reason,
      isWeekend,
      isHoliday,
      hasApprovedToil
    };
  }
}
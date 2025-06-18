import { 
  users, 
  attendance, 
  leaveRequests, 
  shifts, 
  messages, 
  messageDeliveryLog,
  chatGroups, 
  groupMemberships, 
  aiInsights,
  announcements, 
  assignments, 
  hiringRequests, 
  timeoffs, 
 
  routines, 
  toilBalance, 
  holidays, 
  calendarEvents, 
  fileUploads, 
  overtimeRequests, 
  workLocations,
  breaks,

  type User, 
  type InsertUser, 
  type Attendance, 
  type InsertAttendance, 
  type LeaveRequest, 
  type InsertLeaveRequest,
  type Shift,
  type InsertShift,
  type Message,
  type InsertMessage,
  type MessageDeliveryLog,
  type InsertMessageDeliveryLog,
  type ChatGroup,
  type InsertChatGroup,
  type GroupMembership,
  type InsertGroupMembership,
  type AiInsight,
  type InsertAiInsight,
  type Announcement,
  type InsertAnnouncement,
  type Assignment,
  type InsertAssignment,
  type HiringRequest,
  type InsertHiringRequest,
  type Timeoff,
  type InsertTimeoff,

  type Routine,
  type InsertRoutine,
  type ToilBalance,
  type InsertToilBalance,
  type Holiday,
  type InsertHoliday,
  type CalendarEvent,
  type InsertCalendarEvent,
  type FileUpload,
  type InsertFileUpload,
  type OvertimeRequest,
  type InsertOvertimeRequest,

} from "../shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, sql, or, like, count, isNull } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Attendance management
  createAttendance(insertAttendance: InsertAttendance): Promise<Attendance>;
  getAttendanceById(id: number): Promise<Attendance | undefined>;
  getTodayAttendance(): Promise<Attendance[]>;
  getAttendanceByUser(userId: number): Promise<Attendance[]>;
  getAttendanceByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Attendance[]>;
  updateAttendance(id: number, updates: Partial<Attendance>): Promise<Attendance>;
  getIncompleteAttendance(): Promise<Attendance[]>;
  getAllAttendanceWithUsers(): Promise<any[]>;
  updateBulkAttendance(updates: Array<{id: number, data: Partial<Attendance>}>): Promise<void>;
  
  // Leave requests
  createLeaveRequest(insertLeaveRequest: InsertLeaveRequest): Promise<LeaveRequest>;
  getLeaveRequestsByUser(userId: number): Promise<LeaveRequest[]>;
  getPendingLeaveRequests(): Promise<LeaveRequest[]>;
  updateLeaveRequest(id: number, updates: Partial<LeaveRequest>): Promise<LeaveRequest>;
  
  // Shifts
  createShift(insertShift: InsertShift): Promise<Shift>;
  getShiftsByUser(userId: number): Promise<Shift[]>;
  getShiftsByDateRange(startDate: Date, endDate: Date): Promise<Shift[]>;
  getAllShifts(): Promise<Shift[]>;
  getShiftById(id: number): Promise<Shift | undefined>;
  updateShift(id: number, updates: Partial<Shift>): Promise<Shift>;
  deleteShift(id: number): Promise<void>;
  
  // Messages
  createMessage(insertMessage: InsertMessage): Promise<Message>;
  getMessagesByUser(userId: number, otherUserId: number): Promise<Message[]>;
  getMessagesBetweenUsers(userId: number, otherUserId: number): Promise<Message[]>;
  getMessagesByGroup(groupId: number): Promise<Message[]>;
  getGroupMessages(groupId: number): Promise<Message[]>;
  markMessagesAsRead(userId: number, messageIds: number[]): Promise<void>;
  getUnreadMessageCount(userId: number): Promise<number>;
  
  // Message delivery logs
  createMessageDeliveryLog(insertDeliveryLog: InsertMessageDeliveryLog): Promise<MessageDeliveryLog>;
  getMessageDeliveryStatus(messageId: number): Promise<MessageDeliveryLog[]>;
  updateMessageDeliveryStatus(messageId: number, recipientId: number, status: string, errorMessage?: string): Promise<void>;
  getFailedMessages(): Promise<Message[]>;
  
  // Chat groups
  createChatGroup(insertChatGroup: InsertChatGroup): Promise<ChatGroup>;
  getChatGroupsByUser(userId: number): Promise<ChatGroup[]>;
  
  // Announcements
  createAnnouncement(insertAnnouncement: InsertAnnouncement): Promise<Announcement>;
  getActiveAnnouncements(): Promise<Announcement[]>;
  
  // Assignments
  createAssignment(insertAssignment: InsertAssignment): Promise<Assignment>;
  getAssignmentsByUser(userId: number): Promise<Assignment[]>;
  updateAssignment(id: number, updates: Partial<Assignment>): Promise<Assignment>;
  
  // Hiring requests
  createHiringRequest(insertHiringRequest: InsertHiringRequest): Promise<HiringRequest>;
  getHiringRequests(): Promise<HiringRequest[]>;
  
  // Time offs
  createTimeoff(insertTimeoff: InsertTimeoff): Promise<Timeoff>;
  getTimeoffsByUser(userId: number): Promise<Timeoff[]>;
  updateTimeoff(id: number, updates: Partial<Timeoff>): Promise<Timeoff>;
  getPendingTimeoffs(): Promise<Timeoff[]>;
  

  
  // Routines
  createRoutine(insertRoutine: InsertRoutine): Promise<Routine>;
  getRoutinesByUser(userId: number): Promise<Routine[]>;
  getRoutinesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Routine[]>;
  getUpcomingRoutines(userId: number): Promise<Routine[]>;
  getRoutineById(id: number): Promise<Routine | undefined>;
  updateRoutine(id: number, updates: Partial<Routine>): Promise<Routine>;
  deleteRoutine(id: number): Promise<void>;
  
  // TOIL Balance
  getToilBalance(userId: number): Promise<number>;
  createToilBalance(insertToilBalance: InsertToilBalance): Promise<ToilBalance>;
  useToilHours(userId: number, hours: number): Promise<void>;
  
  // Holidays
  createHoliday(insertHoliday: InsertHoliday): Promise<Holiday>;
  getHolidays(): Promise<Holiday[]>;
  updateHoliday(id: number, updates: Partial<Holiday>): Promise<Holiday>;
  deleteHoliday(id: number): Promise<void>;
  
  // Calendar events
  createCalendarEvent(insertCalendarEvent: InsertCalendarEvent): Promise<CalendarEvent>;
  getCalendarEvents(): Promise<CalendarEvent[]>;
  getCalendarEventById(id: number): Promise<CalendarEvent | undefined>;
  updateCalendarEvent(id: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number): Promise<void>;
  
  // File uploads
  createFileUpload(insertFileUpload: InsertFileUpload): Promise<FileUpload>;
  getFileUploadsByUser(userId: number): Promise<FileUpload[]>;
  deleteFileUpload(id: number): Promise<void>;
  
  // Overtime requests
  createOvertimeRequest(insertOvertimeRequest: InsertOvertimeRequest): Promise<OvertimeRequest>;
  getOvertimeRequests(): Promise<OvertimeRequest[]>;
  getPendingOvertimeRequests(): Promise<OvertimeRequest[]>;
  updateOvertimeRequest(id: number, updates: Partial<OvertimeRequest>): Promise<OvertimeRequest>;
  
  // Work locations
  getWorkLocations(): Promise<any[]>;
  createWorkLocation(data: any): Promise<any>;
  getAllAttendanceWithUsers(): Promise<any[]>;
  
  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    totalEmployees: number;
    presentToday: number;
    attendanceRate: number;
    pendingLeaves: number;
    newHires: number;
    absentToday: number;
    lateToday: number;
    overtimeHours: number;
    avgWorkingHours: number;
  }>;
  

  

  

}

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    console.log('UpdateUser called with raw ID:', id, 'Type:', typeof id);
    
    // Ensure id is a valid number
    const userId = parseInt(String(id));
    console.log('Parsed userId:', userId, 'isNaN:', isNaN(userId));
    
    if (isNaN(userId)) {
      console.error(`Invalid user ID received - Raw: ${id}, Parsed: ${userId}`);
      throw new Error(`Invalid user ID: ${id}`);
    }
    
    // Clean the updates object to remove any invalid values
    const cleanUpdates: any = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'number' && isNaN(value)) continue;
      if (key === 'id') continue; // Don't allow updating the ID
      cleanUpdates[key] = value;
    }
    
    // Always update the timestamp
    cleanUpdates.updatedAt = new Date();
    
    const [user] = await db.update(users)
      .set(cleanUpdates)
      .where(eq(users.id, userId))
      .returning();
      
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true));
  }

  // Attendance management
  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const [record] = await db.insert(attendance).values(insertAttendance).returning();
    return record;
  }

  async getAttendanceById(id: number): Promise<Attendance | undefined> {
    const [record] = await db.select().from(attendance).where(eq(attendance.id, id));
    return record || undefined;
  }

  async getTodayAttendance(): Promise<Attendance[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db.select().from(attendance)
      .where(and(
        gte(attendance.date, today),
        lte(attendance.date, tomorrow)
      ))
      .orderBy(desc(attendance.checkIn));
  }

  async getAttendanceByUser(userId: number): Promise<Attendance[]> {
    return await db.select().from(attendance)
      .where(eq(attendance.userId, userId))
      .orderBy(desc(attendance.date));
  }

  async getAttendanceByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Attendance[]> {
    return await db.select().from(attendance)
      .where(and(
        eq(attendance.userId, userId),
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      ))
      .orderBy(desc(attendance.date));
  }

  async updateAttendance(id: number, updates: Partial<Attendance>): Promise<Attendance> {
    const [record] = await db.update(attendance).set(updates).where(eq(attendance.id, id)).returning();
    return record;
  }

  async getIncompleteAttendance(): Promise<Attendance[]> {
    return await db.select().from(attendance)
      .where(and(
        isNull(attendance.checkOut),
        eq(attendance.status, "present")
      ));
  }

  async getAllAttendanceWithUsers(): Promise<any[]> {
    return await db.select({
      id: attendance.id,
      userId: attendance.userId,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      status: attendance.status,
      date: attendance.date,
      workingHours: attendance.workingHours,
      overtimeHours: attendance.overtimeHours,
      userName: users.fullName,
      department: users.department,
      userRole: users.role,
      checkInLocation: attendance.checkInLocation,
      checkOutLocation: attendance.checkOutLocation,
      adminNotes: attendance.adminNotes,
      isAutoCheckout: attendance.isAutoCheckout,
    })
    .from(attendance)
    .leftJoin(users, eq(attendance.userId, users.id))
    .orderBy(desc(attendance.date));
  }

  async updateBulkAttendance(updates: Array<{id: number, data: Partial<Attendance>}>): Promise<void> {
    for (const update of updates) {
      await db.update(attendance)
        .set({ ...update.data, updatedAt: new Date() })
        .where(eq(attendance.id, update.id));
    }
  }

  // Leave requests
  async createLeaveRequest(insertLeaveRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    const [request] = await db.insert(leaveRequests).values(insertLeaveRequest).returning();
    return request;
  }

  async getLeaveRequestsByUser(userId: number): Promise<LeaveRequest[]> {
    return await db.select().from(leaveRequests)
      .where(eq(leaveRequests.userId, userId))
      .orderBy(desc(leaveRequests.submittedAt));
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return await db.select().from(leaveRequests)
      .where(eq(leaveRequests.status, "pending"))
      .orderBy(desc(leaveRequests.submittedAt));
  }

  async updateLeaveRequest(id: number, updates: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const [request] = await db.update(leaveRequests).set(updates).where(eq(leaveRequests.id, id)).returning();
    return request;
  }

  // Shifts
  async createShift(insertShift: InsertShift): Promise<Shift> {
    const [shift] = await db.insert(shifts).values(insertShift).returning();
    return shift;
  }

  async getShiftsByUser(userId: number): Promise<Shift[]> {
    return await db.select().from(shifts)
      .where(eq(shifts.userId, userId))
      .orderBy(asc(shifts.startTime));
  }

  async getShiftsByDateRange(startDate: Date, endDate: Date): Promise<Shift[]> {
    return await db.select().from(shifts)
      .where(and(
        gte(shifts.startTime, startDate),
        lte(shifts.startTime, endDate)
      ))
      .orderBy(asc(shifts.startTime));
  }

  async updateShift(id: number, updates: Partial<Shift>): Promise<Shift> {
    const [shift] = await db.update(shifts).set(updates).where(eq(shifts.id, id)).returning();
    return shift;
  }

  async deleteShift(id: number): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }

  async getAllShifts(): Promise<Shift[]> {
    return await db.select().from(shifts)
      .orderBy(asc(shifts.startTime));
  }

  async getShiftById(id: number): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift || undefined;
  }

  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessagesByUser(userId: number, otherUserId: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(or(
        and(eq(messages.senderId, userId), eq(messages.recipientId, otherUserId)),
        and(eq(messages.senderId, otherUserId), eq(messages.recipientId, userId))
      ))
      .orderBy(asc(messages.sentAt));
  }

  async getMessagesBetweenUsers(userId: number, otherUserId: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(or(
        and(eq(messages.senderId, userId), eq(messages.recipientId, otherUserId)),
        and(eq(messages.senderId, otherUserId), eq(messages.recipientId, userId))
      ))
      .orderBy(asc(messages.sentAt));
  }

  async getMessagesByGroup(groupId: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.groupId, groupId))
      .orderBy(asc(messages.sentAt));
  }

  async getGroupMessages(groupId: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.groupId, groupId))
      .orderBy(asc(messages.sentAt));
  }

  async markMessagesAsRead(userId: number, messageIds: number[]): Promise<void> {
    if (messageIds.length === 0) return;
    
    await db.update(messages)
      .set({ isRead: true })
      .where(and(
        eq(messages.recipientId, userId),
        sql`${messages.id} = ANY(${sql.raw(`ARRAY[${messageIds.join(',')}]`)})`
      ));
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(messages)
      .where(and(
        eq(messages.recipientId, userId),
        eq(messages.isRead, false),
        eq(messages.isDeleted, false)
      ));
    return result.count;
  }

  // Message delivery logs
  async createMessageDeliveryLog(insertDeliveryLog: InsertMessageDeliveryLog): Promise<MessageDeliveryLog> {
    const [log] = await db.insert(messageDeliveryLog).values(insertDeliveryLog).returning();
    return log;
  }

  async getMessageDeliveryStatus(messageId: number): Promise<MessageDeliveryLog[]> {
    return await db.select().from(messageDeliveryLog)
      .where(eq(messageDeliveryLog.messageId, messageId))
      .orderBy(desc(messageDeliveryLog.lastAttemptAt));
  }

  async updateMessageDeliveryStatus(messageId: number, recipientId: number, status: string, errorMessage?: string): Promise<void> {
    await db.update(messageDeliveryLog)
      .set({
        deliveryStatus: status,
        errorMessage: errorMessage,
        lastAttemptAt: new Date(),
        ...(status === 'delivered' && { deliveredAt: new Date() }),
        ...(status === 'read' && { readAt: new Date() })
      })
      .where(and(
        eq(messageDeliveryLog.messageId, messageId),
        eq(messageDeliveryLog.recipientId, recipientId)
      ));
  }

  async getFailedMessages(): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.deliveryStatus, 'failed'))
      .orderBy(desc(messages.sentAt));
  }

  // Chat groups
  async createChatGroup(insertChatGroup: InsertChatGroup): Promise<ChatGroup> {
    const [group] = await db.insert(chatGroups).values(insertChatGroup).returning();
    return group;
  }

  async getChatGroupsByUser(userId: number): Promise<ChatGroup[]> {
    return await db.select({
      id: chatGroups.id,
      name: chatGroups.name,
      description: chatGroups.description,
      createdBy: chatGroups.createdBy,
      createdAt: chatGroups.createdAt
    })
    .from(chatGroups)
    .innerJoin(groupMemberships, eq(chatGroups.id, groupMemberships.groupId))
    .where(eq(groupMemberships.userId, userId));
  }

  // Announcements
  async createAnnouncement(insertAnnouncement: InsertAnnouncement): Promise<Announcement> {
    const [announcement] = await db.insert(announcements).values(insertAnnouncement).returning();
    return announcement;
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    return await db.select().from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.createdAt));
  }

  // Assignments
  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const [assignment] = await db.insert(assignments).values(insertAssignment).returning();
    return assignment;
  }

  async getAssignmentsByUser(userId: number): Promise<Assignment[]> {
    return await db.select().from(assignments)
      .where(eq(assignments.assignedTo, userId))
      .orderBy(desc(assignments.createdAt));
  }

  async updateAssignment(id: number, updates: Partial<Assignment>): Promise<Assignment> {
    const [assignment] = await db.update(assignments).set(updates).where(eq(assignments.id, id)).returning();
    return assignment;
  }

  // Hiring requests
  async createHiringRequest(insertHiringRequest: InsertHiringRequest): Promise<HiringRequest> {
    const [request] = await db.insert(hiringRequests).values(insertHiringRequest).returning();
    return request;
  }

  async getHiringRequests(): Promise<HiringRequest[]> {
    return await db.select().from(hiringRequests)
      .orderBy(desc(hiringRequests.createdAt));
  }

  // Time offs
  async createTimeoff(insertTimeoff: InsertTimeoff): Promise<Timeoff> {
    const [timeoff] = await db.insert(timeoffs).values(insertTimeoff).returning();
    return timeoff;
  }

  async getTimeoffsByUser(userId: number): Promise<Timeoff[]> {
    return await db.select().from(timeoffs)
      .where(eq(timeoffs.userId, userId))
      .orderBy(desc(timeoffs.createdAt));
  }

  async updateTimeoff(id: number, updates: Partial<Timeoff>): Promise<Timeoff> {
    const [timeoff] = await db.update(timeoffs).set(updates).where(eq(timeoffs.id, id)).returning();
    return timeoff;
  }

  async getPendingTimeoffs(): Promise<Timeoff[]> {
    return await db.select().from(timeoffs)
      .where(eq(timeoffs.status, "pending"))
      .orderBy(desc(timeoffs.createdAt));
  }



  // Routines
  async createRoutine(insertRoutine: any): Promise<Routine> {
    const [routine] = await db.insert(routines).values(insertRoutine).returning();
    return routine;
  }

  async getRoutinesByUser(userId: number): Promise<Routine[]> {
    return await db.select().from(routines)
      .where(eq(routines.userId, userId))
      .orderBy(asc(routines.date));
  }

  async getRoutinesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Routine[]> {
    return await db.select().from(routines)
      .where(and(
        eq(routines.userId, userId),
        gte(routines.date, startDate),
        lte(routines.date, endDate)
      ))
      .orderBy(asc(routines.date));
  }

  async getUpcomingRoutines(userId: number): Promise<Routine[]> {
    const now = new Date();
    return await db.select().from(routines)
      .where(and(
        eq(routines.userId, userId),
        gte(routines.date, now)
      ))
      .orderBy(asc(routines.date))
      .limit(10);
  }

  async updateRoutine(id: number, updates: Partial<Routine>): Promise<Routine> {
    const [routine] = await db.update(routines).set(updates).where(eq(routines.id, id)).returning();
    return routine;
  }

  async deleteRoutine(id: number): Promise<void> {
    await db.delete(routines).where(eq(routines.id, id));
  }

  async getRoutineById(id: number): Promise<Routine | undefined> {
    const [routine] = await db.select().from(routines).where(eq(routines.id, id));
    return routine || undefined;
  }



  // TOIL Balance
  async getToilBalance(userId: number): Promise<number> {
    const [result] = await db.select({
      total: sql<number>`COALESCE(SUM(${toilBalance.hoursRemaining}), 0)`
    })
    .from(toilBalance)
    .where(and(
      eq(toilBalance.userId, userId),
      eq(toilBalance.isExpired, false)
    ));
    return result.total;
  }

  async createToilBalance(insertToilBalance: InsertToilBalance): Promise<ToilBalance> {
    const [balance] = await db.insert(toilBalance).values(insertToilBalance).returning();
    return balance;
  }

  async useToilHours(userId: number, hours: number): Promise<void> {
    // This would implement TOIL usage logic
    // For now, just a placeholder
    console.log(`Using ${hours} TOIL hours for user ${userId}`);
  }

  // Holidays
  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    const [holiday] = await db.insert(holidays).values(insertHoliday).returning();
    return holiday;
  }

  async getHolidays(): Promise<Holiday[]> {
    return await db.select().from(holidays)
      .orderBy(asc(holidays.date));
  }

  async updateHoliday(id: number, updates: Partial<Holiday>): Promise<Holiday> {
    const [holiday] = await db.update(holidays).set(updates).where(eq(holidays.id, id)).returning();
    return holiday;
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  // Calendar events
  async createCalendarEvent(insertCalendarEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const [event] = await db.insert(calendarEvents).values(insertCalendarEvent).returning();
    return event;
  }

  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return await db.select().from(calendarEvents)
      .orderBy(asc(calendarEvents.eventDate));
  }

  async updateCalendarEvent(id: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const [event] = await db.update(calendarEvents).set(updates).where(eq(calendarEvents.id, id)).returning();
    return event;
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  async getCalendarEventById(id: number): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event || undefined;
  }

  // File uploads
  async createFileUpload(insertFileUpload: InsertFileUpload): Promise<FileUpload> {
    const [file] = await db.insert(fileUploads).values(insertFileUpload).returning();
    return file;
  }

  async getFileUploadsByUser(userId: number): Promise<FileUpload[]> {
    return await db.select().from(fileUploads)
      .where(and(
        eq(fileUploads.userId, userId),
        eq(fileUploads.isActive, true)
      ))
      .orderBy(desc(fileUploads.uploadedAt));
  }

  async deleteFileUpload(id: number): Promise<void> {
    await db.update(fileUploads)
      .set({ isActive: false })
      .where(eq(fileUploads.id, id));
  }

  // Overtime requests
  async createOvertimeRequest(insertOvertimeRequest: InsertOvertimeRequest): Promise<OvertimeRequest> {
    const [request] = await db.insert(overtimeRequests).values(insertOvertimeRequest).returning();
    return request;
  }

  async getOvertimeRequests(): Promise<OvertimeRequest[]> {
    return await db.select().from(overtimeRequests)
      .orderBy(desc(overtimeRequests.createdAt));
  }

  async getPendingOvertimeRequests(): Promise<OvertimeRequest[]> {
    return await db.select().from(overtimeRequests)
      .where(eq(overtimeRequests.status, "pending"))
      .orderBy(desc(overtimeRequests.createdAt));
  }

  async updateOvertimeRequest(id: number, updates: Partial<OvertimeRequest>): Promise<OvertimeRequest> {
    const [request] = await db.update(overtimeRequests).set(updates).where(eq(overtimeRequests.id, id)).returning();
    return request;
  }

  // Work locations
  async getWorkLocations(): Promise<any[]> {
    return await db.select().from(workLocations)
      .where(eq(workLocations.isActive, true))
      .orderBy(asc(workLocations.name));
  }

  async createWorkLocation(data: any): Promise<any> {
    const [location] = await db.insert(workLocations).values(data).returning();
    return location;
  }



  // AI Insights methods
  async getAiInsights(): Promise<AiInsight[]> {
    return await db.select().from(aiInsights).orderBy(desc(aiInsights.generatedAt));
  }

  async getAiInsightsByType(type: string): Promise<AiInsight[]> {
    return await db.select().from(aiInsights)
      .where(eq(aiInsights.type, type))
      .orderBy(desc(aiInsights.generatedAt));
  }

  async createAiInsight(data: InsertAiInsight): Promise<AiInsight> {
    const [insight] = await db.insert(aiInsights).values(data).returning();
    return insight;
  }







  async getAttendanceByUserAndDate(userId: number, date: string): Promise<any> {
    console.log(`Storage: Looking for attendance - userId: ${userId}, date: ${date}`);
    
    // Try multiple date matching strategies to ensure we find the record
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log(`Storage: Date range - start: ${startOfDay.toISOString()}, end: ${endOfDay.toISOString()}`);

    // First try: exact date range match
    let [attendanceRecord] = await db.select()
      .from(attendance)
      .where(and(
        eq(attendance.userId, userId),
        gte(attendance.date, startOfDay),
        lte(attendance.date, endOfDay)
      ))
      .limit(1);

    // Second try: if no record found, try using SQL date functions for more flexible matching
    if (!attendanceRecord) {
      console.log(`Storage: No record found with date range, trying SQL date matching...`);
      const dateStr = date; // YYYY-MM-DD format
      
      const result = await db.execute(sql`
        SELECT * FROM attendance 
        WHERE user_id = ${userId} 
        AND DATE(date) = DATE(${dateStr})
        ORDER BY date DESC
        LIMIT 1
      `);
      
      attendanceRecord = result.rows[0] as any;
    }

    // Third try: if still no record, try a broader search around the date
    if (!attendanceRecord) {
      console.log(`Storage: Still no record found, trying broader date search...`);
      const dayBefore = new Date(targetDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(12, 0, 0, 0); // noon of previous day
      
      const dayAfter = new Date(targetDate);
      dayAfter.setDate(dayAfter.getDate() + 1);
      dayAfter.setHours(12, 0, 0, 0); // noon of next day
      
      [attendanceRecord] = await db.select()
        .from(attendance)
        .where(and(
          eq(attendance.userId, userId),
          gte(attendance.date, dayBefore),
          lte(attendance.date, dayAfter)
        ))
        .orderBy(desc(attendance.date))
        .limit(1);
    }

    console.log(`Storage: Found attendance record:`, attendanceRecord);
    
    // Debug: Show all attendance records for this user to understand the data
    const allUserAttendance = await db.select().from(attendance)
      .where(eq(attendance.userId, userId))
      .orderBy(desc(attendance.date))
      .limit(10);
    console.log(`Storage: Recent attendance records for user ${userId}:`, allUserAttendance.map(r => ({
      id: r.id,
      date: r.date,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      workingHours: r.workingHours,
      status: r.status
    })));
    
    return attendanceRecord || null;
  }

  // Dashboard metrics implementation
  async getDashboardMetrics(): Promise<{
    totalEmployees: number;
    presentToday: number;
    attendanceRate: number;
    pendingLeaves: number;
    newHires: number;
    absentToday: number;
    lateToday: number;
    overtimeHours: number;
    avgWorkingHours: number;
  }> {
    try {
      // Get all active users
      const allUsers = await db.select().from(users).where(eq(users.isActive, true));
      const totalEmployees = allUsers.length;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's attendance
      const todayAttendance = await db.select().from(attendance)
        .where(and(
          gte(attendance.date, today),
          lte(attendance.date, tomorrow)
        ));

      // Calculate present employees (those who checked in)
      const presentToday = todayAttendance.filter(a => 
        a.checkIn && (a.status === 'present' || a.status === 'late')
      ).length;

      // Calculate absent employees
      const absentToday = totalEmployees - presentToday;

      // Calculate late employees
      const lateToday = todayAttendance.filter(a => a.status === 'late').length;

      // Calculate attendance rate
      const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

      // Get pending leave requests
      const pendingLeaves = await db.select({ count: count() })
        .from(leaveRequests)
        .where(eq(leaveRequests.status, 'pending'));

      // Calculate new hires this month
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const newHires = allUsers.filter(user => {
        const createdDate = new Date(user.createdAt);
        return createdDate >= firstDayOfMonth;
      }).length;

      // Calculate overtime hours for today
      const overtimeHours = todayAttendance.reduce((total, record) => {
        return total + (record.overtimeHours || 0);
      }, 0);

      // Calculate average working hours for today
      const totalWorkingHours = todayAttendance.reduce((total, record) => {
        return total + (record.workingHours || 0);
      }, 0);
      const avgWorkingHours = presentToday > 0 ? 
        Math.round((totalWorkingHours / presentToday) * 100) / 100 : 0;

      return {
        totalEmployees,
        presentToday,
        attendanceRate,
        pendingLeaves: pendingLeaves[0]?.count || 0,
        newHires,
        absentToday,
        lateToday,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        avgWorkingHours
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return default values instead of throwing
      return {
        totalEmployees: 0,
        presentToday: 0,
        attendanceRate: 0,
        pendingLeaves: 0,
        newHires: 0,
        absentToday: 0,
        lateToday: 0,
        overtimeHours: 0,
        avgWorkingHours: 0
      };
    }
  }

}

export const storage = new DatabaseStorage();
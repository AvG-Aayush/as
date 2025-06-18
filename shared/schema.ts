import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based permissions
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("employee"), // admin, hr, employee
  department: text("department"),
  position: text("position"),
  profilePicture: text("profile_picture"),
  phone: text("phone"),
  address: text("address"),
  dateOfBirth: timestamp("date_of_birth"),
  // Personal identification details
  nationalId: text("national_id"),
  citizenshipNumber: text("citizenship_number"),
  passportNumber: text("passport_number"),
  maternalName: text("maternal_name"),
  paternalName: text("paternal_name"),
  grandfatherName: text("grandfather_name"),
  nationality: text("nationality"),
  
  emergencyContact: jsonb("emergency_contact"), // {name, phone, relationship}
  emergencyContacts: jsonb("emergency_contacts"), // Array of {name, phone, relationship, address, isAlternate}
  qualifications: jsonb("qualifications"), // Array of {title, institution, year, description, grade, field}
  trainings: jsonb("trainings"), // Array of {title, provider, completedDate, certificateUrl, description, duration}
  experiences: jsonb("experiences"), // Array of {title, company, startDate, endDate, description, current, responsibilities}
  skills: jsonb("skills"), // Array of {name, level, category}
  bankDetails: jsonb("bank_details"), // {bankName, accountNumber, routingNumber}
  bankDetailsArray: jsonb("bank_details_array"), // Array of {bankName, accountNumber, routingNumber, accountType, isPrimary, swiftCode}
  portfolio: text("portfolio"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Session management for automatic cleanup of expired sessions
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  data: jsonb("data").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// High-tech attendance tracking with GPS and manual check-in/out
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  
  // GPS and Location Tracking
  checkInLatitude: real("check_in_latitude"),
  checkInLongitude: real("check_in_longitude"),
  checkInLocation: text("check_in_location"),
  checkInAddress: text("check_in_address"), // reverse geocoded address
  checkInAccuracy: real("check_in_accuracy"), // GPS accuracy in meters
  
  checkOutLatitude: real("check_out_latitude"),
  checkOutLongitude: real("check_out_longitude"),
  checkOutLocation: text("check_out_location"),
  checkOutAddress: text("check_out_address"),
  checkOutAccuracy: real("check_out_accuracy"),
  
  // Device and Browser Information
  deviceInfo: text("device_info"), // browser, OS, device details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Work Status and Calculations
  status: text("status").notNull().default("present"), // present, absent, late, break, holiday, remote, incomplete
  date: timestamp("date").notNull().defaultNow(),
  workingHours: real("working_hours").default(0),
  overtimeHours: real("overtime_hours").default(0),
  breakDuration: real("break_duration").default(0), // total break time in hours
  isAutoCheckout: boolean("is_auto_checkout").default(false), // true if auto-checked out at midnight
  
  // TOIL and Overtime
  isToilEligible: boolean("is_toil_eligible").default(false),
  toilHoursEarned: real("toil_hours_earned").default(0),
  isWeekendWork: boolean("is_weekend_work").default(false),
  isHolidayWork: boolean("is_holiday_work").default(false),
  
  // Notes and Comments
  checkInNotes: text("check_in_notes"), // employee notes at check-in
  checkOutNotes: text("check_out_notes"), // employee notes at check-out
  adminNotes: text("admin_notes"), // admin/manager notes
  
  // Validation and Verification
  isGpsVerified: boolean("is_gps_verified").default(false),
  isLocationValid: boolean("is_location_valid").default(true),
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Break tracking for detailed time management
export const breaks = pgTable("breaks", {
  id: serial("id").primaryKey(),
  attendanceId: integer("attendance_id").notNull().references(() => attendance.id),
  userId: integer("user_id").notNull().references(() => users.id),
  breakStart: timestamp("break_start").notNull(),
  breakEnd: timestamp("break_end"),
  breakType: text("break_type").notNull().default("regular"), // regular, lunch, bathroom, meeting
  duration: real("duration").default(0), // in minutes
  location: text("location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Valid work locations for GPS verification
export const workLocations = pgTable("work_locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  radius: real("radius").notNull().default(100), // allowed radius in meters
  isActive: boolean("is_active").notNull().default(true),
  isRemoteAllowed: boolean("is_remote_allowed").notNull().default(false),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Attendance analytics and insights
export const attendanceAnalytics = pgTable("attendance_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  totalHours: real("total_hours").notNull().default(0),
  productiveHours: real("productive_hours").notNull().default(0),
  breakTime: real("break_time").notNull().default(0),
  overtimeHours: real("overtime_hours").notNull().default(0),
  punctualityScore: real("punctuality_score").notNull().default(100), // 0-100 scale
  locationCompliance: real("location_compliance").notNull().default(100), // 0-100 scale
  weeklyAverage: real("weekly_average").default(0),
  monthlyAverage: real("monthly_average").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Leave requests
export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // vacation, sick, personal, emergency
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// Shift scheduling
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  notes: text("notes"),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Encrypted chat messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  recipientId: integer("recipient_id").references(() => users.id), // null for group messages
  groupId: integer("group_id"), // for group chats
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // text, file, image
  isRead: boolean("is_read").notNull().default(false),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  editedAt: timestamp("edited_at"),
  originalContent: text("original_content"), // for edit history
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"), // image, file, audio, video
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  deliveryStatus: text("delivery_status").notNull().default("sent"), // sent, delivered, read, failed
  retryCount: integer("retry_count").notNull().default(0),
  lastRetryAt: timestamp("last_retry_at"),
});

// Chat groups
export const chatGroups = pgTable("chat_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Group memberships
export const groupMemberships = pgTable("group_memberships", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => chatGroups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"), // admin, member
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  isActive: boolean("is_active").notNull().default(true),
});

// Message delivery tracking and failures
export const messageDeliveryLog = pgTable("message_delivery_log", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id),
  recipientId: integer("recipient_id").notNull().references(() => users.id),
  deliveryStatus: text("delivery_status").notNull(), // pending, delivered, failed, read
  errorMessage: text("error_message"),
  attemptCount: integer("attempt_count").notNull().default(1),
  lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
});

// AI insights and summaries
export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // attendance_summary, leave_analysis, performance_insights
  title: text("title").notNull(),
  content: jsonb("content").notNull(), // AI-generated insights
  period: text("period"), // daily, weekly, monthly
  generatedBy: integer("generated_by").notNull().references(() => users.id),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

// Announcements
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  department: text("department"), // null for all departments
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Assignments/Tasks
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  assignedTo: integer("assigned_to").references(() => users.id).notNull(),
  assignedBy: integer("assigned_by").references(() => users.id).notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, overdue
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  category: text("category").notNull(), // task, project, training, meeting
  attachments: text("attachments").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Hiring requests
export const hiringRequests = pgTable("hiring_requests", {
  id: serial("id").primaryKey(),
  position: text("position").notNull(),
  department: text("department").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements").array().notNull(),
  salaryRange: text("salary_range"),
  employmentType: text("employment_type").notNull(), // full_time, part_time, contract, intern
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  status: text("status").notNull().default("open"), // open, in_progress, filled, cancelled
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  targetStartDate: timestamp("target_start_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
});

// Time off requests with TOIL support
export const timeoffs = pgTable("timeoffs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // vacation, sick, personal, maternity, paternity, bereavement, toil
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  days: real("days").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  isEmergency: boolean("is_emergency").default(false).notNull(),
  isToilRequest: boolean("is_toil_request").default(false).notNull(),
  toilHoursUsed: real("toil_hours_used").default(0), // TOIL hours being used
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// TOIL (Time Off In Lieu) balance tracking
export const toilBalance = pgTable("toil_balance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  hoursEarned: real("hours_earned").notNull(), // Hours earned from overtime
  hoursUsed: real("hours_used").default(0).notNull(), // Hours used for time off
  hoursRemaining: real("hours_remaining").notNull(), // Current balance
  earnedDate: timestamp("earned_date").notNull(), // When TOIL was earned
  expiryDate: timestamp("expiry_date").notNull(), // 21 days from earned date
  isExpired: boolean("is_expired").default(false).notNull(),
  attendanceId: integer("attendance_id").references(() => attendance.id), // Link to source attendance
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Company holidays
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull().default("public"), // public, company, optional
  description: text("description"),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  affectedDepartments: text("affected_departments").array(), // null means all departments
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Calendar events for company announcements and special occasions
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  eventTime: text("event_time"), // Optional time for the event
  type: text("type").notNull().default("event"), // event, meeting, celebration, announcement
  category: text("category").notNull().default("general"), // general, company, department, training
  priority: text("priority").notNull().default("normal"), // low, normal, high
  location: text("location"),
  isAllDay: boolean("is_all_day").default(false).notNull(),
  affectedDepartments: text("affected_departments").array(), // null means all departments
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// File uploads for profiles and documents
export const fileUploads = pgTable("file_uploads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: text("mime_type").notNull(),
  fileType: text("file_type").notNull(), // profile_picture, portfolio, document, receipt, certificate
  isActive: boolean("is_active").default(true).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});



// Overtime/TOIL working requests
export const overtimeRequests = pgTable("overtime_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  requestedDate: timestamp("requested_date").notNull(),
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format

  reason: text("reason").notNull(),
  workDescription: text("work_description").notNull(),
  isWeekend: boolean("is_weekend").default(false).notNull(),
  isHoliday: boolean("is_holiday").default(false).notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  actualHoursWorked: real("actual_hours_worked"),
  toilHoursAwarded: real("toil_hours_awarded"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// Personal routines (14 days ahead planning with auto-cleanup)
export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  category: text("category").notNull().default("personal"), // work, personal, health, meeting, break
  priority: text("priority").notNull().default("medium"), // low, medium, high
  isCompleted: boolean("is_completed").notNull().default(false),
  remindBefore: integer("remind_before").default(15), // minutes before to remind
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringPattern: text("recurring_pattern"), // daily, weekly, weekdays, weekends
  notes: text("notes"),
  location: text("location"),
  expiresAt: timestamp("expires_at").notNull(), // Auto-calculated as date + 1 day for cleanup
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});







// Relations
export const usersRelations = relations(users, ({ many }) => ({
  attendance: many(attendance),
  leaveRequests: many(leaveRequests),
  shifts: many(shifts),
  routines: many(routines),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  groupMemberships: many(groupMemberships),
  createdAnnouncements: many(announcements),
  assignedTasks: many(assignments, { relationName: "assignedTasks" }),
  createdTasks: many(assignments, { relationName: "createdTasks" }),
  hiringRequests: many(hiringRequests),
  timeoffs: many(timeoffs),
  toilBalance: many(toilBalance),
  fileUploads: many(fileUploads),
  createdHolidays: many(holidays),
  overtimeRequests: many(overtimeRequests),


}));

export const attendanceRelations = relations(attendance, ({ one, many }) => ({
  user: one(users, {
    fields: [attendance.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [attendance.approvedBy],
    references: [users.id],
  }),
  breaks: many(breaks),
}));

export const breaksRelations = relations(breaks, ({ one }) => ({
  attendance: one(attendance, {
    fields: [breaks.attendanceId],
    references: [attendance.id],
  }),
  user: one(users, {
    fields: [breaks.userId],
    references: [users.id],
  }),
}));

export const workLocationsRelations = relations(workLocations, ({ one }) => ({
  creator: one(users, {
    fields: [workLocations.createdBy],
    references: [users.id],
  }),
}));

export const attendanceAnalyticsRelations = relations(attendanceAnalytics, ({ one }) => ({
  user: one(users, {
    fields: [attendanceAnalytics.userId],
    references: [users.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  user: one(users, {
    fields: [leaveRequests.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [leaveRequests.approvedBy],
    references: [users.id],
  }),
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
  user: one(users, {
    fields: [shifts.userId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [shifts.createdBy],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
  group: one(chatGroups, {
    fields: [messages.groupId],
    references: [chatGroups.id],
  }),
}));

export const chatGroupsRelations = relations(chatGroups, ({ one, many }) => ({
  creator: one(users, {
    fields: [chatGroups.createdBy],
    references: [users.id],
  }),
  members: many(groupMemberships),
  messages: many(messages),
}));

export const groupMembershipsRelations = relations(groupMemberships, ({ one }) => ({
  group: one(chatGroups, {
    fields: [groupMemberships.groupId],
    references: [chatGroups.id],
  }),
  user: one(users, {
    fields: [groupMemberships.userId],
    references: [users.id],
  }),
}));

export const messageDeliveryLogRelations = relations(messageDeliveryLog, ({ one }) => ({
  message: one(messages, {
    fields: [messageDeliveryLog.messageId],
    references: [messages.id],
  }),
  recipient: one(users, {
    fields: [messageDeliveryLog.recipientId],
    references: [users.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  generatedBy: one(users, {
    fields: [aiInsights.generatedBy],
    references: [users.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  creator: one(users, {
    fields: [announcements.createdBy],
    references: [users.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  assignedUser: one(users, {
    fields: [assignments.assignedTo],
    references: [users.id],
    relationName: "assignedTasks",
  }),
  creator: one(users, {
    fields: [assignments.assignedBy],
    references: [users.id],
    relationName: "createdTasks",
  }),
}));

export const hiringRequestsRelations = relations(hiringRequests, ({ one }) => ({
  requester: one(users, {
    fields: [hiringRequests.requestedBy],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [hiringRequests.approvedBy],
    references: [users.id],
  }),
}));

export const timeoffsRelations = relations(timeoffs, ({ one }) => ({
  user: one(users, {
    fields: [timeoffs.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [timeoffs.approvedBy],
    references: [users.id],
  }),
}));



export const routinesRelations = relations(routines, ({ one }) => ({
  user: one(users, {
    fields: [routines.userId],
    references: [users.id],
  }),
}));

export const toilBalanceRelations = relations(toilBalance, ({ one }) => ({
  user: one(users, {
    fields: [toilBalance.userId],
    references: [users.id],
  }),
  attendance: one(attendance, {
    fields: [toilBalance.attendanceId],
    references: [attendance.id],
  }),
}));

export const holidaysRelations = relations(holidays, ({ one }) => ({
  creator: one(users, {
    fields: [holidays.createdBy],
    references: [users.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  creator: one(users, {
    fields: [calendarEvents.createdBy],
    references: [users.id],
  }),
}));

export const fileUploadsRelations = relations(fileUploads, ({ one }) => ({
  user: one(users, {
    fields: [fileUploads.userId],
    references: [users.id],
  }),
}));

export const overtimeRequestsRelations = relations(overtimeRequests, ({ one }) => ({
  user: one(users, {
    fields: [overtimeRequests.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [overtimeRequests.approvedBy],
    references: [users.id],
  }),
}));



// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  date: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBreakSchema = createInsertSchema(breaks).omit({
  id: true,
  createdAt: true,
});

export const insertWorkLocationSchema = createInsertSchema(workLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAttendanceAnalyticsSchema = createInsertSchema(attendanceAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
}).extend({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  status: z.enum(["scheduled", "in-progress", "completed", "cancelled"]).default("scheduled"),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
  isDeleted: true,
  deletedAt: true,
  editedAt: true,
  retryCount: true,
  lastRetryAt: true,
});

export const insertMessageDeliveryLogSchema = createInsertSchema(messageDeliveryLog).omit({
  id: true,
  lastAttemptAt: true,
  deliveredAt: true,
  readAt: true,
});

export const insertChatGroupSchema = createInsertSchema(chatGroups).omit({
  id: true,
  createdAt: true,
});

export const insertGroupMembershipSchema = createInsertSchema(groupMemberships).omit({
  id: true,
  joinedAt: true,
});

export const insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  generatedAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
}).extend({
  expiresAt: z.coerce.date().optional().nullable(),
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
  completedAt: true,
}).extend({
  dueDate: z.coerce.date().optional().nullable(),
});

export const insertHiringRequestSchema = createInsertSchema(hiringRequests).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
}).extend({
  targetStartDate: z.coerce.date().optional().nullable(),
  requirements: z.array(z.string()).or(z.string().transform(str => str.split('\n').filter(req => req.trim()))),
});

export const insertTimeoffSchema = createInsertSchema(timeoffs).omit({
  id: true,
  createdAt: true,
  processedAt: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  // For TOIL requests, convert hours to days (8 hours = 1 day)
  toilHoursUsed: z.number().min(0).optional().transform((hours) => {
    if (hours && hours > 0) {
      // Convert hours to days, minimum 0.125 (1 hour), round to nearest 0.125
      return Math.max(0.125, Math.round((hours / 8) * 8) / 8);
    }
    return hours;
  }),
  days: z.number().min(0).transform((days) => {
    // Ensure days are in increments of 0.125 (1 hour = 0.125 days)
    return Math.round(days * 8) / 8;
  }),
});



export const insertRoutineSchema = createInsertSchema(routines).omit({
  id: true,
  userId: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.coerce.date(),
});

export const insertToilBalanceSchema = createInsertSchema(toilBalance).omit({
  id: true,
  createdAt: true,
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
  createdAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  eventDate: z.coerce.date(),
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true,
  uploadedAt: true,
});

export const insertOvertimeRequestSchema = createInsertSchema(overtimeRequests).omit({
  id: true,
  createdAt: true,
}).extend({
  requestedDate: z.coerce.date(),
  processedAt: z.date().optional(),
});







// Schema for leave requests
export const leaveRequestSchema = z.object({
  type: z.enum(["annual", "casual", "sick", "emergency", "maternity", "paternity", "bereavement"]).refine(val => val, {
    message: "Please select a leave type"
  }),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(5, "Please provide a reason (minimum 5 characters)"),
  status: z.string().default("pending"),
});

// Schema for TOIL leave requests (using TOIL hours for time off)
export const toilLeaveRequestSchema = z.object({
  startDate: z.string().min(1, "Start date is required").refine(val => !isNaN(Date.parse(val)), {
    message: "Please provide a valid start date"
  }),
  endDate: z.string().min(1, "End date is required").refine(val => !isNaN(Date.parse(val)), {
    message: "Please provide a valid end date"
  }),
  toilHoursUsed: z.number().min(1, "Must use at least 1 hour of TOIL").max(40, "Maximum 40 hours per request"),
  reason: z.string().optional(),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: "End date must be after or equal to start date",
  path: ["endDate"]
});

// Login and registration schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Profile picture update schema
export const updateProfilePictureSchema = z.object({
  profilePicture: z.string().min(1, "Profile picture is required"),
});

// Message schema for API
export const messageSchema = z.object({
  recipientId: z.string().min(1, "Recipient is required").transform(val => parseInt(val)),
  groupId: z.number().optional(),
  content: z.string().min(1, "Message content is required"),
  messageType: z.enum(["text", "file", "image", "audio", "video"]).default("text"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  attachmentUrl: z.string().optional(),
  attachmentType: z.string().optional(),
});

// Core message types
export type User = typeof users.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MessageDeliveryLog = typeof messageDeliveryLog.$inferSelect;
export type ChatGroup = typeof chatGroups.$inferSelect;
export type GroupMembership = typeof groupMemberships.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertMessageDeliveryLog = z.infer<typeof insertMessageDeliveryLogSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type UpdateProfilePictureData = z.infer<typeof updateProfilePictureSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;
export type InsertChatGroup = z.infer<typeof insertChatGroupSchema>;
export type InsertGroupMembership = z.infer<typeof insertGroupMembershipSchema>;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertHiringRequest = z.infer<typeof insertHiringRequestSchema>;
export type HiringRequest = typeof hiringRequests.$inferSelect;
export type InsertTimeoff = z.infer<typeof insertTimeoffSchema>;
export type Timeoff = typeof timeoffs.$inferSelect;

export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type Routine = typeof routines.$inferSelect;
export type InsertToilBalance = z.infer<typeof insertToilBalanceSchema>;
export type ToilBalance = typeof toilBalance.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;
export type InsertOvertimeRequest = z.infer<typeof insertOvertimeRequestSchema>;
export type OvertimeRequest = typeof overtimeRequests.$inferSelect;
export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;
export type ToilRequestFormData = z.infer<typeof toilLeaveRequestSchema>;





// Session types
export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

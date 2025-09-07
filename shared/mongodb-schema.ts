import mongoose from 'mongoose';
import { z } from 'zod';

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { type: String, required: true, default: 'employee' }, // admin, hr, employee
  department: String,
  position: String,
  profilePicture: String,
  phone: String,
  address: String,
  dateOfBirth: Date,
  // Personal identification details
  nationalId: String,
  citizenshipNumber: String,
  passportNumber: String,
  maternalName: String,
  paternalName: String,
  grandfatherName: String,
  nationality: String,
  emergencyContact: mongoose.Schema.Types.Mixed, // {name, phone, relationship}
  emergencyContacts: [mongoose.Schema.Types.Mixed], // Array of {name, phone, relationship, address, isAlternate}
  qualifications: [mongoose.Schema.Types.Mixed], // Array of {title, institution, year, description, grade, field}
  trainings: [mongoose.Schema.Types.Mixed], // Array of {title, provider, completedDate, certificateUrl, description, duration}
  experiences: [mongoose.Schema.Types.Mixed], // Array of {title, company, startDate, endDate, description, current, responsibilities}
  skills: [mongoose.Schema.Types.Mixed], // Array of {name, level, category}
  bankDetails: mongoose.Schema.Types.Mixed, // {bankName, accountNumber, routingNumber}
  bankDetailsArray: [mongoose.Schema.Types.Mixed], // Array of {bankName, accountNumber, routingNumber, accountType, isPrimary, swiftCode}
  portfolio: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Session schema
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  data: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, required: true },
  ipAddress: String,
  userAgent: String,
}, { timestamps: true });

// Attendance schema
const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  checkIn: Date,
  checkOut: Date,
  // GPS and Location Tracking
  checkInLatitude: Number,
  checkInLongitude: Number,
  checkInLocation: String,
  checkInAddress: String,
  checkInAccuracy: Number,
  checkOutLatitude: Number,
  checkOutLongitude: Number,
  checkOutLocation: String,
  checkOutAddress: String,
  checkOutAccuracy: Number,
  // Device and Browser Information
  deviceInfo: String,
  ipAddress: String,
  userAgent: String,
  // Work Status and Calculations
  status: { type: String, default: 'present' }, // present, absent, late, break, holiday, remote, incomplete
  date: { type: Date, default: Date.now },
  workingHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  breakDuration: { type: Number, default: 0 },
  isAutoCheckout: { type: Boolean, default: false },
  // TOIL and Overtime
  isToilEligible: { type: Boolean, default: false },
  toilHoursEarned: { type: Number, default: 0 },
  isWeekendWork: { type: Boolean, default: false },
  isHolidayWork: { type: Boolean, default: false },
  // Notes and Comments
  checkInNotes: String,
  checkOutNotes: String,
  adminNotes: String,
  // Validation and Verification
  isGpsVerified: { type: Boolean, default: false },
  isLocationValid: { type: Boolean, default: true },
  requiresApproval: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
}, { timestamps: true });

// Break schema
const breakSchema = new mongoose.Schema({
  attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  breakStart: { type: Date, required: true },
  breakEnd: Date,
  breakType: { type: String, default: 'regular' }, // regular, lunch, bathroom, meeting
  duration: { type: Number, default: 0 }, // in minutes
  location: String,
  latitude: Number,
  longitude: Number,
  notes: String,
}, { timestamps: true });

// Work locations schema
const workLocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radius: { type: Number, default: 100 }, // allowed radius in meters
  isActive: { type: Boolean, default: true },
  isRemoteAllowed: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Attendance analytics schema
const attendanceAnalyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  totalHours: { type: Number, default: 0 },
  productiveHours: { type: Number, default: 0 },
  breakTime: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  punctualityScore: { type: Number, default: 100 }, // 0-100 scale
  locationCompliance: { type: Number, default: 100 }, // 0-100 scale
  weeklyAverage: { type: Number, default: 0 },
  monthlyAverage: { type: Number, default: 0 },
}, { timestamps: true });

// Leave requests schema
const leaveRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // vacation, sick, personal, emergency
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, default: 'pending' }, // pending, approved, rejected
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
}, { timestamps: true });

// Shift scheduling schema
const shiftSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  location: String,
  notes: String,
  status: { type: String, default: 'scheduled' }, // scheduled, completed, cancelled
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Message schema
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for group messages
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatGroup' }, // for group chats
  content: { type: String, required: true },
  messageType: { type: String, default: 'text' }, // text, file, image
  isRead: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  editedAt: Date,
  originalContent: String, // for edit history
  attachmentUrl: String,
  attachmentType: String, // image, file, audio, video
  priority: { type: String, default: 'normal' }, // low, normal, high, urgent
  deliveryStatus: { type: String, default: 'sent' }, // sent, delivered, read, failed
  retryCount: { type: Number, default: 0 },
  lastRetryAt: Date,
}, { timestamps: true });

// Chat groups schema
const chatGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Group memberships schema
const groupMembershipSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatGroup', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, default: 'member' }, // admin, member
  joinedAt: { type: Date, default: Date.now },
  leftAt: Date,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Message delivery log schema
const messageDeliveryLogSchema = new mongoose.Schema({
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deliveryStatus: { type: String, required: true }, // pending, delivered, failed, read
  errorMessage: String,
  attemptCount: { type: Number, default: 1 },
  lastAttemptAt: { type: Date, default: Date.now },
  deliveredAt: Date,
  readAt: Date,
}, { timestamps: true });

// AI insights schema
const aiInsightSchema = new mongoose.Schema({
  type: { type: String, required: true }, // attendance_summary, leave_analysis, performance_insights
  title: { type: String, required: true },
  content: mongoose.Schema.Types.Mixed, // AI-generated insights
  period: String, // daily, weekly, monthly
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Announcements schema
const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  priority: { type: String, default: 'normal' }, // low, normal, high, urgent
  department: String, // null for all departments
  expiresAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Assignments/Tasks schema
const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: Date,
  status: { type: String, default: 'pending' }, // pending, in_progress, completed, overdue
  priority: { type: String, default: 'medium' }, // low, medium, high, critical
  category: { type: String, required: true }, // task, project, training, meeting
  attachments: [String],
  completedAt: Date,
}, { timestamps: true });

// Hiring requests schema
const hiringRequestSchema = new mongoose.Schema({
  position: { type: String, required: true },
  department: { type: String, required: true },
  description: { type: String, required: true },
  requirements: { type: [String], required: true },
  salaryRange: String,
  employmentType: { type: String, required: true }, // full_time, part_time, contract, intern
  priority: { type: String, default: 'normal' }, // low, normal, high, urgent
  status: { type: String, default: 'open' }, // open, in_progress, filled, cancelled
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetStartDate: Date,
  approvedAt: Date,
}, { timestamps: true });

// Time off requests with TOIL support schema
const timeoffSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // vacation, sick, personal, maternity, paternity, bereavement, toil
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number, required: true },
  reason: String,
  status: { type: String, default: 'pending' }, // pending, approved, rejected
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  isEmergency: { type: Boolean, default: false },
  isToilRequest: { type: Boolean, default: false },
  toilHoursUsed: { type: Number, default: 0 }, // TOIL hours being used
  processedAt: Date,
}, { timestamps: true });

// TOIL balance tracking schema
const toilBalanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hoursEarned: { type: Number, required: true }, // Hours earned from overtime
  hoursUsed: { type: Number, default: 0 }, // Hours used for time off
  hoursRemaining: { type: Number, required: true }, // Current balance
  earnedDate: { type: Date, required: true }, // When TOIL was earned
  expiryDate: { type: Date, required: true }, // 21 days from earned date
  isExpired: { type: Boolean, default: false },
  attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }, // Link to source attendance
  notes: String,
}, { timestamps: true });

// Company holidays schema
const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, default: 'public' }, // public, company, optional
  description: String,
  isRecurring: { type: Boolean, default: false },
  affectedDepartments: [String], // null means all departments
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Calendar events schema
const calendarEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  eventDate: { type: Date, required: true },
  eventTime: String, // Optional time for the event
  type: { type: String, default: 'event' }, // event, meeting, celebration, announcement
  category: { type: String, default: 'general' }, // general, company, department, training
  priority: { type: String, default: 'normal' }, // low, normal, high
  location: String,
  isAllDay: { type: Boolean, default: false },
  affectedDepartments: [String], // null means all departments
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// File uploads schema
const fileUploadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true }, // in bytes
  mimeType: { type: String, required: true },
  fileType: { type: String, required: true }, // profile_picture, portfolio, document, receipt, certificate
  isActive: { type: Boolean, default: true },
  uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Overtime/TOIL working requests schema
const overtimeRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedDate: { type: Date, required: true },
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true }, // HH:MM format
  reason: { type: String, required: true },
  workDescription: { type: String, required: true },
  isWeekend: { type: Boolean, default: false },
  isHoliday: { type: Boolean, default: false },
  status: { type: String, default: 'pending' }, // pending, approved, rejected
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  actualHoursWorked: Number,
  toilHoursAwarded: Number,
  processedAt: Date,
}, { timestamps: true });

// Personal routines schema
const routineSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  date: { type: Date, required: true },
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true }, // HH:MM format
  category: { type: String, default: 'personal' }, // work, personal, health, meeting, break
  priority: { type: String, default: 'medium' }, // low, medium, high
  isCompleted: { type: Boolean, default: false },
  remindBefore: { type: Number, default: 15 }, // minutes before to remind
  isRecurring: { type: Boolean, default: false },
  recurringPattern: String, // daily, weekly, weekdays, weekends
  notes: String,
  location: String,
  expiresAt: { type: Date, required: true }, // Auto-calculated as date + 1 day for cleanup
}, { timestamps: true });

// Projects schema (NEW - missing from original)
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  startDate: { type: Date, required: true },
  endDate: Date,
  status: { type: String, default: 'active' }, // active, completed, on_hold, cancelled
  priority: { type: String, default: 'medium' }, // low, medium, high, critical
  budget: Number,
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client: String,
  progress: { type: Number, default: 0 }, // 0-100 percentage
  tags: [String],
}, { timestamps: true });

// Hour allocation schema (NEW - for allocating work hours to projects)
const hourAllocationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true },
  date: { type: Date, required: true },
  hoursAllocated: { type: Number, required: true },
  description: String,
  taskType: String, // development, meeting, review, testing, etc.
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  status: { type: String, default: 'pending' }, // pending, approved, rejected
}, { timestamps: true });

// Create models
export const User = mongoose.model('User', userSchema);
export const Session = mongoose.model('Session', sessionSchema);
export const Attendance = mongoose.model('Attendance', attendanceSchema);
export const Break = mongoose.model('Break', breakSchema);
export const WorkLocation = mongoose.model('WorkLocation', workLocationSchema);
export const AttendanceAnalytics = mongoose.model('AttendanceAnalytics', attendanceAnalyticsSchema);
export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
export const Shift = mongoose.model('Shift', shiftSchema);
export const Message = mongoose.model('Message', messageSchema);
export const ChatGroup = mongoose.model('ChatGroup', chatGroupSchema);
export const GroupMembership = mongoose.model('GroupMembership', groupMembershipSchema);
export const MessageDeliveryLog = mongoose.model('MessageDeliveryLog', messageDeliveryLogSchema);
export const AiInsight = mongoose.model('AiInsight', aiInsightSchema);
export const Announcement = mongoose.model('Announcement', announcementSchema);
export const Assignment = mongoose.model('Assignment', assignmentSchema);
export const HiringRequest = mongoose.model('HiringRequest', hiringRequestSchema);
export const Timeoff = mongoose.model('Timeoff', timeoffSchema);
export const ToilBalance = mongoose.model('ToilBalance', toilBalanceSchema);
export const Holiday = mongoose.model('Holiday', holidaySchema);
export const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
export const FileUpload = mongoose.model('FileUpload', fileUploadSchema);
export const OvertimeRequest = mongoose.model('OvertimeRequest', overtimeRequestSchema);
export const Routine = mongoose.model('Routine', routineSchema);
export const Project = mongoose.model('Project', projectSchema);
export const HourAllocation = mongoose.model('HourAllocation', hourAllocationSchema);

// Validation schemas using Zod (keeping existing ones and adding new ones)
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(1, "Full name is required"),
  role: z.string().default("employee"),
  department: z.string().optional(),
  position: z.string().optional(),
});

export const leaveRequestSchema = z.object({
  type: z.enum(["annual", "casual", "sick", "emergency", "maternity", "paternity", "bereavement"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(5, "Please provide a reason (minimum 5 characters)"),
});

export const messageSchema = z.object({
  recipientId: z.string().min(1, "Recipient is required"),
  groupId: z.string().optional(),
  content: z.string().min(1, "Message content is required"),
  messageType: z.enum(["text", "file", "image", "audio", "video"]).default("text"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  attachmentUrl: z.string().optional(),
  attachmentType: z.string().optional(),
});

// NEW: Project schemas
export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  status: z.enum(["active", "completed", "on_hold", "cancelled"]).default("active"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  budget: z.number().optional(),
  managerId: z.string().min(1, "Manager is required"),
  teamMembers: z.array(z.string()).default([]),
  client: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const hourAllocationSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  attendanceId: z.string().min(1, "Attendance record is required"),
  date: z.string().min(1, "Date is required"),
  hoursAllocated: z.number().min(0.1, "Hours must be greater than 0"),
  description: z.string().optional(),
  taskType: z.string().optional(),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type ProjectFormData = z.infer<typeof projectSchema>;
export type HourAllocationFormData = z.infer<typeof hourAllocationSchema>;
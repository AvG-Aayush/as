import express, { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { db } from "./db";
import { and, gte, lte } from "drizzle-orm";
import { 
  requireAuth, 
  requireRole, 
  authMiddleware, 
  createUser as createUserAuth,
  authenticateUser
} from "./auth";
import {
  insertUserSchema,
  insertAttendanceSchema,
  insertLeaveRequestSchema,
  insertShiftSchema,
  insertMessageSchema,
  insertAnnouncementSchema,
  insertAssignmentSchema,
  insertHiringRequestSchema,
  insertTimeoffSchema,

  insertRoutineSchema,
  insertHolidaySchema,
  insertCalendarEventSchema,
  insertOvertimeRequestSchema,


  loginSchema,
  registerSchema,
  updateProfilePictureSchema,
  type User,
  type Attendance,
  attendance
} from "../shared/schema";

interface AuthenticatedRequest extends Request {
  user?: User;
}

// Set up multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Apply auth middleware to all routes
  app.use(authMiddleware);

  // Authentication routes
  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await authenticateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      (req.session as any).userId = user.id;
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: 'Login failed' });
    }
  });

  // Registration endpoint removed - users can only be created through employee onboarding by admins

  app.post('/api/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/user', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: { ...req.user, password: undefined } });
  });

  // Profile management routes
  app.get('/api/profile/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Users can only view their own profile unless admin/hr
      if (req.user!.id !== userId && !['admin', 'hr'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  app.put('/api/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = req.body;
      
      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updates.password;
      delete updates.role;
      delete updates.id;

      const user = await storage.updateUser(req.user!.id, updates);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(400).json({ error: 'Failed to update profile' });
    }
  });

  app.put('/api/profile/picture', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { profilePicture } = updateProfilePictureSchema.parse(req.body);
      
      const user = await storage.updateUser(req.user!.id, { profilePicture });
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error('Profile picture update error:', error);
      res.status(400).json({ error: 'Failed to update profile picture' });
    }
  });

  // User management
  app.get('/api/users', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userData = registerSchema.parse(req.body);
      const user = await createUserAuth(
        userData.username,
        userData.email,
        userData.password,
        userData.role || 'employee',
        userData.fullName
      );
      res.status(201).json({ ...user, password: undefined });
    } catch (error) {
      res.status(400).json({ error: 'Failed to create user' });
    }
  });

  app.get('/api/users/contacts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const contacts = users
        .filter(user => user.id !== req.user!.id)
        .map(user => ({
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          department: user.department,
          position: user.position,
          profilePicture: user.profilePicture
        }));
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  // Real-time Attendance Check-in/Check-out with GPS tracking
  app.post('/api/attendance/checkin', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user already checked in today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const existingAttendance = await storage.getAttendanceByUser(req.user!.id);
      const todayRecord = existingAttendance.find(record => {
        const recordDate = new Date(record.date);
        return recordDate >= today && recordDate < tomorrow;
      });

      if (todayRecord && todayRecord.checkIn && !todayRecord.checkOut) {
        return res.status(400).json({ 
          error: 'Already checked in today', 
          attendance: todayRecord,
          canCheckOut: true 
        });
      }

      // If there's a completed record for today, prevent new check-in
      if (todayRecord && todayRecord.checkOut) {
        return res.status(400).json({ 
          error: 'Already completed work for today', 
          attendance: todayRecord,
          canCheckOut: false 
        });
      }

      const checkInTime = new Date();
      const attendanceData = {
        userId: req.user!.id,
        checkIn: checkInTime,
        checkInLatitude: req.body.checkInLatitude || req.body.latitude || null,
        checkInLongitude: req.body.checkInLongitude || req.body.longitude || null,
        checkInLocation: req.body.checkInLocation || req.body.location || 'Manual Check-in',
        checkInAddress: req.body.checkInAddress || req.body.address || null,
        checkInAccuracy: req.body.checkInAccuracy || req.body.accuracy || null,
        deviceInfo: req.body.deviceInfo || req.get('User-Agent'),
        ipAddress: req.ip || 'Unknown',
        userAgent: req.get('User-Agent') || 'Unknown',
        status: req.body.status || 'present',
        date: checkInTime,
        checkInNotes: req.body.checkInNotes || req.body.notes || null,
        isGpsVerified: Boolean(req.body.isGpsVerified && req.body.latitude && req.body.longitude),
        isLocationValid: req.body.isLocationValid !== false,
        requiresApproval: Boolean(req.body.requiresApproval)
      };

      const attendance = await storage.createAttendance(attendanceData);
      res.status(201).json({
        ...attendance,
        message: 'Check-in successful'
      });
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(400).json({ 
        error: 'Failed to check in',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  app.post('/api/attendance/checkout/:attendanceId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const attendanceId = parseInt(req.params.attendanceId);
      
      if (isNaN(attendanceId)) {
        return res.status(400).json({ error: 'Invalid attendance ID' });
      }

      const currentAttendance = await storage.getAttendanceById(attendanceId);
      
      if (!currentAttendance || currentAttendance.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }

      if (currentAttendance.checkOut) {
        return res.status(400).json({ 
          error: 'Already checked out today', 
          attendance: currentAttendance 
        });
      }

      if (!currentAttendance.checkIn) {
        return res.status(400).json({ error: 'No check-in record found' });
      }

      const checkOutTime = new Date();
      const checkInTime = new Date(currentAttendance.checkIn);
      const workingMilliseconds = checkOutTime.getTime() - checkInTime.getTime();
      const workingHours = Math.max(0, workingMilliseconds / (1000 * 60 * 60));

      // Calculate overtime (over 8 hours) and TOIL eligibility
      const overtimeHours = workingHours > 8 ? workingHours - 8 : 0;
      const isWeekend = [0, 6].includes(checkInTime.getDay()); // Sunday = 0, Saturday = 6

      const updateData = {
        checkOut: checkOutTime,
        checkOutLatitude: req.body.checkOutLatitude || req.body.latitude || null,
        checkOutLongitude: req.body.checkOutLongitude || req.body.longitude || null,
        checkOutLocation: req.body.checkOutLocation || req.body.location || 'Manual Check-out',
        checkOutAddress: req.body.checkOutAddress || req.body.address || null,
        checkOutAccuracy: req.body.checkOutAccuracy || req.body.accuracy || null,
        checkOutNotes: req.body.checkOutNotes || req.body.notes || null,
        workingHours: Math.round(workingHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        isToilEligible: overtimeHours > 0 || isWeekend,
        toilHoursEarned: Math.round(Math.max(overtimeHours, isWeekend ? workingHours : 0) * 100) / 100,
        isWeekendWork: isWeekend,
        status: 'completed',
        updatedAt: checkOutTime
      };

      const attendance = await storage.updateAttendance(attendanceId, updateData);
      
      res.json({
        ...attendance,
        message: 'Check-out successful',
        workingSummary: {
          totalHours: updateData.workingHours,
          overtimeHours: updateData.overtimeHours,
          toilEarned: updateData.toilHoursEarned,
          isWeekendWork: updateData.isWeekendWork
        }
      });
    } catch (error) {
      console.error('Check-out error:', error);
      res.status(400).json({ 
        error: 'Failed to check out',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  app.get('/api/attendance/today', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Always return current user's attendance record for today, regardless of role
      const userAttendance = await storage.getAttendanceByUser(req.user!.id);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayAttendance = userAttendance.find(record => {
        const recordDate = new Date(record.date);
        return recordDate >= today && recordDate < tomorrow;
      });
      
      res.json(todayAttendance || null);
    } catch (error) {
      console.error('Failed to fetch today attendance:', error);
      res.status(500).json({ error: 'Failed to fetch attendance' });
    }
  });

  app.get('/api/attendance/history/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { startDate, endDate } = req.query;
      
      // Users can only view their own attendance unless admin/hr
      if (req.user!.id !== userId && !['admin', 'hr'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      let attendance = await storage.getAttendanceByUser(userId);
      
      // Filter by date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        attendance = attendance.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= start && recordDate <= end;
        });
      }
      
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch attendance history' });
    }
  });

  // Enhanced attendance history with date range support
  app.get('/api/attendance/history', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, startDate, endDate } = req.query;
      const targetUserId = userId ? parseInt(userId as string) : req.user!.id;
      
      // Users can only view their own attendance unless admin/hr
      if (req.user!.id !== targetUserId && !['admin', 'hr'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      let attendance = await storage.getAttendanceByUser(targetUserId);
      
      // Filter by date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        attendance = attendance.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= start && recordDate <= end;
        });
      }
      
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch attendance history' });
    }
  });

  app.put('/api/attendance/:id/status', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, adminNotes, requiresApproval, approvedBy } = req.body;
      
      const attendance = await storage.updateAttendance(id, {
        status,
        adminNotes,
        requiresApproval,
        approvedBy,
        approvedAt: approvedBy ? new Date() : undefined
      });
      
      res.json(attendance);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update attendance status' });
    }
  });

  // Leave requests
  app.get('/api/leave-requests/user/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (req.user!.id !== userId && !['admin', 'hr'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const requests = await storage.getLeaveRequestsByUser(userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  });

  app.get('/api/leave-requests/pending', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (['admin', 'hr'].includes(req.user!.role)) {
        const requests = await storage.getPendingLeaveRequests();
        res.json(requests);
      } else {
        const userRequests = await storage.getLeaveRequestsByUser(req.user!.id);
        const pendingRequests = userRequests.filter(req => req.status === 'pending');
        res.json(pendingRequests);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pending leave requests' });
    }
  });

  app.post('/api/leave-requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const leaveData = insertLeaveRequestSchema.parse({
        ...req.body,
        userId: req.user!.id,
        submittedAt: new Date()
      });
      
      const leaveRequest = await storage.createLeaveRequest(leaveData);
      res.status(201).json(leaveRequest);
    } catch (error) {
      console.error('Leave request error:', error);
      res.status(400).json({ error: 'Failed to create leave request' });
    }
  });

  app.put('/api/leave-requests/:id', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, approvedBy, rejectionReason } = req.body;
      
      const leaveRequest = await storage.updateLeaveRequest(id, {
        status,
        approvedBy,
        rejectionReason,
        reviewedAt: new Date()
      });
      
      res.json(leaveRequest);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update leave request' });
    }
  });

  // Messages and chat
  app.get('/api/messages/user/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      
      if (isNaN(otherUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Verify the other user exists
      const otherUser = await storage.getUser(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const messages = await storage.getMessagesByUser(req.user!.id, otherUserId);
      res.json(messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.get('/api/messages/group/:groupId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      
      if (isNaN(groupId)) {
        return res.status(400).json({ error: 'Invalid group ID' });
      }

      const messages = await storage.getMessagesByGroup(groupId);
      res.json(messages);
    } catch (error) {
      console.error('Failed to fetch group messages:', error);
      res.status(500).json({ error: 'Failed to fetch group messages' });
    }
  });

  app.post('/api/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate required fields
      if (!req.body.content || req.body.content.trim() === '') {
        return res.status(400).json({ error: 'Message content is required' });
      }

      if (!req.body.recipientId && !req.body.groupId) {
        return res.status(400).json({ error: 'Either recipientId or groupId is required' });
      }

      // Validate recipient exists if sending direct message
      if (req.body.recipientId) {
        const recipient = await storage.getUser(parseInt(req.body.recipientId));
        if (!recipient) {
          return res.status(404).json({ error: 'Recipient not found' });
        }
      }

      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user!.id,
        sentAt: new Date(),
        deliveryStatus: 'sent',
        retryCount: 0,
        isRead: false,
        isDeleted: false
      });
      
      const message = await storage.createMessage(messageData);
      
      // Create delivery log entry for direct messages
      if (message.recipientId) {
        try {
          await storage.createMessageDeliveryLog({
            messageId: message.id,
            recipientId: message.recipientId,
            deliveryStatus: 'delivered',
            attemptCount: 1
          });
        } catch (logError) {
          console.error('Failed to create delivery log:', logError);
          // Don't fail the message send if logging fails
        }
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Message creation error:', error);
      
      res.status(400).json({ 
        error: 'Failed to send message', 
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined 
      });
    }
  });

  app.put('/api/messages/mark-read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { senderId, messageIds } = req.body;
      
      if (messageIds && Array.isArray(messageIds)) {
        // Mark specific messages as read
        if (messageIds.length > 0) {
          await storage.markMessagesAsRead(req.user!.id, messageIds);
        }
      } else if (senderId) {
        // Mark all messages from a specific sender as read
        const senderIdNum = parseInt(senderId);
        if (isNaN(senderIdNum)) {
          return res.status(400).json({ error: 'Invalid sender ID' });
        }

        const messages = await storage.getMessagesByUser(req.user!.id, senderIdNum);
        const unreadMessageIds = messages
          .filter(msg => !msg.isRead && msg.recipientId === req.user!.id)
          .map(msg => msg.id);
        
        if (unreadMessageIds.length > 0) {
          await storage.markMessagesAsRead(req.user!.id, unreadMessageIds);
        }
      } else {
        return res.status(400).json({ error: 'Either senderId or messageIds must be provided' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Mark messages as read error:', error);
      res.status(400).json({ error: 'Failed to mark messages as read' });
    }
  });

  app.get('/api/messages/unread-count', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user!.id);
      res.json({ count });
    } catch (error) {
      console.error('Failed to get unread count:', error);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  });

  // Get message delivery status
  app.get('/api/messages/:messageId/delivery-status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const messageId = parseInt(req.params.messageId);
      
      if (isNaN(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }

      const deliveryStatus = await storage.getMessageDeliveryStatus(messageId);
      res.json(deliveryStatus);
    } catch (error) {
      console.error('Failed to get delivery status:', error);
      res.status(500).json({ error: 'Failed to get delivery status' });
    }
  });

  // Update message delivery status (for system use)
  app.put('/api/messages/:messageId/delivery-status', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { recipientId, status, errorMessage } = req.body;
      
      if (isNaN(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }

      await storage.updateMessageDeliveryStatus(messageId, recipientId, status, errorMessage);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update delivery status:', error);
      res.status(500).json({ error: 'Failed to update delivery status' });
    }
  });

  // Announcements
  app.get('/api/announcements', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const announcements = await storage.getActiveAnnouncements();
      res.json(announcements);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  });

  app.post('/api/announcements', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const announcementData = insertAnnouncementSchema.parse({
        ...req.body,
        createdBy: req.user!.id,
        createdAt: new Date()
      });
      
      const announcement = await storage.createAnnouncement(announcementData);
      res.status(201).json(announcement);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create announcement' });
    }
  });

  // Assignments
  app.get('/api/assignments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const assignments = await storage.getAssignmentsByUser(req.user!.id);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  });

  app.post('/api/assignments', requireAuth, requireRole(['admin', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const assignmentData = insertAssignmentSchema.parse({
        ...req.body,
        assignedBy: req.user!.id,
        createdAt: new Date()
      });
      
      const assignment = await storage.createAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create assignment' });
    }
  });

  app.patch('/api/assignments/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const assignment = await storage.updateAssignment(id, updates);
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update assignment' });
    }
  });

  // Hiring requests
  app.get('/api/hiring-requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requests = await storage.getHiringRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch hiring requests' });
    }
  });

  app.post('/api/hiring-requests', requireAuth, requireRole(['admin', 'hr', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hiringData = insertHiringRequestSchema.parse({
        ...req.body,
        requestedBy: req.user!.id,
        createdAt: new Date()
      });
      
      const hiringRequest = await storage.createHiringRequest(hiringData);
      res.status(201).json(hiringRequest);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create hiring request' });
    }
  });

  // Time offs
  app.get('/api/timeoffs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const timeoffs = await storage.getTimeoffsByUser(req.user!.id);
      res.json(timeoffs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch time offs' });
    }
  });

  app.get('/api/timeoffs/user/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (req.user!.id !== userId && !['admin', 'hr'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const timeoffs = await storage.getTimeoffsByUser(userId);
      res.json(timeoffs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user time offs' });
    }
  });

  app.post('/api/timeoffs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const timeoffData = insertTimeoffSchema.parse({
        ...req.body,
        userId: req.user!.id,
        createdAt: new Date()
      });
      
      const timeoff = await storage.createTimeoff(timeoffData);
      res.status(201).json(timeoff);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create time off request' });
    }
  });



  // Dashboard metrics
  app.get("/api/dashboard/metrics", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const todayAttendance = await storage.getTodayAttendance();
      const pendingLeaveRequests = await storage.getPendingLeaveRequests();
      
      // Calculate present employees today
      const presentToday = todayAttendance.filter(a => a.status === 'present' || a.checkIn).length;
      
      // Calculate attendance rate
      const attendanceRate = users.length > 0 ? (presentToday / users.length) * 100 : 0;
      
      // Calculate new hires this month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newHires = users.filter((u: any) => {
        const createdDate = new Date(u.createdAt);
        return createdDate >= firstDayOfMonth;
      }).length;

      const metrics = {
        totalEmployees: users.length,
        presentToday: presentToday,
        attendanceRate: Math.round(attendanceRate),
        pendingLeaves: pendingLeaveRequests.length,
        newHires: newHires
      };

      res.json(metrics);
    } catch (error) {
      console.error('Dashboard metrics error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
  });

  // Work locations
  app.get('/api/work-locations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locations = await storage.getWorkLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch work locations' });
    }
  });

  app.post('/api/work-locations', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locationData = {
        ...req.body,
        createdBy: req.user!.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const location = await storage.createWorkLocation(locationData);
      res.status(201).json(location);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create work location' });
    }
  });

  // Admin endpoints for request management (Admin only)
  app.get('/api/admin/pending-requests', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get all pending requests from different tables
      const pendingLeaveRequests = await storage.getPendingLeaveRequests();
      const allOvertimeRequests = await storage.getOvertimeRequests();
      const pendingOvertimeRequests = allOvertimeRequests.filter((req: any) => req.status === 'pending');
      const allTimeoffs = await storage.getTimeoffsByUser(0); // Get all timeoffs, filter later
      const pendingTimeoffs = allTimeoffs.filter((req: any) => req.status === 'pending');

      // Get user information for each request
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map(user => [user.id, user]));

      const combinedRequests = {
        leaveRequests: pendingLeaveRequests.map((request: any) => ({
          ...request,
          user: userMap.get(request.userId)
        })),
        overtimeRequests: pendingOvertimeRequests.map((request: any) => ({
          ...request,
          user: userMap.get(request.userId)
        })),
        timeoffRequests: pendingTimeoffs.map((request: any) => ({
          ...request,
          user: userMap.get(request.userId)
        }))
      };

      res.json(combinedRequests);
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
      res.status(500).json({ error: 'Failed to fetch pending requests' });
    }
  });

  app.put('/api/admin/approve-leave/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { approvalNotes } = req.body;
      
      const leaveRequest = await storage.updateLeaveRequest(id, {
        status: 'approved',
        approvedBy: req.user!.id,
        rejectionReason: approvalNotes || null
      });
      
      res.json(leaveRequest);
    } catch (error) {
      console.error('Failed to approve leave request:', error);
      res.status(400).json({ error: 'Failed to approve leave request' });
    }
  });

  app.put('/api/admin/reject-leave/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { rejectionReason } = req.body;
      
      const leaveRequest = await storage.updateLeaveRequest(id, {
        status: 'rejected',
        approvedBy: req.user!.id,
        rejectionReason
      });
      
      res.json(leaveRequest);
    } catch (error) {
      console.error('Failed to reject leave request:', error);
      res.status(400).json({ error: 'Failed to reject leave request' });
    }
  });

  app.put('/api/admin/approve-overtime/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { toilHoursAwarded } = req.body;
      
      const overtimeRequest = await storage.updateOvertimeRequest(id, {
        status: 'approved',
        approvedBy: req.user!.id,
        processedAt: new Date(),
        toilHoursAwarded: toilHoursAwarded || 0
      });
      
      res.json(overtimeRequest);
    } catch (error) {
      console.error('Failed to approve overtime request:', error);
      res.status(400).json({ error: 'Failed to approve overtime request' });
    }
  });

  app.put('/api/admin/reject-overtime/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { rejectionReason } = req.body;
      
      const overtimeRequest = await storage.updateOvertimeRequest(id, {
        status: 'rejected',
        approvedBy: req.user!.id,
        processedAt: new Date(),
        rejectionReason
      });
      
      res.json(overtimeRequest);
    } catch (error) {
      console.error('Failed to reject overtime request:', error);
      res.status(400).json({ error: 'Failed to reject overtime request' });
    }
  });

  app.put('/api/admin/approve-timeoff/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const timeoffRequest = await storage.updateTimeoff(id, {
        status: 'approved',
        approvedBy: req.user!.id
      });
      
      res.json(timeoffRequest);
    } catch (error) {
      console.error('Failed to approve timeoff request:', error);
      res.status(400).json({ error: 'Failed to approve timeoff request' });
    }
  });

  app.put('/api/admin/reject-timeoff/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { rejectionReason } = req.body;
      
      const timeoffRequest = await storage.updateTimeoff(id, {
        status: 'rejected',
        approvedBy: req.user!.id,
        rejectionReason
      });
      
      res.json(timeoffRequest);
    } catch (error) {
      console.error('Failed to reject timeoff request:', error);
      res.status(400).json({ error: 'Failed to reject timeoff request' });
    }
  });

  // Admin endpoint for employee attendance tracking with comprehensive filtering
  app.get('/api/admin/employees-attendance', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate, date, userId, status, department } = req.query;
      
      if (startDate && endDate) {
        // Handle date range requests for dashboard charts
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        
        const attendanceData = await storage.getAllAttendanceWithUsers();
        const filteredData = attendanceData.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= start && recordDate <= end;
        });
        
        // Transform data to match component expectations
        const transformedData = filteredData.map(record => ({
          ...record,
          user: {
            id: record.userId,
            fullName: record.userName,
            email: '', // Add if needed
            department: record.department,
            role: record.userRole
          }
        }));
        
        res.json(transformedData);
      } else if (date) {
        // Handle specific date requests
        const targetDate = new Date(date as string);
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const attendanceData = await storage.getAllAttendanceWithUsers();
        const dayData = attendanceData.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= targetDate && recordDate < nextDay;
        });
        
        // Transform data to match component expectations
        const transformedData = dayData.map(record => ({
          ...record,
          user: {
            id: record.userId,
            fullName: record.userName,
            email: '',
            department: record.department,
            role: record.userRole
          }
        }));
        
        res.json(transformedData);
      } else {
        // Default: get recent attendance (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const attendanceData = await storage.getAllAttendanceWithUsers();
        const recentData = attendanceData.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= thirtyDaysAgo;
        });
        
        // Transform data to match component expectations
        const transformedData = recentData.map(record => ({
          ...record,
          user: {
            id: record.userId,
            fullName: record.userName,
            email: '',
            department: record.department,
            role: record.userRole
          }
        }));
        
        res.json(transformedData);
      }
    } catch (error) {
      console.error('Failed to fetch employees attendance:', error);
      res.status(500).json({ error: 'Failed to fetch employees attendance' });
    }
  });

  // Update individual attendance record (Admin only)
  app.put('/api/attendance/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Add admin tracking
      const updatesWithAdmin = {
        ...updates,
        updatedAt: new Date(),
        adminEditedBy: req.user!.id,
        adminEditedAt: new Date()
      };
      
      const attendanceRecord = await storage.updateAttendance(id, updatesWithAdmin);
      res.json(attendanceRecord);
    } catch (error) {
      console.error('Failed to update attendance record:', error);
      res.status(400).json({ error: 'Failed to update attendance record' });
    }
  });

  // Bulk update attendance records (Admin only)
  app.post('/api/attendance/bulk-update', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ids, updates } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No records selected for update' });
      }
      
      // Add admin tracking to updates
      const updatesWithAdmin = {
        ...updates,
        updatedAt: new Date(),
        adminEditedBy: req.user!.id,
        adminEditedAt: new Date()
      };
      
      const results = await Promise.all(
        ids.map(id => storage.updateAttendance(id, updatesWithAdmin))
      );
      
      res.json({ 
        success: true, 
        updatedCount: results.length,
        message: `Successfully updated ${results.length} attendance records`
      });
    } catch (error) {
      console.error('Failed to bulk update attendance records:', error);
      res.status(400).json({ error: 'Failed to bulk update attendance records' });
    }
  });

  // Fix incorrect working hours calculation (Admin only)
  app.post('/api/admin/fix-working-hours', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { attendanceScheduler } = await import('./attendance-scheduler.js');
      const fixedCount = await attendanceScheduler.fixIncorrectWorkingHours();
      
      res.json({ 
        success: true, 
        fixedCount,
        message: `Successfully fixed ${fixedCount} attendance records with incorrect working hours`
      });
    } catch (error) {
      console.error('Failed to fix working hours:', error);
      res.status(500).json({ error: 'Failed to fix working hours' });
    }
  });

  // Routines API
  app.get('/api/routines', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const routines = await storage.getRoutinesByUser(req.user!.id);
      res.json(routines);
    } catch (error) {
      console.error('Failed to fetch routines:', error);
      res.status(500).json({ error: 'Failed to fetch routines' });
    }
  });

  app.get('/api/routines/upcoming', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const routines = await storage.getUpcomingRoutines(req.user!.id);
      res.json(routines);
    } catch (error) {
      console.error('Failed to fetch upcoming routines:', error);
      res.status(500).json({ error: 'Failed to fetch upcoming routines' });
    }
  });

  app.post('/api/routines', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsedData = insertRoutineSchema.parse(req.body);
      
      // Calculate expiresAt as date + 1 day for cleanup
      const expiresAt = new Date(parsedData.date);
      expiresAt.setDate(expiresAt.getDate() + 1);
      
      const routineData = {
        ...parsedData,
        userId: req.user!.id,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const routine = await storage.createRoutine(routineData);
      res.status(201).json(routine);
    } catch (error) {
      console.error('Failed to create routine:', error);
      res.status(400).json({ error: 'Failed to create routine' });
    }
  });

  app.get('/api/routines/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const routine = await storage.getRoutineById(id);
      
      if (!routine || routine.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Routine not found' });
      }
      
      res.json(routine);
    } catch (error) {
      console.error('Failed to fetch routine:', error);
      res.status(500).json({ error: 'Failed to fetch routine' });
    }
  });

  app.put('/api/routines/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Check ownership
      const existingRoutine = await storage.getRoutineById(id);
      if (!existingRoutine || existingRoutine.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Routine not found' });
      }
      
      const routine = await storage.updateRoutine(id, { ...updates, updatedAt: new Date() });
      res.json(routine);
    } catch (error) {
      console.error('Failed to update routine:', error);
      res.status(400).json({ error: 'Failed to update routine' });
    }
  });

  app.delete('/api/routines/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check ownership
      const existingRoutine = await storage.getRoutineById(id);
      if (!existingRoutine || existingRoutine.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Routine not found' });
      }
      
      await storage.deleteRoutine(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete routine:', error);
      res.status(400).json({ error: 'Failed to delete routine' });
    }
  });

  // Shifts API
  app.get('/api/shifts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      let shifts;
      if (req.user!.role === 'admin' || req.user!.role === 'hr') {
        shifts = await storage.getAllShifts();
      } else {
        shifts = await storage.getShiftsByUser(req.user!.id);
      }
      res.json(shifts);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
      res.status(500).json({ error: 'Failed to fetch shifts' });
    }
  });

  app.get('/api/shifts/user/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (req.user!.id !== userId && !['admin', 'hr'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const shifts = await storage.getShiftsByUser(userId);
      res.json(shifts);
    } catch (error) {
      console.error('Failed to fetch user shifts:', error);
      res.status(500).json({ error: 'Failed to fetch user shifts' });
    }
  });

  app.post('/api/shifts', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const shiftData = insertShiftSchema.parse({
        ...req.body,
        createdBy: req.user!.id,
        createdAt: new Date()
      });
      
      const shift = await storage.createShift(shiftData);
      res.status(201).json(shift);
    } catch (error) {
      console.error('Failed to create shift:', error);
      res.status(400).json({ error: 'Failed to create shift' });
    }
  });

  app.get('/api/shifts/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const shift = await storage.getShiftById(id);
      
      if (!shift) {
        return res.status(404).json({ error: 'Shift not found' });
      }
      
      // Check access permissions
      if (shift.userId !== req.user!.id && !['admin', 'hr'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      res.json(shift);
    } catch (error) {
      console.error('Failed to fetch shift:', error);
      res.status(500).json({ error: 'Failed to fetch shift' });
    }
  });

  app.put('/api/shifts/:id', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const shift = await storage.updateShift(id, updates);
      res.json(shift);
    } catch (error) {
      console.error('Failed to update shift:', error);
      res.status(400).json({ error: 'Failed to update shift' });
    }
  });

  app.delete('/api/shifts/:id', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteShift(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete shift:', error);
      res.status(400).json({ error: 'Failed to delete shift' });
    }
  });

  // Calendar Events API
  app.get('/api/calendar-events', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const events = await storage.getCalendarEvents();
      res.json(events);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
  });

  app.post('/api/calendar-events', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventData = insertCalendarEventSchema.parse({
        ...req.body,
        createdBy: req.user!.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const event = await storage.createCalendarEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      res.status(400).json({ error: 'Failed to create calendar event' });
    }
  });

  app.get('/api/calendar-events/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getCalendarEventById(id);
      
      if (!event) {
        return res.status(404).json({ error: 'Calendar event not found' });
      }
      
      res.json(event);
    } catch (error) {
      console.error('Failed to fetch calendar event:', error);
      res.status(500).json({ error: 'Failed to fetch calendar event' });
    }
  });

  app.put('/api/calendar-events/:id', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if event exists
      const existingEvent = await storage.getCalendarEventById(id);
      if (!existingEvent) {
        return res.status(404).json({ error: 'Calendar event not found' });
      }
      
      const updates = { ...req.body, updatedAt: new Date() };
      
      const event = await storage.updateCalendarEvent(id, updates);
      res.json(event);
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      res.status(400).json({ error: 'Failed to update calendar event' });
    }
  });

  app.delete('/api/calendar-events/:id', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if event exists
      const existingEvent = await storage.getCalendarEventById(id);
      if (!existingEvent) {
        return res.status(404).json({ error: 'Calendar event not found' });
      }
      
      await storage.deleteCalendarEvent(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      res.status(400).json({ error: 'Failed to delete calendar event' });
    }
  });

  // Holidays API
  app.get('/api/holidays', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const holidays = await storage.getHolidays();
      res.json(holidays);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
      res.status(500).json({ error: 'Failed to fetch holidays' });
    }
  });

  app.post('/api/holidays', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const holidayData = insertHolidaySchema.parse({
        ...req.body,
        createdBy: req.user!.id,
        createdAt: new Date()
      });
      
      const holiday = await storage.createHoliday(holidayData);
      res.status(201).json(holiday);
    } catch (error) {
      console.error('Failed to create holiday:', error);
      res.status(400).json({ error: 'Failed to create holiday' });
    }
  });

  return server;
}

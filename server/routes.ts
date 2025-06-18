import express, { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { db, executeWithTimeout } from "./db";
import { and, gte, lte, sql, eq } from "drizzle-orm";
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
  attendance,
  users
} from "../shared/schema";

interface AuthenticatedRequest extends Request {
  user?: User;
}

// Set up multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: fileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export async function registerRoutes(app: Express) {
  // Enable trust proxy for correct IP addresses
  app.set('trust proxy', true);
  
  // Apply authentication middleware to all routes
  app.use(authMiddleware);
  
  const server = createServer(app);

  // Authentication routes
  app.post('/api/login', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      console.log(`[LOGIN] Login attempt from IP: ${ip} with body:`, { username: req.body.username, hasPassword: !!req.body.password });
      
      const { username, password } = loginSchema.parse(req.body);
      
      console.log(`[LOGIN] Attempting authentication for username: ${username}`);
      const user = await authenticateUser(username, password);
      
      if (!user) {
        console.warn(`[LOGIN] Authentication failed for username: ${username} from IP: ${ip}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      console.log(`[LOGIN] Authentication successful for user: ${user.username} (ID: ${user.id})`);

      // Store user in session with proper error handling
      (req.session as any).userId = user.id;
      (req.session as any).username = user.username;
      (req.session as any).role = user.role;
      
      console.log(`[LOGIN] Session data set: userId=${user.id}, sessionId=${req.session.id}`);
      
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error(`[LOGIN] Session save error:`, err);
            reject(err);
          } else {
            console.log(`[LOGIN] Session saved successfully for user: ${user.username}`);
            resolve();
          }
        });
      });

      const responseUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        position: user.position,
        profilePicture: user.profilePicture
      };

      console.log(`[LOGIN] Login completed successfully for ${user.username} in ${Date.now() - startTime}ms`);
      res.json({ user: responseUser });
      
    } catch (error) {
      console.error(`[LOGIN] Login error for IP ${ip}:`, error);
      res.status(400).json({ error: 'Invalid login data' });
    }
  });

  app.post('/api/logout', (req: Request, res: Response) => {
    try {
      // Always clear the cookie first to ensure logout works even if session destruction fails
      res.clearCookie('hrms.sid', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });

      // Try to destroy session, but don't fail if it doesn't work
      if (req.session && typeof req.session.destroy === 'function') {
        req.session.destroy((err) => {
          if (err) {
            console.error('[LOGOUT] Session destruction error:', err);
          }
        });
      }

      // Always return success for logout
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('[LOGOUT] Logout error:', error);
      // Even if there's an error, clear cookie and return success
      res.clearCookie('hrms.sid', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
      res.json({ success: true, message: 'Logged out successfully' });
    }
  });

  app.get('/api/user', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      id: req.user!.id,
      username: req.user!.username,
      email: req.user!.email,
      fullName: req.user!.fullName,
      role: req.user!.role,
      department: req.user!.department,
      position: req.user!.position,
      profilePicture: req.user!.profilePicture
    });
  });

  // Dashboard metrics endpoint
  app.get("/api/dashboard/metrics", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Dashboard metrics error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
  });

  // Users endpoint for admin
  app.get('/api/users', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Create user endpoint for admin
  app.post('/api/users', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await createUserAuth(
        userData.username,
        userData.email,
        userData.password || 'temp123',
        userData.role || 'employee',
        userData.fullName || userData.username
      );
      res.status(201).json(user);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(400).json({ error: 'Failed to create user' });
    }
  });

  // Attendance check-in endpoint
  app.post('/api/attendance/checkin', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const attendanceData = {
        ...req.body,
        userId: req.user!.id,
        checkIn: new Date(),
        date: new Date(),
        status: 'present'
      };
      
      const attendance = await storage.createAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({ 
        error: 'Failed to check in',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  // Attendance checkout endpoint
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
      const workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      const isWeekend = checkOutTime.getDay() === 0 || checkOutTime.getDay() === 6;
      const standardHours = 8;
      const overtimeHours = Math.max(0, workingHours - standardHours);
      const toilHoursEarned = isWeekend ? workingHours : overtimeHours;

      const updateData = {
        checkOut: checkOutTime,
        checkOutLatitude: req.body.checkOutLatitude,
        checkOutLongitude: req.body.checkOutLongitude,
        checkOutLocation: req.body.checkOutLocation || 'Manual Check-out',
        checkOutAddress: req.body.checkOutAddress,
        checkOutAccuracy: req.body.checkOutAccuracy,
        checkOutNotes: req.body.checkOutNotes,
        workingHours: Number(workingHours.toFixed(2)),
        overtimeHours: Number(overtimeHours.toFixed(2)),
        toilHoursEarned: Number(toilHoursEarned.toFixed(2)),
        isWeekendWork: isWeekend,
        updatedAt: new Date()
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
      res.status(500).json({ 
        error: 'Failed to check out',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  // Get today's attendance
  app.get('/api/attendance/today', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const todayAttendance = await storage.getTodayAttendance();
      const userAttendance = todayAttendance.find(a => a.userId === req.user!.id);
      res.json(userAttendance || null);
    } catch (error) {
      console.error('Get today attendance error:', error);
      res.status(500).json({ error: 'Failed to fetch today attendance' });
    }
  });

  // Update profile picture (must be before the generic /api/profile/:id route)
  app.put('/api/profile/picture', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('Profile picture endpoint hit, body:', req.body);
      console.log('User from session:', req.user);
      
      const { profilePicture } = updateProfilePictureSchema.parse(req.body);
      
      // Get user ID directly from session/authentication
      const userId = req.user!.id;
      
      console.log('Profile picture update request for user:', userId, 'Type:', typeof userId);
      
      // Use storage method to update profile picture
      const updatedUser = await storage.updateUser(userId, { profilePicture });
      
      // Remove sensitive information
      const { password, ...userProfile } = updatedUser;
      res.json({ user: userProfile });
    } catch (error) {
      console.error('Update profile picture error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update profile picture' });
    }
  });

  // Get user profile by ID
  app.get('/api/profile/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Check if user is accessing their own profile or if they have admin/hr permissions
      if (req.user!.id !== userId && !['admin', 'hr'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Remove sensitive information
      const { password, ...userProfile } = user;
      res.json(userProfile);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  // Update user profile
  app.put('/api/profile/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      
      // Check if user is updating their own profile or if they have admin permissions
      if (req.user!.id !== userId && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Manually validate and clean the update data to avoid schema parsing issues
      const allowedFields = [
        'fullName', 'email', 'phone', 'address', 'dateOfBirth',
        'nationalId', 'citizenshipNumber', 'passportNumber', 
        'maternalName', 'paternalName', 'grandfatherName', 'nationality',
        'department', 'position', 'portfolio',
        'emergencyContact', 'emergencyContacts', 'qualifications', 
        'trainings', 'experiences', 'skills', 'bankDetails', 'bankDetailsArray'
      ];
      
      const updateData: any = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined && req.body[field] !== null) {
          updateData[field] = req.body[field];
        }
      }
      
      // Don't allow regular users to change their role
      if (req.user!.role === 'admin' && req.body.role) {
        updateData.role = req.body.role;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      // Remove sensitive information
      const { password, ...userProfile } = updatedUser;
      res.json({ user: userProfile });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({ error: 'Failed to update profile' });
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
        return res.status(400).json({ error: 'Invalid or empty IDs array' });
      }
      
      const updatesWithAdmin = {
        ...updates,
        updatedAt: new Date(),
        adminEditedBy: req.user!.id,
        adminEditedAt: new Date()
      };
      
      const results = [];
      for (const id of ids) {
        try {
          const attendanceRecord = await storage.updateAttendance(id, updatesWithAdmin);
          results.push(attendanceRecord);
        } catch (error) {
          console.error(`Failed to update attendance record ${id}:`, error);
        }
      }
      
      res.json({ 
        message: `Updated ${results.length} out of ${ids.length} records`,
        updated: results.length,
        total: ids.length
      });
    } catch (error) {
      console.error('Failed to bulk update attendance records:', error);
      res.status(400).json({ error: 'Failed to bulk update attendance records' });
    }
  });

  // Leave Requests API
  app.get('/api/leave-requests/user/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only access their own leave requests unless they're admin/hr
      if (req.user!.id !== userId && !['admin', 'hr'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const leaveRequests = await storage.getLeaveRequestsByUser(userId);
      res.json(leaveRequests);
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
      res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  });

  app.get('/api/leave-requests/pending', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pendingRequests = await storage.getPendingLeaveRequests();
      res.json(pendingRequests);
    } catch (error) {
      console.error('Failed to fetch pending leave requests:', error);
      res.status(500).json({ error: 'Failed to fetch pending leave requests' });
    }
  });

  app.post('/api/leave-requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requestData = {
        ...req.body,
        userId: req.user!.id,
        requestedAt: new Date(),
        status: 'pending'
      };
      
      const leaveData = insertLeaveRequestSchema.parse(requestData);
      const leaveRequest = await storage.createLeaveRequest(leaveData);
      res.status(201).json(leaveRequest);
    } catch (error) {
      console.error('Failed to create leave request:', error);
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

  // Messages API
  app.get('/api/messages/user/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      
      if (isNaN(otherUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

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

  app.get('/api/users/contacts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contacts = await storage.getUserContacts(req.user!.id);
      res.json(contacts);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  app.get('/api/chat-groups', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const groups = await storage.getChatGroups();
      res.json(groups);
    } catch (error) {
      console.error('Failed to fetch chat groups:', error);
      res.status(500).json({ error: 'Failed to fetch chat groups' });
    }
  });

  app.get('/api/chat-groups/user/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const groups = await storage.getChatGroupsByUser(userId);
      res.json(groups);
    } catch (error) {
      console.error('Failed to fetch user chat groups:', error);
      res.status(500).json({ error: 'Failed to fetch user chat groups' });
    }
  });

  app.post('/api/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requestData = {
        ...req.body,
        senderId: req.user!.id,
        sentAt: new Date()
      };
      
      const messageData = insertMessageSchema.parse(requestData);
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      res.status(400).json({ error: 'Failed to send message' });
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

  app.put('/api/messages/mark-read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { messageIds } = req.body;
      
      if (!Array.isArray(messageIds)) {
        return res.status(400).json({ error: 'messageIds must be an array' });
      }

      for (const messageId of messageIds) {
        await storage.markMessageAsRead(messageId, req.user!.id);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  });

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

  // Announcements API
  app.get('/api/announcements', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const announcements = await storage.getAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  });

  app.post('/api/announcements', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requestData = {
        ...req.body,
        createdBy: req.user!.id,
        createdAt: new Date()
      };
      
      const announcementData = insertAnnouncementSchema.parse(requestData);
      const announcement = await storage.createAnnouncement(announcementData);
      res.status(201).json(announcement);
    } catch (error) {
      console.error('Failed to create announcement:', error);
      res.status(400).json({ error: 'Failed to create announcement' });
    }
  });

  // Assignments API
  app.get('/api/assignments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const assignments = await storage.getAssignments();
      res.json(assignments);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  });

  app.post('/api/assignments', requireAuth, requireRole(['admin', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requestData = {
        ...req.body,
        assignedBy: req.user!.id,
        createdBy: req.user!.id,
        createdAt: new Date()
      };
      
      const assignmentData = insertAssignmentSchema.parse(requestData);
      const assignment = await storage.createAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Failed to create assignment:', error);
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
      console.error('Failed to update assignment:', error);
      res.status(400).json({ error: 'Failed to update assignment' });
    }
  });

  // Hiring Requests API
  app.get('/api/hiring-requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hiringRequests = await storage.getHiringRequests();
      res.json(hiringRequests);
    } catch (error) {
      console.error('Failed to fetch hiring requests:', error);
      res.status(500).json({ error: 'Failed to fetch hiring requests' });
    }
  });

  app.post('/api/hiring-requests', requireAuth, requireRole(['admin', 'hr', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requestData = {
        ...req.body,
        requestedBy: req.user!.id,
        createdAt: new Date(),
        status: 'open'
      };
      
      const hiringData = insertHiringRequestSchema.parse(requestData);
      const hiringRequest = await storage.createHiringRequest(hiringData);
      res.status(201).json(hiringRequest);
    } catch (error) {
      console.error('Failed to create hiring request:', error);
      res.status(400).json({ error: 'Failed to create hiring request' });
    }
  });

  // Time-off Requests API
  app.get('/api/timeoffs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const timeoffs = await storage.getTimeoffs();
      res.json(timeoffs);
    } catch (error) {
      console.error('Failed to fetch time-offs:', error);
      res.status(500).json({ error: 'Failed to fetch time-offs' });
    }
  });

  app.get('/api/timeoffs/user/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (req.user!.id !== userId && !['admin', 'hr'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const timeoffs = await storage.getTimeoffsByUser(userId);
      res.json(timeoffs);
    } catch (error) {
      console.error('Failed to fetch user time-offs:', error);
      res.status(500).json({ error: 'Failed to fetch user time-offs' });
    }
  });

  app.post('/api/timeoffs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requestData = {
        ...req.body,
        userId: req.user!.id,
        createdAt: new Date(),
        status: 'pending'
      };
      
      const timeoffData = insertTimeoffSchema.parse(requestData);
      const timeoff = await storage.createTimeoff(timeoffData);
      res.status(201).json(timeoff);
    } catch (error) {
      console.error('Failed to create time-off request:', error);
      res.status(400).json({ error: 'Failed to create time-off request' });
    }
  });

  // Dashboard Metrics API
  app.get("/api/dashboard/metrics", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
  });

  // Database seeding endpoint (admin only)
  app.post("/api/admin/seed-database", requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { seedDatabase } = await import('./seed-data');
      const result = await seedDatabase();
      res.json({ 
        success: true, 
        message: 'Database seeded successfully',
        data: result
      });
    } catch (error) {
      console.error('Failed to seed database:', error);
      res.status(500).json({ error: 'Failed to seed database' });
    }
  });

  return server;
}
import express, { Express, Request, Response, NextFunction } from "express";
import { 
  authenticateUser, 
  createUser, 
  requireAuth, 
  requireRole, 
  authMiddleware,
  getUserById,
  getUserByUsername
} from "./mongodb-auth";
import { 
  User, 
  Attendance, 
  LeaveRequest, 
  Message, 
  Announcement, 
  Project, 
  HourAllocation,
  loginValidationSchema,
  registerValidationSchema,
  leaveRequestValidationSchema,
  projectValidationSchema,
  hourAllocationValidationSchema
} from "../shared/mongodb-schema";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export function registerRoutes(app: Express): void {
  // Apply auth middleware globally
  app.use(authMiddleware);

  // Authentication Routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = loginValidationSchema.parse(req.body);
      
      const user = await authenticateUser(username, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set user session
      req.session.user = user;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ 
        message: "Login successful", 
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
          position: user.position,
          profilePicture: user.profilePicture
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie('hrms.sid');
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ 
      user: {
        id: req.user.id,
        username: req.user.username,
        fullName: req.user.fullName,
        role: req.user.role,
        department: req.user.department,
        position: req.user.position,
        profilePicture: req.user.profilePicture,
        email: req.user.email,
        phone: req.user.phone
      }
    });
  });

  // User Management Routes (Admin only)
  app.post("/api/users", requireAuth, requireRole(['admin', 'hr']), async (req: Request, res: Response) => {
    try {
      const userData = registerValidationSchema.parse(req.body);
      const user = await createUser(userData);
      res.json({ message: "User created successfully", user });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create user" });
    }
  });

  app.get("/api/users", requireAuth, requireRole(['admin', 'hr']), async (req: Request, res: Response) => {
    try {
      const users = await User.find({ isActive: true }).select('-password');
      const formattedUsers = users.map(user => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        position: user.position,
        profilePicture: user.profilePicture,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt
      }));
      res.json(formattedUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Dashboard Statistics
  app.get("/api/dashboard/stats", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const totalEmployees = await User.countDocuments({ role: { $ne: 'admin' }, isActive: true });
      const presentToday = await Attendance.countDocuments({ 
        date: { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999))
        },
        status: 'present'
      });
      
      const pendingLeaves = await LeaveRequest.countDocuments({ status: 'pending' });
      const activeProjects = await Project.countDocuments({ status: 'active' });

      res.json({
        totalEmployees,
        presentToday,
        absentToday: totalEmployees - presentToday,
        pendingLeaves,
        activeProjects
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // Attendance Routes
  app.post("/api/attendance/checkin", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if already checked in today
      const existingAttendance = await Attendance.findOne({
        userId,
        date: {
          $gte: today,
          $lte: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      if (existingAttendance && existingAttendance.checkIn) {
        return res.status(400).json({ error: "Already checked in today" });
      }

      const checkInTime = new Date();
      const attendance = new Attendance({
        userId,
        checkIn: checkInTime,
        date: today,
        status: 'present',
        checkInLatitude: req.body.latitude,
        checkInLongitude: req.body.longitude,
        checkInLocation: req.body.location,
        checkInNotes: req.body.notes
      });

      await attendance.save();
      res.json({ message: "Checked in successfully", attendance });
    } catch (error) {
      console.error("Check-in error:", error);
      res.status(500).json({ error: "Failed to check in" });
    }
  });

  app.post("/api/attendance/checkout", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const attendance = await Attendance.findOne({
        userId,
        date: {
          $gte: today,
          $lte: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        checkIn: { $exists: true },
        checkOut: { $exists: false }
      });

      if (!attendance) {
        return res.status(400).json({ error: "No check-in found for today" });
      }

      const checkOutTime = new Date();
      const workingHours = (checkOutTime.getTime() - attendance.checkIn!.getTime()) / (1000 * 60 * 60);
      const overtimeHours = Math.max(0, workingHours - 8);

      attendance.checkOut = checkOutTime;
      attendance.workingHours = Math.round(workingHours * 100) / 100;
      attendance.overtimeHours = Math.round(overtimeHours * 100) / 100;
      attendance.checkOutLatitude = req.body.latitude;
      attendance.checkOutLongitude = req.body.longitude;
      attendance.checkOutLocation = req.body.location;
      attendance.checkOutNotes = req.body.notes;

      await attendance.save();
      res.json({ message: "Checked out successfully", attendance });
    } catch (error) {
      console.error("Check-out error:", error);
      res.status(500).json({ error: "Failed to check out" });
    }
  });

  // Get today's attendance status for current user
  app.get("/api/attendance/today", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const attendance = await Attendance.findOne({
        userId,
        date: {
          $gte: today,
          $lte: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      res.json({ attendance });
    } catch (error) {
      console.error("Get today attendance error:", error);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  // Get user's attendance history
  app.get("/api/attendance/history", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const attendance = await Attendance.find({ userId })
        .sort({ date: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const totalCount = await Attendance.countDocuments({ userId });
      
      res.json({
        attendance,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        totalCount
      });
    } catch (error) {
      console.error("Get attendance history error:", error);
      res.status(500).json({ error: "Failed to fetch attendance history" });
    }
  });

  // Project Routes (NEW)
  app.get("/api/projects", requireAuth, async (req: Request, res: Response) => {
    try {
      const projects = await Project.find({ status: { $ne: 'cancelled' } })
        .populate('managerId teamMembers', 'fullName username')
        .sort({ createdAt: -1 });
      
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", requireAuth, requireRole(['admin', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectData = projectValidationSchema.parse(req.body);
      
      const project = new Project({
        ...projectData,
        createdBy: req.user.id,
        startDate: new Date(projectData.startDate),
        endDate: projectData.endDate ? new Date(projectData.endDate) : undefined
      });

      await project.save();
      await project.populate('managerId teamMembers', 'fullName username');
      
      res.json({ message: "Project created successfully", project });
    } catch (error) {
      console.error("Create project error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create project" });
    }
  });

  // Hour Allocation Routes (NEW)
  app.post("/api/hours/allocate", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allocationData = hourAllocationValidationSchema.parse(req.body);
      
      const allocation = new HourAllocation({
        ...allocationData,
        userId: req.user.id,
        date: new Date(allocationData.date)
      });

      await allocation.save();
      await allocation.populate('projectId', 'name');
      
      res.json({ message: "Hours allocated successfully", allocation });
    } catch (error) {
      console.error("Allocate hours error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to allocate hours" });
    }
  });

  // Get user's hour allocations
  app.get("/api/hours/my-allocations", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const allocations = await HourAllocation.find({ userId })
        .populate('projectId', 'name')
        .sort({ date: -1 });
      
      res.json(allocations);
    } catch (error) {
      console.error("Get allocations error:", error);
      res.status(500).json({ error: "Failed to fetch hour allocations" });
    }
  });

  // Leave Request Routes
  app.post("/api/leave-requests", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const leaveData = leaveRequestValidationSchema.parse(req.body);
      
      const leaveRequest = new LeaveRequest({
        ...leaveData,
        userId: req.user.id,
        startDate: new Date(leaveData.startDate),
        endDate: new Date(leaveData.endDate)
      });

      await leaveRequest.save();
      res.json({ message: "Leave request submitted successfully", leaveRequest });
    } catch (error) {
      console.error("Create leave request error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to submit leave request" });
    }
  });

  app.get("/api/leave-requests", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const leaveRequests = await LeaveRequest.find({ userId }).sort({ submittedAt: -1 });
      res.json(leaveRequests);
    } catch (error) {
      console.error("Get leave requests error:", error);
      res.status(500).json({ error: "Failed to fetch leave requests" });
    }
  });

  // Announcements
  app.get("/api/announcements", requireAuth, async (req: Request, res: Response) => {
    try {
      const announcements = await Announcement.find({ isActive: true })
        .populate('createdBy', 'fullName')
        .sort({ createdAt: -1 })
        .limit(10);
      
      res.json(announcements);
    } catch (error) {
      console.error("Get announcements error:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });
}
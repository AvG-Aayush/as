import { User, Attendance, LeaveRequest, Announcement } from "../shared/mongodb-schema";
import bcrypt from "bcrypt";

export async function initializeSampleData() {
  try {
    console.log("Checking for existing sample data...");

    // Check if we already have sample employees (more than just admin)
    const existingUsers = await User.find();
    const nonAdminUsers = existingUsers.filter(u => u.role !== 'admin');
    
    if (nonAdminUsers.length > 0) {
      console.log("Sample data already exists");
      return { success: true, message: "Sample data already exists" };
    }

    console.log("Creating sample employees...");
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    // Create sample employees
    const sampleEmployees = [
      {
        username: "john.doe",
        email: "john@company.com", 
        fullName: "John Doe",
        password: hashedPassword,
        role: "employee",
        department: "Engineering",
        position: "Software Developer",
        isActive: true,
      },
      {
        username: "jane.smith",
        email: "jane@company.com",
        fullName: "Jane Smith", 
        password: hashedPassword,
        role: "hr",
        department: "Human Resources",
        position: "HR Manager",
        isActive: true,
      },
      {
        username: "mike.johnson",
        email: "mike@company.com",
        fullName: "Mike Johnson",
        password: hashedPassword,
        role: "employee",
        department: "Marketing",
        position: "Marketing Specialist",
        isActive: true,
      },
      {
        username: "sarah.wilson",
        email: "sarah@company.com",
        fullName: "Sarah Wilson",
        password: hashedPassword,
        role: "manager",
        department: "Sales",
        position: "Sales Manager",
        isActive: true,
      },
      {
        username: "david.brown",
        email: "david@company.com",
        fullName: "David Brown",
        password: hashedPassword,
        role: "employee",
        department: "Finance",
        position: "Financial Analyst",
        isActive: true,
      },
      {
        username: "lisa.garcia",
        email: "lisa@company.com",
        fullName: "Lisa Garcia",
        password: hashedPassword,
        role: "employee",
        department: "Operations",
        position: "Operations Coordinator",
        isActive: true,
      }
    ];

    const insertedUsers = await User.insertMany(sampleEmployees);
    console.log(`Created ${insertedUsers.length} sample employees`);

    // Create attendance records for the past 7 days
    const attendanceRecords = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      for (const user of insertedUsers) {
        // 90% attendance rate
        const isPresent = Math.random() > 0.1;
        
        if (isPresent) {
          const checkInHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM
          const checkInMinute = Math.floor(Math.random() * 60);
          const checkIn = new Date(date);
          checkIn.setHours(checkInHour, checkInMinute, 0, 0);
          
          const checkOutHour = 17 + Math.floor(Math.random() * 2); // 5-6 PM
          const checkOutMinute = Math.floor(Math.random() * 60);
          const checkOut = new Date(date);
          checkOut.setHours(checkOutHour, checkOutMinute, 0, 0);
          
          const workingHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          const overtimeHours = Math.max(0, workingHours - 8);
          
          attendanceRecords.push({
            userId: user._id,
            date,
            checkIn,
            checkOut,
            status: "present",
            workingHours: Math.round(workingHours * 100) / 100,
            overtimeHours: Math.round(overtimeHours * 100) / 100,
            checkInLocation: "Office Main Building",
            checkOutLocation: "Office Main Building"
          });
        }
      }
    }
    
    if (attendanceRecords.length > 0) {
      await Attendance.insertMany(attendanceRecords);
      console.log(`Created ${attendanceRecords.length} attendance records`);
    }

    // Create some leave requests
    const leaveRequestsData = [
      {
        userId: insertedUsers[0]._id, // John Doe
        type: "vacation",
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        reason: "Family vacation",
        status: "pending",
        submittedAt: new Date()
      },
      {
        userId: insertedUsers[2]._id, // Mike Johnson
        type: "sick",
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        reason: "Medical appointment",
        status: "pending",
        submittedAt: new Date()
      }
    ];

    await LeaveRequest.insertMany(leaveRequestsData);
    console.log(`Created ${leaveRequestsData.length} leave requests`);

    // Get admin user for announcements
    const adminUser = await User.findOne({ role: 'admin' });

    // Create announcements
    const announcementsData = [
      {
        title: "Company All-Hands Meeting",
        content: "Join us for our quarterly all-hands meeting this Friday at 2 PM in the main conference room.",
        createdBy: adminUser!._id,
        priority: "high",
      },
      {
        title: "New Employee Benefits",
        content: "We're excited to announce enhanced health benefits starting next month. Check your email for details.",
        createdBy: insertedUsers[1]._id, // HR Manager
        priority: "medium",
      }
    ];

    await Announcement.insertMany(announcementsData);
    console.log(`Created ${announcementsData.length} announcements`);

    console.log("Sample data initialization completed successfully!");
    
    return {
      success: true,
      message: "Sample data created successfully",
      data: {
        users: insertedUsers.length,
        attendance: attendanceRecords.length,
        leaveRequests: leaveRequestsData.length,
        announcements: announcementsData.length
      }
    };

  } catch (error) {
    console.error("Error initializing sample data:", error);
    throw error;
  }
}
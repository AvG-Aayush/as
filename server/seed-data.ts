import { db } from "./db";
import { users, attendance, leaveRequests, announcements, timeoffs, overtimeRequests } from "../shared/schema";
import bcrypt from "bcrypt";

export async function seedDatabase() {
  try {
    console.log("Seeding database with sample data...");

    // Create sample users
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const sampleUsers = [
      {
        username: "admin",
        email: "admin@company.com",
        fullName: "System Administrator",
        password: hashedPassword,
        role: "admin" as const,
        department: "IT",
        position: "Administrator",
        isActive: true,
      },
      {
        username: "john.doe",
        email: "john@company.com", 
        fullName: "John Doe",
        password: hashedPassword,
        role: "employee" as const,
        department: "Engineering",
        position: "Software Developer",
        isActive: true,
      },
      {
        username: "jane.smith",
        email: "jane@company.com",
        fullName: "Jane Smith", 
        password: hashedPassword,
        role: "hr" as const,
        department: "Human Resources",
        position: "HR Manager",
        isActive: true,
      },
      {
        username: "mike.johnson",
        email: "mike@company.com",
        fullName: "Mike Johnson",
        password: hashedPassword,
        role: "employee" as const,
        department: "Marketing",
        position: "Marketing Specialist",
        isActive: true,
      },
      {
        username: "sarah.wilson",
        email: "sarah@company.com",
        fullName: "Sarah Wilson",
        password: hashedPassword,
        role: "manager" as const,
        department: "Sales",
        position: "Sales Manager",
        isActive: true,
      },
      {
        username: "david.brown",
        email: "david@company.com",
        fullName: "David Brown",
        password: hashedPassword,
        role: "employee" as const,
        department: "Finance",
        position: "Financial Analyst",
        isActive: true,
      }
    ];

    // Insert users and get their IDs
    const insertedUsers = await db.insert(users).values(sampleUsers).returning();
    console.log(`Created ${insertedUsers.length} users`);

    // Create attendance records for the past 7 days
    const attendanceRecords = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      // Create attendance for each employee (skip admin)
      const employees = insertedUsers.filter(u => u.role === 'employee' || u.role === 'manager');
      
      for (const user of employees) {
        // 85% chance of being present
        const isPresent = Math.random() > 0.15;
        
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
            userId: user.id,
            date,
            checkIn,
            checkOut,
            status: "completed" as const,
            workingHours: Math.round(workingHours * 100) / 100,
            overtimeHours: Math.round(overtimeHours * 100) / 100,
            checkInLocation: "Office",
            checkOutLocation: "Office"
          });
        }
      }
    }
    
    if (attendanceRecords.length > 0) {
      await db.insert(attendance).values(attendanceRecords);
      console.log(`Created ${attendanceRecords.length} attendance records`);
    }

    // Create some leave requests
    const leaveRequestsData = [
      {
        userId: insertedUsers[1].id, // John Doe
        type: "vacation",
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        reason: "Family vacation",
        status: "pending" as const,
        submittedAt: new Date()
      },
      {
        userId: insertedUsers[3].id, // Mike Johnson
        type: "sick",
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        reason: "Medical appointment",
        status: "pending" as const,
        submittedAt: new Date()
      }
    ];

    await db.insert(leaveRequests).values(leaveRequestsData);
    console.log(`Created ${leaveRequestsData.length} leave requests`);

    // Create announcements
    const announcementsData = [
      {
        title: "Company Meeting",
        content: "All-hands meeting scheduled for next Friday at 2 PM.",
        createdBy: insertedUsers[0].id, // Admin
        priority: "high",
        targetAudience: "all",
        createdAt: new Date()
      },
      {
        title: "New HR Policies",
        content: "Updated employee handbook is now available on the portal.",
        createdBy: insertedUsers[2].id, // HR
        priority: "medium",
        targetAudience: "all",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      }
    ];

    await db.insert(announcements).values(announcementsData);
    console.log(`Created ${announcementsData.length} announcements`);

    // Create some timeoff requests
    const timeoffData = [
      {
        userId: insertedUsers[5].id, // David Brown
        type: "personal",
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
        days: 3,
        reason: "Personal time",
        status: "pending" as const,
        createdAt: new Date()
      }
    ];

    await db.insert(timeoffs).values(timeoffData);
    console.log(`Created ${timeoffData.length} timeoff requests`);

    // Create overtime requests
    const overtimeData = [
      {
        userId: insertedUsers[1].id, // John Doe
        requestedDate: new Date(),
        startTime: "09:00",
        endTime: "12:00",
        hours: 3,
        workDescription: "Project deadline completion",
        reason: "Project deadline",
        status: "pending" as const,
        submittedAt: new Date()
      }
    ];

    await db.insert(overtimeRequests).values(overtimeData);
    console.log(`Created ${overtimeData.length} overtime requests`);

    console.log("Database seeding completed successfully!");
    
    return {
      users: insertedUsers.length,
      attendance: attendanceRecords.length,
      leaveRequests: leaveRequestsData.length,
      announcements: announcementsData.length,
      timeoffs: timeoffData.length,
      overtime: overtimeData.length
    };

  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedAttendanceTracker from "@/components/attendance/EnhancedAttendanceTracker";
import AttendanceManagement from "@/components/admin/AttendanceManagement";
import MonthlyAttendanceHistory from "@/components/attendance/MonthlyAttendanceHistory";
import { Shield, Clock, BarChart3 } from "lucide-react";

interface User {
  id: number;
  role: string;
  fullName: string;
}

export default function EnhancedAttendancePage() {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'hr';

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Enhanced Attendance System</h1>
        <p className="text-muted-foreground">
          Automatic time tracking with midnight reset and admin controls
        </p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="tracker" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tracker" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              My Attendance
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Manage All Attendance
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Monthly Reports
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tracker">
            <EnhancedAttendanceTracker />
          </TabsContent>
          
          <TabsContent value="management">
            <AttendanceManagement />
          </TabsContent>
          
          <TabsContent value="monthly">
            <MonthlyAttendanceHistory />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="tracker" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tracker" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              My Attendance
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              My Monthly Report
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tracker">
            <EnhancedAttendanceTracker />
          </TabsContent>
          
          <TabsContent value="monthly">
            <MonthlyAttendanceHistory />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { WebSocketProvider } from "@/contexts/websocket-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Updates from "@/pages/updates";
import Onboarding from "@/pages/onboarding";

import AttendancePage from "@/pages/attendance";
import RealtimeAttendance from "@/pages/realtime-attendance";
import AttendanceNew from "@/pages/attendance-new";
import HighTechAttendance from "@/pages/high-tech-attendance";
import LeaveManagement from "@/pages/leave-management";
import ShiftScheduling from "@/pages/shift-scheduling";
import Messages from "@/pages/messages";
import AIInsights from "@/pages/ai-insights";
import RoleManagement from "@/pages/role-management";
import HRForms from "@/pages/hr-forms";

import RequestForms from "@/pages/request-forms";

import AdminRequests from "@/pages/admin-requests";
import Profile from "@/pages/profile";
import SimpleProfile from "@/pages/simple-profile";
import AttendanceHistory from "@/pages/attendance-history";
import AdminAttendancePage from "@/pages/admin-attendance";

import Employees from "@/pages/employees";
import PersonalRoutine from "@/pages/personal-routine";
import AdminCalendar from "@/pages/admin-calendar";
import EnhancedProfile from "@/pages/enhanced-profile";
import SimpleLoginPage from "@/pages/simple-login";
import AddCalendarEvent from "@/pages/add-calendar-event";
import AddShift from "@/pages/add-shift";
import AddRoutine from "@/pages/add-routine";

import Layout from "@/components/layout/sidebar";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <SimpleLoginPage />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={SimpleLoginPage} />
      <Route path="/updates">
        <ProtectedRoute component={() => (
          <Layout>
            <Updates />
          </Layout>
        )} />
      </Route>

      <Route path="/onboarding">
        <ProtectedRoute component={() => (
          <Layout>
            <Onboarding />
          </Layout>
        )} />
      </Route>
      <Route path="/attendance">
        <ProtectedRoute component={() => (
          <Layout>
            <AttendancePage />
          </Layout>
        )} />
      </Route>
      
      <Route path="/realtime-attendance">
        <ProtectedRoute component={() => (
          <Layout>
            <RealtimeAttendance />
          </Layout>
        )} />
      </Route>
      
      <Route path="/attendance-new">
        <ProtectedRoute component={() => (
          <Layout>
            <AttendanceNew />
          </Layout>
        )} />
      </Route>
      
      <Route path="/high-tech-attendance">
        <ProtectedRoute component={() => (
          <Layout>
            <HighTechAttendance />
          </Layout>
        )} />
      </Route>

      <Route path="/shift-scheduling">
        <ProtectedRoute component={() => (
          <Layout>
            <ShiftScheduling />
          </Layout>
        )} />
      </Route>

      <Route path="/messages">
        <ProtectedRoute component={() => (
          <Layout>
            <Messages />
          </Layout>
        )} />
      </Route>
      <Route path="/ai-insights">
        <ProtectedRoute component={() => (
          <Layout>
            <AIInsights />
          </Layout>
        )} />
      </Route>
      <Route path="/role-management">
        <ProtectedRoute component={() => (
          <Layout>
            <RoleManagement />
          </Layout>
        )} />
      </Route>
      <Route path="/hr-forms">
        <ProtectedRoute component={() => (
          <Layout>
            <HRForms />
          </Layout>
        )} />
      </Route>
      <Route path="/request-forms">
        <ProtectedRoute component={() => (
          <Layout>
            <RequestForms />
          </Layout>
        )} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={() => (
          <Layout>
            <SimpleProfile />
          </Layout>
        )} />
      </Route>
      <Route path="/attendance-history">
        <ProtectedRoute component={() => (
          <Layout>
            <AttendanceHistory />
          </Layout>
        )} />
      </Route>
      
      <Route path="/admin-attendance">
        <ProtectedRoute component={() => (
          <Layout>
            <AdminAttendancePage />
          </Layout>
        )} />
      </Route>

      <Route path="/employees">
        <ProtectedRoute component={() => (
          <Layout>
            <Employees />
          </Layout>
        )} />
      </Route>
      <Route path="/personal-routine">
        <ProtectedRoute component={() => (
          <Layout>
            <PersonalRoutine />
          </Layout>
        )} />
      </Route>
      <Route path="/admin-calendar">
        <ProtectedRoute component={() => (
          <Layout>
            <AdminCalendar />
          </Layout>
        )} />
      </Route>

      <Route path="/add-calendar-event">
        <ProtectedRoute component={() => (
          <Layout>
            <AddCalendarEvent />
          </Layout>
        )} />
      </Route>

      <Route path="/add-shift">
        <ProtectedRoute component={() => (
          <Layout>
            <AddShift />
          </Layout>
        )} />
      </Route>

      <Route path="/add-routine">
        <ProtectedRoute component={() => (
          <Layout>
            <AddRoutine />
          </Layout>
        )} />
      </Route>

      <Route path="/admin-requests">
        <ProtectedRoute component={() => (
          <Layout>
            <AdminRequests />
          </Layout>
        )} />
      </Route>

      <Route path="/">
        <ProtectedRoute component={() => (
          <Layout>
            <Dashboard />
          </Layout>
        )} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WebSocketProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

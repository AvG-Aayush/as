import { UserPlus, Clock, ClipboardCheck, BarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "wouter";

export default function QuickActions() {
  const { user } = useAuth();

  const actions = [
    {
      title: "Add New Employee",
      description: "Start onboarding process",
      icon: UserPlus,
      bgColor: "primary-bg-50 hover:bg-primary-100 dark:bg-primary-900 dark:hover:bg-primary-800",
      iconBg: "primary-bg",
      iconColor: "text-white",
      textColor: "primary-text-700 dark:text-primary-400",
      subtextColor: "primary-text-600 dark:text-primary-500",
      href: "/onboarding",
      adminOnly: true,
    },
    {
      title: "Track Attendance",
      description: "Check in/out and view hours",
      icon: Clock,
      bgColor: "bg-green-50 hover:bg-green-100 dark:bg-green-900 dark:hover:bg-green-800",
      iconBg: "bg-green-500",
      iconColor: "text-white",
      textColor: "text-green-700 dark:text-green-400",
      subtextColor: "text-green-600 dark:text-green-500",
      href: "/attendance",
      adminOnly: false,
    },
    {
      title: "Review Leave Requests",
      description: "Pending approvals",
      icon: ClipboardCheck,
      bgColor: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-900 dark:hover:bg-orange-800",
      iconBg: "bg-orange-500",
      iconColor: "text-white",
      textColor: "text-orange-700 dark:text-orange-400",
      subtextColor: "text-orange-600 dark:text-orange-500",
      href: "/leave-management",
      hrOnly: true,
    },
    {
      title: "AI Report Summary",
      description: "Generate insights",
      icon: BarChart,
      bgColor: "bg-purple-50 hover:bg-purple-100 dark:bg-purple-900 dark:hover:bg-purple-800",
      iconBg: "bg-purple-500",
      iconColor: "text-white",
      textColor: "text-purple-700 dark:text-purple-400",
      subtextColor: "text-purple-600 dark:text-purple-500",
      href: "/ai-insights",
      hrOnly: true,
    },
  ];

  const filteredActions = actions.filter(action => {
    if (action.adminOnly && user?.role !== 'admin') return false;
    if (action.hrOnly && !['admin', 'hr'].includes(user?.role || '')) return false;
    return true;
  });

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <Button
                  variant="ghost"
                  className={`w-full flex items-center space-x-3 p-3 h-auto ${action.bgColor} transition-colors`}
                >
                  <div className={`w-10 h-10 ${action.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${action.iconColor}`} />
                  </div>
                  <div className="text-left flex-1">
                    <p className={`font-medium ${action.textColor}`}>
                      {action.title}
                    </p>
                    <p className={`text-sm ${action.subtextColor}`}>
                      {action.description}
                    </p>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Additional Actions */}
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">More Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/shift-scheduling">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Manage Shifts
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Team Chat
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

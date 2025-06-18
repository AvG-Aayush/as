import { useQuery } from "@tanstack/react-query";
import { Megaphone, Clock, Calendar, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import type { Announcement, User as UserType } from "@shared/schema";

export default function RecentAnnouncements() {
  const { user } = useAuth();

  // Get recent announcements
  const { data: announcements } = useQuery({
    queryKey: ['/api/announcements'],
  });

  // Get users for display names
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin' || user?.role === 'hr',
  });

  // Create user lookup map
  const userMap = new Map(users?.map((u: UserType) => [u.id, u]) || []);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return AlertCircle;
      case 'high':
        return Calendar;
      case 'normal':
        return Info;
      default:
        return Info;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const recentAnnouncements = announcements?.slice(0, 5) || [];

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    return time.toLocaleDateString();
  };

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Megaphone className="h-5 w-5" />
              <span>Announcements</span>
            </CardTitle>
            <CardDescription>
              Latest company announcements and updates
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="primary-text-600 hover:text-primary-700">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentAnnouncements.length === 0 ? (
          <div className="text-center py-8">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentAnnouncements.map((announcement: any) => {
              const Icon = getPriorityIcon(announcement.priority);
              const createdBy = userMap.get(announcement.createdBy);
              
              return (
                <div key={announcement.id} className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {announcement.title}
                      </p>
                      <Badge className={`text-xs ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      By {createdBy?.fullName || 'System'} • {formatTimeAgo(announcement.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

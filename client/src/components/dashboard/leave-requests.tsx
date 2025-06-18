import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Check, X, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import type { LeaveRequest, User as UserType } from "@shared/schema";

export default function LeaveRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get pending leave requests
  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['/api/leave-requests/pending'],
    enabled: user?.role === 'admin',
  });

  // Get users for display names
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin',
  });

  // Approve/Reject leave request mutation
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PUT', `/api/leave-requests/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave request",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (id: number) => {
    updateRequestMutation.mutate({ id, status: 'approved' });
    toast({
      title: "Success",
      description: "Leave request approved successfully!",
    });
  };

  const handleReject = (id: number) => {
    updateRequestMutation.mutate({ id, status: 'rejected' });
    toast({
      title: "Leave Rejected",
      description: "Leave request has been rejected.",
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Create user lookup map
  const userMap = new Map(users?.map((u: UserType) => [u.id, u]) || []);

  if (!user || user.role !== 'admin') {
    return (
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Leave Requests</span>
          </CardTitle>
          <CardDescription>
            Manage employee leave requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Leave request management is available for administrators only
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <span>Pending Leave Requests</span>
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                {pendingRequests?.length || 0} pending
              </Badge>
            </CardTitle>
            <CardDescription>
              Review and approve employee leave requests
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="primary-text-600 hover:text-primary-700">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : pendingRequests?.length === 0 ? (
          <div className="text-center py-8">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">No pending leave requests</p>
            <p className="text-sm text-muted-foreground mt-1">
              All leave requests have been reviewed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests?.slice(0, 3).map((request: LeaveRequest) => {
              const userInfo = userMap.get(request.userId);
              return (
                <div key={request.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="text-sm">
                          {userInfo?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {userInfo?.fullName || `Employee ID: ${request.userId}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {userInfo?.department} • {userInfo?.position}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">Type:</p>
                      <p className="text-muted-foreground capitalize">
                        {request.type.replace('_', ' ')} Leave
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Duration:</p>
                      <p className="text-muted-foreground">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        <span className="ml-1">
                          ({calculateDuration(request.startDate, request.endDate)} days)
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="font-medium text-foreground text-sm mb-1">Reason:</p>
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      {request.reason}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleApprove(request.id)}
                      disabled={updateRequestMutation.isPending}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(request.id)}
                      disabled={updateRequestMutation.isPending}
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                    >
                      <X className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
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

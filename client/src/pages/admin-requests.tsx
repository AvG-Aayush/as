import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Timer, 
  User,
  Building,
  MapPin,
  MessageSquare,
  Award,
  Loader2,
  FileText,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface PendingRequests {
  leaveRequests: any[];
  overtimeRequests: any[];
  timeoffRequests: any[];
}

export default function AdminRequestsPage() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [toilHoursAwarded, setToilHoursAwarded] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">This page is restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  // Fetch pending requests
  const { data: pendingRequests, isLoading, refetch } = useQuery<PendingRequests>({
    queryKey: ['/api/admin/pending-requests'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Approve request mutation
  const approveMutation = useMutation({
    mutationFn: async ({ requestType, id, data }: { requestType: string; id: number; data: any }) => {
      return apiRequest('PUT', `/api/admin/approve-${requestType}/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Request Approved",
        description: "The request has been successfully approved.",
      });
      refetch();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  // Reject request mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ requestType, id, data }: { requestType: string; id: number; data: any }) => {
      return apiRequest('PUT', `/api/admin/reject-${requestType}/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Request Rejected",
        description: "The request has been rejected.",
      });
      refetch();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedRequest(null);
    setApprovalNotes("");
    setRejectionReason("");
    setToilHoursAwarded("");
  };

  const handleApprove = (request: any, requestType: string) => {
    setSelectedRequest({ ...request, requestType });
    setActionType('approve');
    setIsDialogOpen(true);
  };

  const handleReject = (request: any, requestType: string) => {
    setSelectedRequest({ ...request, requestType });
    setActionType('reject');
    setIsDialogOpen(true);
  };

  const submitAction = () => {
    if (!selectedRequest) return;

    const requestType = selectedRequest.requestType;
    const id = selectedRequest.id;

    if (actionType === 'approve') {
      const data: any = { approvalNotes };
      if (requestType === 'overtime') {
        data.toilHoursAwarded = parseFloat(toilHoursAwarded) || 0;
      }
      approveMutation.mutate({ requestType, id, data });
    } else {
      rejectMutation.mutate({ 
        requestType, 
        id, 
        data: { rejectionReason } 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderLeaveRequest = (request: any) => (
    <Card key={request.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              {request.user?.profilePicture ? (
                <AvatarImage src={request.user.profilePicture} />
              ) : (
                <AvatarFallback>
                  {request.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h3 className="font-semibold">{request.user?.fullName || `User ID: ${request.userId}`}</h3>
              <p className="text-sm text-muted-foreground">
                {request.user?.department} • {request.user?.position}
              </p>
            </div>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(request.startDate), 'MMM dd, yyyy')} - {format(new Date(request.endDate), 'MMM dd, yyyy')}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <FileText className="h-4 w-4" />
            <span>Type: {request.type}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <MessageSquare className="h-4 w-4" />
            <span>{request.reason}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Submitted: {format(new Date(request.submittedAt), 'MMM dd, yyyy HH:mm')}</span>
          </div>
          
          {request.status === 'pending' && (
            <div className="flex gap-2 pt-3">
              <Button 
                size="sm" 
                onClick={() => handleApprove(request, 'leave')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => handleReject(request, 'leave')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderOvertimeRequest = (request: any) => (
    <Card key={request.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              {request.user?.profilePicture ? (
                <AvatarImage src={request.user.profilePicture} />
              ) : (
                <AvatarFallback>
                  {request.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h3 className="font-semibold">{request.user?.fullName || `User ID: ${request.userId}`}</h3>
              <p className="text-sm text-muted-foreground">
                {request.user?.department} • {request.user?.position}
              </p>
            </div>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(request.requestedDate), 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>{request.startTime} - {request.endTime} ({request.estimatedHours} hours)</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Timer className="h-4 w-4" />
            <span>Estimated Hours: {request.estimatedHours}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <MessageSquare className="h-4 w-4" />
            <span>{request.reason}</span>
          </div>
          {request.workDescription && (
            <div className="flex items-start space-x-2 text-sm">
              <FileText className="h-4 w-4 mt-0.5" />
              <span>{request.workDescription}</span>
            </div>
          )}
          <div className="flex gap-2">
            {request.isWeekend && <Badge variant="outline" className="text-blue-600">Weekend</Badge>}
            {request.isHoliday && <Badge variant="outline" className="text-purple-600">Holiday</Badge>}
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Submitted: {format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}</span>
          </div>
          
          {request.status === 'pending' && (
            <div className="flex gap-2 pt-3">
              <Button 
                size="sm" 
                onClick={() => handleApprove(request, 'overtime')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => handleReject(request, 'overtime')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderTimeoffRequest = (request: any) => (
    <Card key={request.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              {request.user?.profilePicture ? (
                <AvatarImage src={request.user.profilePicture} />
              ) : (
                <AvatarFallback>
                  {request.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h3 className="font-semibold">{request.user?.fullName || `User ID: ${request.userId}`}</h3>
              <p className="text-sm text-muted-foreground">
                {request.user?.department} • {request.user?.position}
              </p>
            </div>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(request.startDate), 'MMM dd, yyyy')} - {format(new Date(request.endDate), 'MMM dd, yyyy')}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <FileText className="h-4 w-4" />
            <span>Type: {request.type}</span>
          </div>
          {request.reason && (
            <div className="flex items-center space-x-2 text-sm">
              <MessageSquare className="h-4 w-4" />
              <span>{request.reason}</span>
            </div>
          )}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Submitted: {format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}</span>
          </div>
          
          {request.status === 'pending' && (
            <div className="flex gap-2 pt-3">
              <Button 
                size="sm" 
                onClick={() => handleApprove(request, 'timeoff')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => handleReject(request, 'timeoff')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalPendingRequests = 
    (pendingRequests?.leaveRequests?.length || 0) +
    (pendingRequests?.overtimeRequests?.length || 0) +
    (pendingRequests?.timeoffRequests?.length || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Request Management</h1>
          <p className="text-muted-foreground">
            Manage all pending employee requests for leave, overtime, and TOIL
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {totalPendingRequests} Pending
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="leave" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leave" className="relative">
            Leave Requests
            {(pendingRequests?.leaveRequests?.length || 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {pendingRequests?.leaveRequests?.length || 0}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overtime" className="relative">
            Overtime Requests
            {(pendingRequests?.overtimeRequests?.length || 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {pendingRequests?.overtimeRequests?.length || 0}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeoff" className="relative">
            TOIL Requests
            {(pendingRequests?.timeoffRequests?.length || 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {pendingRequests?.timeoffRequests?.length || 0}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Leave Requests</span>
              </CardTitle>
              <CardDescription>
                Review and approve employee leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests?.leaveRequests?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending leave requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests?.leaveRequests?.map(renderLeaveRequest)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overtime" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Timer className="h-5 w-5" />
                <span>Overtime Requests</span>
              </CardTitle>
              <CardDescription>
                Review and approve overtime work requests with TOIL awards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests?.overtimeRequests?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending overtime requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests?.overtimeRequests?.map(renderOvertimeRequest)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeoff" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>TOIL Requests</span>
              </CardTitle>
              <CardDescription>
                Review and approve TOIL (Time Off In Lieu) requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests?.timeoffRequests?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending TOIL requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests?.timeoffRequests?.map(renderTimeoffRequest)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval/Rejection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  {actionType === 'approve' ? 'Approve' : 'Reject'} this {selectedRequest.requestType} request 
                  from {selectedRequest.user?.fullName || `User ID: ${selectedRequest.userId}`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {actionType === 'approve' ? (
              <>
                <div>
                  <Label htmlFor="approvalNotes">Approval Notes (Optional)</Label>
                  <Textarea
                    id="approvalNotes"
                    placeholder="Add any notes for this approval..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                  />
                </div>
                {selectedRequest?.requestType === 'overtime' && (
                  <div>
                    <Label htmlFor="toilHours">TOIL Hours to Award</Label>
                    <Input
                      id="toilHours"
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="Enter TOIL hours (e.g. 2.5)"
                      value={toilHoursAwarded}
                      onChange={(e) => setToilHoursAwarded(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Recommended: {selectedRequest?.estimatedHours || 0} hours based on overtime request
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div>
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Please provide a reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitAction}
              disabled={approveMutation.isPending || rejectMutation.isPending || (actionType === 'reject' && !rejectionReason.trim())}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {(approveMutation.isPending || rejectMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
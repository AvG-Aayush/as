import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ToilBalance {
  totalHours: number;
  expiringHours: number;
  expiringDate: Date | null;
}

interface ToilManagementProps {
  userId: number;
  isAdmin?: boolean;
}

export function ToilManagement({ userId, isAdmin = false }: ToilManagementProps) {
  const [hoursToUse, setHoursToUse] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: toilBalance, isLoading } = useQuery<ToilBalance>({
    queryKey: ['/api/toil/balance', userId],
    queryFn: async () => {
      const response = await fetch(`/api/toil/balance/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch TOIL balance');
      return response.json();
    }
  });

  const useToilMutation = useMutation({
    mutationFn: async (hours: number) => {
      const response = await fetch('/api/toil/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hoursToUse: hours })
      });
      if (!response.ok) throw new Error('Failed to use TOIL hours');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "TOIL Used Successfully",
        description: `${hoursToUse} hours of TOIL have been used for time off.`
      });
      setHoursToUse('');
      queryClient.invalidateQueries({ queryKey: ['/api/toil/balance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Using TOIL",
        description: error.message || "Failed to use TOIL hours",
        variant: "destructive"
      });
    }
  });

  const handleUseToil = () => {
    const hours = parseFloat(hoursToUse);
    if (isNaN(hours) || hours <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number of hours",
        variant: "destructive"
      });
      return;
    }

    if (toilBalance && hours > toilBalance.totalHours) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough TOIL hours available",
        variant: "destructive"
      });
      return;
    }

    useToilMutation.mutate(hours);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getDaysUntilExpiry = (date: Date | null) => {
    if (!date) return null;
    const now = new Date();
    const expiry = new Date(date);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading TOIL balance...</div>
        </CardContent>
      </Card>
    );
  }

  const daysUntilExpiry = toilBalance?.expiringDate ? getDaysUntilExpiry(toilBalance.expiringDate) : null;

  return (
    <div className="space-y-6">
      {/* TOIL Balance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            TOIL Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {toilBalance?.totalHours.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Total Hours Available
              </div>
            </div>

            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {toilBalance?.expiringHours.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Expiring Soon
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.floor((toilBalance?.totalHours || 0) / 8)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Full Days Available
              </div>
            </div>
          </div>

          {/* Expiry Warning */}
          {toilBalance?.expiringHours && toilBalance.expiringHours > 0 && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  TOIL Expiring Soon
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-300">
                  {toilBalance.expiringHours.toFixed(1)} hours expire on {formatDate(toilBalance.expiringDate)}
                  {daysUntilExpiry && daysUntilExpiry > 0 && ` (${daysUntilExpiry} days remaining)`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Use TOIL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Use TOIL Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hours to Use</label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max={toilBalance?.totalHours || 0}
              value={hoursToUse}
              onChange={(e) => setHoursToUse(e.target.value)}
              placeholder="Enter hours (e.g., 8 for full day)"
            />
            <p className="text-xs text-gray-500">
              8 hours = 1 full day, 4 hours = half day
            </p>
          </div>

          <Button
            onClick={handleUseToil}
            disabled={!hoursToUse || useToilMutation.isPending || (toilBalance?.totalHours || 0) === 0}
            className="w-full"
          >
            {useToilMutation.isPending ? "Processing..." : "Use TOIL Hours"}
          </Button>
        </CardContent>
      </Card>

      {/* TOIL Information */}
      <Card>
        <CardHeader>
          <CardTitle>How TOIL Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Earning TOIL</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Work overtime (>8 hours/day) or on weekends/holidays to earn TOIL hours
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Using TOIL</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Use TOIL hours for time off instead of regular leave days
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Expiry Policy</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                TOIL hours expire 21 days after they are earned
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
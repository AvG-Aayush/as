import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, TrendingUp, Users, Calendar, FileText, Sparkles, Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import type { AiInsight } from "@shared/schema";

export default function AIInsights() {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get AI insights
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/ai/insights'],
    enabled: user?.role === 'admin' || user?.role === 'hr',
  });

  // Generate AI insights mutations
  const generateAttendanceSummary = useMutation({
    mutationFn: () => apiRequest('POST', '/api/ai/attendance-summary'),
    onMutate: () => setIsGenerating('attendance'),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Attendance summary generated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/insights'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate attendance summary",
        variant: "destructive",
      });
    },
    onSettled: () => setIsGenerating(null),
  });

  const generateLeaveAnalysis = useMutation({
    mutationFn: () => apiRequest('POST', '/api/ai/leave-analysis'),
    onMutate: () => setIsGenerating('leave'),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Leave analysis generated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/insights'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate leave analysis",
        variant: "destructive",
      });
    },
    onSettled: () => setIsGenerating(null),
  });

  const generatePerformanceInsights = useMutation({
    mutationFn: () => apiRequest('POST', '/api/ai/performance-insights'),
    onMutate: () => setIsGenerating('performance'),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Performance insights generated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/insights'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate performance insights",
        variant: "destructive",
      });
    },
    onSettled: () => setIsGenerating(null),
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'attendance_summary':
        return <Users className="h-5 w-5" />;
      case 'leave_analysis':
        return <Calendar className="h-5 w-5" />;
      case 'performance_insights':
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <Bot className="h-5 w-5" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'attendance_summary':
        return 'text-blue-600 dark:text-blue-400';
      case 'leave_analysis':
        return 'text-green-600 dark:text-green-400';
      case 'performance_insights':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const renderInsightContent = (insight: AiInsight) => {
    const content = insight.content as any;
    
    switch (insight.type) {
      case 'attendance_summary':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{content.totalEmployees}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Present Today</p>
                <p className="text-2xl font-bold">{content.presentToday}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold">{content.attendanceRate}%</p>
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">Trends & Analysis:</p>
              <p className="text-sm text-muted-foreground">{content.trends}</p>
            </div>
            {content.recommendations && content.recommendations.length > 0 && (
              <div>
                <p className="font-medium mb-2">Recommendations:</p>
                <ul className="list-disc list-inside space-y-1">
                  {content.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'leave_analysis':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{content.totalRequests}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{content.pendingRequests}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Approval Rate</p>
                <p className="text-2xl font-bold">{content.approvalRate}%</p>
              </div>
            </div>
            {content.commonReasons && content.commonReasons.length > 0 && (
              <div>
                <p className="font-medium mb-2">Common Leave Reasons:</p>
                <div className="flex flex-wrap gap-2">
                  {content.commonReasons.map((reason: string, index: number) => (
                    <Badge key={index} variant="secondary">{reason}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="font-medium mb-2">Insights:</p>
              <p className="text-sm text-muted-foreground">{content.insights}</p>
            </div>
          </div>
        );

      case 'performance_insights':
        return (
          <div className="space-y-4">
            {content.departmentPerformance && content.departmentPerformance.length > 0 && (
              <div>
                <p className="font-medium mb-4">Department Performance:</p>
                <div className="space-y-3">
                  {content.departmentPerformance.map((dept: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{dept.department}</p>
                        <Badge variant={dept.score >= 80 ? 'default' : dept.score >= 60 ? 'secondary' : 'destructive'}>
                          {dept.score}%
                        </Badge>
                      </div>
                      <Progress value={dept.score} className="mb-2" />
                      <p className="text-sm text-muted-foreground">{dept.insights}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="font-medium mb-2">Overall Trends:</p>
              <p className="text-sm text-muted-foreground">{content.overallTrends}</p>
            </div>
            {content.recommendations && content.recommendations.length > 0 && (
              <div>
                <p className="font-medium mb-2">Recommendations:</p>
                <ul className="list-disc list-inside space-y-1">
                  {content.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
        );
    }
  };

  // Check if user has HR/Admin privileges
  if (user?.role !== 'admin' && user?.role !== 'hr') {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                Only HR managers and administrators can access AI insights.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold charcoal-text">AI Insights</h1>
        <p className="text-muted-foreground mt-2">
          Smart analytics and automated reports powered by artificial intelligence for data-driven HR decisions.
        </p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate Insights</TabsTrigger>
          <TabsTrigger value="history">Insight History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* Generate New Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Attendance Summary</span>
                </CardTitle>
                <CardDescription>
                  Generate AI-powered analysis of employee attendance patterns and trends.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => generateAttendanceSummary.mutate()}
                  disabled={isGenerating === 'attendance'}
                  className="w-full primary-bg hover:bg-primary-600"
                >
                  {isGenerating === 'attendance' ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Summary
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span>Leave Analysis</span>
                </CardTitle>
                <CardDescription>
                  Analyze leave request patterns, approval rates, and seasonal trends.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => generateLeaveAnalysis.mutate()}
                  disabled={isGenerating === 'leave'}
                  className="w-full primary-bg hover:bg-primary-600"
                >
                  {isGenerating === 'leave' ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Analysis
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span>Performance Insights</span>
                </CardTitle>
                <CardDescription>
                  Get AI insights on employee performance and department efficiency.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => generatePerformanceInsights.mutate()}
                  disabled={isGenerating === 'performance'}
                  className="w-full primary-bg hover:bg-primary-600"
                >
                  {isGenerating === 'performance' ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Insights
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* AI Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>AI Capabilities</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">What AI Can Analyze:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Attendance patterns and anomalies</li>
                    <li>• Leave request trends and approval rates</li>
                    <li>• Department performance metrics</li>
                    <li>• Employee productivity indicators</li>
                    <li>• Workforce utilization rates</li>
                    <li>• Seasonal employment patterns</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Benefits:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Data-driven decision making</li>
                    <li>• Early identification of issues</li>
                    <li>• Predictive workforce planning</li>
                    <li>• Automated report generation</li>
                    <li>• Strategic recommendations</li>
                    <li>• Time-saving analysis</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Generated Insights</span>
              </CardTitle>
              <CardDescription>
                View and download previously generated AI insights and reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                      <div className="h-20 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : insights?.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No AI insights generated yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate your first insights using the tools above
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {insights?.map((insight: AiInsight) => (
                    <Card key={insight.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={getInsightColor(insight.type)}>
                              {getInsightIcon(insight.type)}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{insight.title}</CardTitle>
                              <CardDescription className="flex items-center space-x-4">
                                <span>Generated: {formatDate(insight.generatedAt)}</span>
                                <Badge variant="outline" className="capitalize">
                                  {insight.period}
                                </Badge>
                                <Badge variant="secondary" className="capitalize">
                                  {insight.type.replace('_', ' ')}
                                </Badge>
                              </CardDescription>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {renderInsightContent(insight)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

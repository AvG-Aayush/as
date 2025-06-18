import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { Building2, Users, Shield, Clock } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.username, data.password);
      toast({
        title: "Login successful",
        description: `Welcome back!`,
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
        {/* Hero Section */}
        <div className="space-y-6 lg:space-y-8 text-center lg:text-left order-2 lg:order-1">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-center lg:justify-start space-x-2">
              <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                HR Platform
              </h1>
            </div>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-lg">
              Comprehensive human resources management with real-time attendance tracking, 
              smart leave management, and AI-powered insights.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            <div className="flex flex-col items-center space-y-2 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <Users className="h-8 w-8 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Employee Management</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                Complete employee lifecycle management with role-based permissions
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <Clock className="h-8 w-8 text-green-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Smart Attendance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                GPS and biometric attendance tracking with real-time monitoring
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <Shield className="h-8 w-8 text-purple-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Secure & Scalable</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                Enterprise-grade security with encrypted communications
              </p>
            </div>
          </div>


        </div>

        {/* Login Form */}
        <div className="w-full max-w-md mx-auto order-1 lg:order-2">
          <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl font-bold">Sign In</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Enter your credentials to access the HR platform
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Test Accounts:</p>
                <div className="space-y-1">
                  <div className="text-xs text-blue-600 dark:text-blue-300">
                    <strong>Admin:</strong> admin / admin123
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-300">
                    <strong>HR Manager:</strong> hr_manager / hr123
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-300">
                    <strong>Employee:</strong> employee / emp123
                  </div>
                </div>
              </div>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your username"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
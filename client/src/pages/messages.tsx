import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MessagingPortal from "@/components/messaging/messaging-portal";

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with your team members securely
          </p>
        </div>
        
        <Card className="h-[calc(100vh-200px)]">
          <CardContent className="p-0 h-full">
            <MessagingPortal />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
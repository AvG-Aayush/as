import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import ChatWindow from "./chat-window";

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  // Get unread message count
  const { data: unreadCount } = useQuery({
    queryKey: ['/api/messages/unread-count'],
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-16 sm:bottom-20 right-4 sm:right-6 w-72 sm:w-80 h-80 sm:h-96 bg-card border border-border rounded-lg shadow-xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
            <h3 className="font-semibold text-sm sm:text-base">Internal Chat</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatWindow />
          </div>
        </div>
      )}

      {/* Floating Button */}
      <Button
        onClick={toggleChat}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg primary-bg hover:bg-primary-600 z-40 transition-all transform hover:scale-105"
        size="sm"
      >
        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        {unreadCount && (unreadCount as any)?.count > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center text-xs p-0"
          >
            {(unreadCount as any).count > 99 ? '99+' : (unreadCount as any).count}
          </Badge>
        )}
      </Button>
    </>
  );
}

import { useState, useEffect, useRef } from "react";
import { Send, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useWebSocket } from "@/contexts/websocket-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { encryptMessage, decryptMessage } from "@/lib/encryption";
import type { Message, User as UserType } from "@shared/schema";

export default function ChatWindow() {
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState("contacts");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { sendMessage: sendWebSocketMessage } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all users for contact list
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user,
  });

  // Get messages with selected user
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/messages/user', selectedUser?.id],
    enabled: !!selectedUser && !!user,
    refetchInterval: 3000, // Refetch every 3 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { recipientId: number; content: string }) => {
      const encryptedContent = encryptMessage(messageData.content);
      const response = await apiRequest('POST', '/api/messages', {
        recipientId: messageData.recipientId,
        content: encryptedContent,
        messageType: 'text',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/user', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
      setMessage("");
      toast({
        title: "Message Sent",
        description: "Your message has been delivered successfully",
      });
    },
    onError: (error: any) => {
      console.error('Message sending error:', error);
      const errorMessage = error.response?.data?.error || error.message || "Unable to send message. It will be retried automatically.";
      
      toast({
        title: "Message Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mark messages as read when viewing
  const markAsReadMutation = useMutation({
    mutationFn: async (senderId: number) => {
      return apiRequest('PUT', '/api/messages/mark-read', { senderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
    },
  });

  // Handle WebSocket messages
  useEffect(() => {
    const handleChatMessage = (event: CustomEvent) => {
      const messageData = event.detail;
      if (messageData.senderId === selectedUser?.id || messageData.recipientId === user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/messages/user', selectedUser?.id] });
        queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
      }
    };

    window.addEventListener('chat_message', handleChatMessage as EventListener);
    return () => {
      window.removeEventListener('chat_message', handleChatMessage as EventListener);
    };
  }, [selectedUser, user, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read when user is selected
  useEffect(() => {
    if (selectedUser && user) {
      markAsReadMutation.mutate(selectedUser.id);
    }
  }, [selectedUser, user]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser) return;

    sendMessageMutation.mutate({
      recipientId: selectedUser.id,
      content: message.trim(),
    });

    // Send real-time message via WebSocket
    sendWebSocketMessage({
      type: 'chat_message',
      senderId: user?.id,
      recipientId: selectedUser.id,
      content: encryptMessage(message.trim()),
      timestamp: new Date(),
    });
  };

  const formatMessageTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="flex-1 px-4 pb-4">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {Array.isArray(users) ? users.filter((u: UserType) => u.id !== user?.id).map((contact: UserType) => (
                <div
                  key={contact.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => {
                    setSelectedUser(contact);
                    setActiveTab("chat");
                  }}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {contact.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.department} • {contact.position}
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              )) : (
                <div className="flex items-center justify-center h-20 text-muted-foreground">
                  <p className="text-xs">Loading contacts...</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="chat" className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              {/* Chat header */}
              <div className="flex items-center space-x-3 px-4 py-2 border-b border-border">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {selectedUser.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedUser.fullName}</p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                <div className="space-y-3 py-4">
                  {messagesLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex justify-start">
                          <div className="max-w-[75%] px-3 py-2 rounded-lg bg-muted animate-pulse">
                            <div className="h-4 bg-muted-foreground/20 rounded w-32"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : Array.isArray(messages) && messages.length > 0 ? (
                    messages.map((msg: Message) => {
                      const isOwn = msg.senderId === user?.id;
                      const decryptedContent = decryptMessage(msg.content);
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${
                              isOwn
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-foreground border'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{decryptedContent}</p>
                            <p className={`text-xs mt-1 ${
                              isOwn ? 'text-blue-100' : 'text-muted-foreground'
                            }`}>
                              {formatMessageTime(msg.sentAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-20 text-muted-foreground">
                      <p className="text-xs">No messages yet. Start the conversation!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Message input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
                <div className="flex space-x-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={!message.trim() || sendMessageMutation.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <div>
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Select a contact to start chatting
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { Send, Users, User, Search, Phone, Video, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Message, User as UserType } from "@shared/schema";

interface MessageWithSender extends Message {
  senderName?: string;
  senderUsername?: string;
}

export default function MessagingPortal() {
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all users for contact list
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users/contacts'],
    enabled: !!user,
  });

  // Get messages with selected user
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/messages/user', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      const response = await apiRequest('GET', `/api/messages/user/${selectedUser.id}`);
      return response.json();
    },
    enabled: !!selectedUser && !!user,
    refetchInterval: 5000,
  });

  // Get unread message count
  const { data: unreadCount } = useQuery({
    queryKey: ['/api/messages/unread-count'],
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { recipientId: number; content: string }) => {
      const response = await apiRequest('POST', '/api/messages', {
        recipientId: messageData.recipientId,
        content: messageData.content,
        messageType: 'text',
        priority: 'normal'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/user', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
      setMessage("");
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    },
    onError: (error: any) => {
      console.error('Message sending failed:', error);
      toast({
        title: "Message Failed",
        description: "Unable to send message. It will be retried automatically.",
        variant: "destructive",
      });
    },
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (senderId: number) => {
      return apiRequest('PUT', '/api/messages/mark-read', { senderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
    },
  });

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

  const filteredUsers = Array.isArray(users) 
    ? users.filter((u: UserType) => 
        u.id !== user?.id && 
        (u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         u.department?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  return (
    <div className="flex h-full bg-background">
      {/* Contacts Sidebar */}
      <div className="w-1/3 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {usersLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((contact: UserType) => (
                <div
                  key={contact.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                    selectedUser?.id === contact.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedUser(contact)}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={contact.profilePicture || undefined} />
                    <AvatarFallback>
                      {contact.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{contact.fullName}</p>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.department} • {contact.position}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-20 text-muted-foreground">
                <p className="text-sm">No contacts found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedUser.profilePicture || undefined} />
                  <AvatarFallback>
                    {selectedUser.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedUser.fullName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.department} • Online
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messagesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex justify-start">
                        <div className="max-w-[70%] p-3 rounded-lg bg-muted animate-pulse">
                          <div className="h-4 bg-muted-foreground/20 rounded w-32"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(messages) && messages.length > 0 ? (
                  messages.map((msg: MessageWithSender) => {
                    const isOwn = msg.senderId === user?.id;
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="flex items-start space-x-2 max-w-[70%]">
                          {!isOwn && (
                            <Avatar className="w-8 h-8 mt-1">
                              <AvatarFallback className="text-xs">
                                {selectedUser?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div
                            className={`p-3 rounded-lg shadow-sm ${
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className={`text-xs ${
                                isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {formatMessageTime(msg.sentAt)}
                              </p>
                              {isOwn && (
                                <div className="flex items-center space-x-1">
                                  {msg.isRead && (
                                    <Badge variant="secondary" className="text-xs px-1 py-0">
                                      Read
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {isOwn && (
                            <Avatar className="w-8 h-8 mt-1">
                              <AvatarImage src={user?.profilePicture || undefined} />
                              <AvatarFallback className="text-xs">
                                {user?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-32 text-center">
                    <div>
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No messages yet. Start the conversation!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={sendMessageMutation.isPending}
                />
                <Button 
                  type="submit" 
                  disabled={!message.trim() || sendMessageMutation.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose a contact from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
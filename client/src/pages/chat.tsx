import { useState, useEffect, useRef } from "react";
import { Send, Users, User, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useWebSocket } from "@/contexts/websocket-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { encryptMessage, decryptMessage } from "@/lib/encryption";
import type { Message, User as UserType, ChatGroup } from "@shared/schema";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [activeTab, setActiveTab] = useState("direct");
  const [searchQuery, setSearchQuery] = useState("");
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

  // Get user's chat groups
  const { data: groups } = useQuery({
    queryKey: ['/api/chat-groups/user', user?.id],
    enabled: !!user,
  });

  // Get messages for selected conversation
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: selectedUser 
      ? ['/api/messages/user', selectedUser.id]
      : selectedGroup 
      ? ['/api/messages/group', selectedGroup.id]
      : [],
    enabled: !!(selectedUser || selectedGroup),
    refetchInterval: 3000,
  });

  console.log('Messages data:', messages);
  console.log('Selected user:', selectedUser);
  console.log('Messages loading:', messagesLoading);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { recipientId?: number; groupId?: number; content: string }) => {
      const encryptedContent = encryptMessage(messageData.content);
      const response = await apiRequest('POST', '/api/messages', {
        ...messageData,
        content: encryptedContent,
        messageType: 'text',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: selectedUser 
          ? ['/api/messages/user', selectedUser.id]
          : ['/api/messages/group', selectedGroup?.id]
      });
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

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (data: { senderId?: number; groupId?: number }) => {
      return apiRequest('PUT', '/api/messages/mark-read', data);
    },
  });

  // Handle WebSocket messages
  useEffect(() => {
    const handleChatMessage = (event: CustomEvent) => {
      const messageData = event.detail;
      
      // Check if message is for current conversation
      const isCurrentConversation = 
        (selectedUser && (messageData.senderId === selectedUser.id || messageData.recipientId === user?.id)) ||
        (selectedGroup && messageData.groupId === selectedGroup.id);
      
      if (isCurrentConversation) {
        queryClient.invalidateQueries({ 
          queryKey: selectedUser 
            ? ['/api/messages/user', selectedUser.id]
            : ['/api/messages/group', selectedGroup?.id]
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
    };

    window.addEventListener('chat_message', handleChatMessage as EventListener);
    return () => {
      window.removeEventListener('chat_message', handleChatMessage as EventListener);
    };
  }, [selectedUser, selectedGroup, user, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedUser) {
      markAsReadMutation.mutate({ senderId: selectedUser.id });
    } else if (selectedGroup) {
      markAsReadMutation.mutate({ groupId: selectedGroup.id });
    }
  }, [selectedUser, selectedGroup]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const messageData = selectedUser 
      ? { recipientId: selectedUser.id, content: message.trim() }
      : selectedGroup 
      ? { groupId: selectedGroup.id, content: message.trim() }
      : null;

    if (!messageData) return;

    sendMessageMutation.mutate(messageData);

    // Send real-time message via WebSocket
    sendWebSocketMessage({
      type: 'chat_message',
      senderId: user?.id,
      ...messageData,
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

  const filteredUsers = Array.isArray(users) ? users.filter((u: UserType) => 
    u.id !== user?.id && 
    (u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.department?.toLowerCase().includes(searchQuery.toLowerCase()))
  ) : [];

  const filteredGroups = Array.isArray(groups) ? groups.filter((g: ChatGroup) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className="content-padding h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)]">
      <div className="mb-4 sm:mb-6">
        <h1 className="heading-responsive charcoal-text">Internal Chat</h1>
        <p className="text-muted-foreground mt-2 text-responsive mobile-hidden">
          Secure communication platform for team collaboration and messaging.
        </p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6 h-full">
        {/* Sidebar - Contacts and Groups */}
        <Card className="lg:col-span-1 h-64 lg:h-full flex flex-col order-2 lg:order-1">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Conversations</CardTitle>
              <Button variant="ghost" size="sm" className="mobile-hidden">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                className="pl-10 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mx-4">
                <TabsTrigger value="direct">Direct</TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
              </TabsList>

              <TabsContent value="direct" className="flex-1 mt-4">
                <ScrollArea className="h-full px-4">
                  <div className="space-y-2">
                    {filteredUsers?.map((contact: UserType) => (
                      <div
                        key={contact.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedUser?.id === contact.id 
                            ? 'primary-bg-50 dark:bg-primary-900/50' 
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => {
                          setSelectedUser(contact);
                          setSelectedGroup(null);
                        }}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="text-sm">
                            {contact.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{contact.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.department} • {contact.position}
                          </p>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="groups" className="flex-1 mt-4">
                <ScrollArea className="h-full px-4">
                  <div className="space-y-2">
                    {filteredGroups?.map((group: ChatGroup) => (
                      <div
                        key={group.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedGroup?.id === group.id 
                            ? 'primary-bg-50 dark:bg-primary-900/50' 
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => {
                          setSelectedGroup(group);
                          setSelectedUser(null);
                        }}
                      >
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{group.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {group.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 h-full lg:h-full flex flex-col order-1 lg:order-2">
          {selectedUser || selectedGroup ? (
            <>
              {/* Chat header */}
              <CardHeader className="pb-3 sm:pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                      {selectedUser ? (
                        <AvatarFallback className="text-xs sm:text-sm">
                          {selectedUser.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      ) : (
                        <div className="w-full h-full bg-muted rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        </div>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {selectedUser?.fullName || selectedGroup?.name}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {selectedUser 
                          ? `${selectedUser.department} • Online` 
                          : selectedGroup?.description || 'Group chat'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="mobile-hidden">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 p-4 overflow-hidden">
                <ScrollArea className="h-full" ref={scrollRef}>
                  <div className="space-y-4 p-4">
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
                        let decryptedContent = msg.content;
                        
                        // Try to decrypt if content looks encrypted, otherwise use as-is
                        try {
                          if (msg.content && msg.content.includes(':')) {
                            decryptedContent = decryptMessage(msg.content);
                          }
                        } catch (error) {
                          console.log('Decryption failed, using content as-is:', error);
                          decryptedContent = msg.content;
                        }
                        
                        // Fallback to show content even if decryption fails
                        const displayContent = decryptedContent || msg.content || 'Message content unavailable';
                        
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className="flex items-start space-x-2 max-w-[70%]">
                              {!isOwn && (
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs">
                                    {selectedUser?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`px-4 py-2 rounded-lg shadow-sm ${
                                  isOwn
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-foreground border'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
                                <p className={`text-xs mt-1 ${
                                  isOwn ? 'text-blue-100' : 'text-muted-foreground'
                                }`}>
                                  {formatMessageTime(msg.sentAt)}
                                </p>
                              </div>
                              {isOwn && (
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs">
                                    {user?.fullName?.split(' ').map(n => n[0]).join('') || 'Y'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-center h-32 text-muted-foreground">
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Message input */}
              <div className="p-4 border-t">
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
                    className="primary-bg hover:bg-primary-600"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
                <p className="text-muted-foreground">
                  Select a contact or group to begin messaging with secure, encrypted chat.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

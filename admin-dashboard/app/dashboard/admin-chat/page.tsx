'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Send, 
  Search, 
  MessageSquare,
  User,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface Conversation {
  id: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
  participant: {
    id: string;
    name: string;
    role: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
  };
  updatedAt: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: {
    name: string;
  };
  isAdminMessage: boolean;
  priorityLevel: string;
  createdAt: string;
}

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchUserId, setSearchUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/admin/chat/conversations', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/admin/chat/conversations/${conversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const handleInitiateChat = async () => {
    if (!searchUserId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }

    try {
      const response = await fetch('/api/admin/chat/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          targetUserId: searchUserId,
          initialMessage: 'Hello, this is EVConnect admin support.',
        }),
      });

      if (response.ok) {
        toast.success('Chat initiated');
        loadConversations();
        setSearchUserId('');
      }
    } catch (error) {
      toast.error('Failed to initiate chat');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await fetch(`/api/admin/chat/conversations/${selectedConversation.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          content: newMessage,
          priority: 'normal',
        }),
      });

      if (response.ok) {
        setNewMessage('');
        loadMessages(selectedConversation.id);
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-120px)]">
      <div className="flex gap-4 h-full">
        {/* Conversations List */}
        <Card className="w-1/3 flex flex-col">
          <CardHeader>
            <CardTitle>Admin Chat</CardTitle>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="User ID to contact"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                className="flex-1 px-3 py-2 border rounded"
              />
              <Button onClick={handleInitiateChat} size="sm">
                <MessageSquare size={16} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {loading ? (
              <div>Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const otherUser = conv.user.id === localStorage.getItem('userId') 
                    ? conv.participant 
                    : conv.user;
                    
                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-3 rounded cursor-pointer hover:bg-gray-100 ${
                        selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User size={20} />
                        <div className="flex-1">
                          <div className="font-semibold">{otherUser.name}</div>
                          <div className="text-sm text-gray-600 truncate">
                            {conv.lastMessage?.content || 'No messages yet'}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {conv.user.role}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <User size={24} />
                  <div>
                    {(selectedConversation.user.id === localStorage.getItem('userId')
                      ? selectedConversation.participant
                      : selectedConversation.user
                    ).name}
                    <span className="text-sm text-gray-500 ml-2">
                      ({(selectedConversation.user.id === localStorage.getItem('userId')
                        ? selectedConversation.participant
                        : selectedConversation.user
                      ).role})
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isFromAdmin = msg.isAdminMessage;
                  const isMe = msg.senderId === localStorage.getItem('userId');

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isMe
                            ? 'bg-blue-500 text-white'
                            : isFromAdmin
                            ? 'bg-red-100 text-gray-900 border-2 border-red-500'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {isFromAdmin && !isMe && (
                          <div className="flex items-center gap-1 text-xs font-bold text-red-600 mb-1">
                            <AlertCircle size={12} />
                            ADMIN MESSAGE
                          </div>
                        )}
                        <div className="text-xs opacity-70 mb-1">
                          {msg.sender.name} • {new Date(msg.createdAt).toLocaleTimeString()}
                        </div>
                        <div>{msg.content}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </CardContent>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type admin message..."
                    className="flex-1 px-4 py-2 border rounded-lg"
                  />
                  <Button onClick={handleSendMessage}>
                    <Send size={20} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a conversation to start chatting
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

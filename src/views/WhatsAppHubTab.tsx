import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, Users, Phone, Video, Search, UserPlus, FileText, CheckCircle2, QrCode, Send, Paperclip, MoreVertical, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../lib/Button';
import { Badge } from '../lib/Badge';
import { auth } from '../lib/firebase';
import { EmptyState } from '../components/EmptyState';

export default function WhatsAppHubTab() {
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [connectionMode, setConnectionMode] = useState<'cloud' | 'web'>('cloud');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChats = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/workspace/whatsapp/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setChats(data.chats || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (chatId: string) => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/workspace/whatsapp/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data.messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChat) return;
    const text = inputText;
    setInputText('');

    // Optimistic UI update
    const newMessage = {
        id: `temp-${Date.now()}`,
        text,
        sender: 'AGENT',
        timestamp: new Date().toISOString(),
        chatId: activeChat.id
    };
    setMessages(prev => [...prev, newMessage]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/workspace/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId: activeChat.id, text, recipientPhone: activeChat.phone })
      });
      fetchChats();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchChats();
    // Simulate real-time mock data since we don't have active WS
    const interval = setInterval(fetchChats, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
    }
  }, [activeChat]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white overflow-hidden">
      <header className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">WhatsApp Hub</h1>
            <p className="text-xs text-slate-500 font-medium">Unified Messaging & Communications</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 rounded-lg p-1">
                <button 
                    className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-colors", connectionMode === 'cloud' ? "bg-white shadow-sm text-slate-800" : "text-slate-500")}
                    onClick={() => setConnectionMode('cloud')}
                >
                    Cloud API
                </button>
                <button 
                    className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-colors", connectionMode === 'web' ? "bg-white shadow-sm text-slate-800" : "text-slate-500")}
                    onClick={() => setConnectionMode('web')}
                >
                    Web QR
                </button>
            </div>
            {connectionMode === 'cloud' ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold gap-1"><ShieldCheck size={12}/> Verified Business</Badge>
            ) : (
                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs border-emerald-200 text-emerald-700 bg-emerald-50"><QrCode size={14}/> Connect Device</Button>
            )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-[350px] border-r border-slate-100 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search messages..." 
                className="w-full bg-slate-50 border-none rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm font-medium">No active conversations. Start one by clicking New Chat or wait for an incoming message.</div>
            ) : (
                chats.map(chat => (
                <div 
                    key={chat.id}
                    onClick={() => setActiveChat(chat)}
                    className={cn(
                    "p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50",
                    activeChat?.id === chat.id && "bg-emerald-50/50"
                    )}
                >
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 truncate pr-2">{chat.name || chat.phone || 'Unknown Contact'}</h4>
                            {chat.type && <Badge className="text-[9px] px-1 py-0 border-none bg-slate-200 text-slate-600 font-black">{chat.type}</Badge>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-slate-500 font-medium truncate pr-4">{chat.lastMessage || 'Connected.'}</p>
                        {chat.unread > 0 && (
                            <div className="h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {chat.unread}
                            </div>
                        )}
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#F8FAFC]">
            {activeChat ? (
                <>
                    {/* Chat Header */}
                    <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                {(activeChat.name || activeChat.phone || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">{activeChat.name || activeChat.phone || 'Unknown Contact'}</h3>
                                <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    {activeChat.phone} • WhatsApp Business
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 text-slate-400">
                            <Button variant="ghost" size="icon" className="hover:bg-slate-100"><Zap size={18}/></Button>
                            <Button variant="ghost" size="icon" className="hover:bg-slate-100"><MoreVertical size={18}/></Button>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {loading ? (
                            <div className="flex justify-center text-slate-400 font-medium text-sm">Loading messages...</div>
                        ) : messages.length === 0 ? (
                            <div className="flex justify-center text-slate-400 font-medium text-sm">Send a message to start the conversation.</div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={msg.id || idx} className={cn("flex", msg.sender === 'AGENT' ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm relative",
                                        msg.sender === 'AGENT' ? "bg-emerald-600 text-white rounded-br-none" : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                                    )}>
                                        <p className="text-sm">{msg.text}</p>
                                        <span className={cn(
                                            "text-[9px] font-medium block mt-1",
                                            msg.sender === 'AGENT' ? "text-emerald-200 text-right" : "text-slate-400"
                                        )}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 bg-white border-t border-slate-200 flex items-end gap-2 shrink-0">
                        <Button variant="ghost" size="icon" className="shrink-0 text-slate-400 hover:text-slate-600 mb-1">
                            <Paperclip size={20} />
                        </Button>
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 min-h-[44px] max-h-32 overflow-y-auto">
                            <textarea 
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Type a message..."
                                className="w-full bg-transparent border-none focus:outline-none resize-none text-sm leading-relaxed"
                                rows={1}
                            />
                        </div>
                        <Button 
                            onClick={handleSendMessage}
                            disabled={!inputText.trim()}
                            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white h-11 w-11 rounded-xl flex items-center justify-center mb-0.5"
                        >
                            <Send size={18} className="ml-1" />
                        </Button>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                        <MessageSquare size={32} />
                    </div>
                    <h3 className="text-slate-800 font-bold mb-2">No Chat Selected</h3>
                    <p className="text-slate-500 text-sm">Select a conversation from the sidebar to view messages.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { MessageSquare, Users, Phone, Video, Search, UserPlus, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../lib/Button';

export default function WhatsAppHubTab() {
  const [activeChat, setActiveChat] = useState<string | null>(null);

  const chats = [
    { id: '1', name: 'Global Tech Resourcing', type: 'VENDOR', lastMessage: 'We have 3 Java developers ready for the ACME role.', time: '10:42 AM', unread: 2 },
    { id: '2', name: 'Sarah Jenkins', type: 'CANDIDATE', lastMessage: 'Great, I will join the interview link at 2 PM.', time: '09:15 AM', unread: 0 },
    { id: '3', name: 'ACME Corp HR', type: 'CLIENT', lastMessage: 'Can we schedule another round for David?', time: 'Yesterday', unread: 0 },
  ];

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
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 text-xs gap-2 hidden md:flex">
            <UserPlus size={14} /> New Chat
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-80 border-r border-slate-100 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search messages..." 
                className="w-full bg-slate-50 border-none rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {chats.map(chat => (
              <div 
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={cn(
                  "p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50",
                  activeChat === chat.id && "bg-emerald-50/50"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-sm text-slate-900">{chat.name}</h4>
                  <span className="text-[10px] text-slate-400 font-medium">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500 truncate pr-4">{chat.lastMessage}</p>
                  {chat.unread > 0 && (
                    <div className="h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                      {chat.unread}
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {chat.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 hidden md:flex flex-col bg-slate-50 relative">
          {activeChat ? (
            <>
              <div className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <Users size={16} className="text-slate-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{chats.find(c => c.id === activeChat)?.name}</h3>
                    <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Online
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><Phone size={16} /></button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><Video size={16} /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Simulated chat history */}
                <div className="flex justify-center">
                  <span className="text-[10px] text-slate-400 font-medium bg-white px-3 py-1 rounded-full border border-slate-100">Today</span>
                </div>
                
                <div className="flex gap-3 max-w-[80%]">
                  <div className="h-8 w-8 bg-slate-200 rounded-full shrink-0"></div>
                  <div>
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm text-sm text-slate-700">
                      Hi, we have reviewed the JD for the Senior React Developer role. We have 3 candidates ready for submission.
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">10:40 AM</span>
                  </div>
                </div>

                <div className="flex gap-3 max-w-[80%]">
                  <div className="h-8 w-8 bg-slate-200 rounded-full shrink-0"></div>
                  <div>
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <FileText size={24} className="text-indigo-500" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">sarah_jenkins_resume.pdf</p>
                          <p className="text-[10px] text-slate-500">2.4 MB • AI Parser Processing...</p>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">10:41 AM</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl flex items-center gap-2 text-xs text-indigo-700 font-medium shadow-sm">
                    <CheckCircle2 size={14} className="text-indigo-500" />
                    AI Workflow Triggered: Candidate Profile Created & Matched
                  </div>
                </div>

                <div className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse">
                  <div className="h-8 w-8 bg-emerald-100 rounded-full shrink-0 flex items-center justify-center">
                    <span className="text-emerald-700 font-bold text-xs">AI</span>
                  </div>
                  <div>
                    <div className="bg-emerald-600 text-white p-3 rounded-2xl rounded-tr-none shadow-sm text-sm">
                      Thanks! Resume received and parsed. Candidate Sarah Jenkins is a 96% match for REQ-441. Added to the Review Queue.
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block text-right">10:42 AM</span>
                  </div>
                </div>
              </div>

              <div className="h-20 bg-white border-t border-slate-100 px-6 py-4 shrink-0">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6">
                    Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p className="font-medium">Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

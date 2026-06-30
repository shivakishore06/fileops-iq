'use client';

import React, { useState } from 'react';
import { useAuth } from '../../providers/auth-provider';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Brain, Send, ArrowLeft, Loader2, User, Bot, 
  Table, AlertCircle, FileText, CheckCircle2, RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  type?: string;
  data?: any;
}

export default function CopilotPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am your FileOps IQ AI Copilot. You can ask me questions about file arrivals, missing data, SLA breaches, or performance trends.\n\nTry asking: "Show files missing today" or "Compare today\'s files with yesterday".',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/api/v1/copilot/ask', { query: userMessage.text });
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.data.response,
        type: res.data.type,
        data: res.data.data,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: err.response?.data?.message || 'I encountered an error querying the database.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderDataWidget = (type: string, data: any) => {
    if (!data) return null;

    switch (type) {
      case 'FILES_LIST':
        return (
          <div className="mt-4 rounded-xl border border-slate-900 overflow-hidden text-xs bg-slate-950/60 shadow-xl">
            <div className="border-b border-slate-900 bg-slate-950/40 px-4 py-2 font-semibold text-slate-400">
              Matched File Records
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-900 font-mono text-[9px] uppercase tracking-wider text-slate-500 bg-slate-950/20">
                  <th className="px-4 py-2">Filename</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Received At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-350">
                {data.map((file: any) => (
                  <tr key={file.id} className="hover:bg-slate-900/30">
                    <td className="px-4 py-2 text-white font-semibold truncate max-w-[150px]">{file.filename}</td>
                    <td className="px-4 py-2 font-mono text-[10px]">{file.status}</td>
                    <td className="px-4 py-2">{new Date(file.receivedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'ALERTS_LIST':
        return (
          <div className="mt-4 space-y-2">
            {data.map((alert: any) => (
              <div key={alert.id} className="flex gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <div>
                  <h5 className="font-bold text-white">{alert.title}</h5>
                  <p className="mt-0.5 text-slate-350 text-[11px]">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'COMPARISON':
        return (
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs font-semibold">
            <div className="glass-panel border-slate-905 p-4 rounded-xl bg-slate-950/40 text-center space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Today</span>
              <span className="text-2xl font-extrabold text-white">{data.todayCount}</span>
            </div>
            <div className="glass-panel border-slate-905 p-4 rounded-xl bg-slate-950/40 text-center space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Yesterday</span>
              <span className="text-2xl font-extrabold text-white">{data.yesterdayCount}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25 pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">AI Copilot</h1>
            <p className="text-xs text-slate-500">Natural language insights and database analytics</p>
          </div>
        </div>
      </header>

      {/* Chat workspace area */}
      <div className="flex-1 overflow-y-auto p-6 z-10 relative space-y-6">
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 p-4 rounded-2xl border ${
                  msg.sender === 'user'
                    ? 'bg-slate-900/40 border-slate-900 ml-12'
                    : 'glass-panel border-slate-900 mr-12'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                    msg.sender === 'user'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-primary/10 border-primary/20 text-primary'
                  }`}>
                    {msg.sender === 'user' ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {msg.sender === 'user' ? 'Operator' : 'FileOps AI Copilot'}
                  </span>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </p>
                  
                  {msg.sender === 'ai' && msg.type && renderDataWidget(msg.type, msg.data)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 p-4 rounded-2xl border glass-panel border-slate-900 mr-12 text-slate-550 items-center"
            >
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
              <span className="text-xs">Analyzing telemetry events logs...</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input bar pinned at bottom */}
      <div className="relative border-t border-slate-900 bg-slate-950/80 backdrop-blur-md p-6 shrink-0 z-10">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-4">
          <input
            type="text"
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI Copilot... (e.g. 'Show files missing today')"
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950/50 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary/50 transition"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/95 transition disabled:opacity-50 shrink-0 shadow-lg shadow-primary/10"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

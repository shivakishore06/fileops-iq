'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/auth-provider';
import { api } from '../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Server, Bell, Database, CheckCircle, XCircle, AlertTriangle, 
  TrendingUp, Activity, BarChart3, Clock, ArrowUpRight, ArrowDownRight, 
  ArrowRight, FileSpreadsheet, Cpu, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { io } from 'socket.io-client';

interface KPIStats {
  totalFiles: number;
  failedFiles: number;
  activeAlerts: number;
  expectedCount: number;
  successRate: number;
  avgDurationSec: number;
}

interface VolumeTrend {
  date: string;
  total: number;
  success: number;
  failed: number;
}

interface RealtimeStageEvent {
  fileId: string;
  filename: string;
  stage: string;
  status: string;
  timestamp: string;
  error?: string;
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const queryClient = useQueryClient();
  const [liveEvents, setLiveEvents] = useState<RealtimeStageEvent[]>([]);

  // Queries
  const { data: kpis, isLoading: isLoadingKpis } = useQuery<KPIStats>({
    queryKey: ['kpis'],
    queryFn: async () => {
      const res = await api.get('/api/v1/analytics/kpis');
      return res.data;
    },
    refetchInterval: 10000, // poll every 10s
  });

  const { data: trends = [], isLoading: isLoadingTrends } = useQuery<VolumeTrend[]>({
    queryKey: ['trends'],
    queryFn: async () => {
      const res = await api.get('/api/v1/analytics/trends');
      return res.data;
    },
  });

  // Socket.io Realtime Listener
  useEffect(() => {
    if (user && user.tenantId) {
      const token = localStorage.getItem('access_token');
      const socket = io('http://localhost:3001/events', {
        query: { token: token || '' },
        transports: ['websocket'],
      });

      socket.on('file.lifecycle', (event: RealtimeStageEvent) => {
        setLiveEvents((prev) => [event, ...prev.slice(0, 14)]); // keep last 15 events
        queryClient.invalidateQueries({ queryKey: ['kpis'] }); // reload KPIs dynamically
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user, queryClient]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25" />
      
      {/* Main Workspace Layout */}
      <main className="relative max-w-7xl mx-auto px-6 py-12 z-10 flex-1 w-full space-y-8">
        
        {/* User context metadata banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-white">
                Executive Dashboard
              </h2>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                kpis?.activeAlerts && kpis.activeAlerts > 0
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  kpis?.activeAlerts && kpis.activeAlerts > 0 ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'
                }`} />
                SYSTEM {kpis?.activeAlerts && kpis.activeAlerts > 0 ? 'INCIDENT' : 'HEALTHY'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active Organization: <strong className="text-cyan-400">{user.tenantId}</strong> | Operator: {user.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/files" className="rounded-lg bg-slate-900 border border-slate-850 px-3 py-2 text-xs font-semibold hover:bg-slate-800 transition">
              File Explorer
            </Link>
            <Link href="/connections" className="rounded-lg bg-slate-900 border border-slate-850 px-3 py-2 text-xs font-semibold hover:bg-slate-800 transition">
              Connections
            </Link>
            <Link href="/alerts" className="rounded-lg bg-slate-900 border border-slate-850 px-3 py-2 text-xs font-semibold hover:bg-slate-800 transition">
              SLAs & Alerts
            </Link>
            <Link href="/copilot" className="rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 px-3 py-2 text-xs font-semibold hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-400 transition">
              AI Copilot
            </Link>
          </div>
        </div>

        {/* 1. Stat cards section */}
        {isLoadingKpis ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-900/40 animate-pulse border border-slate-900" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Stat Card 1: Files Processed */}
            <div className="glass-panel border-slate-900 p-6 rounded-xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Files Today</span>
                <Activity className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-white">{kpis?.totalFiles}</span>
                <span className="text-xs text-slate-500 font-mono">/ {kpis?.expectedCount} expected</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                <span>Steady volume stream active</span>
              </div>
            </div>

            {/* Stat Card 2: Success Rate */}
            <div className="glass-panel border-slate-900 p-6 rounded-xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-white">{kpis?.successRate}%</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                {kpis?.successRate && kpis.successRate >= 99 ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span>Target SLA is &gt;98.5%</span>
              </div>
            </div>

            {/* Stat Card 3: Avg speed */}
            <div className="glass-panel border-slate-900 p-6 rounded-xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Avg Latency</span>
                <Clock className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-white">{kpis?.avgDurationSec}s</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span>From arrival to archival storage</span>
              </div>
            </div>

            {/* Stat Card 4: SLA breaches */}
            <div className="glass-panel border-slate-900 p-6 rounded-xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Incidents</span>
                <Bell className="h-4 w-4 text-red-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-white">{kpis?.activeAlerts}</span>
              </div>
              <div className="text-[10px] text-slate-450 flex items-center gap-1">
                {kpis?.activeAlerts && kpis.activeAlerts > 0 ? (
                  <span className="text-red-400 font-semibold animate-pulse">Critical action required</span>
                ) : (
                  <span className="text-slate-450">All transfers compliant today</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Charts and Activity Stream panel split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Trends chart */}
          <div className="lg:col-span-2 glass-panel border-slate-900 rounded-xl p-6 flex flex-col justify-between shadow-2xl h-[450px]">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Daily Volume Analytics (Last 30 Days)
              </h3>
              <p className="text-xs text-slate-500 mt-1">Aggregated successfully processed vs failed transfers</p>
            </div>
            
            <div className="flex-1 w-full mt-6 min-h-[250px]">
              {isLoadingTrends ? (
                <div className="h-full w-full bg-slate-900/10 animate-pulse rounded" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, color: '#fff' }} />
                    <Area type="monotone" dataKey="total" name="Successful Volume" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                    <Area type="monotone" dataKey="failed" name="Failed Transfers" stroke="#ef4444" strokeWidth={1.5} fillOpacity={1} fill="url(#colorFailed)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Realtime Stream Side Panel */}
          <div className="glass-panel border-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[450px]">
            <div className="border-b border-slate-900 px-6 py-4 bg-slate-950/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Live Activity Stream
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {liveEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 text-center space-y-2">
                  <Cpu className="h-8 w-8 text-slate-800" />
                  <p className="text-xs">Waiting for events...</p>
                  <p className="text-[10px] text-slate-700 max-w-[200px]">
                    Poller chron will broadcast automatically when files are discovered on remote servers.
                  </p>
                </div>
              ) : (
                <div className="relative border-l border-slate-850 pl-4 space-y-4">
                  <AnimatePresence initial={false}>
                    {liveEvents.map((evt, idx) => (
                      <motion.div
                        key={`${evt.fileId}-${evt.stage}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative text-xs space-y-1"
                      >
                        <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border border-slate-950 bg-primary" />
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-semibold text-white truncate max-w-[140px]" title={evt.filename}>
                            {evt.filename}
                          </span>
                          <span className="font-mono text-[9px] text-slate-500">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-450">
                          <ArrowRight className="h-3 w-3 text-primary" />
                          <span>Stage: <strong className="text-slate-300 font-mono text-[10px]">{evt.stage}</strong></span>
                          <span className={`text-[9px] font-bold px-1 rounded uppercase font-mono ${
                            evt.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {evt.status}
                          </span>
                        </div>
                        {evt.error && (
                          <p className="text-[10px] text-red-400 bg-red-950/20 p-1.5 rounded border border-red-900/20 font-mono">
                            Error: {evt.error}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

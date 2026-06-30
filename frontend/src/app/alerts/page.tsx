'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../providers/auth-provider';
import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Bell, Calendar, Plus, RefreshCw, CheckCircle, 
  XCircle, AlertTriangle, ArrowLeft, Loader2, Play, Trash2, Sliders, Check
} from 'lucide-react';
import Link from 'next/link';
import { io } from 'socket.io-client';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  triggeredAt: string;
}

interface SlaPolicy {
  id: string;
  name: string;
  filenamePattern: string;
  expectedTime: string;
  toleranceMin: number;
  alertMarginMin: number;
  frequency: string;
  isActive: boolean;
}

export default function AlertsDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localAlerts, setLocalAlerts] = useState<Alert[]>([]);

  // Queries
  const { data: alerts = [], isLoading: isLoadingAlerts } = useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await api.get('/api/v1/alerts');
      return res.data;
    },
  });

  const { data: slaPolicies = [], isLoading: isLoadingSlas } = useQuery<SlaPolicy[]>({
    queryKey: ['slas'],
    queryFn: async () => {
      const res = await api.get('/api/v1/sla');
      return res.data;
    },
  });

  // Sync query data with local state to allow instant Socket.io prepends
  useEffect(() => {
    if (alerts.length > 0) {
      setLocalAlerts(alerts);
    }
  }, [alerts]);

  // Realtime Socket.io listener for new alerts
  useEffect(() => {
    if (user && user.tenantId) {
      const token = localStorage.getItem('access_token');
      const socket = io('http://localhost:3001/events', {
        query: { token: token || '' },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('Connected to socket gateway');
      });

      socket.on('alert.new', (newAlert: Alert) => {
        setLocalAlerts((prev) => [newAlert, ...prev]);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  // Mutations
  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/api/v1/alerts/${id}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/api/v1/alerts/${id}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      
      {/* Header */}
      <header className="relative border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Alerts & SLA Manager</h1>
            <p className="text-xs text-slate-500">Track file operational incidents and service compliance</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative max-w-7xl mx-auto px-6 py-12 z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Realtime Alerts Log */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel border-slate-900 rounded-xl overflow-hidden shadow-2xl">
            <div className="border-b border-slate-900 px-6 py-4 bg-slate-950/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Live Operational Incident Log
              </h3>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['alerts'] })}
                className="text-xs text-slate-450 hover:text-white flex items-center gap-1.5 transition"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>

            {isLoadingAlerts ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs">Fetching alerts...</span>
              </div>
            ) : localAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-slate-700" />
                <div>
                  <p className="text-base font-semibold text-white">No active incidents</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    All file transfers are operating within standard tolerance windows.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <AnimatePresence initial={false}>
                  {localAlerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                      className={`flex gap-4 rounded-xl border p-4 backdrop-blur-md transition-all ${
                        alert.status === 'RESOLVED'
                          ? 'bg-slate-900/10 border-slate-900 text-slate-500'
                          : alert.severity === 'CRITICAL'
                          ? 'bg-red-500/5 border-red-500/20 text-red-400'
                          : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {alert.severity === 'CRITICAL' ? (
                          <XCircle className="h-5 w-5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold ${alert.status === 'RESOLVED' ? 'line-through text-slate-500' : 'text-white'}`}>
                            {alert.title}
                          </h4>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                            alert.status === 'ACTIVE' 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : alert.status === 'ACKNOWLEDGED' 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-900 text-slate-500 border border-slate-805'
                          }`}>
                            {alert.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-350">{alert.message}</p>
                        <div className="text-[10px] text-slate-500 font-mono pt-1">
                          {new Date(alert.triggeredAt).toLocaleString()}
                        </div>
                      </div>

                      {alert.status !== 'RESOLVED' && (
                        <div className="flex flex-col gap-2 justify-start shrink-0">
                          {alert.status === 'ACTIVE' && (
                            <button
                              onClick={() => acknowledgeMutation.mutate(alert.id)}
                              className="flex items-center justify-center gap-1.5 px-3 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold text-slate-300 transition"
                            >
                              <Check className="h-3 w-3" /> Acknowledge
                            </button>
                          )}
                          <button
                            onClick={() => resolveMutation.mutate(alert.id)}
                            className="flex items-center justify-center gap-1.5 px-3 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 transition"
                          >
                            Resolve
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: SLA Policies */}
        <div className="space-y-6">
          <div className="glass-panel border-slate-900 rounded-xl overflow-hidden shadow-2xl">
            <div className="border-b border-slate-900 px-6 py-4 bg-slate-950/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Active SLA Policies
              </h3>
            </div>

            {isLoadingSlas ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Fetching SLAs...</span>
              </div>
            ) : slaPolicies.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <Sliders className="h-8 w-8 mx-auto text-slate-700" />
                <p className="text-xs text-slate-500">No SLA policies defined yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-900">
                {slaPolicies.map((sla) => (
                  <div key={sla.id} className="p-6 space-y-3 hover:bg-slate-900/10 transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{sla.name}</h4>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          Pattern: {sla.filenamePattern}
                        </span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                        sla.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900 text-slate-500'
                      }`}>
                        {sla.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/50 p-2.5 rounded border border-slate-900 font-mono text-slate-400">
                      <div>
                        <span className="text-[9px] text-slate-500 block">Expected Arrival</span>
                        <span className="text-white font-bold">{sla.expectedTime}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">Tolerance Limit</span>
                        <span className="text-white font-bold">+{sla.toleranceMin}m</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

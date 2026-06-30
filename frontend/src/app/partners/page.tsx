'use client';

import React from 'react';
import { useAuth } from '../../providers/auth-provider';
import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Loader2, Users, CheckCircle2, AlertOctagon, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface PartnerPerformance {
  partnerName: string;
  partnerCode: string;
  totalTransfers: number;
  failedTransfers: number;
  successRate: number;
}

export default function PartnersDashboard() {
  const { user } = useAuth();

  const { data: partners = [], isLoading } = useQuery<PartnerPerformance[]>({
    queryKey: ['partnerPerformance'],
    queryFn: async () => {
      const res = await api.get('/api/v1/analytics/partners');
      return res.data;
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Partner Performance</h1>
            <p className="text-xs text-slate-500">Track data transmission statistics per organization partner</p>
          </div>
        </div>
      </header>

      {/* Main workspace */}
      <main className="relative max-w-7xl mx-auto px-6 py-12 z-10 space-y-8">
        <div className="glass-panel border-slate-900 rounded-xl overflow-hidden shadow-2xl">
          <div className="border-b border-slate-900 px-6 py-4 bg-slate-950/40">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Registered Partners Compliance Metrics
            </h3>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs">Fetching partner performance metrics...</span>
            </div>
          ) : partners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center space-y-4">
              <Users className="h-12 w-12 text-slate-700" />
              <p className="text-sm text-slate-550">No partner metrics registered yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-mono text-[10px] uppercase tracking-wider bg-slate-950/20">
                    <th className="px-6 py-3">Partner Name</th>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Total Files Sent</th>
                    <th className="px-6 py-3">Failed Files</th>
                    <th className="px-6 py-3">Compliance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {partners.map((partner, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/30 transition">
                      <td className="px-6 py-4.5 font-bold text-white">
                        {partner.partnerName}
                      </td>
                      <td className="px-6 py-4.5 font-mono text-xs text-slate-400">
                        {partner.partnerCode}
                      </td>
                      <td className="px-6 py-4.5 text-slate-400">
                        {partner.totalTransfers}
                      </td>
                      <td className="px-6 py-4.5 text-slate-450 font-mono text-xs">
                        {partner.failedTransfers}
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${
                            partner.successRate >= 98 
                              ? 'text-emerald-400' 
                              : partner.successRate >= 90
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}>
                            {partner.successRate}%
                          </span>
                          <div className="w-24 h-1.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                            <div 
                              className={`h-full ${
                                partner.successRate >= 98 
                                  ? 'bg-emerald-500' 
                                  : partner.successRate >= 90
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${partner.successRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { 
  ScrollText, Search, Download, RefreshCw, Calendar, User
} from 'lucide-react';

interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AuditTrailPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // Fetch audit logs
  const { data: logs = [], isLoading, refetch } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/api/v1/audit');
      return res.data;
    }
  });

  // Filter logs locally (simplifies and keeps it fast/agnostic)
  const filteredLogs = logs.filter(log => {
    const userFullName = log.user ? `${log.user.firstName} ${log.user.lastName} ${log.user.email}`.toLowerCase() : 'system';
    const matchesSearch = userFullName.includes(searchTerm.toLowerCase()) || 
                          (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAction = actionFilter ? log.action === actionFilter : true;
    return matchesSearch && matchesAction;
  });

  // Extract unique actions for filters
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  const handleExportCsv = () => {
    let csv = 'Timestamp,User,Action,IP Address,Details\n';
    for (const log of filteredLogs) {
      const userStr = log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : 'System';
      const cleanDetails = log.details ? log.details.replace(/"/g, '""') : '';
      csv += `${new Date(log.timestamp).toISOString()},"${userStr}",${log.action},"${log.ipAddress || ''}","${cleanDetails}"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-cyan-400" />
            Audit Trail
          </h1>
          <p className="text-slate-400 mt-1">Immutable global trace logs of user interactions, policy triggers, and system events.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl transition-all text-sm font-semibold shadow-lg shadow-cyan-500/10"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={() => refetch()}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
          <input 
            type="text"
            placeholder="Search by user or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1">
          <ScrollText className="w-5 h-5 text-slate-500" />
          <select 
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-transparent text-white focus:outline-none border-none cursor-pointer"
          >
            <option value="" className="bg-[#0B0F19]">All Actions</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act} className="bg-[#0B0F19]">{act}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-sm">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">IP Address</th>
                  <th className="pb-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-all text-sm">
                    <td className="py-4 text-slate-400 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-4 font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-cyan-400" />
                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System Engine'}
                    </td>
                    <td className="py-4">
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs px-2 py-0.5 rounded font-mono font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 text-slate-300 text-xs">{log.ipAddress || 'Internal'}</td>
                    <td className="py-4 text-slate-300 max-w-[300px] truncate" title={log.details || ''}>
                      {log.details || 'No details provided.'}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-500">No audit events matched your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { 
  FolderSearch, Search, Filter, RefreshCw, ChevronDown, ChevronUp, 
  Clock, Database, CheckCircle, XCircle, AlertTriangle, ArrowRight,
  Download, Play, FileText, BarChart2
} from 'lucide-react';
import Link from 'next/link';

interface ConnectionInfo {
  id: string;
  name: string;
  type: string;
}

interface FileExplorerItem {
  id: string;
  filename: string;
  path: string;
  fileSize: string;
  status: string;
  receivedAt: string;
  checksum?: string;
  connection?: ConnectionInfo;
}

interface LifecycleStep {
  id: string;
  stage: string;
  status: string;
  timestamp: string;
  errorMessage?: string;
}

export default function FileExplorer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [connectionFilter, setConnectionFilter] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState('receivedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch Connections for filter dropdown
  const { data: connections = [] } = useQuery<ConnectionInfo[]>({
    queryKey: ['explorer-connections'],
    queryFn: async () => {
      const res = await api.get('/api/v1/connections');
      return res.data;
    }
  });

  // Fetch paginated files
  const { data, isLoading, refetch } = useQuery<{
    files: FileExplorerItem[];
    total: number;
    totalPages: number;
  }>({
    queryKey: ['explorer-files', searchTerm, statusFilter, connectionFilter, page, sortBy, sortOrder],
    queryFn: async () => {
      const res = await api.get('/api/v1/files/explorer/search', {
        params: {
          filename: searchTerm || undefined,
          status: statusFilter || undefined,
          connectionId: connectionFilter || undefined,
          sortBy,
          sortOrder,
          page,
          pageSize,
        }
      });
      return res.data;
    }
  });

  // Fetch timeline for expanded file
  const { data: timeline = [], isLoading: isLoadingTimeline } = useQuery<LifecycleStep[]>({
    queryKey: ['explorer-file-timeline', selectedFileId],
    queryFn: async () => {
      if (!selectedFileId) return [];
      const res = await api.get(`/api/v1/files/explorer/${selectedFileId}/lifecycle`);
      return res.data;
    },
    enabled: !!selectedFileId
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">PROCESSED</span>;
      case 'ERROR':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">ERROR</span>;
      case 'DETECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">DETECTED</span>;
      case 'TRANSFERRED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">TRANSFERRED</span>;
      case 'VALIDATED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">VALIDATED</span>;
      case 'ARCHIVED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">ARCHIVED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  const getStageIcon = (stage: string, status: string) => {
    if (status === 'FAILED') return <XCircle className="w-5 h-5 text-rose-400" />;
    return <CheckCircle className="w-5 h-5 text-emerald-400" />;
  };

  const formatBytes = (bytesStr: string) => {
    const bytes = parseInt(bytesStr, 10) || 0;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
            <FolderSearch className="w-8 h-8 text-cyan-400" />
            File Explorer
          </h1>
          <p className="text-slate-400 mt-1">Trace, search, and audit the complete lifecycle of every data feed.</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="flex items-center gap-2 self-start md:self-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-sm font-semibold"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
          <input 
            type="text"
            placeholder="Search by filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1">
          <Filter className="w-5 h-5 text-slate-500" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-transparent text-white focus:outline-none border-none cursor-pointer"
          >
            <option value="" className="bg-[#0B0F19]">All Statuses</option>
            <option value="DETECTED" className="bg-[#0B0F19]">DETECTED</option>
            <option value="TRANSFERRED" className="bg-[#0B0F19]">TRANSFERRED</option>
            <option value="VALIDATED" className="bg-[#0B0F19]">VALIDATED</option>
            <option value="PROCESSED" className="bg-[#0B0F19]">PROCESSED</option>
            <option value="ARCHIVED" className="bg-[#0B0F19]">ARCHIVED</option>
            <option value="ERROR" className="bg-[#0B0F19]">ERROR</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1">
          <Database className="w-5 h-5 text-slate-500" />
          <select 
            value={connectionFilter}
            onChange={(e) => setConnectionFilter(e.target.value)}
            className="w-full bg-transparent text-white focus:outline-none border-none cursor-pointer"
          >
            <option value="" className="bg-[#0B0F19]">All Connections</option>
            {connections.map((conn) => (
              <option key={conn.id} value={conn.id} className="bg-[#0B0F19]">{conn.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Table Container */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-sm">
                    <th className="pb-3 cursor-pointer" onClick={() => { setSortBy('filename'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Filename</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Connection</th>
                    <th className="pb-3 cursor-pointer" onClick={() => { setSortBy('receivedAt'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Received At</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.files.map((file) => (
                    <tr 
                      key={file.id}
                      onClick={() => setSelectedFileId(file.id === selectedFileId ? null : file.id)}
                      className={`border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer ${file.id === selectedFileId ? 'bg-white/5' : ''}`}
                    >
                      <td className="py-4 font-medium max-w-[200px] truncate">{file.filename}</td>
                      <td className="py-4">{getStatusBadge(file.status)}</td>
                      <td className="py-4 text-slate-300 text-sm">{formatBytes(file.fileSize)}</td>
                      <td className="py-4 text-slate-300 text-sm">{file.connection?.name || 'Local'}</td>
                      <td className="py-4 text-slate-400 text-xs">{new Date(file.receivedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!data || data.files.length === 0) && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-500">No file transfers matched your search criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 mt-6 pt-4">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                Previous
              </button>
              <span className="text-slate-400 text-sm">Page {page} of {data.totalPages}</span>
              <button 
                disabled={page === data.totalPages}
                onClick={() => setPage(p => Math.min(p + 1, data.totalPages))}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Timeline Details Side Panel */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Lifecycle Audit
          </h2>

          <AnimatePresence mode="wait">
            {!selectedFileId ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-64 flex flex-col items-center justify-center text-slate-500 text-center"
              >
                <FileText className="w-12 h-12 text-slate-600 mb-3" />
                Select a file from the table to trace its ingestion lifecycle.
              </motion.div>
            ) : isLoadingTimeline ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Checksum SHA-256</div>
                  <div className="text-xs font-mono break-all text-slate-200">
                    {data?.files.find(f => f.id === selectedFileId)?.checksum || 'N/A'}
                  </div>
                </div>

                <div className="relative pl-6 border-l border-white/15 space-y-6">
                  {timeline.map((step, idx) => (
                    <div key={step.id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1 bg-[#0B0F19] rounded-full p-1 border border-white/15">
                        {getStageIcon(step.stage, step.status)}
                      </div>
                      
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-2">
                          {step.stage}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            step.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>{step.status}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(step.timestamp).toLocaleTimeString()} ({new Date(step.timestamp).toLocaleDateString()})
                        </div>
                        {step.errorMessage && (
                          <div className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2.5 rounded-lg mt-2">
                            {step.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {timeline.length === 0 && (
                    <div className="text-sm text-slate-500 py-4">No lifecycle events recorded for this file.</div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-cyan-500/10">
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button className="flex items-center justify-center p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
                    <Play className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

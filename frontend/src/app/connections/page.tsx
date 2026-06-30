'use client';

import React, { useState } from 'react';
import { useAuth } from '../../providers/auth-provider';
import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Database, Plus, RefreshCw, Trash2, Edit3, CheckCircle, 
  XCircle, Play, Server, Loader2, ArrowLeft, KeyRound, Globe, FileText
} from 'lucide-react';
import Link from 'next/link';

interface Connection {
  id: string;
  name: string;
  type: string;
  status: 'ACTIVE' | 'ERROR' | 'INACTIVE';
  host?: string;
  port?: number;
  username?: string;
  pollingInterval: number;
  lastCheckedAt?: string;
  hasPassword?: boolean;
  hasPrivateKey?: boolean;
  configJson?: string;
}

export default function ConnectionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingConn, setEditingConn] = useState<Connection | null>(null);
  const [formError, setFormError] = useState('');
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [testingId, setTestingId] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState('SFTP');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [configJson, setConfigJson] = useState('{}');
  const [pollingInterval, setPollingInterval] = useState(300);

  // Queries & Mutations
  const { data: connections = [], isLoading } = useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await api.get('/api/v1/connections');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newConn: any) => {
      return api.post('/api/v1/connections', newConn);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to create connection');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedConn: any) => {
      return api.put(`/api/v1/connections/${editingConn?.id}`, updatedConn);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to update connection');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/v1/connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    }
  });

  const openCreateModal = () => {
    setEditingConn(null);
    setName('');
    setType('SFTP');
    setHost('');
    setPort(22);
    setUsername('');
    setPassword('');
    setPrivateKey('');
    setConfigJson('{}');
    setPollingInterval(300);
    setFormError('');
    setIsOpen(true);
  };

  const openEditModal = (conn: Connection) => {
    setEditingConn(conn);
    setName(conn.name);
    setType(conn.type);
    setHost(conn.host || '');
    setPort(conn.port || 22);
    setUsername(conn.username || '');
    setPassword(''); // never prefill password for security
    setPrivateKey('');
    setConfigJson(conn.configJson || '{}');
    setPollingInterval(conn.pollingInterval);
    setFormError('');
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditingConn(null);
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await api.post(`/api/v1/connections/${id}/test`);
      setTestResult({ id, success: res.data.success, message: res.data.message });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    } catch (err: any) {
      setTestResult({ 
        id, 
        success: false, 
        message: err.response?.data?.message || 'Connection test request failed' 
      });
    } finally {
      setTestingId('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const payload: any = {
      name,
      type,
      pollingInterval: Number(pollingInterval),
    };

    if (type === 'SFTP' || type === 'FTP' || type === 'FTPS') {
      payload.host = host;
      payload.port = Number(port);
      payload.username = username;
      if (password) payload.password = password;
      if (privateKey) payload.privateKey = privateKey;
    }

    if (configJson) {
      try {
        JSON.parse(configJson); // Validate JSON format
        payload.configJson = configJson;
      } catch {
        setFormError('Configuration Options must be a valid JSON string');
        return;
      }
    }

    if (editingConn) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Connection Manager</h1>
            <p className="text-xs text-slate-500">Configure file source pollers and credentials</p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/95 transition duration-150"
        >
          <Plus className="h-4 w-4" />
          New Connection
        </button>
      </header>

      {/* Main body */}
      <main className="relative max-w-7xl mx-auto px-6 py-12 z-10 space-y-8">
        
        {/* Test Result Alert Banner */}
        <AnimatePresence>
          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex items-start gap-3 rounded-xl border p-4 backdrop-blur-md ${
                testResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/25 text-red-400'
              }`}
            >
              {testResult.success ? <CheckCircle className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">
                  Connection Test {testResult.success ? 'Passed' : 'Failed'}
                </h4>
                <p className="text-xs mt-1 text-slate-350">{testResult.message}</p>
              </div>
              <button 
                onClick={() => setTestResult(null)}
                className="text-xs font-semibold hover:underline"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connections List Card */}
        <div className="glass-panel border-slate-900 rounded-xl overflow-hidden shadow-2xl">
          <div className="border-b border-slate-900 px-6 py-4 bg-slate-950/40">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Active Server & Storage Integrations
            </h3>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs">Fetching connections...</span>
            </div>
          ) : connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center space-y-4">
              <Server className="h-12 w-12 text-slate-700" />
              <div>
                <p className="text-base font-semibold text-white">No active connections</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Register a remote server or storage bucket (SFTP, AWS S3, local directory) to start polling files.
                </p>
              </div>
              <button
                onClick={openCreateModal}
                className="rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:text-white px-4 py-2 text-xs font-semibold transition"
              >
                Create Connection
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-mono text-[10px] uppercase tracking-wider bg-slate-950/20">
                    <th className="px-6 py-3">Connection Name</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Host / Path</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Interval</th>
                    <th className="px-6 py-3">Last Checked</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {connections.map((conn) => (
                    <tr key={conn.id} className="hover:bg-slate-900/30 transition">
                      <td className="px-6 py-4.5 font-bold text-white flex items-center gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        {conn.name}
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {conn.type}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 font-mono text-xs text-slate-400">
                        {conn.host ? `${conn.host}:${conn.port}` : JSON.parse(conn.configJson || '{}').path || '-'}
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-2">
                          <span className={`relative flex h-2 w-2`}>
                            {conn.status === 'ACTIVE' && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            )}
                            {conn.status === 'ERROR' && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${
                              conn.status === 'ACTIVE' 
                                ? 'bg-emerald-500' 
                                : conn.status === 'ERROR' 
                                ? 'bg-red-500' 
                                : 'bg-slate-500'
                            }`} />
                          </span>
                          <span className={`text-xs font-semibold ${
                            conn.status === 'ACTIVE' 
                              ? 'text-emerald-400' 
                              : conn.status === 'ERROR' 
                              ? 'text-red-400' 
                              : 'text-slate-400'
                          }`}>
                            {conn.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-slate-400">
                        {conn.pollingInterval}s
                      </td>
                      <td className="px-6 py-4.5 font-mono text-xs text-slate-400">
                        {conn.lastCheckedAt ? new Date(conn.lastCheckedAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4.5 text-right space-x-2">
                        <button
                          onClick={() => handleTestConnection(conn.id)}
                          disabled={testingId === conn.id}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition"
                          title="Run Connection Diagnostics"
                        >
                          {testingId === conn.id ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                          ) : (
                            <Play className="h-4.5 w-4.5 text-emerald-400" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(conn)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Settings"
                        >
                          <Edit3 className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => {
                            if(confirm('Are you sure you want to delete this connection?')) {
                              deleteMutation.mutate(conn.id);
                            }
                          }}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                          title="Delete Connection"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Creation/Edit Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div>
                <h3 className="text-xl font-bold text-white">
                  {editingConn ? 'Modify Connection' : 'Register New Connection'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Specify details below to connect to target storage.
                </p>
              </div>

              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Connection Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 px-3 text-sm text-white outline-none focus:border-primary/50 transition"
                      placeholder="e.g. SFTP Partner A"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 px-3 text-sm text-white outline-none focus:border-primary/50 transition"
                    >
                      <option value="SFTP">SFTP</option>
                      <option value="S3">AWS S3 / MinIO</option>
                      <option value="FOLDER">Local Folder</option>
                    </select>
                  </div>
                </div>

                {type === 'SFTP' && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-slate-400">Host Address</label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <input
                            type="text"
                            required
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                            className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-primary/50 transition"
                            placeholder="sftp.company.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">Port</label>
                        <input
                          type="number"
                          required
                          value={port}
                          onChange={(e) => setPort(Number(e.target.value))}
                          className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 px-3 text-sm text-white outline-none focus:border-primary/50 transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Username</label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 px-3 text-sm text-white outline-none focus:border-primary/50 transition"
                        placeholder="sftp_user"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">
                        Password {editingConn && <span className="text-[10px] text-slate-500">(Leave blank to keep current)</span>}
                      </label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-primary/50 transition"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">
                        SSH Private Key {editingConn && <span className="text-[10px] text-slate-500">(Leave blank to keep current)</span>}
                      </label>
                      <textarea
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 px-3 text-xs font-mono text-white outline-none focus:border-primary/50 transition h-20"
                        placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Polling Interval (seconds)</label>
                    <input
                      type="number"
                      required
                      value={pollingInterval}
                      onChange={(e) => setPollingInterval(Number(e.target.value))}
                      className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 px-3 text-sm text-white outline-none focus:border-primary/50 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Additional JSON Config Options
                  </label>
                  <textarea
                    required
                    value={configJson}
                    onChange={(e) => setConfigJson(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 px-3 text-xs font-mono text-white outline-none focus:border-primary/50 transition h-24"
                    placeholder={`{\n  "path": "/data/incoming",\n  "bucketName": "transfers"\n}`}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/95 transition disabled:opacity-50"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    )}
                    {editingConn ? 'Save Changes' : 'Create Connection'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

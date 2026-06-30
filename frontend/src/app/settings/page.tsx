'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { 
  Settings, Bot, Calendar, HardDrive, Flag, Webhook, 
  Plus, Trash2, Check, RefreshCw, Eye, EyeOff
} from 'lucide-react';

interface RetentionPolicy {
  id: string;
  name: string;
  pattern: string;
  ageDays: number;
  action: string;
  isActive: boolean;
}

interface StoragePolicy {
  id: string;
  name: string;
  provider: string;
  bucketName: string;
  region?: string;
  isActive: boolean;
}

interface FeatureFlag {
  id: string;
  key: string;
  value: boolean;
  description?: string;
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: string;
  channels: string[];
  channelCfg?: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'retention' | 'storage' | 'flags' | 'webhooks'>('general');

  // Form states
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [aiApiKey, setAiApiKey] = useState('********');
  const [showApiKey, setShowApiKey] = useState(false);

  // Retention policy form
  const [retName, setRetName] = useState('');
  const [retPattern, setRetPattern] = useState('');
  const [retAge, setRetAge] = useState(30);
  const [retAction, setRetAction] = useState('DELETE');

  // Storage policy form
  const [storeName, setStoreName] = useState('');
  const [storeProvider, setStoreProvider] = useState('MINIO');
  const [storeBucket, setStoreBucket] = useState('');
  const [storeRegion, setStoreRegion] = useState('');

  // Webhook rule form
  const [ruleName, setRuleName] = useState('');
  const [ruleCond, setRuleCond] = useState('CONNECTION_FAILURE');
  const [ruleSeverity, setRuleSeverity] = useState('WARNING');
  const [ruleWebhookUrl, setRuleWebhookUrl] = useState('');

  // General tenant query
  const { data: tenantInfo = { name: 'Acme Enterprise', domain: 'acme.fileops-iq.com' } } = useQuery({
    queryKey: ['tenant-info'],
    queryFn: async () => {
      const res = await api.get('/api/v1/tenant/profile').catch(() => ({ data: { name: 'Acme Enterprise', domain: 'acme.fileops-iq.com' } }));
      return res.data;
    }
  });

  // Queries
  const { data: aiSettings, refetch: refetchAi } = useQuery({
    queryKey: ['settings-ai'],
    queryFn: async () => {
      const res = await api.get('/api/v1/ai-settings');
      if (res.data) {
        setAiProvider(res.data.provider);
        setAiModel(res.data.modelName);
      }
      return res.data;
    }
  });

  const { data: retentionPolicies = [], refetch: refetchRetention } = useQuery<RetentionPolicy[]>({
    queryKey: ['settings-retention'],
    queryFn: async () => {
      const res = await api.get('/api/v1/retention');
      return res.data;
    }
  });

  const { data: storagePolicies = [], refetch: refetchStorage } = useQuery<StoragePolicy[]>({
    queryKey: ['settings-storage'],
    queryFn: async () => {
      const res = await api.get('/api/v1/storage-policies');
      return res.data;
    }
  });

  const { data: featureFlags = [], refetch: refetchFlags } = useQuery<FeatureFlag[]>({
    queryKey: ['settings-flags'],
    queryFn: async () => {
      const res = await api.get('/api/v1/feature-flags');
      return res.data;
    }
  });

  const { data: alertRules = [], refetch: refetchWebhooks } = useQuery<AlertRule[]>({
    queryKey: ['settings-webhooks'],
    queryFn: async () => {
      const res = await api.get('/api/v1/alert/rules').catch(() => ({ data: [] }));
      return res.data;
    }
  });

  // Mutations
  const updateAiMutation = useMutation({
    mutationFn: async (data: { provider: string; modelName: string; apiKey?: string }) => {
      return api.post('/api/v1/ai-settings', data);
    },
    onSuccess: () => {
      refetchAi();
      alert('AI Configuration updated successfully.');
    }
  });

  const addRetentionMutation = useMutation({
    mutationFn: async (data: { name: string; pattern: string; ageDays: number; action: string }) => {
      return api.post('/api/v1/retention', data);
    },
    onSuccess: () => {
      refetchRetention();
      setRetName('');
      setRetPattern('');
    }
  });

  const deleteRetentionMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/v1/retention/${id}`);
    },
    onSuccess: () => refetchRetention()
  });

  const addStorageMutation = useMutation({
    mutationFn: async (data: { name: string; provider: string; bucketName: string; region?: string }) => {
      return api.post('/api/v1/storage-policies', data);
    },
    onSuccess: () => {
      refetchStorage();
      setStoreName('');
      setStoreBucket('');
      setStoreRegion('');
    }
  });

  const deleteStorageMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/v1/storage-policies/${id}`);
    },
    onSuccess: () => refetchStorage()
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/api/v1/feature-flags/${id}/toggle`);
    },
    onSuccess: () => refetchFlags()
  });

  const addWebhookMutation = useMutation({
    mutationFn: async (data: { name: string; condition: string; severity: string; channels: string[]; channelCfg: string }) => {
      return api.post('/api/v1/alert/rules', data);
    },
    onSuccess: () => {
      refetchWebhooks();
      setRuleName('');
      setRuleWebhookUrl('');
    }
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/v1/alert/rules/${id}`);
    },
    onSuccess: () => refetchWebhooks()
  });

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
          <Settings className="w-8 h-8 text-cyan-400" />
          Platform Settings
        </h1>
        <p className="text-slate-400 mt-1">Configure workspace rules, AI copilot engines, storage endpoints, and feature toggles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          {[
            { id: 'general', label: 'General Profile', icon: Settings },
            { id: 'ai', label: 'AI Copilot Engine', icon: Bot },
            { id: 'retention', label: 'Data Retention', icon: Calendar },
            { id: 'storage', label: 'Storage Policies', icon: HardDrive },
            { id: 'flags', label: 'Feature Flags', icon: Flag },
            { id: 'webhooks', label: 'Alert Webhooks', icon: Webhook },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border-l-4 border-cyan-400 bg-white/5 font-semibold' 
                    : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">General Workspace Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Organization / Tenant Name</label>
                  <input 
                    type="text" 
                    value={tenantInfo.name} 
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-300 focus:outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Enterprise Domain URL</label>
                  <input 
                    type="text" 
                    value={tenantInfo.domain} 
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-300 focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">AI Copilot Engine Configuration</h2>
              <p className="text-sm text-slate-400">Configure global parameters for conversational parsing and system throughput analysis.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">AI Provider</label>
                  <select 
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="openai" className="bg-[#0B0F19]">OpenAI</option>
                    <option value="anthropic" className="bg-[#0B0F19]">Anthropic</option>
                    <option value="gemini" className="bg-[#0B0F19]">Google Gemini</option>
                    <option value="ollama" className="bg-[#0B0F19]">Ollama (Local / Air-gapped)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">AI Model Name</label>
                  <input 
                    type="text" 
                    value={aiModel} 
                    onChange={(e) => setAiModel(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Provider API Key</label>
                  <div className="relative">
                    <input 
                      type={showApiKey ? 'text' : 'password'} 
                      value={aiApiKey} 
                      onChange={(e) => setAiApiKey(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button 
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-4 top-3.5 text-slate-400 hover:text-white"
                    >
                      {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => updateAiMutation.mutate({ provider: aiProvider, modelName: aiModel, apiKey: aiApiKey })}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-sm font-semibold transition-all"
              >
                Save Engine Configuration
              </button>
            </div>
          )}

          {activeTab === 'retention' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">Data Retention Policies</h2>

              {/* Policy List */}
              <div className="space-y-3">
                {retentionPolicies.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4">
                    <div>
                      <div className="font-semibold text-slate-200">{policy.name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Pattern: <code className="text-cyan-400">{policy.pattern}</code> | Purge age: {policy.ageDays} days | Action: {policy.action}
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteRetentionMutation.mutate(policy.id)}
                      className="p-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/25 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Policy Form */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Plus className="w-5 h-5 text-cyan-400" /> Add Policy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Policy Name</label>
                    <input type="text" value={retName} onChange={e => setRetName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Glob pattern (e.g. *.csv)</label>
                    <input type="text" value={retPattern} onChange={e => setRetPattern(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Age threshold (days)</label>
                    <input type="number" value={retAge} onChange={e => setRetAge(parseInt(e.target.value, 10))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Action</label>
                    <select value={retAction} onChange={e => setRetAction(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                      <option value="DELETE" className="bg-[#0B0F19]">DELETE</option>
                      <option value="ARCHIVE" className="bg-[#0B0F19]">ARCHIVE</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => addRetentionMutation.mutate({ name: retName, pattern: retPattern, ageDays: retAge, action: retAction })}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-sm font-semibold transition-all"
                >
                  Create Policy
                </button>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">External Storage Policies</h2>

              {/* Policy List */}
              <div className="space-y-3">
                {storagePolicies.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4">
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        {policy.name}
                        {policy.isActive && <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-bold border border-emerald-500/20">ACTIVE</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Provider: {policy.provider} | Bucket: <code className="text-cyan-400">{policy.bucketName}</code>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteStorageMutation.mutate(policy.id)}
                      className="p-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/25 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Storage Form */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Plus className="w-5 h-5 text-cyan-400" /> Configure Storage Destination</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Configuration Name</label>
                    <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Provider Type</label>
                    <select value={storeProvider} onChange={e => setStoreProvider(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                      <option value="MINIO" className="bg-[#0B0F19]">MinIO</option>
                      <option value="AWS_S3" className="bg-[#0B0F19]">AWS S3</option>
                      <option value="AZURE_BLOB" className="bg-[#0B0F19]">Azure Blob Storage</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Bucket / Container Name</label>
                    <input type="text" value={storeBucket} onChange={e => setStoreBucket(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Region (Optional)</label>
                    <input type="text" value={storeRegion} onChange={e => setStoreRegion(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <button 
                  onClick={() => addStorageMutation.mutate({ name: storeName, provider: storeProvider, bucketName: storeBucket, region: storeRegion })}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-sm font-semibold transition-all"
                >
                  Save Storage Endpoint
                </button>
              </div>
            </div>
          )}

          {activeTab === 'flags' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">Enterprise Feature Flags</h2>
              <p className="text-sm text-slate-400">Toggle SaaS modular feature layers dynamically for user roles across the platform.</p>

              <div className="space-y-4">
                {featureFlags.map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4">
                    <div>
                      <div className="font-semibold text-slate-200 font-mono text-sm">{flag.key}</div>
                      <div className="text-xs text-slate-400 mt-1">{flag.description || 'No description provided.'}</div>
                    </div>
                    <button 
                      onClick={() => toggleFlagMutation.mutate(flag.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        flag.value ? 'bg-cyan-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        flag.value ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
                {featureFlags.length === 0 && (
                  <div className="text-slate-500 text-sm text-center py-6">No custom feature flags registered. Defaults are active.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">Operational Webhooks & Rules</h2>

              {/* Webhook List */}
              <div className="space-y-3">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4">
                    <div>
                      <div className="font-semibold text-slate-200">{rule.name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Condition: {rule.condition} | Severity: {rule.severity} | Webhook: <code className="text-cyan-400 truncate max-w-[200px] inline-block align-middle">{rule.channelCfg}</code>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteWebhookMutation.mutate(rule.id)}
                      className="p-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/25 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Webhook Form */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Plus className="w-5 h-5 text-cyan-400" /> Configure Webhook Alert Dispatch</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Rule/Webhook Name</label>
                    <input type="text" value={ruleName} onChange={e => setRuleName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Trigger Condition</label>
                    <select value={ruleCond} onChange={e => setRuleCond(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                      <option value="CONNECTION_FAILURE" className="bg-[#0B0F19]">Connection Failure</option>
                      <option value="LATE_FILE" className="bg-[#0B0F19]">SLA Ingestion Late</option>
                      <option value="MISSING_FILE" className="bg-[#0B0F19]">Missing File Feed</option>
                      <option value="ERROR" className="bg-[#0B0F19]">General Pipeline Error</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Alert Severity</label>
                    <select value={ruleSeverity} onChange={e => setRuleSeverity(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                      <option value="INFO" className="bg-[#0B0F19]">Info</option>
                      <option value="WARNING" className="bg-[#0B0F19]">Warning</option>
                      <option value="CRITICAL" className="bg-[#0B0F19]">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Webhook URL Endpoint</label>
                    <input type="text" value={ruleWebhookUrl} onChange={e => setRuleWebhookUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="https://hooks.slack.com/services/..." />
                  </div>
                </div>
                <button 
                  onClick={() => addWebhookMutation.mutate({ name: ruleName, condition: ruleCond, severity: ruleSeverity, channels: ['WEBHOOK'], channelCfg: ruleWebhookUrl })}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-sm font-semibold transition-all"
                >
                  Save Webhook Alert Rule
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../providers/auth-provider';
import { 
  Shield, LayoutDashboard, FolderSearch, Server, 
  Bell, Bot, Users, Settings, ScrollText, LogOut 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const navigationItems = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'File Explorer', path: '/files', icon: FolderSearch },
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Connections', path: '/connections', icon: Server },
        { label: 'Alerts & SLAs', path: '/alerts', icon: Bell },
        { label: 'AI Copilot', path: '/copilot', icon: Bot },
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { label: 'User Directory', path: '/users', icon: Users },
        { label: 'Settings', path: '/settings', icon: Settings },
        { label: 'Audit Trail', path: '/audit', icon: ScrollText },
      ]
    }
  ];

  if (!user) return null;

  return (
    <aside className="w-64 bg-[#080B11] border-r border-white/5 flex flex-col h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <div className="text-md font-bold tracking-tight text-white flex items-center">
            FileOps<span className="text-cyan-400 ml-0.5">IQ</span>
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Enterprise Hub</div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {navigationItems.map((section, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="text-[10px] text-slate-500 font-bold tracking-wider px-3 uppercase">{section.title}</div>
            {section.items.map((item, itemIdx) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={itemIdx}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border border-cyan-500/10 font-medium' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Session Footer */}
      <div className="p-4 border-t border-white/5 space-y-3">
        <div className="flex items-center gap-3 px-3 py-1.5">
          <div className="h-8 w-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold border border-cyan-500/20 text-xs">
            {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
          </div>
          <div className="truncate">
            <div className="text-xs font-semibold text-slate-200">{user.firstName} {user.lastName}</div>
            <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

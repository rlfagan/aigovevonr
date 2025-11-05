'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Settings, Users, Plug, Lock, Brain, Code, Shield, Activity, BarChart3, Bell, Database, Server, Mail } from 'lucide-react';

type Tab = 'integrations' | 'users' | 'settings';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('integrations');

  const tabs = [
    { id: 'integrations' as Tab, label: 'Integrations', icon: Plug },
    { id: 'users' as Tab, label: 'Users', icon: Users },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="relative z-10 p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-light text-white flex items-center gap-3 mb-2">
            <Settings className="h-10 w-10 text-violet-400 drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              ADMIN SETTINGS
            </span>
          </h1>
          <p className="text-gray-400 text-sm tracking-wide uppercase">
            Manage integrations, users, and system configuration
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-cyan-500/20 mb-8">
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group relative flex items-center gap-2 px-6 py-3 rounded-t-lg transition-all duration-300 font-light text-sm uppercase tracking-wide
                    ${isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] border-t border-x border-cyan-500/30'
                      : 'text-gray-400 hover:text-cyan-400 hover:bg-slate-800/50'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 transition-all ${isActive ? 'drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]' : ''}`} />
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'integrations' && <IntegrationsTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div>
      <p className="text-gray-400 mb-6 text-sm uppercase tracking-wide">
        View the full integrations page for detailed status and configuration.
      </p>
      <Link
        href="/integrations"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all font-light uppercase tracking-wide text-sm"
      >
        Open Integrations Page
        <Activity className="h-4 w-4" />
      </Link>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all">
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30 w-fit mb-4">
            <Lock className="h-8 w-8 text-cyan-400" />
          </div>
          <h3 className="font-light text-white text-xl mb-3">IAM Providers</h3>
          <p className="text-gray-400 text-sm mb-4">
            Connect to Okta or Microsoft Entra ID for user authentication
          </p>
          <div className="text-sm text-gray-500 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
              <span>JWT token verification</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
              <span>User synchronization</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
              <span>Group mapping</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-violet-500/30 rounded-lg p-6 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all">
          <div className="p-3 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-lg border border-violet-500/30 w-fit mb-4">
            <Brain className="h-8 w-8 text-violet-400" />
          </div>
          <h3 className="font-light text-white text-xl mb-3">AI Services</h3>
          <p className="text-gray-400 text-sm mb-4">
            Runtime protection for Microsoft Copilot Studio agents
          </p>
          <div className="text-sm text-gray-500 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-violet-400 rounded-full"></div>
              <span>Policy enforcement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-violet-400 rounded-full"></div>
              <span>PII detection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-violet-400 rounded-full"></div>
              <span>Conversation logging</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-green-500/30 rounded-lg p-6 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all">
          <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30 w-fit mb-4">
            <Code className="h-8 w-8 text-green-400" />
          </div>
          <h3 className="font-light text-white text-xl mb-3">Plugins</h3>
          <p className="text-gray-400 text-sm mb-4">
            Browser and IDE extensions for endpoint protection
          </p>
          <div className="text-sm text-gray-500 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
              <span>Chrome/Edge extension</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
              <span>VS Code extension</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
              <span>Real-time monitoring</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  return (
    <div>
      <p className="text-gray-400 mb-6 text-sm uppercase tracking-wide">
        View the full users page for detailed user management.
      </p>
      <Link
        href="/users"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all font-light uppercase tracking-wide text-sm"
      >
        Open Users Page
        <Users className="h-4 w-4" />
      </Link>

      <div className="mt-8">
        <h3 className="font-light text-white text-2xl mb-6 uppercase tracking-wide">User Management Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <h4 className="font-light text-white text-lg">IAM Integration</h4>
            </div>
            <p className="text-sm text-gray-400">
              Sync users from Okta or Microsoft Entra ID. Automatically import user details,
              departments, and group memberships.
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-violet-500/30 rounded-lg p-6 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-violet-500/20 rounded-lg border border-violet-500/30">
                <BarChart3 className="h-5 w-5 text-violet-400" />
              </div>
              <h4 className="font-light text-white text-lg">Activity Tracking</h4>
            </div>
            <p className="text-sm text-gray-400">
              View user activity, AI service usage, policy violations, and risk scores across
              the organization.
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-green-500/30 rounded-lg p-6 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30">
                <Shield className="h-5 w-5 text-green-400" />
              </div>
              <h4 className="font-light text-white text-lg">Search & Filter</h4>
            </div>
            <p className="text-sm text-gray-400">
              Filter users by department, IAM provider, activity status, and violation history.
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-orange-500/30 rounded-lg p-6 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
                <Activity className="h-5 w-5 text-orange-400" />
              </div>
              <h4 className="font-light text-white text-lg">Department Analytics</h4>
            </div>
            <p className="text-sm text-gray-400">
              See which departments are using AI services most, track compliance, and identify trends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  return (
    <div>
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
              <Server className="h-6 w-6 text-cyan-400" />
            </div>
            <h3 className="font-light text-white text-xl uppercase tracking-wide">System Configuration</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-light text-gray-400 mb-2 uppercase tracking-wide">
                Organization Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all font-mono text-sm"
                placeholder="Your Company"
              />
            </div>

            <div>
              <label className="block text-sm font-light text-gray-400 mb-2 uppercase tracking-wide">
                Decision API URL
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all font-mono text-sm"
                defaultValue="http://localhost:8002"
              />
            </div>

            <div>
              <label className="block text-sm font-light text-gray-400 mb-2 uppercase tracking-wide">
                Cache TTL (seconds)
              </label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all font-mono text-sm"
                defaultValue="300"
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-violet-500/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-violet-500/20 rounded-lg border border-violet-500/30">
              <Bell className="h-6 w-6 text-violet-400" />
            </div>
            <h3 className="font-light text-white text-xl uppercase tracking-wide">Notifications</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/30 transition-all cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-violet-500" defaultChecked />
              <span className="text-sm text-gray-300">Email notifications for policy violations</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/30 transition-all cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-violet-500" defaultChecked />
              <span className="text-sm text-gray-300">Slack notifications for high-risk activity</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/30 transition-all cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-violet-500" />
              <span className="text-sm text-gray-300">Weekly summary reports</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/30 transition-all cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-violet-500" />
              <span className="text-sm text-gray-300">Real-time alerts for PII detection</span>
            </label>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30">
              <Database className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="font-light text-white text-xl uppercase tracking-wide">Data Retention</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-light text-gray-400 mb-2 uppercase tracking-wide">
                Decision Logs Retention (days)
              </label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-green-500/50 focus:shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all font-mono text-sm"
                defaultValue="90"
              />
            </div>

            <div>
              <label className="block text-sm font-light text-gray-400 mb-2 uppercase tracking-wide">
                Conversation Logs Retention (days)
              </label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-green-500/50 focus:shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all font-mono text-sm"
                defaultValue="180"
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-orange-500/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
              <Shield className="h-6 w-6 text-orange-400" />
            </div>
            <h3 className="font-light text-white text-xl uppercase tracking-wide">Security</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/30 transition-all cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-orange-500" defaultChecked />
              <span className="text-sm text-gray-300">Require API key for plugin requests</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/30 transition-all cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-orange-500" defaultChecked />
              <span className="text-sm text-gray-300">Enable rate limiting</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/30 transition-all cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-orange-500" defaultChecked />
              <span className="text-sm text-gray-300">Log all authentication attempts</span>
            </label>
          </div>
        </div>

        <button className="px-8 py-3 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all font-light uppercase tracking-wide text-sm">
          Save Settings
        </button>
      </div>
    </div>
  );
}

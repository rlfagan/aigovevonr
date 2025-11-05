'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Home, FileText, AlertTriangle, Users, Settings, LogOut, Plug, Zap, Eye, Activity } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', icon: Home, label: 'Dashboard' },
    { href: '/policies', icon: FileText, label: 'Policies' },
    { href: '/violations', icon: AlertTriangle, label: 'Violations' },
    { href: '/unknown-services', icon: Shield, label: 'Unknown AI' },
    { href: '/guardrails', icon: Zap, label: 'Guardrails' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <nav className="relative z-50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-cyan-500/20 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <Shield className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] transition-all group-hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl group-hover:bg-cyan-400/30 transition-all"></div>
              </div>
              <span className="font-light text-xl bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent tracking-wide">
                AI GOVERNANCE
              </span>
            </Link>

            {/* Navigation Items */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      group relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300
                      ${isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                        : 'text-gray-400 hover:text-cyan-400 hover:bg-slate-800/50'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 transition-all ${isActive ? 'drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]' : ''}`} />
                    <span className="font-light text-sm tracking-wide uppercase">{item.label}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* User Info & Status */}
          <div className="flex items-center gap-6">
            {/* Live Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-full border border-green-500/30">
              <div className="relative">
                <Activity className="w-3 h-3 text-green-400 animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-green-400/30 blur-md"></div>
              </div>
              <span className="text-xs text-green-400 uppercase tracking-wider font-light">Active</span>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-light text-gray-300">Admin User</div>
                <div className="text-xs text-gray-500 font-mono">admin@company.com</div>
              </div>

              {/* User Avatar */}
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-950 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              </div>

              {/* Logout Button */}
              <button className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/30 group">
                <LogOut className="w-5 h-5 group-hover:drop-shadow-[0_0_4px_rgba(239,68,68,0.6)] transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Bottom Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
    </nav>
  )
}

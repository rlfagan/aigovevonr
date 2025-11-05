'use client';

import { useState, useEffect } from 'react';
import {
  Shield, Lock, Cloud, Globe, Zap, Code, Database, Activity, Settings, BarChart3,
  CheckCircle2, AlertCircle, Package, XCircle, Brain, Chrome, Users
} from 'lucide-react';

interface IntegrationStatus {
  name: string;
  type: string;
  status: 'connected' | 'configured' | 'available' | 'disconnected';
  description: string;
  icon: string;
  endpoint?: string;
  lastSync?: string;
  details?: Record<string, any>;
  configSteps?: string[];
  envVars?: Record<string, string>;
}

// Icon mapping for consistent lucide-react icons
const getIconForIntegration = (name: string, type: string) => {
  const iconMap: Record<string, any> = {
    'Okta': Lock,
    'Microsoft Entra ID': Users,
    'Zscaler': Shield,
    'Netskope': Cloud,
    'Google Workspace': Globe,
    'AWS CloudTrail': Cloud,
    'Copilot Studio Protection': Brain,
    'Chrome/Edge Extension': Chrome,
    'VS Code Extension': Code,
    'OPA Policy Engine': Settings,
    'PostgreSQL Database': Database,
    'Redis Cache': Zap,
    'Grafana': BarChart3,
    'Prometheus': Activity
  };
  return iconMap[name] || Settings;
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [configModal, setConfigModal] = useState<IntegrationStatus | null>(null);
  const [testResults, setTestResults] = useState<any | null>(null);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  async function fetchIntegrations() {
    setLoading(true);
    try {
      const decisionApiHealth = await fetch('http://localhost:8000/health');
      const decisionApiData = await decisionApiHealth.json();

      let iamData = null;
      try {
        const iamResponse = await fetch('http://localhost:8000/api/iam/status');
        if (iamResponse.ok) {
          iamData = await iamResponse.json();
        }
      } catch (e) {
        console.log('IAM not available');
      }

      let copilotData = null;
      try {
        const copilotResponse = await fetch('http://localhost:8003/health');
        if (copilotResponse.ok) {
          copilotData = await copilotResponse.json();
        }
      } catch (e) {
        console.log('Copilot Studio proxy not available');
      }

      const integrationsList: IntegrationStatus[] = [
        {
          name: 'Okta',
          type: 'iam',
          status: iamData?.okta_configured ? 'connected' : 'available',
          description: 'Enterprise identity and access management',
          icon: 'Lock',
          endpoint: 'http://localhost:8000/api/iam',
          lastSync: iamData?.last_sync,
          details: {
            provider: 'okta',
            users_synced: iamData?.total_users || 0
          },
          configSteps: [
            'Create Okta application in Admin Console',
            'Get Client ID and Client Secret',
            'Generate API token for user sync',
            'Add credentials to .env file',
            'Restart Decision API',
            'Test connection'
          ],
          envVars: {
            'OKTA_DOMAIN': 'dev-12345.okta.com',
            'OKTA_CLIENT_ID': 'your_client_id',
            'OKTA_CLIENT_SECRET': 'your_client_secret',
            'OKTA_API_TOKEN': 'your_api_token'
          }
        },
        {
          name: 'Microsoft Entra ID',
          type: 'iam',
          status: iamData?.entra_id_configured ? 'connected' : 'available',
          description: 'Azure Active Directory integration',
          icon: 'Users',
          endpoint: 'http://localhost:8000/api/iam',
          lastSync: iamData?.last_sync,
          details: {
            provider: 'entra_id',
            users_synced: iamData?.total_users || 0
          },
          configSteps: [
            'Register application in Azure Portal',
            'Create client secret',
            'Add API permissions (User.Read.All, Group.Read.All)',
            'Grant admin consent',
            'Add credentials to .env file',
            'Restart Decision API',
            'Test connection'
          ],
          envVars: {
            'ENTRA_TENANT_ID': 'your_tenant_id',
            'ENTRA_CLIENT_ID': 'your_client_id',
            'ENTRA_CLIENT_SECRET': 'your_client_secret'
          }
        },
        {
          name: 'Zscaler',
          type: 'cloud_security',
          status: 'available',
          description: 'Internet Access (ZIA) and Private Access (ZPA) log ingestion',
          icon: 'Shield',
          endpoint: 'http://localhost:8000/api/zscaler',
          details: {
            log_types: ['Web', 'ZPA', 'Firewall'],
            ai_detection: true,
            dlp_monitoring: true
          }
        },
        {
          name: 'Netskope',
          type: 'cloud_security',
          status: 'available',
          description: 'CASB and SASE platform log ingestion for cloud app monitoring',
          icon: 'Cloud',
          endpoint: 'http://localhost:8000/api/netskope',
          details: {
            features: ['DLP', 'Threat Protection', 'Cloud App Visibility'],
            ai_detection: true
          }
        },
        {
          name: 'Google Workspace',
          type: 'cloud_platform',
          status: 'available',
          description: 'Activity logs for Drive, Meet, and AI service usage tracking',
          icon: 'Globe',
          endpoint: 'http://localhost:8000/api/google-workspace',
          details: {
            services: ['Drive', 'Meet', 'Gmail', 'Chat'],
            ai_detection: true
          }
        },
        {
          name: 'AWS CloudTrail',
          type: 'cloud_platform',
          status: 'available',
          description: 'AWS API activity logs including Bedrock and SageMaker usage',
          icon: 'Cloud',
          endpoint: 'http://localhost:8000/api/aws-cloudtrail',
          details: {
            ai_services: ['Bedrock', 'SageMaker', 'Comprehend', 'Rekognition'],
            coverage: 'All AWS API calls'
          }
        },
        {
          name: 'Copilot Studio Protection',
          type: 'ai_service',
          status: copilotData?.status === 'healthy' ? 'connected' : 'available',
          description: 'Runtime protection for Microsoft Copilot Studio agents',
          icon: 'Brain',
          endpoint: 'http://localhost:8003',
          details: {
            decision_api: copilotData?.services?.decision_api,
            database: copilotData?.services?.database
          }
        },
        {
          name: 'Chrome/Edge Extension',
          type: 'plugin',
          status: 'configured',
          description: 'Browser extension for AI service monitoring and PII protection',
          icon: 'Chrome',
          details: {
            version: '1.0.0',
            services_monitored: 160,
            pii_detection: true,
            personal_email_detection: true
          }
        },
        {
          name: 'VS Code Extension',
          type: 'plugin',
          status: 'configured',
          description: 'IDE extension for AI coding assistant governance',
          icon: 'Code',
          details: {
            version: '0.1.0',
            package: 'ai-governance-shield-0.1.0.vsix',
            ai_assistants: 11,
            content_scanning: true
          }
        },
        {
          name: 'OPA Policy Engine',
          type: 'core',
          status: decisionApiData?.services?.opa === 'healthy' ? 'connected' : 'disconnected',
          description: 'Open Policy Agent for policy evaluation',
          icon: 'Settings',
          endpoint: 'http://localhost:8181',
          details: {
            health: decisionApiData?.services?.opa
          }
        },
        {
          name: 'PostgreSQL Database',
          type: 'core',
          status: decisionApiData?.services?.database === 'healthy' ? 'connected' : 'disconnected',
          description: 'TimescaleDB for audit logs and analytics',
          icon: 'Database',
          endpoint: 'http://localhost:5434',
          details: {
            health: decisionApiData?.services?.database
          }
        },
        {
          name: 'Redis Cache',
          type: 'core',
          status: decisionApiData?.services?.cache === 'healthy' ? 'connected' : 'disconnected',
          description: 'Decision caching and rate limiting',
          icon: 'Zap',
          endpoint: 'http://localhost:6380',
          details: {
            health: decisionApiData?.services?.cache
          }
        },
        {
          name: 'Grafana',
          type: 'monitoring',
          status: 'connected',
          description: 'Dashboards and visualizations',
          icon: 'BarChart3',
          endpoint: 'http://localhost:3000',
          details: {
            default_user: 'admin',
            default_password: 'admin'
          }
        },
        {
          name: 'Prometheus',
          type: 'monitoring',
          status: 'connected',
          description: 'Metrics collection and alerting',
          icon: 'Activity',
          endpoint: 'http://localhost:9090'
        }
      ];

      setIntegrations(integrationsList);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function testConnection(integration: IntegrationStatus) {
    setTestingIntegration(integration.name);
    setTestResults(null);

    try {
      let testEndpoint = '';

      if (integration.type === 'iam' && integration.name === 'Okta') {
        testEndpoint = 'http://localhost:8000/api/iam/test-okta';
      } else if (integration.type === 'iam' && integration.name === 'Microsoft Entra ID') {
        testEndpoint = 'http://localhost:8000/api/iam/test-entra-id';
      } else if (integration.type === 'cloud_security' && integration.name === 'Zscaler') {
        testEndpoint = 'http://localhost:8000/api/zscaler/test-connection';
      } else if (integration.type === 'cloud_security' && integration.name === 'Netskope') {
        testEndpoint = 'http://localhost:8000/api/netskope/test-connection';
      } else {
        setTestResults({
          success: false,
          error: 'Test endpoint not available for this integration',
          integration: integration.name
        });
        return;
      }

      const response = await fetch(testEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      setTestResults({
        ...results,
        integration: integration.name
      });

    } catch (error: any) {
      setTestResults({
        success: false,
        error: error.message || 'Failed to test connection',
        integration: integration.name,
        tests: [{
          name: 'Connection Test',
          status: 'failed',
          message: error.message || 'Failed to connect to test endpoint'
        }]
      });
    } finally {
      setTestingIntegration(null);
    }
  }

  const groupedIntegrations = {
    iam: integrations.filter(i => i.type === 'iam'),
    cloud_security: integrations.filter(i => i.type === 'cloud_security'),
    cloud_platform: integrations.filter(i => i.type === 'cloud_platform'),
    ai_service: integrations.filter(i => i.type === 'ai_service'),
    plugin: integrations.filter(i => i.type === 'plugin'),
    core: integrations.filter(i => i.type === 'core'),
    monitoring: integrations.filter(i => i.type === 'monitoring')
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]"></div>
          <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-400/20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="relative z-10 p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-light text-white flex items-center gap-3 mb-2">
            <Settings className="h-10 w-10 text-violet-400 drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              INTEGRATIONS
            </span>
          </h1>
          <p className="text-gray-400 text-sm tracking-wide uppercase">
            Platform Integration Management
          </p>
        </div>

        {/* IAM Integrations */}
        <div className="mb-8">
          <h2 className="text-xl font-light text-white mb-4 flex items-center gap-2">
            <Lock className="h-6 w-6 text-cyan-400" />
            Identity & Access Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedIntegrations.iam.map((integration) => (
              <IntegrationCard key={integration.name} integration={integration} onConfigure={setConfigModal} onTest={testConnection} />
            ))}
          </div>
        </div>

        {/* Cloud Security */}
        <div className="mb-8">
          <h2 className="text-xl font-light text-white mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6 text-green-400" />
            Cloud Security & SASE
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedIntegrations.cloud_security.map((integration) => (
              <IntegrationCard key={integration.name} integration={integration} onConfigure={setConfigModal} onTest={testConnection} />
            ))}
          </div>
        </div>

        {/* Cloud Platforms */}
        <div className="mb-8">
          <h2 className="text-xl font-light text-white mb-4 flex items-center gap-2">
            <Cloud className="h-6 w-6 text-violet-400" />
            Cloud Platforms
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedIntegrations.cloud_platform.map((integration) => (
              <IntegrationCard key={integration.name} integration={integration} onConfigure={setConfigModal} onTest={testConnection} />
            ))}
          </div>
        </div>

        {/* AI Services */}
        <div className="mb-8">
          <h2 className="text-xl font-light text-white mb-4 flex items-center gap-2">
            <Brain className="h-6 w-6 text-orange-400" />
            AI Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedIntegrations.ai_service.map((integration) => (
              <IntegrationCard key={integration.name} integration={integration} onTest={testConnection} />
            ))}
          </div>
        </div>

        {/* Plugins */}
        <div className="mb-8">
          <h2 className="text-xl font-light text-white mb-4 flex items-center gap-2">
            <Code className="h-6 w-6 text-cyan-400" />
            Browser & IDE Plugins
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedIntegrations.plugin.map((integration) => (
              <IntegrationCard key={integration.name} integration={integration} onTest={testConnection} />
            ))}
          </div>
        </div>

        {/* Core Services */}
        <div className="mb-8">
          <h2 className="text-xl font-light text-white mb-4 flex items-center gap-2">
            <Settings className="h-6 w-6 text-violet-400" />
            Core Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedIntegrations.core.map((integration) => (
              <IntegrationCard key={integration.name} integration={integration} onTest={testConnection} />
            ))}
          </div>
        </div>

        {/* Monitoring */}
        <div className="mb-8">
          <h2 className="text-xl font-light text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-green-400" />
            Monitoring & Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedIntegrations.monitoring.map((integration) => (
              <IntegrationCard key={integration.name} integration={integration} onTest={testConnection} />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {configModal && (
        <ConfigModal integration={configModal} onClose={() => setConfigModal(null)} onSave={() => { setConfigModal(null); fetchIntegrations(); }} />
      )}

      {testResults && (
        <TestResultsModal results={testResults} onClose={() => setTestResults(null)} />
      )}

      {testingIntegration && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-8 max-w-md shadow-[0_0_50px_rgba(34,211,238,0.3)]">
            <div className="text-center">
              <div className="relative mx-auto mb-4 w-16 h-16">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)]"></div>
                <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-400/20"></div>
              </div>
              <p className="text-lg font-light text-white mb-2">Testing {testingIntegration}...</p>
              <p className="text-sm text-gray-400">Running connection tests</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IntegrationCard({ integration, onConfigure, onTest }: { integration: IntegrationStatus; onConfigure?: (integration: IntegrationStatus) => void; onTest?: (integration: IntegrationStatus) => void }) {
  const IconComponent = getIconForIntegration(integration.name, integration.type);

  const statusColors = {
    connected: { bg: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30', text: 'text-green-400', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]' },
    configured: { bg: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]' },
    available: { bg: 'from-gray-500/20 to-slate-500/20', border: 'border-gray-500/30', text: 'text-gray-400', glow: 'shadow-[0_0_20px_rgba(107,114,128,0.2)]' },
    disconnected: { bg: 'from-red-500/20 to-orange-500/20', border: 'border-red-500/30', text: 'text-red-400', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]' },
  };

  const statusConfig = statusColors[integration.status];
  const StatusIcon = integration.status === 'connected' ? CheckCircle2 : integration.status === 'configured' ? Settings : integration.status === 'disconnected' ? XCircle : Package;

  return (
    <div className={`bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border ${statusConfig.border} rounded-lg p-6 hover:${statusConfig.glow} transition-all duration-300 group`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 bg-gradient-to-br ${statusConfig.bg} rounded-lg border ${statusConfig.border}`}>
            <IconComponent className={`h-6 w-6 ${statusConfig.text}`} />
          </div>
          <div>
            <h3 className="font-light text-white text-lg">{integration.name}</h3>
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-light bg-gradient-to-r ${statusConfig.bg} border ${statusConfig.border} ${statusConfig.text} mt-1`}>
              <StatusIcon className="h-3 w-3" />
              {integration.status}
            </div>
          </div>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-4">{integration.description}</p>

      {integration.endpoint && (
        <div className="text-xs text-gray-500 mb-3">
          <span className="font-mono bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50">{integration.endpoint}</span>
        </div>
      )}

      {integration.lastSync && (
        <div className="text-xs text-gray-500 mb-3">
          Last sync: <span className="text-cyan-400 font-mono">{new Date(integration.lastSync).toLocaleString()}</span>
        </div>
      )}

      {integration.details && Object.keys(integration.details).length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="text-xs text-gray-400 space-y-2">
            {Object.entries(integration.details).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="uppercase tracking-wide">{key.replace(/_/g, ' ')}:</span>
                <span className="text-cyan-400 font-mono">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : Array.isArray(value) ? value.join(', ') : value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {integration.status === 'available' && integration.configSteps && onConfigure && (
          <button
            onClick={() => onConfigure(integration)}
            className="flex-1 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400 py-2 px-4 rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all text-sm font-light uppercase tracking-wide"
          >
            Configure
          </button>
        )}

        {integration.status === 'connected' && integration.endpoint && (
          <>
            <a
              href={integration.endpoint}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-slate-800/50 border border-slate-700/50 text-gray-300 py-2 px-4 rounded-lg hover:border-cyan-500/30 hover:text-cyan-400 transition-all text-sm text-center font-light uppercase tracking-wide"
            >
              Open →
            </a>
            {onTest && (
              <button
                onClick={() => onTest(integration)}
                className="bg-green-500/20 border border-green-500/30 text-green-400 py-2 px-4 rounded-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all text-sm font-light uppercase tracking-wide"
              >
                Test
              </button>
            )}
          </>
        )}

        {(integration.status === 'configured' || integration.status === 'available') && onTest && integration.endpoint && (
          <button
            onClick={() => onTest(integration)}
            className="flex-1 bg-green-500/20 border border-green-500/30 text-green-400 py-2 px-4 rounded-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all text-sm font-light uppercase tracking-wide"
          >
            Test Connection
          </button>
        )}
      </div>
    </div>
  );
}

function ConfigModal({ integration, onClose, onSave }: { integration: IntegrationStatus; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState<Record<string, string>>(integration.envVars || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/iam/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: integration.name === 'Okta' ? 'okta' : 'entra_id',
          config: formData
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save configuration: ${response.statusText}`);
      }

      alert('Configuration saved! Please restart the Decision API for changes to take effect.');
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-cyan-500/30 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(34,211,238,0.3)]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light text-white">Configure {integration.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-red-400 transition-colors">
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <p className="text-gray-400 text-sm mb-6">{integration.description}</p>

          {integration.configSteps && (
            <div className="mb-6 bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <h3 className="font-light text-white mb-3 uppercase tracking-wide text-sm">Setup Steps:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400">
                {integration.configSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-light text-white mb-4 uppercase tracking-wide text-sm">Configuration:</h3>
            <div className="space-y-4">
              {Object.entries(formData).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-light text-gray-400 mb-2 uppercase tracking-wide">
                    {key}
                  </label>
                  <input
                    type={key.toLowerCase().includes('secret') || key.toLowerCase().includes('token') || key.toLowerCase().includes('password') ? 'password' : 'text'}
                    value={value}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all font-mono text-sm"
                    placeholder={value}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-800/50 border border-slate-700/50 text-gray-300 rounded-lg hover:border-gray-600 transition-all font-light uppercase tracking-wide text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all disabled:opacity-50 font-light uppercase tracking-wide text-sm"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestResultsModal({ results, onClose }: { results: any; onClose: () => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed": return { bg: "from-green-500/20 to-emerald-500/20", border: "border-green-500/30", text: "text-green-400" };
      case "failed": return { bg: "from-red-500/20 to-orange-500/20", border: "border-red-500/30", text: "text-red-400" };
      case "warning": return { bg: "from-yellow-500/20 to-orange-500/20", border: "border-yellow-500/30", text: "text-yellow-400" };
      case "info": return { bg: "from-cyan-500/20 to-blue-500/20", border: "border-cyan-500/30", text: "text-cyan-400" };
      default: return { bg: "from-gray-500/20 to-slate-500/20", border: "border-gray-500/30", text: "text-gray-400" };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed": return CheckCircle2;
      case "failed": return XCircle;
      case "warning": return AlertCircle;
      case "info": return Activity;
      default: return Package;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-cyan-500/30 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(34,211,238,0.3)]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-light text-white">Test Results: {results.integration}</h2>
              <p className="text-sm text-gray-400 mt-1 font-mono">
                {new Date(results.timestamp).toLocaleString()}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-red-400 transition-colors">
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Overall Status */}
          <div className={`mb-6 p-6 rounded-lg bg-gradient-to-br ${results.success ? "from-green-500/20 to-emerald-500/20 border-2 border-green-500/30" : "from-red-500/20 to-orange-500/20 border-2 border-red-500/30"} shadow-[0_0_30px_${results.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}]`}>
            <div className="flex items-center gap-4">
              {results.success ? (
                <CheckCircle2 className="h-12 w-12 text-green-400" />
              ) : (
                <XCircle className="h-12 w-12 text-red-400" />
              )}
              <div>
                <div className="font-light text-white text-xl mb-1">
                  {results.success ? "All Tests Passed" : "Some Tests Failed"}
                </div>
                {results.summary && (
                  <div className="text-sm text-gray-300">{results.summary}</div>
                )}
                {results.error && (
                  <div className="text-sm text-red-400 mt-1">Error: {results.error}</div>
                )}
              </div>
            </div>
          </div>

          {/* Test Details */}
          {results.tests && results.tests.length > 0 && (
            <div className="space-y-3 mb-6">
              <h3 className="font-light text-white text-lg uppercase tracking-wide">Test Details</h3>
              {results.tests.map((test: any, idx: number) => {
                const StatusIcon = getStatusIcon(test.status);
                const colors = getStatusColor(test.status);
                return (
                  <div key={idx} className={`p-4 rounded-lg bg-gradient-to-br ${colors.bg} border ${colors.border}`}>
                    <div className="flex items-start gap-3">
                      <StatusIcon className={`h-6 w-6 ${colors.text} flex-shrink-0`} />
                      <div className="flex-1">
                        <div className="font-light text-white">{test.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{test.message}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all font-light uppercase tracking-wide text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

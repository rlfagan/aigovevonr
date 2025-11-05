"""
Model-Agnostic Configuration Presets
Preset configurations for popular enterprise and open-source AI models
"""

from typing import Dict, List, Optional, Any
from enum import Enum
from pydantic import BaseModel


class SecurityLevel(str, Enum):
    MAXIMUM = "MAXIMUM"  # Highest security, lowest risk tolerance
    HIGH = "HIGH"  # Strong security, balanced performance
    BALANCED = "BALANCED"  # Balance security and usability
    PERMISSIVE = "PERMISSIVE"  # Lower restrictions, higher usability
    DEVELOPMENT = "DEVELOPMENT"  # For dev/test environments only


class IndustryVertical(str, Enum):
    HEALTHCARE = "HEALTHCARE"
    FINANCE = "FINANCE"
    GOVERNMENT = "GOVERNMENT"
    EDUCATION = "EDUCATION"
    TECHNOLOGY = "TECHNOLOGY"
    RETAIL = "RETAIL"
    MANUFACTURING = "MANUFACTURING"
    GENERAL = "GENERAL"


class GuardrailConfig(BaseModel):
    """Configuration for AI guardrails"""

    # Risk Assessment
    enable_risk_assessment: bool = True
    risk_threshold: float = 0.7  # 0.0-1.0
    block_on_high_risk: bool = True

    # Content Moderation
    enable_content_moderation: bool = True
    toxicity_threshold: float = 0.7
    strict_mode: bool = False

    # PII Protection
    enable_pii_detection: bool = True
    block_on_pii: bool = True
    redact_pii: bool = True

    # Jailbreak Protection
    enable_jailbreak_detection: bool = True
    block_jailbreak_attempts: bool = True

    # Prompt Injection Protection
    enable_prompt_injection_detection: bool = True
    block_prompt_injection: bool = True

    # Compliance
    enforce_compliance: bool = True
    required_frameworks: List[str] = []

    # Red Team Intelligence
    enable_threat_detection: bool = True
    log_threats: bool = True
    auto_block_known_threats: bool = True

    # Model Routing
    enable_failover: bool = True
    max_latency_ms: int = 5000
    cost_optimization: bool = False

    # Audit and Logging
    log_all_requests: bool = True
    log_all_responses: bool = True
    retention_days: int = 365


class ModelPreset(BaseModel):
    """Preset configuration for specific AI model"""
    preset_id: str
    name: str
    model_family: str  # e.g., "gpt-4", "claude-3", "gemini"
    provider: str
    security_level: SecurityLevel
    industry_vertical: Optional[IndustryVertical] = None
    config: GuardrailConfig
    description: str
    recommended_for: List[str]


class PresetManager:
    """
    Manager for model-agnostic configuration presets
    Provides ready-to-use configurations for popular AI models
    """

    def __init__(self):
        self.presets: Dict[str, ModelPreset] = {}
        self._initialize_presets()

    def _initialize_presets(self):
        """Initialize preset configurations"""

        # ========================================
        # OpenAI GPT-4 Presets
        # ========================================

        self.register_preset(ModelPreset(
            preset_id="gpt4-enterprise-max-security",
            name="GPT-4 Enterprise - Maximum Security",
            model_family="gpt-4",
            provider="openai",
            security_level=SecurityLevel.MAXIMUM,
            industry_vertical=IndustryVertical.FINANCE,
            config=GuardrailConfig(
                enable_risk_assessment=True,
                risk_threshold=0.5,  # Very strict
                block_on_high_risk=True,
                enable_content_moderation=True,
                toxicity_threshold=0.5,
                strict_mode=True,
                enable_pii_detection=True,
                block_on_pii=True,
                redact_pii=True,
                enable_jailbreak_detection=True,
                block_jailbreak_attempts=True,
                enable_prompt_injection_detection=True,
                block_prompt_injection=True,
                enforce_compliance=True,
                required_frameworks=["GDPR", "SOC2", "ISO27001"],
                enable_threat_detection=True,
                log_threats=True,
                auto_block_known_threats=True,
                enable_failover=True,
                max_latency_ms=3000,
                log_all_requests=True,
                log_all_responses=True,
                retention_days=2555  # 7 years for financial compliance
            ),
            description="Maximum security configuration for GPT-4 in regulated industries",
            recommended_for=[
                "Financial services",
                "Banking applications",
                "Regulated industries",
                "High-security environments"
            ]
        ))

        self.register_preset(ModelPreset(
            preset_id="gpt4-healthcare-hipaa",
            name="GPT-4 Healthcare - HIPAA Compliant",
            model_family="gpt-4",
            provider="openai",
            security_level=SecurityLevel.MAXIMUM,
            industry_vertical=IndustryVertical.HEALTHCARE,
            config=GuardrailConfig(
                enable_risk_assessment=True,
                risk_threshold=0.6,
                block_on_high_risk=True,
                enable_content_moderation=True,
                toxicity_threshold=0.6,
                strict_mode=True,
                enable_pii_detection=True,
                block_on_pii=True,  # Critical for PHI
                redact_pii=True,
                enable_jailbreak_detection=True,
                block_jailbreak_attempts=True,
                enable_prompt_injection_detection=True,
                block_prompt_injection=True,
                enforce_compliance=True,
                required_frameworks=["HIPAA", "GDPR"],
                enable_threat_detection=True,
                log_threats=True,
                auto_block_known_threats=True,
                enable_failover=True,
                max_latency_ms=4000,
                log_all_requests=True,
                log_all_responses=True,
                retention_days=2555  # HIPAA requires 6 years minimum
            ),
            description="HIPAA-compliant configuration for healthcare applications using GPT-4",
            recommended_for=[
                "Healthcare providers",
                "Medical applications",
                "PHI processing",
                "Telehealth platforms"
            ]
        ))

        self.register_preset(ModelPreset(
            preset_id="gpt4-balanced",
            name="GPT-4 Balanced",
            model_family="gpt-4",
            provider="openai",
            security_level=SecurityLevel.BALANCED,
            industry_vertical=IndustryVertical.TECHNOLOGY,
            config=GuardrailConfig(
                enable_risk_assessment=True,
                risk_threshold=0.7,
                block_on_high_risk=True,
                enable_content_moderation=True,
                toxicity_threshold=0.7,
                strict_mode=False,
                enable_pii_detection=True,
                block_on_pii=True,
                redact_pii=True,
                enable_jailbreak_detection=True,
                block_jailbreak_attempts=True,
                enable_prompt_injection_detection=True,
                block_prompt_injection=True,
                enforce_compliance=True,
                required_frameworks=["GDPR"],
                enable_threat_detection=True,
                log_threats=True,
                auto_block_known_threats=True,
                enable_failover=True,
                max_latency_ms=5000,
                log_all_requests=True,
                log_all_responses=True,
                retention_days=365
            ),
            description="Balanced security and performance for general enterprise use",
            recommended_for=[
                "General business applications",
                "Customer support",
                "Content generation",
                "Most enterprise use cases"
            ]
        ))

        # ========================================
        # Anthropic Claude Presets
        # ========================================

        self.register_preset(ModelPreset(
            preset_id="claude-enterprise-secure",
            name="Claude Enterprise - High Security",
            model_family="claude-3",
            provider="anthropic",
            security_level=SecurityLevel.HIGH,
            industry_vertical=IndustryVertical.TECHNOLOGY,
            config=GuardrailConfig(
                enable_risk_assessment=True,
                risk_threshold=0.65,
                block_on_high_risk=True,
                enable_content_moderation=True,
                toxicity_threshold=0.65,
                strict_mode=False,
                enable_pii_detection=True,
                block_on_pii=True,
                redact_pii=True,
                enable_jailbreak_detection=True,
                block_jailbreak_attempts=True,
                enable_prompt_injection_detection=True,
                block_prompt_injection=True,
                enforce_compliance=True,
                required_frameworks=["GDPR", "SOC2"],
                enable_threat_detection=True,
                log_threats=True,
                auto_block_known_threats=True,
                enable_failover=True,
                max_latency_ms=5000,
                log_all_requests=True,
                log_all_responses=True,
                retention_days=730  # 2 years
            ),
            description="High security configuration for Claude in enterprise environments",
            recommended_for=[
                "Code generation",
                "Technical documentation",
                "Enterprise AI assistants",
                "Research and analysis"
            ]
        ))

        # ========================================
        # Google Gemini Presets
        # ========================================

        self.register_preset(ModelPreset(
            preset_id="gemini-education",
            name="Gemini Education - Safe Learning",
            model_family="gemini",
            provider="google",
            security_level=SecurityLevel.HIGH,
            industry_vertical=IndustryVertical.EDUCATION,
            config=GuardrailConfig(
                enable_risk_assessment=True,
                risk_threshold=0.6,  # Strict for education
                block_on_high_risk=True,
                enable_content_moderation=True,
                toxicity_threshold=0.5,  # Very strict
                strict_mode=True,
                enable_pii_detection=True,
                block_on_pii=True,
                redact_pii=True,
                enable_jailbreak_detection=True,
                block_jailbreak_attempts=True,
                enable_prompt_injection_detection=True,
                block_prompt_injection=True,
                enforce_compliance=True,
                required_frameworks=["GDPR", "COPPA"],  # Children's privacy
                enable_threat_detection=True,
                log_threats=True,
                auto_block_known_threats=True,
                enable_failover=True,
                max_latency_ms=6000,
                log_all_requests=True,
                log_all_responses=True,
                retention_days=365
            ),
            description="Safe configuration for educational applications with student data protection",
            recommended_for=[
                "Educational platforms",
                "K-12 applications",
                "Student-facing AI",
                "Learning management systems"
            ]
        ))

        # ========================================
        # Open Source Models Presets
        # ========================================

        self.register_preset(ModelPreset(
            preset_id="llama-self-hosted-secure",
            name="Llama Self-Hosted - Secure",
            model_family="llama",
            provider="local",
            security_level=SecurityLevel.HIGH,
            industry_vertical=IndustryVertical.GENERAL,
            config=GuardrailConfig(
                enable_risk_assessment=True,
                risk_threshold=0.7,
                block_on_high_risk=True,
                enable_content_moderation=True,
                toxicity_threshold=0.7,
                strict_mode=False,
                enable_pii_detection=True,
                block_on_pii=True,
                redact_pii=True,
                enable_jailbreak_detection=True,
                block_jailbreak_attempts=True,
                enable_prompt_injection_detection=True,
                block_prompt_injection=True,
                enforce_compliance=True,
                required_frameworks=["GDPR"],
                enable_threat_detection=True,
                log_threats=True,
                auto_block_known_threats=True,
                enable_failover=False,  # Single self-hosted model
                max_latency_ms=10000,  # May be slower
                log_all_requests=True,
                log_all_responses=True,
                retention_days=365
            ),
            description="Secure configuration for self-hosted Llama models",
            recommended_for=[
                "On-premise deployments",
                "Air-gapped environments",
                "Data sovereignty requirements",
                "Cost-sensitive applications"
            ]
        ))

        # ========================================
        # Industry-Specific Presets
        # ========================================

        self.register_preset(ModelPreset(
            preset_id="government-max-security",
            name="Government - Maximum Security (FedRAMP)",
            model_family="azure-gpt-4",
            provider="azure",
            security_level=SecurityLevel.MAXIMUM,
            industry_vertical=IndustryVertical.GOVERNMENT,
            config=GuardrailConfig(
                enable_risk_assessment=True,
                risk_threshold=0.4,  # Extremely strict
                block_on_high_risk=True,
                enable_content_moderation=True,
                toxicity_threshold=0.5,
                strict_mode=True,
                enable_pii_detection=True,
                block_on_pii=True,
                redact_pii=True,
                enable_jailbreak_detection=True,
                block_jailbreak_attempts=True,
                enable_prompt_injection_detection=True,
                block_prompt_injection=True,
                enforce_compliance=True,
                required_frameworks=["ISO27001", "SOC2"],
                enable_threat_detection=True,
                log_threats=True,
                auto_block_known_threats=True,
                enable_failover=True,
                max_latency_ms=3000,
                log_all_requests=True,
                log_all_responses=True,
                retention_days=2555  # Long retention for government
            ),
            description="Maximum security configuration for government and defense applications",
            recommended_for=[
                "Government agencies",
                "Defense contractors",
                "Critical infrastructure",
                "National security applications"
            ]
        ))

        self.register_preset(ModelPreset(
            preset_id="retail-customer-facing",
            name="Retail - Customer Facing",
            model_family="gpt-3.5-turbo",
            provider="openai",
            security_level=SecurityLevel.BALANCED,
            industry_vertical=IndustryVertical.RETAIL,
            config=GuardrailConfig(
                enable_risk_assessment=True,
                risk_threshold=0.75,
                block_on_high_risk=True,
                enable_content_moderation=True,
                toxicity_threshold=0.7,
                strict_mode=False,
                enable_pii_detection=True,
                block_on_pii=False,  # May need to process customer data
                redact_pii=True,
                enable_jailbreak_detection=True,
                block_jailbreak_attempts=True,
                enable_prompt_injection_detection=True,
                block_prompt_injection=True,
                enforce_compliance=True,
                required_frameworks=["GDPR", "CCPA", "PCI_DSS"],
                enable_threat_detection=True,
                log_threats=True,
                auto_block_known_threats=True,
                enable_failover=True,
                max_latency_ms=2000,  # Fast for customer experience
                cost_optimization=True,
                log_all_requests=True,
                log_all_responses=True,
                retention_days=365
            ),
            description="Customer-facing AI for retail with balanced security and performance",
            recommended_for=[
                "E-commerce chatbots",
                "Customer service",
                "Product recommendations",
                "Virtual shopping assistants"
            ]
        ))

        # ========================================
        # Development Presets
        # ========================================

        self.register_preset(ModelPreset(
            preset_id="development-testing",
            name="Development - Testing Environment",
            model_family="any",
            provider="any",
            security_level=SecurityLevel.DEVELOPMENT,
            config=GuardrailConfig(
                enable_risk_assessment=True,
                risk_threshold=0.85,  # More permissive
                block_on_high_risk=False,  # Log but don't block
                enable_content_moderation=True,
                toxicity_threshold=0.8,
                strict_mode=False,
                enable_pii_detection=True,
                block_on_pii=False,
                redact_pii=False,
                enable_jailbreak_detection=True,
                block_jailbreak_attempts=False,  # Detect but don't block
                enable_prompt_injection_detection=True,
                block_prompt_injection=False,
                enforce_compliance=False,
                required_frameworks=[],
                enable_threat_detection=True,
                log_threats=True,
                auto_block_known_threats=False,
                enable_failover=False,
                max_latency_ms=30000,
                log_all_requests=True,
                log_all_responses=True,
                retention_days=30  # Short retention for dev
            ),
            description="Permissive configuration for development and testing (NOT FOR PRODUCTION)",
            recommended_for=[
                "Development environments",
                "Testing and QA",
                "Proof of concepts",
                "Experimentation"
            ]
        ))

    def register_preset(self, preset: ModelPreset):
        """Register a new preset"""
        self.presets[preset.preset_id] = preset

    def get_preset(self, preset_id: str) -> Optional[ModelPreset]:
        """Get a preset by ID"""
        return self.presets.get(preset_id)

    def list_presets(
        self,
        model_family: Optional[str] = None,
        provider: Optional[str] = None,
        security_level: Optional[SecurityLevel] = None,
        industry: Optional[IndustryVertical] = None
    ) -> List[ModelPreset]:
        """List presets with optional filters"""
        presets = list(self.presets.values())

        if model_family:
            presets = [p for p in presets if p.model_family == model_family]

        if provider:
            presets = [p for p in presets if p.provider == provider]

        if security_level:
            presets = [p for p in presets if p.security_level == security_level]

        if industry:
            presets = [p for p in presets if p.industry_vertical == industry]

        return presets

    def get_preset_summary(self) -> List[Dict[str, Any]]:
        """Get summary of all presets"""
        return [
            {
                "preset_id": p.preset_id,
                "name": p.name,
                "model_family": p.model_family,
                "provider": p.provider,
                "security_level": p.security_level.value,
                "industry": p.industry_vertical.value if p.industry_vertical else "General",
                "description": p.description
            }
            for p in self.presets.values()
        ]


# Singleton instance
_preset_manager = PresetManager()


def get_preset_manager() -> PresetManager:
    """Get the global preset manager instance"""
    return _preset_manager

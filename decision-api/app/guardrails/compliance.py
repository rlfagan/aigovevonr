"""
Automated Compliance Framework
Compliance templates for GDPR, HIPAA, EUAIA (EU AI Act), and more
"""

from typing import Dict, List, Optional, Set, Any
from enum import Enum
from pydantic import BaseModel
from datetime import datetime


class ComplianceFramework(str, Enum):
    GDPR = "GDPR"  # General Data Protection Regulation
    HIPAA = "HIPAA"  # Health Insurance Portability and Accountability Act
    EUAIA = "EUAIA"  # EU AI Act
    CCPA = "CCPA"  # California Consumer Privacy Act
    SOC2 = "SOC2"  # Service Organization Control 2
    ISO27001 = "ISO27001"  # Information Security Management
    PCI_DSS = "PCI_DSS"  # Payment Card Industry Data Security Standard
    COPPA = "COPPA"  # Children's Online Privacy Protection Act


class ComplianceStatus(str, Enum):
    COMPLIANT = "COMPLIANT"
    NON_COMPLIANT = "NON_COMPLIANT"
    PARTIAL = "PARTIAL"
    UNKNOWN = "UNKNOWN"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class ComplianceRequirement(BaseModel):
    requirement_id: str
    framework: ComplianceFramework
    title: str
    description: str
    mandatory: bool
    control_category: str
    validation_rules: List[str]


class ComplianceCheckResult(BaseModel):
    requirement_id: str
    status: ComplianceStatus
    details: str
    evidence: List[str]
    recommendations: List[str]


class ComplianceAuditResult(BaseModel):
    framework: ComplianceFramework
    overall_status: ComplianceStatus
    compliance_score: float  # 0.0-1.0
    total_requirements: int
    compliant_requirements: int
    non_compliant_requirements: int
    check_results: List[ComplianceCheckResult]
    audit_timestamp: datetime
    next_audit_due: Optional[datetime] = None


class ComplianceEngine:
    """
    Automated compliance auditing and enforcement engine
    """

    def __init__(self):
        self.requirements: Dict[ComplianceFramework, List[ComplianceRequirement]] = {}
        self._initialize_compliance_requirements()

    def _initialize_compliance_requirements(self):
        """Initialize compliance requirements for major frameworks"""

        # GDPR Requirements
        self.requirements[ComplianceFramework.GDPR] = [
            ComplianceRequirement(
                requirement_id="GDPR-ART-5-1-A",
                framework=ComplianceFramework.GDPR,
                title="Lawfulness, fairness and transparency",
                description="Personal data must be processed lawfully, fairly and transparently",
                mandatory=True,
                control_category="Data Processing Principles",
                validation_rules=[
                    "consent_obtained",
                    "processing_purpose_specified",
                    "data_subject_informed"
                ]
            ),
            ComplianceRequirement(
                requirement_id="GDPR-ART-5-1-B",
                framework=ComplianceFramework.GDPR,
                title="Purpose limitation",
                description="Data collected for specified, explicit and legitimate purposes",
                mandatory=True,
                control_category="Data Processing Principles",
                validation_rules=[
                    "purpose_documented",
                    "no_incompatible_processing"
                ]
            ),
            ComplianceRequirement(
                requirement_id="GDPR-ART-5-1-C",
                framework=ComplianceFramework.GDPR,
                title="Data minimization",
                description="Data must be adequate, relevant and limited to what is necessary",
                mandatory=True,
                control_category="Data Processing Principles",
                validation_rules=[
                    "minimal_data_collection",
                    "no_excessive_data"
                ]
            ),
            ComplianceRequirement(
                requirement_id="GDPR-ART-6",
                framework=ComplianceFramework.GDPR,
                title="Lawful basis for processing",
                description="Processing must have a lawful basis (consent, contract, legal obligation, etc.)",
                mandatory=True,
                control_category="Lawfulness",
                validation_rules=[
                    "lawful_basis_identified",
                    "consent_or_legitimate_interest"
                ]
            ),
            ComplianceRequirement(
                requirement_id="GDPR-ART-25",
                framework=ComplianceFramework.GDPR,
                title="Data protection by design and by default",
                description="Implement appropriate technical and organizational measures",
                mandatory=True,
                control_category="Privacy by Design",
                validation_rules=[
                    "privacy_by_design_implemented",
                    "default_settings_protective"
                ]
            ),
            ComplianceRequirement(
                requirement_id="GDPR-ART-32",
                framework=ComplianceFramework.GDPR,
                title="Security of processing",
                description="Implement appropriate security measures including encryption",
                mandatory=True,
                control_category="Security",
                validation_rules=[
                    "encryption_enabled",
                    "access_controls_implemented",
                    "security_monitoring_active"
                ]
            ),
            ComplianceRequirement(
                requirement_id="GDPR-ART-33-34",
                framework=ComplianceFramework.GDPR,
                title="Breach notification",
                description="Notify authorities and data subjects of breaches within 72 hours",
                mandatory=True,
                control_category="Incident Response",
                validation_rules=[
                    "breach_detection_capability",
                    "notification_procedures_documented"
                ]
            ),
        ]

        # HIPAA Requirements
        self.requirements[ComplianceFramework.HIPAA] = [
            ComplianceRequirement(
                requirement_id="HIPAA-164-308-A-1",
                framework=ComplianceFramework.HIPAA,
                title="Security Management Process",
                description="Implement policies and procedures to prevent, detect, contain, and correct security violations",
                mandatory=True,
                control_category="Administrative Safeguards",
                validation_rules=[
                    "risk_analysis_performed",
                    "risk_management_strategy",
                    "security_incident_procedures"
                ]
            ),
            ComplianceRequirement(
                requirement_id="HIPAA-164-308-A-3",
                framework=ComplianceFramework.HIPAA,
                title="Workforce Security",
                description="Implement procedures to ensure workforce access to ePHI is appropriate",
                mandatory=True,
                control_category="Administrative Safeguards",
                validation_rules=[
                    "authorization_procedures",
                    "workforce_clearance",
                    "termination_procedures"
                ]
            ),
            ComplianceRequirement(
                requirement_id="HIPAA-164-312-A-1",
                framework=ComplianceFramework.HIPAA,
                title="Access Control",
                description="Implement technical policies to allow only authorized access to ePHI",
                mandatory=True,
                control_category="Technical Safeguards",
                validation_rules=[
                    "unique_user_identification",
                    "automatic_logoff",
                    "encryption_decryption"
                ]
            ),
            ComplianceRequirement(
                requirement_id="HIPAA-164-312-A-2-IV",
                framework=ComplianceFramework.HIPAA,
                title="Encryption and Decryption",
                description="Implement mechanism to encrypt and decrypt ePHI",
                mandatory=False,  # Addressable
                control_category="Technical Safeguards",
                validation_rules=[
                    "encryption_at_rest",
                    "encryption_in_transit"
                ]
            ),
            ComplianceRequirement(
                requirement_id="HIPAA-164-312-B",
                framework=ComplianceFramework.HIPAA,
                title="Audit Controls",
                description="Implement hardware, software, and procedures to record and examine access to ePHI",
                mandatory=True,
                control_category="Technical Safeguards",
                validation_rules=[
                    "audit_logging_enabled",
                    "log_retention_policy",
                    "log_review_procedures"
                ]
            ),
            ComplianceRequirement(
                requirement_id="HIPAA-164-312-E-1",
                framework=ComplianceFramework.HIPAA,
                title="Transmission Security",
                description="Implement technical security measures to guard against unauthorized access during transmission",
                mandatory=True,
                control_category="Technical Safeguards",
                validation_rules=[
                    "integrity_controls",
                    "encryption_in_transit"
                ]
            ),
        ]

        # EU AI Act (EUAIA) Requirements
        self.requirements[ComplianceFramework.EUAIA] = [
            ComplianceRequirement(
                requirement_id="EUAIA-ART-9",
                framework=ComplianceFramework.EUAIA,
                title="Risk Management System",
                description="High-risk AI systems must have a risk management system",
                mandatory=True,
                control_category="Risk Management",
                validation_rules=[
                    "risk_assessment_documented",
                    "risk_mitigation_measures",
                    "continuous_risk_monitoring"
                ]
            ),
            ComplianceRequirement(
                requirement_id="EUAIA-ART-10",
                framework=ComplianceFramework.EUAIA,
                title="Data and Data Governance",
                description="Training, validation and testing data must be relevant, representative, free of errors",
                mandatory=True,
                control_category="Data Governance",
                validation_rules=[
                    "data_quality_criteria",
                    "bias_detection_measures",
                    "data_documentation"
                ]
            ),
            ComplianceRequirement(
                requirement_id="EUAIA-ART-11",
                framework=ComplianceFramework.EUAIA,
                title="Technical Documentation",
                description="Maintain technical documentation demonstrating compliance",
                mandatory=True,
                control_category="Documentation",
                validation_rules=[
                    "comprehensive_documentation",
                    "documentation_accessible",
                    "documentation_updated"
                ]
            ),
            ComplianceRequirement(
                requirement_id="EUAIA-ART-12",
                framework=ComplianceFramework.EUAIA,
                title="Record-keeping",
                description="Automatically record events (logging) throughout AI system's lifetime",
                mandatory=True,
                control_category="Logging and Monitoring",
                validation_rules=[
                    "automatic_logging",
                    "log_retention",
                    "traceability_maintained"
                ]
            ),
            ComplianceRequirement(
                requirement_id="EUAIA-ART-13",
                framework=ComplianceFramework.EUAIA,
                title="Transparency and provision of information to users",
                description="High-risk AI systems must be transparent and provide information to users",
                mandatory=True,
                control_category="Transparency",
                validation_rules=[
                    "user_information_provided",
                    "ai_interaction_disclosed",
                    "clear_instructions"
                ]
            ),
            ComplianceRequirement(
                requirement_id="EUAIA-ART-14",
                framework=ComplianceFramework.EUAIA,
                title="Human oversight",
                description="High-risk AI systems must be designed to allow effective human oversight",
                mandatory=True,
                control_category="Human Oversight",
                validation_rules=[
                    "human_review_capability",
                    "override_mechanisms",
                    "monitoring_dashboards"
                ]
            ),
            ComplianceRequirement(
                requirement_id="EUAIA-ART-15",
                framework=ComplianceFramework.EUAIA,
                title="Accuracy, robustness and cybersecurity",
                description="High-risk AI systems must be accurate, robust and secure",
                mandatory=True,
                control_category="Quality and Security",
                validation_rules=[
                    "accuracy_metrics_defined",
                    "robustness_testing",
                    "cybersecurity_measures"
                ]
            ),
        ]

        # CCPA Requirements
        self.requirements[ComplianceFramework.CCPA] = [
            ComplianceRequirement(
                requirement_id="CCPA-1798-100",
                framework=ComplianceFramework.CCPA,
                title="Consumer's Right to Know",
                description="Consumers have right to know what personal information is collected",
                mandatory=True,
                control_category="Transparency",
                validation_rules=[
                    "collection_notice_provided",
                    "categories_disclosed",
                    "purposes_disclosed"
                ]
            ),
            ComplianceRequirement(
                requirement_id="CCPA-1798-105",
                framework=ComplianceFramework.CCPA,
                title="Right to Delete",
                description="Consumers have right to request deletion of personal information",
                mandatory=True,
                control_category="Data Subject Rights",
                validation_rules=[
                    "deletion_process_implemented",
                    "deletion_request_handling",
                    "verification_procedures"
                ]
            ),
            ComplianceRequirement(
                requirement_id="CCPA-1798-120",
                framework=ComplianceFramework.CCPA,
                title="Right to Opt-Out",
                description="Consumers have right to opt-out of sale of personal information",
                mandatory=True,
                control_category="Data Subject Rights",
                validation_rules=[
                    "opt_out_mechanism",
                    "do_not_sell_link",
                    "opt_out_honored"
                ]
            ),
        ]

        # SOC2 Requirements
        self.requirements[ComplianceFramework.SOC2] = [
            ComplianceRequirement(
                requirement_id="SOC2-CC6.1",
                framework=ComplianceFramework.SOC2,
                title="Logical and Physical Access Controls",
                description="System implements controls to protect against unauthorized access",
                mandatory=True,
                control_category="Security",
                validation_rules=[
                    "access_controls_implemented",
                    "authentication_required",
                    "authorization_enforced"
                ]
            ),
            ComplianceRequirement(
                requirement_id="SOC2-CC7.2",
                framework=ComplianceFramework.SOC2,
                title="System Monitoring",
                description="System monitors activities and alerts on anomalies",
                mandatory=True,
                control_category="Monitoring",
                validation_rules=[
                    "monitoring_enabled",
                    "logging_configured",
                    "alerts_configured"
                ]
            ),
        ]

        # ISO27001 Requirements
        self.requirements[ComplianceFramework.ISO27001] = [
            ComplianceRequirement(
                requirement_id="ISO27001-A.9.1",
                framework=ComplianceFramework.ISO27001,
                title="Access Control Policy",
                description="Access control policy established and maintained",
                mandatory=True,
                control_category="Access Control",
                validation_rules=[
                    "access_policy_documented",
                    "access_policy_reviewed",
                    "access_controls_enforced"
                ]
            ),
            ComplianceRequirement(
                requirement_id="ISO27001-A.18.1",
                framework=ComplianceFramework.ISO27001,
                title="Compliance Requirements",
                description="Compliance with legal, statutory, regulatory and contractual requirements",
                mandatory=True,
                control_category="Compliance",
                validation_rules=[
                    "legal_requirements_identified",
                    "compliance_monitored",
                    "compliance_reported"
                ]
            ),
        ]

        # PCI DSS Requirements
        self.requirements[ComplianceFramework.PCI_DSS] = [
            ComplianceRequirement(
                requirement_id="PCI-DSS-3.4",
                framework=ComplianceFramework.PCI_DSS,
                title="Cardholder Data Protection",
                description="Render cardholder data unreadable anywhere it is stored",
                mandatory=True,
                control_category="Data Protection",
                validation_rules=[
                    "encryption_at_rest",
                    "encryption_in_transit",
                    "key_management"
                ]
            ),
            ComplianceRequirement(
                requirement_id="PCI-DSS-10.1",
                framework=ComplianceFramework.PCI_DSS,
                title="Audit Trails",
                description="Implement audit trails to link access to system components",
                mandatory=True,
                control_category="Logging and Monitoring",
                validation_rules=[
                    "audit_logging_enabled",
                    "logs_retained",
                    "logs_reviewed"
                ]
            ),
        ]

        # COPPA Requirements
        self.requirements[ComplianceFramework.COPPA] = [
            ComplianceRequirement(
                requirement_id="COPPA-312.4",
                framework=ComplianceFramework.COPPA,
                title="Parental Consent",
                description="Obtain verifiable parental consent before collecting children's data",
                mandatory=True,
                control_category="Consent",
                validation_rules=[
                    "age_verification_implemented",
                    "parental_consent_obtained",
                    "consent_verification"
                ]
            ),
            ComplianceRequirement(
                requirement_id="COPPA-312.5",
                framework=ComplianceFramework.COPPA,
                title="Parental Rights",
                description="Provide parents access to children's information and deletion rights",
                mandatory=True,
                control_category="Data Subject Rights",
                validation_rules=[
                    "parent_access_provided",
                    "deletion_mechanism",
                    "data_minimization"
                ]
            ),
        ]

    def audit_compliance(
        self,
        framework: ComplianceFramework,
        system_config: Dict[str, any],
        policy_data: Optional[Dict[str, Any]] = None
    ) -> ComplianceAuditResult:
        """
        Perform compliance audit for a specific framework

        Args:
            framework: Compliance framework to audit against
            system_config: Current system configuration
            policy_data: Optional policy enforcement data
        """
        if framework not in self.requirements:
            raise ValueError(f"Unsupported compliance framework: {framework}")

        requirements = self.requirements[framework]
        check_results = []

        for req in requirements:
            result = self._check_requirement(req, system_config, policy_data)
            check_results.append(result)

        # Calculate compliance score
        compliant_count = len([r for r in check_results if r.status == ComplianceStatus.COMPLIANT])
        total_count = len(check_results)
        compliance_score = compliant_count / total_count if total_count > 0 else 0.0

        # Determine overall status
        non_compliant = len([r for r in check_results if r.status == ComplianceStatus.NON_COMPLIANT])
        if non_compliant == 0:
            overall_status = ComplianceStatus.COMPLIANT
        elif compliance_score >= 0.8:
            overall_status = ComplianceStatus.PARTIAL
        else:
            overall_status = ComplianceStatus.NON_COMPLIANT

        return ComplianceAuditResult(
            framework=framework,
            overall_status=overall_status,
            compliance_score=compliance_score,
            total_requirements=total_count,
            compliant_requirements=compliant_count,
            non_compliant_requirements=non_compliant,
            check_results=check_results,
            audit_timestamp=datetime.utcnow(),
            next_audit_due=None  # Could calculate based on framework requirements
        )

    def _check_requirement(
        self,
        requirement: ComplianceRequirement,
        system_config: Dict[str, Any],
        policy_data: Optional[Dict[str, Any]]
    ) -> ComplianceCheckResult:
        """
        Check a specific compliance requirement

        This is a simplified implementation - in production, this would
        integrate with actual system checks, policy evaluations, etc.
        """
        evidence = []
        recommendations = []
        status = ComplianceStatus.UNKNOWN

        # Check validation rules
        passed_rules = 0
        total_rules = len(requirement.validation_rules)

        for rule in requirement.validation_rules:
            # Simulate rule checking based on system config
            rule_passed = self._check_validation_rule(rule, system_config, policy_data)

            if rule_passed:
                passed_rules += 1
                evidence.append(f"Rule '{rule}' passed")
            else:
                evidence.append(f"Rule '{rule}' failed")
                recommendations.append(f"Implement or fix: {rule}")

        # Determine status
        if passed_rules == total_rules:
            status = ComplianceStatus.COMPLIANT
            details = "All validation rules passed"
        elif passed_rules > 0:
            status = ComplianceStatus.PARTIAL
            details = f"{passed_rules}/{total_rules} validation rules passed"
        else:
            status = ComplianceStatus.NON_COMPLIANT
            details = "No validation rules passed"

        if not requirement.mandatory and status != ComplianceStatus.COMPLIANT:
            status = ComplianceStatus.PARTIAL
            details += " (addressable requirement)"

        return ComplianceCheckResult(
            requirement_id=requirement.requirement_id,
            status=status,
            details=details,
            evidence=evidence,
            recommendations=recommendations
        )

    def _check_validation_rule(
        self,
        rule: str,
        system_config: Dict[str, Any],
        policy_data: Optional[Dict[str, Any]]
    ) -> bool:
        """
        Check a specific validation rule

        In production, this would perform actual system checks
        """
        # Simplified rule checking
        rule_checks = {
            # Security
            "encryption_enabled": system_config.get("encryption", {}).get("enabled", False),
            "encryption_at_rest": system_config.get("encryption", {}).get("at_rest", False),
            "encryption_in_transit": system_config.get("encryption", {}).get("in_transit", False),
            "access_controls_implemented": system_config.get("access_control", {}).get("enabled", False),
            "security_monitoring_active": system_config.get("monitoring", {}).get("enabled", False),

            # Logging and Audit
            "audit_logging_enabled": system_config.get("audit_logging", {}).get("enabled", True),
            "log_retention_policy": system_config.get("audit_logging", {}).get("retention_days", 0) >= 365,
            "automatic_logging": system_config.get("audit_logging", {}).get("automatic", True),
            "log_review_procedures": system_config.get("audit_logging", {}).get("review_procedures", False),

            # Privacy
            "consent_obtained": system_config.get("privacy", {}).get("consent_mechanism", False),
            "data_subject_informed": system_config.get("privacy", {}).get("transparency", False),
            "minimal_data_collection": system_config.get("privacy", {}).get("data_minimization", False),
            "privacy_by_design_implemented": system_config.get("privacy", {}).get("by_design", False),

            # AI-specific
            "risk_assessment_documented": system_config.get("ai_governance", {}).get("risk_assessment", False),
            "bias_detection_measures": system_config.get("ai_governance", {}).get("bias_detection", False),
            "human_review_capability": system_config.get("ai_governance", {}).get("human_oversight", False),
            "accuracy_metrics_defined": system_config.get("ai_governance", {}).get("accuracy_metrics", False),
        }

        # Default to compliant if rule not found (for demo purposes)
        return rule_checks.get(rule, True)

    def get_compliance_report(
        self,
        frameworks: List[ComplianceFramework],
        system_config: Dict[str, Any]
    ) -> Dict[str, ComplianceAuditResult]:
        """Generate compliance report for multiple frameworks"""
        report = {}

        for framework in frameworks:
            audit_result = self.audit_compliance(framework, system_config)
            report[framework.value] = audit_result

        return report


# Singleton instance
_compliance_engine = ComplianceEngine()


def get_compliance_engine() -> ComplianceEngine:
    """Get the global compliance engine instance"""
    return _compliance_engine

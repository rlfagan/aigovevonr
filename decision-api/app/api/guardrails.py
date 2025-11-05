"""
AI Guardrails API
F5-equivalent runtime security for AI models
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.guardrails.risk_assessment import (
    get_risk_assessor,
    RiskAssessmentResult,
    RiskLevel,
    RiskCategory
)
from app.guardrails.content_moderation import (
    get_content_moderator,
    ModerationResult,
    ToxicityLevel
)
from app.guardrails.model_routing import (
    get_model_router,
    RoutingDecision,
    ModelCapability,
    ModelStatus
)
from app.guardrails.compliance import (
    get_compliance_engine,
    ComplianceFramework,
    ComplianceAuditResult
)
from app.guardrails.red_team import (
    get_red_team,
    ThreatIntelligence,
    SecurityIncident,
    RedTeamReport,
    ThreatCategory,
    ThreatLevel
)
from app.guardrails.presets import (
    get_preset_manager,
    ModelPreset,
    SecurityLevel as PresetSecurityLevel,
    IndustryVertical
)

router = APIRouter(prefix="/api/guardrails", tags=["AI Guardrails"])


# ==========================================
# REQUEST/RESPONSE MODELS
# ==========================================

class PromptAnalysisRequest(BaseModel):
    prompt: str = Field(..., description="User prompt to analyze")
    user_email: Optional[str] = None
    model_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = {}


class ResponseAnalysisRequest(BaseModel):
    response: str = Field(..., description="AI response to analyze")
    prompt: Optional[str] = None
    model_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = {}


class GuardrailsDecision(BaseModel):
    allowed: bool
    decision: str  # ALLOW, BLOCK, REVIEW
    risk_assessment: Optional[RiskAssessmentResult] = None
    content_moderation: Optional[ModerationResult] = None
    threats_detected: List[ThreatIntelligence] = []
    recommendation: str
    metadata: Dict[str, Any] = {}


class ModelRouteRequest(BaseModel):
    capability: str = Field(..., description="Required capability (e.g., 'chat', 'code_generation')")
    user_preference: Optional[str] = None
    max_cost: Optional[float] = None
    require_low_latency: bool = False


class ComplianceAuditRequest(BaseModel):
    framework: str = Field(..., description="Compliance framework (GDPR, HIPAA, EUAIA, etc.)")
    system_config: Dict[str, Any] = Field(default_factory=dict)
    policy_data: Optional[Dict[str, Any]] = None


# ==========================================
# PROMPT/RESPONSE ANALYSIS ENDPOINTS
# ==========================================

@router.post("/analyze/prompt", response_model=GuardrailsDecision)
async def analyze_prompt(request: PromptAnalysisRequest):
    """
    Analyze a user prompt before sending to AI model

    Performs:
    - Risk assessment
    - Content moderation
    - Threat detection (jailbreak, prompt injection, etc.)
    """
    risk_assessor = get_risk_assessor()
    content_moderator = get_content_moderator()
    red_team = get_red_team()

    # Risk assessment
    risk_result = risk_assessor.assess_prompt(request.prompt, request.context)

    # Content moderation
    moderation_result = content_moderator.moderate_content(request.prompt)

    # Threat detection
    threats = red_team.analyze_threat(request.prompt, {
        "user": request.user_email,
        "model": request.model_id,
        **request.context
    })

    # Make decision
    should_block = (
        risk_result.should_block or
        moderation_result.should_block or
        any(t.threat_level in [ThreatLevel.CRITICAL, ThreatLevel.HIGH] for t in threats)
    )

    should_review = (
        risk_result.should_review or
        (moderation_result.is_toxic and not moderation_result.should_block)
    )

    # Log threats as incidents
    if threats and request.user_email:
        for threat in threats:
            red_team.create_incident(
                user_email=request.user_email,
                threat_category=threat.category,
                threat_level=threat.threat_level,
                attack_vector=threat.attack_pattern,
                payload=request.prompt[:500],
                detected_by=["risk_assessor", "content_moderator", "red_team"],
                blocked=should_block
            )

    # Generate recommendation
    if should_block:
        decision = "BLOCK"
        recommendation = "Request blocked due to security risks. "
        if risk_result.should_block:
            recommendation += f"Risk: {risk_result.risk_level.value}. "
        if moderation_result.should_block:
            recommendation += f"Content: {moderation_result.toxicity_level.value}. "
        if threats:
            recommendation += f"Threats: {', '.join([t.attack_pattern for t in threats])}."
    elif should_review:
        decision = "REVIEW"
        recommendation = "Manual review recommended before processing."
    else:
        decision = "ALLOW"
        recommendation = "Prompt passes all security checks."

    return GuardrailsDecision(
        allowed=not should_block,
        decision=decision,
        risk_assessment=risk_result,
        content_moderation=moderation_result,
        threats_detected=threats,
        recommendation=recommendation,
        metadata={
            "overall_risk_score": risk_result.overall_risk_score,
            "toxicity_score": moderation_result.toxicity_score,
            "threat_count": len(threats)
        }
    )


@router.post("/analyze/response", response_model=GuardrailsDecision)
async def analyze_response(request: ResponseAnalysisRequest):
    """
    Analyze an AI model response before returning to user

    Performs:
    - Risk assessment for data leakage
    - Content moderation for harmful output
    - Compliance checks
    """
    risk_assessor = get_risk_assessor()
    content_moderator = get_content_moderator()

    # Risk assessment (check for PII leakage, etc.)
    risk_result = risk_assessor.assess_response(request.response, request.context)

    # Content moderation
    moderation_result = content_moderator.moderate_content(request.response)

    # Make decision
    should_block = risk_result.should_block or moderation_result.should_block
    should_review = risk_result.should_review

    # Generate recommendation
    if should_block:
        decision = "BLOCK"
        if moderation_result.redacted_content:
            recommendation = "Response blocked. Consider using redacted version."
        else:
            recommendation = "Response blocked due to security/compliance violations."
    elif should_review:
        decision = "REVIEW"
        recommendation = "Response requires review before delivery."
    else:
        decision = "ALLOW"
        recommendation = "Response passes all security checks."

    return GuardrailsDecision(
        allowed=not should_block,
        decision=decision,
        risk_assessment=risk_result,
        content_moderation=moderation_result,
        threats_detected=[],
        recommendation=recommendation,
        metadata={
            "overall_risk_score": risk_result.overall_risk_score,
            "toxicity_score": moderation_result.toxicity_score,
            "redacted_available": moderation_result.redacted_content is not None
        }
    )


# ==========================================
# MODEL ROUTING ENDPOINTS
# ==========================================

@router.post("/route/model", response_model=RoutingDecision)
async def route_model_request(request: ModelRouteRequest):
    """
    Route request to optimal AI model with failover support

    Selects best model based on:
    - Required capability
    - Availability/health
    - Performance requirements
    - Cost constraints
    """
    router_instance = get_model_router()

    # Map capability string to enum
    try:
        capability = ModelCapability(request.capability)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid capability. Must be one of: {', '.join([c.value for c in ModelCapability])}"
        )

    try:
        routing_decision = router_instance.route_request(
            capability=capability,
            user_preference=request.user_preference,
            max_cost=request.max_cost,
            require_low_latency=request.require_low_latency
        )
        return routing_decision
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/route/health")
async def get_models_health():
    """Get health status for all registered models"""
    router_instance = get_model_router()
    return {
        "models": router_instance.get_all_models_status(),
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/route/health/check")
async def trigger_health_check():
    """Trigger health check for all models"""
    router_instance = get_model_router()
    await router_instance.health_check_all()
    return {
        "status": "completed",
        "message": "Health check completed for all models",
        "timestamp": datetime.utcnow().isoformat()
    }


# ==========================================
# COMPLIANCE ENDPOINTS
# ==========================================

@router.post("/compliance/audit", response_model=ComplianceAuditResult)
async def audit_compliance(request: ComplianceAuditRequest):
    """
    Perform compliance audit for specified framework

    Supports: GDPR, HIPAA, EUAIA (EU AI Act), CCPA, SOC2, ISO27001, PCI-DSS, COPPA
    """
    compliance_engine = get_compliance_engine()

    # Map framework string to enum
    try:
        framework = ComplianceFramework(request.framework.upper())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid framework. Must be one of: {', '.join([f.value for f in ComplianceFramework])}"
        )

    audit_result = compliance_engine.audit_compliance(
        framework=framework,
        system_config=request.system_config,
        policy_data=request.policy_data
    )

    return audit_result


@router.get("/compliance/frameworks")
async def list_compliance_frameworks():
    """List all supported compliance frameworks"""
    return {
        "frameworks": [
            {
                "id": f.value,
                "name": f.value,
                "description": _get_framework_description(f)
            }
            for f in ComplianceFramework
        ]
    }


def _get_framework_description(framework: ComplianceFramework) -> str:
    """Get description for compliance framework"""
    descriptions = {
        ComplianceFramework.GDPR: "General Data Protection Regulation (EU)",
        ComplianceFramework.HIPAA: "Health Insurance Portability and Accountability Act (US)",
        ComplianceFramework.EUAIA: "EU AI Act - Regulation for Artificial Intelligence",
        ComplianceFramework.CCPA: "California Consumer Privacy Act",
        ComplianceFramework.SOC2: "Service Organization Control 2",
        ComplianceFramework.ISO27001: "Information Security Management",
        ComplianceFramework.PCI_DSS: "Payment Card Industry Data Security Standard",
        ComplianceFramework.COPPA: "Children's Online Privacy Protection Act"
    }
    return descriptions.get(framework, "")


# ==========================================
# THREAT INTELLIGENCE ENDPOINTS
# ==========================================

@router.get("/threats/report", response_model=RedTeamReport)
async def get_threat_report(
    days: int = Query(7, description="Number of days to include in report")
):
    """
    Generate AI Red Team threat intelligence report

    Includes:
    - Threat statistics
    - Attack vectors
    - Trending threats
    - Security recommendations
    """
    red_team = get_red_team()

    start_date = datetime.utcnow() - __import__('datetime').timedelta(days=days)
    report = red_team.get_threat_report(start_date=start_date)

    return report


@router.get("/threats/vectors")
async def get_attack_vectors():
    """Get statistics for all known attack vectors"""
    red_team = get_red_team()
    return {
        "attack_vectors": red_team.get_attack_vector_stats(),
        "total_vectors": len(red_team.attack_vectors),
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/threats/incidents")
async def get_recent_incidents(
    limit: int = Query(50, description="Maximum number of incidents to return")
):
    """Get recent security incidents"""
    red_team = get_red_team()

    # Get most recent incidents
    incidents = sorted(
        red_team.incidents,
        key=lambda x: x.timestamp,
        reverse=True
    )[:limit]

    return {
        "incidents": [
            {
                "incident_id": inc.incident_id,
                "timestamp": inc.timestamp.isoformat(),
                "user_email": inc.user_email,
                "threat_category": inc.threat_category.value,
                "threat_level": inc.threat_level.value,
                "attack_vector": inc.attack_vector,
                "blocked": inc.blocked,
                "investigation_status": inc.investigation_status
            }
            for inc in incidents
        ],
        "total_incidents": len(red_team.incidents),
        "returned": len(incidents)
    }


# ==========================================
# PRESET CONFIGURATION ENDPOINTS
# ==========================================

@router.get("/presets", response_model=List[Dict[str, Any]])
async def list_presets(
    model_family: Optional[str] = Query(None, description="Filter by model family"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    security_level: Optional[str] = Query(None, description="Filter by security level"),
    industry: Optional[str] = Query(None, description="Filter by industry vertical")
):
    """
    List available configuration presets

    Model-agnostic presets for popular AI models and use cases
    """
    preset_mgr = get_preset_manager()

    # Convert string parameters to enums if provided
    security_enum = None
    if security_level:
        try:
            security_enum = PresetSecurityLevel(security_level.upper())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid security level: {security_level}")

    industry_enum = None
    if industry:
        try:
            industry_enum = IndustryVertical(industry.upper())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid industry: {industry}")

    presets = preset_mgr.list_presets(
        model_family=model_family,
        provider=provider,
        security_level=security_enum,
        industry=industry_enum
    )

    return [
        {
            "preset_id": p.preset_id,
            "name": p.name,
            "model_family": p.model_family,
            "provider": p.provider,
            "security_level": p.security_level.value,
            "industry": p.industry_vertical.value if p.industry_vertical else None,
            "description": p.description,
            "recommended_for": p.recommended_for
        }
        for p in presets
    ]


@router.get("/presets/{preset_id}", response_model=ModelPreset)
async def get_preset(preset_id: str):
    """Get detailed configuration for a specific preset"""
    preset_mgr = get_preset_manager()

    preset = preset_mgr.get_preset(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset not found: {preset_id}")

    return preset


# ==========================================
# DASHBOARD/STATS ENDPOINTS
# ==========================================

@router.get("/dashboard/summary")
async def get_dashboard_summary():
    """
    Get comprehensive dashboard summary

    Includes statistics from all guardrail systems
    """
    risk_assessor = get_risk_assessor()
    content_moderator = get_content_moderator()
    red_team = get_red_team()
    router_instance = get_model_router()

    # Get threat statistics
    recent_threats = red_team.get_threat_report(
        start_date=datetime.utcnow() - __import__('datetime').timedelta(days=1)
    )

    # Get model health
    models_status = router_instance.get_all_models_status()
    healthy_models = len([m for m in models_status if m.get("status") == "HEALTHY"])

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "threats": {
            "last_24h": recent_threats.total_threats_detected,
            "blocked": recent_threats.blocked_attacks,
            "by_category": {k.value: v for k, v in recent_threats.threats_by_category.items()},
            "by_level": {k.value: v for k, v in recent_threats.threats_by_level.items()}
        },
        "models": {
            "total": len(models_status),
            "healthy": healthy_models,
            "degraded": len([m for m in models_status if m.get("status") == "DEGRADED"]),
            "unavailable": len([m for m in models_status if m.get("status") == "UNAVAILABLE"])
        },
        "recommendations": recent_threats.recommendations
    }


@router.get("/health")
async def guardrails_health():
    """Health check for guardrails system"""
    return {
        "status": "healthy",
        "components": {
            "risk_assessment": "operational",
            "content_moderation": "operational",
            "model_routing": "operational",
            "compliance": "operational",
            "red_team": "operational",
            "presets": "operational"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

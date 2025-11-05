"""
AI Risk Assessment Framework
Tailored risk evaluation for foundational and in-house models
"""

from typing import Dict, List, Optional, Any
from enum import Enum
from pydantic import BaseModel
import re
import json


class RiskLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    MINIMAL = "MINIMAL"


class RiskCategory(str, Enum):
    DATA_LEAKAGE = "DATA_LEAKAGE"
    HARMFUL_OUTPUT = "HARMFUL_OUTPUT"
    ADVERSARIAL_ATTACK = "ADVERSARIAL_ATTACK"
    COMPLIANCE_VIOLATION = "COMPLIANCE_VIOLATION"
    BIAS_DISCRIMINATION = "BIAS_DISCRIMINATION"
    MISINFORMATION = "MISINFORMATION"
    PROMPT_INJECTION = "PROMPT_INJECTION"
    JAILBREAK_ATTEMPT = "JAILBREAK_ATTEMPT"


class RiskFactor(BaseModel):
    category: RiskCategory
    severity: RiskLevel
    score: int  # 0-100
    confidence: float  # 0.0-1.0
    evidence: List[str]
    mitigation: Optional[str] = None


class RiskAssessmentResult(BaseModel):
    overall_risk_score: int  # 0-100
    risk_level: RiskLevel
    risk_factors: List[RiskFactor]
    recommendations: List[str]
    should_block: bool
    should_review: bool


class AIRiskAssessor:
    """
    Comprehensive AI risk assessment engine
    Evaluates prompts, responses, and model interactions for security risks
    """

    # Patterns for detecting various risks
    PII_PATTERNS = {
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
        "credit_card": r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
        "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        "phone": r"\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b",
        "ip_address": r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
        "api_key": r"(?i)(api[_-]?key|apikey|access[_-]?token|secret[_-]?key)[\s:=]+['\"]?([a-zA-Z0-9_\-]{20,})['\"]?",
    }

    # Jailbreak attempt patterns
    JAILBREAK_PATTERNS = [
        r"(?i)ignore (previous|above|all|your) (instructions|rules|guidelines|directives)",
        r"(?i)you (are|must) now (in|a) (DAN|developer|jailbreak|unrestricted) mode",
        r"(?i)(pretend|act|behave) (as if|like) you (have no|don't have) (restrictions|limitations|rules)",
        r"(?i)disregard (your|all) (programming|training|guidelines|safety)",
        r"(?i)from now on.*respond (only|directly) (to|with)",
        r"(?i)you will now (forget|ignore) (your|all) (constraints|limitations)",
    ]

    # Prompt injection patterns
    PROMPT_INJECTION_PATTERNS = [
        r"(?i)(system|assistant|user):\s*\n",
        r"(?i)###?\s*(instruction|system|prompt)s?\s*:",
        r"(?i)<\|?(system|im_start|endoftext|user)\|?>",
        r"(?i)ignore the (above|previous) and (instead|now)",
    ]

    # Harmful content indicators
    HARMFUL_CONTENT_PATTERNS = [
        r"(?i)(how to|ways to|methods to).{0,50}(harm|hurt|kill|assassinate|murder)",
        r"(?i)(build|make|create|manufacture).{0,30}(bomb|explosive|weapon)",
        r"(?i)(hack|exploit|breach|compromise).{0,30}(system|network|database|account)",
        r"(?i)(child|minor|underage).{0,30}(sexual|explicit|abuse)",
        r"(?i)(suicide|self-harm).{0,30}(method|way|how to)",
    ]

    # Bias and discrimination patterns
    BIAS_PATTERNS = [
        r"(?i)(all|every|most).{0,20}(women|men|blacks|whites|asians|muslims|jews|gays).{0,30}(are|should be|deserve)",
        r"(?i)(inferior|superior).{0,20}(race|ethnicity|gender|religion)",
    ]

    # Proprietary/confidential markers
    CONFIDENTIAL_PATTERNS = [
        r"(?i)@proprietary",
        r"(?i)CONFIDENTIAL",
        r"(?i)INTERNAL\s+ONLY",
        r"(?i)TRADE\s+SECRET",
        r"(?i)DO\s+NOT\s+SHARE",
        r"(?i)RESTRICTED\s+ACCESS",
    ]

    def __init__(self):
        self.enabled = True

    def assess_prompt(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> RiskAssessmentResult:
        """
        Assess risks in a user prompt before sending to AI model
        """
        risk_factors = []

        # Check for PII/data leakage
        pii_risks = self._check_pii(prompt)
        risk_factors.extend(pii_risks)

        # Check for jailbreak attempts
        jailbreak_risks = self._check_jailbreak_attempts(prompt)
        risk_factors.extend(jailbreak_risks)

        # Check for prompt injection
        injection_risks = self._check_prompt_injection(prompt)
        risk_factors.extend(injection_risks)

        # Check for harmful content requests
        harmful_risks = self._check_harmful_content(prompt)
        risk_factors.extend(harmful_risks)

        # Check for confidential markers
        confidential_risks = self._check_confidential_content(prompt)
        risk_factors.extend(confidential_risks)

        # Calculate overall risk
        return self._calculate_overall_risk(risk_factors)

    def assess_response(self, response: str, context: Optional[Dict[str, Any]] = None) -> RiskAssessmentResult:
        """
        Assess risks in AI model response before returning to user
        """
        risk_factors = []

        # Check for PII in response
        pii_risks = self._check_pii(response)
        risk_factors.extend(pii_risks)

        # Check for harmful output
        harmful_risks = self._check_harmful_content(response)
        risk_factors.extend(harmful_risks)

        # Check for bias/discrimination
        bias_risks = self._check_bias_discrimination(response)
        risk_factors.extend(bias_risks)

        # Check for confidential data leakage
        confidential_risks = self._check_confidential_content(response)
        risk_factors.extend(confidential_risks)

        return self._calculate_overall_risk(risk_factors)

    def _check_pii(self, content: str) -> List[RiskFactor]:
        """Detect PII/sensitive data"""
        risk_factors = []
        detected_types = []

        for pii_type, pattern in self.PII_PATTERNS.items():
            matches = re.findall(pattern, content)
            if matches:
                detected_types.append(pii_type)

                # Determine severity based on type
                severity = RiskLevel.CRITICAL if pii_type in ["ssn", "credit_card", "api_key"] else RiskLevel.HIGH
                score = 90 if severity == RiskLevel.CRITICAL else 70

                risk_factors.append(RiskFactor(
                    category=RiskCategory.DATA_LEAKAGE,
                    severity=severity,
                    score=score,
                    confidence=0.95,
                    evidence=[f"Detected {pii_type}: {len(matches)} occurrence(s)"],
                    mitigation=f"Remove or redact {pii_type} before processing"
                ))

        return risk_factors

    def _check_jailbreak_attempts(self, content: str) -> List[RiskFactor]:
        """Detect jailbreak/manipulation attempts"""
        risk_factors = []

        for pattern in self.JAILBREAK_PATTERNS:
            if re.search(pattern, content):
                risk_factors.append(RiskFactor(
                    category=RiskCategory.JAILBREAK_ATTEMPT,
                    severity=RiskLevel.HIGH,
                    score=85,
                    confidence=0.90,
                    evidence=[f"Jailbreak pattern detected: {pattern[:50]}..."],
                    mitigation="Block request and log for security review"
                ))
                break  # One detection is enough

        return risk_factors

    def _check_prompt_injection(self, content: str) -> List[RiskFactor]:
        """Detect prompt injection attempts"""
        risk_factors = []

        for pattern in self.PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, content):
                risk_factors.append(RiskFactor(
                    category=RiskCategory.PROMPT_INJECTION,
                    severity=RiskLevel.HIGH,
                    score=80,
                    confidence=0.85,
                    evidence=[f"Prompt injection pattern detected"],
                    mitigation="Sanitize input and apply strict prompt template"
                ))
                break

        return risk_factors

    def _check_harmful_content(self, content: str) -> List[RiskFactor]:
        """Detect harmful/dangerous content"""
        risk_factors = []

        for pattern in self.HARMFUL_CONTENT_PATTERNS:
            if re.search(pattern, content):
                risk_factors.append(RiskFactor(
                    category=RiskCategory.HARMFUL_OUTPUT,
                    severity=RiskLevel.CRITICAL,
                    score=95,
                    confidence=0.88,
                    evidence=["Potentially harmful content detected"],
                    mitigation="Block immediately and alert security team"
                ))
                break

        return risk_factors

    def _check_bias_discrimination(self, content: str) -> List[RiskFactor]:
        """Detect bias and discriminatory content"""
        risk_factors = []

        for pattern in self.BIAS_PATTERNS:
            if re.search(pattern, content):
                risk_factors.append(RiskFactor(
                    category=RiskCategory.BIAS_DISCRIMINATION,
                    severity=RiskLevel.HIGH,
                    score=75,
                    confidence=0.75,
                    evidence=["Potentially biased or discriminatory content detected"],
                    mitigation="Review for bias, consider content moderation"
                ))
                break

        return risk_factors

    def _check_confidential_content(self, content: str) -> List[RiskFactor]:
        """Detect confidential/proprietary markers"""
        risk_factors = []
        detected = []

        for pattern in self.CONFIDENTIAL_PATTERNS:
            if re.search(pattern, content):
                detected.append(pattern)

        if detected:
            risk_factors.append(RiskFactor(
                category=RiskCategory.COMPLIANCE_VIOLATION,
                severity=RiskLevel.CRITICAL,
                score=90,
                confidence=0.98,
                evidence=[f"Confidential markers detected: {len(detected)}"],
                mitigation="Block and require manual review"
            ))

        return risk_factors

    def _calculate_overall_risk(self, risk_factors: List[RiskFactor]) -> RiskAssessmentResult:
        """Calculate overall risk score and recommendations"""
        if not risk_factors:
            return RiskAssessmentResult(
                overall_risk_score=0,
                risk_level=RiskLevel.MINIMAL,
                risk_factors=[],
                recommendations=["No significant risks detected"],
                should_block=False,
                should_review=False
            )

        # Calculate weighted average score
        total_score = sum(rf.score * rf.confidence for rf in risk_factors)
        total_weight = sum(rf.confidence for rf in risk_factors)
        overall_score = int(total_score / total_weight) if total_weight > 0 else 0

        # Determine risk level
        if overall_score >= 85:
            risk_level = RiskLevel.CRITICAL
        elif overall_score >= 70:
            risk_level = RiskLevel.HIGH
        elif overall_score >= 50:
            risk_level = RiskLevel.MEDIUM
        elif overall_score >= 30:
            risk_level = RiskLevel.LOW
        else:
            risk_level = RiskLevel.MINIMAL

        # Determine actions
        should_block = risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH]
        should_review = risk_level in [RiskLevel.HIGH, RiskLevel.MEDIUM]

        # Generate recommendations
        recommendations = self._generate_recommendations(risk_factors, risk_level)

        return RiskAssessmentResult(
            overall_risk_score=overall_score,
            risk_level=risk_level,
            risk_factors=risk_factors,
            recommendations=recommendations,
            should_block=should_block,
            should_review=should_review
        )

    def _generate_recommendations(self, risk_factors: List[RiskFactor], risk_level: RiskLevel) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        # Category-specific recommendations
        categories = {rf.category for rf in risk_factors}

        if RiskCategory.DATA_LEAKAGE in categories:
            recommendations.append("Enable DLP scanning and PII redaction")
            recommendations.append("Implement data loss prevention policies")

        if RiskCategory.JAILBREAK_ATTEMPT in categories or RiskCategory.PROMPT_INJECTION in categories:
            recommendations.append("Apply input sanitization and validation")
            recommendations.append("Enable advanced prompt protection")

        if RiskCategory.HARMFUL_OUTPUT in categories:
            recommendations.append("Enable content moderation filters")
            recommendations.append("Implement human review for flagged content")

        if RiskCategory.COMPLIANCE_VIOLATION in categories:
            recommendations.append("Review compliance requirements (GDPR, HIPAA, etc.)")
            recommendations.append("Ensure proper data classification and handling")

        # General recommendations based on risk level
        if risk_level == RiskLevel.CRITICAL:
            recommendations.append("IMMEDIATE ACTION REQUIRED: Block request and alert security team")
        elif risk_level == RiskLevel.HIGH:
            recommendations.append("Require manual review before proceeding")
        elif risk_level == RiskLevel.MEDIUM:
            recommendations.append("Log for audit and consider additional monitoring")

        return recommendations


# Singleton instance
_risk_assessor = AIRiskAssessor()


def get_risk_assessor() -> AIRiskAssessor:
    """Get the global risk assessor instance"""
    return _risk_assessor

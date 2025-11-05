"""
Content Moderation Engine
Filters toxic, biased, and inaccurate content in AI interactions
"""

from typing import Dict, List, Optional, Set
from enum import Enum
from pydantic import BaseModel
import re


class ToxicityLevel(str, Enum):
    SEVERE = "SEVERE"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"
    CLEAN = "CLEAN"


class ToxicityCategory(str, Enum):
    PROFANITY = "PROFANITY"
    HATE_SPEECH = "HATE_SPEECH"
    SEXUAL_CONTENT = "SEXUAL_CONTENT"
    VIOLENCE = "VIOLENCE"
    HARASSMENT = "HARASSMENT"
    THREAT = "THREAT"
    IDENTITY_ATTACK = "IDENTITY_ATTACK"
    INSULT = "INSULT"


class ModerationResult(BaseModel):
    is_toxic: bool
    toxicity_score: float  # 0.0-1.0
    toxicity_level: ToxicityLevel
    categories: List[ToxicityCategory]
    flagged_content: List[str]
    should_block: bool
    redacted_content: Optional[str] = None


class ContentModerator:
    """
    Content moderation system for detecting and filtering harmful content
    """

    # Profanity patterns (sample - expand with more comprehensive lists)
    PROFANITY_WORDS = {
        "fuck", "shit", "ass", "bitch", "damn", "bastard", "crap",
        "piss", "dick", "pussy", "cock", "whore", "slut", "fag"
    }

    # Hate speech indicators
    HATE_SPEECH_PATTERNS = [
        r"(?i)\b(n[i1]gg[ae]r|n[i1]gg[ae]|n[1i]gg[0o]|k[i1]ke|ch[i1]nk|sp[i1]c|beaner|wetback)\b",
        r"(?i)(death to|kill all|exterminate|genocide).{0,20}(jews|muslims|christians|blacks|whites|gays)",
        r"(?i)(sub-human|inferior race|master race)",
    ]

    # Sexual content patterns
    SEXUAL_CONTENT_PATTERNS = [
        r"(?i)\b(porn|pornography|xxx|sex|nude|naked|erotic)\b",
        r"(?i)(sexual|sexually).{0,20}(explicit|graphic|aroused|stimulated)",
        r"(?i)(breast|penis|vagina|genitals|anal|oral).{0,30}(explicit|graphic|detailed)",
    ]

    # Violence patterns
    VIOLENCE_PATTERNS = [
        r"(?i)(kill|murder|assassinate|execute|slaughter|massacre).{0,30}(him|her|them|people)",
        r"(?i)(torture|mutilate|dismember|maim|disfigure)",
        r"(?i)(blood|gore|brutal|savage|violent).{0,20}(attack|assault|beating)",
    ]

    # Harassment patterns
    HARASSMENT_PATTERNS = [
        r"(?i)(you (are|should)).{0,30}(die|kill yourself|end your life)",
        r"(?i)(stupid|idiot|moron|retard|dumb).{0,20}(person|people|user)",
        r"(?i)(fat|ugly|disgusting|worthless|pathetic).{0,20}(person|piece of)",
    ]

    # Threat patterns
    THREAT_PATTERNS = [
        r"(?i)(i will|i'll|gonna|going to).{0,30}(kill|hurt|harm|destroy|attack|bomb|shoot)",
        r"(?i)(watch your back|you're dead|you better watch out)",
        r"(?i)(threat|threaten|threatening).{0,20}(you|your|violence)",
    ]

    # Identity attack patterns
    IDENTITY_ATTACK_PATTERNS = [
        r"(?i)all (women|men|blacks|whites|asians|hispanics|jews|muslims|christians|gays|trans).{0,30}(are|should)",
        r"(?i)(typical|stereotypical).{0,20}(woman|man|black|white|asian|jew|muslim|gay)",
    ]

    def __init__(self, toxicity_threshold: float = 0.7):
        self.toxicity_threshold = toxicity_threshold
        self.enabled = True

    def moderate_content(self, content: str, strict_mode: bool = False) -> ModerationResult:
        """
        Analyze content for toxicity and harmful elements

        Args:
            content: Text content to moderate
            strict_mode: If True, applies stricter filtering rules
        """
        toxicity_scores = {}
        flagged_items = []
        categories = []

        # Check profanity
        profanity_score, profanity_flags = self._check_profanity(content)
        if profanity_score > 0:
            toxicity_scores[ToxicityCategory.PROFANITY] = profanity_score
            categories.append(ToxicityCategory.PROFANITY)
            flagged_items.extend(profanity_flags)

        # Check hate speech
        hate_score, hate_flags = self._check_hate_speech(content)
        if hate_score > 0:
            toxicity_scores[ToxicityCategory.HATE_SPEECH] = hate_score
            categories.append(ToxicityCategory.HATE_SPEECH)
            flagged_items.extend(hate_flags)

        # Check sexual content
        sexual_score, sexual_flags = self._check_sexual_content(content)
        if sexual_score > 0:
            toxicity_scores[ToxicityCategory.SEXUAL_CONTENT] = sexual_score
            categories.append(ToxicityCategory.SEXUAL_CONTENT)
            flagged_items.extend(sexual_flags)

        # Check violence
        violence_score, violence_flags = self._check_violence(content)
        if violence_score > 0:
            toxicity_scores[ToxicityCategory.VIOLENCE] = violence_score
            categories.append(ToxicityCategory.VIOLENCE)
            flagged_items.extend(violence_flags)

        # Check harassment
        harassment_score, harassment_flags = self._check_harassment(content)
        if harassment_score > 0:
            toxicity_scores[ToxicityCategory.HARASSMENT] = harassment_score
            categories.append(ToxicityCategory.HARASSMENT)
            flagged_items.extend(harassment_flags)

        # Check threats
        threat_score, threat_flags = self._check_threats(content)
        if threat_score > 0:
            toxicity_scores[ToxicityCategory.THREAT] = threat_score
            categories.append(ToxicityCategory.THREAT)
            flagged_items.extend(threat_flags)

        # Check identity attacks
        identity_score, identity_flags = self._check_identity_attacks(content)
        if identity_score > 0:
            toxicity_scores[ToxicityCategory.IDENTITY_ATTACK] = identity_score
            categories.append(ToxicityCategory.IDENTITY_ATTACK)
            flagged_items.extend(identity_flags)

        # Calculate overall toxicity score
        if toxicity_scores:
            overall_score = max(toxicity_scores.values())
        else:
            overall_score = 0.0

        # Determine toxicity level
        if overall_score >= 0.9:
            toxicity_level = ToxicityLevel.SEVERE
        elif overall_score >= 0.7:
            toxicity_level = ToxicityLevel.HIGH
        elif overall_score >= 0.5:
            toxicity_level = ToxicityLevel.MODERATE
        elif overall_score >= 0.3:
            toxicity_level = ToxicityLevel.LOW
        else:
            toxicity_level = ToxicityLevel.CLEAN

        # Determine if should block
        threshold = 0.5 if strict_mode else self.toxicity_threshold
        is_toxic = overall_score >= threshold
        should_block = is_toxic and (toxicity_level in [ToxicityLevel.SEVERE, ToxicityLevel.HIGH])

        # Generate redacted version if needed
        redacted_content = self._redact_content(content, flagged_items) if should_block else None

        return ModerationResult(
            is_toxic=is_toxic,
            toxicity_score=overall_score,
            toxicity_level=toxicity_level,
            categories=categories,
            flagged_content=flagged_items,
            should_block=should_block,
            redacted_content=redacted_content
        )

    def _check_profanity(self, content: str) -> tuple[float, List[str]]:
        """Check for profanity"""
        content_lower = content.lower()
        words = set(re.findall(r'\b\w+\b', content_lower))

        profane_words = words.intersection(self.PROFANITY_WORDS)

        if profane_words:
            # Score based on frequency
            count = sum(content_lower.count(word) for word in profane_words)
            score = min(1.0, 0.3 + (count * 0.1))
            return score, list(profane_words)

        return 0.0, []

    def _check_hate_speech(self, content: str) -> tuple[float, List[str]]:
        """Check for hate speech"""
        flags = []

        for pattern in self.HATE_SPEECH_PATTERNS:
            matches = re.findall(pattern, content)
            if matches:
                flags.extend(matches)

        if flags:
            return 1.0, flags  # Hate speech is always maximum severity

        return 0.0, []

    def _check_sexual_content(self, content: str) -> tuple[float, List[str]]:
        """Check for sexual content"""
        flags = []
        score = 0.0

        for pattern in self.SEXUAL_CONTENT_PATTERNS:
            matches = re.findall(pattern, content)
            if matches:
                flags.extend(matches)
                score = max(score, 0.6)  # Medium severity

        return score, flags

    def _check_violence(self, content: str) -> tuple[float, List[str]]:
        """Check for violent content"""
        flags = []
        score = 0.0

        for pattern in self.VIOLENCE_PATTERNS:
            matches = re.findall(pattern, content)
            if matches:
                flags.extend(matches)
                score = max(score, 0.8)  # High severity

        return score, flags

    def _check_harassment(self, content: str) -> tuple[float, List[str]]:
        """Check for harassment"""
        flags = []
        score = 0.0

        for pattern in self.HARASSMENT_PATTERNS:
            matches = re.findall(pattern, content)
            if matches:
                flags.extend(matches)
                score = max(score, 0.75)

        return score, flags

    def _check_threats(self, content: str) -> tuple[float, List[str]]:
        """Check for threats"""
        flags = []
        score = 0.0

        for pattern in self.THREAT_PATTERNS:
            matches = re.findall(pattern, content)
            if matches:
                flags.extend(matches)
                score = max(score, 0.95)  # Threats are very severe

        return score, flags

    def _check_identity_attacks(self, content: str) -> tuple[float, List[str]]:
        """Check for identity-based attacks"""
        flags = []
        score = 0.0

        for pattern in self.IDENTITY_ATTACK_PATTERNS:
            matches = re.findall(pattern, content)
            if matches:
                flags.extend(matches)
                score = max(score, 0.8)

        return score, flags

    def _redact_content(self, content: str, flagged_items: List[str]) -> str:
        """Redact flagged content"""
        redacted = content

        for item in flagged_items:
            # Replace with asterisks of same length
            redacted = re.sub(
                re.escape(item),
                '*' * len(item),
                redacted,
                flags=re.IGNORECASE
            )

        return redacted


# Singleton instance
_content_moderator = ContentModerator()


def get_content_moderator() -> ContentModerator:
    """Get the global content moderator instance"""
    return _content_moderator

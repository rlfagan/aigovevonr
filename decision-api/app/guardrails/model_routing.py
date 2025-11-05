"""
Model Routing and Failover System
Low-latency runtime security with dynamic model routing
"""

from typing import Dict, List, Optional, Any
from enum import Enum
from pydantic import BaseModel
from datetime import datetime, timedelta
import asyncio
import time


class ModelStatus(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    UNAVAILABLE = "UNAVAILABLE"
    MAINTENANCE = "MAINTENANCE"


class ModelProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    AZURE = "azure"
    AWS_BEDROCK = "aws_bedrock"
    COHERE = "cohere"
    HUGGINGFACE = "huggingface"
    LOCAL = "local"


class ModelCapability(str, Enum):
    TEXT_GENERATION = "text_generation"
    CHAT = "chat"
    CODE_GENERATION = "code_generation"
    EMBEDDINGS = "embeddings"
    IMAGE_GENERATION = "image_generation"
    FUNCTION_CALLING = "function_calling"


class ModelConfig(BaseModel):
    model_id: str
    provider: ModelProvider
    endpoint: str
    api_key_env: Optional[str] = None
    capabilities: List[ModelCapability]
    max_tokens: int = 4096
    cost_per_1k_tokens: float = 0.0
    latency_threshold_ms: int = 5000
    priority: int = 100  # Higher = preferred
    enabled: bool = True


class RoutingDecision(BaseModel):
    selected_model: str
    provider: ModelProvider
    reason: str
    failover_models: List[str]
    estimated_latency_ms: int
    estimated_cost: float


class HealthCheck(BaseModel):
    model_id: str
    status: ModelStatus
    latency_ms: int
    success_rate: float
    last_check: datetime
    consecutive_failures: int = 0


class ModelRouter:
    """
    Intelligent model routing system with automatic failover
    Ensures high availability and optimal performance
    """

    def __init__(self):
        self.models: Dict[str, ModelConfig] = {}
        self.health_status: Dict[str, HealthCheck] = {}
        self.request_history: List[Dict[str, Any]] = []
        self.max_history = 1000

        # Initialize with common models
        self._initialize_default_models()

    def _initialize_default_models(self):
        """Initialize with preset model configurations"""

        # OpenAI Models
        self.register_model(ModelConfig(
            model_id="gpt-4-turbo",
            provider=ModelProvider.OPENAI,
            endpoint="https://api.openai.com/v1/chat/completions",
            api_key_env="OPENAI_API_KEY",
            capabilities=[
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CHAT,
                ModelCapability.CODE_GENERATION,
                ModelCapability.FUNCTION_CALLING
            ],
            max_tokens=128000,
            cost_per_1k_tokens=0.01,
            priority=90
        ))

        self.register_model(ModelConfig(
            model_id="gpt-3.5-turbo",
            provider=ModelProvider.OPENAI,
            endpoint="https://api.openai.com/v1/chat/completions",
            api_key_env="OPENAI_API_KEY",
            capabilities=[
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CHAT,
                ModelCapability.FUNCTION_CALLING
            ],
            max_tokens=16385,
            cost_per_1k_tokens=0.0015,
            priority=70
        ))

        # Anthropic Models
        self.register_model(ModelConfig(
            model_id="claude-3-opus",
            provider=ModelProvider.ANTHROPIC,
            endpoint="https://api.anthropic.com/v1/messages",
            api_key_env="ANTHROPIC_API_KEY",
            capabilities=[
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CHAT,
                ModelCapability.CODE_GENERATION
            ],
            max_tokens=200000,
            cost_per_1k_tokens=0.015,
            priority=95
        ))

        self.register_model(ModelConfig(
            model_id="claude-3-sonnet",
            provider=ModelProvider.ANTHROPIC,
            endpoint="https://api.anthropic.com/v1/messages",
            api_key_env="ANTHROPIC_API_KEY",
            capabilities=[
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CHAT,
                ModelCapability.CODE_GENERATION
            ],
            max_tokens=200000,
            cost_per_1k_tokens=0.003,
            priority=85
        ))

        # Google Models
        self.register_model(ModelConfig(
            model_id="gemini-pro",
            provider=ModelProvider.GOOGLE,
            endpoint="https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent",
            api_key_env="GOOGLE_API_KEY",
            capabilities=[
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CHAT
            ],
            max_tokens=30720,
            cost_per_1k_tokens=0.00025,
            priority=75
        ))

        # Azure OpenAI
        self.register_model(ModelConfig(
            model_id="azure-gpt-4",
            provider=ModelProvider.AZURE,
            endpoint="https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions",
            api_key_env="AZURE_OPENAI_KEY",
            capabilities=[
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CHAT,
                ModelCapability.CODE_GENERATION
            ],
            max_tokens=128000,
            cost_per_1k_tokens=0.01,
            priority=88
        ))

    def register_model(self, config: ModelConfig):
        """Register a new model configuration"""
        self.models[config.model_id] = config
        self.health_status[config.model_id] = HealthCheck(
            model_id=config.model_id,
            status=ModelStatus.HEALTHY,
            latency_ms=0,
            success_rate=1.0,
            last_check=datetime.utcnow(),
            consecutive_failures=0
        )

    def route_request(
        self,
        capability: ModelCapability,
        user_preference: Optional[str] = None,
        max_cost: Optional[float] = None,
        require_low_latency: bool = False
    ) -> RoutingDecision:
        """
        Route a request to the optimal model based on criteria

        Args:
            capability: Required model capability
            user_preference: Preferred model or provider
            max_cost: Maximum acceptable cost per 1k tokens
            require_low_latency: Prioritize low latency over other factors
        """

        # Filter models by capability and availability
        available_models = [
            (model_id, config)
            for model_id, config in self.models.items()
            if capability in config.capabilities
            and config.enabled
            and self.health_status[model_id].status in [ModelStatus.HEALTHY, ModelStatus.DEGRADED]
        ]

        if not available_models:
            raise Exception(f"No available models for capability: {capability}")

        # Apply cost filter
        if max_cost:
            available_models = [
                (model_id, config)
                for model_id, config in available_models
                if config.cost_per_1k_tokens <= max_cost
            ]

        # Apply user preference
        if user_preference:
            preferred = [
                (model_id, config)
                for model_id, config in available_models
                if model_id == user_preference or config.provider.value == user_preference
            ]
            if preferred:
                available_models = preferred

        # Score and rank models
        scored_models = []
        for model_id, config in available_models:
            health = self.health_status[model_id]
            score = self._calculate_model_score(
                config,
                health,
                require_low_latency
            )
            scored_models.append((score, model_id, config, health))

        # Sort by score (descending)
        scored_models.sort(reverse=True, key=lambda x: x[0])

        # Select primary model
        _, selected_id, selected_config, selected_health = scored_models[0]

        # Prepare failover list
        failover_models = [model_id for _, model_id, _, _ in scored_models[1:4]]

        # Estimate latency and cost
        estimated_latency = selected_health.latency_ms if selected_health.latency_ms > 0 else 1000
        estimated_cost = selected_config.cost_per_1k_tokens

        # Generate routing reason
        reason = self._generate_routing_reason(
            selected_config,
            selected_health,
            require_low_latency,
            user_preference
        )

        return RoutingDecision(
            selected_model=selected_id,
            provider=selected_config.provider,
            reason=reason,
            failover_models=failover_models,
            estimated_latency_ms=estimated_latency,
            estimated_cost=estimated_cost
        )

    def _calculate_model_score(
        self,
        config: ModelConfig,
        health: HealthCheck,
        require_low_latency: bool
    ) -> float:
        """Calculate routing score for a model"""
        score = 0.0

        # Priority weight (30%)
        score += (config.priority / 100) * 30

        # Health/availability weight (40%)
        if health.status == ModelStatus.HEALTHY:
            score += 40
        elif health.status == ModelStatus.DEGRADED:
            score += 20

        score += health.success_rate * 10

        # Latency weight (20% or 40% if low latency required)
        latency_weight = 40 if require_low_latency else 20
        if health.latency_ms > 0:
            # Lower latency = higher score
            latency_score = max(0, 1 - (health.latency_ms / config.latency_threshold_ms))
            score += latency_score * latency_weight

        # Cost efficiency weight (10%)
        if config.cost_per_1k_tokens > 0:
            # Lower cost = higher score (normalized)
            cost_score = max(0, 1 - (config.cost_per_1k_tokens / 0.02))  # Normalize to $0.02
            score += cost_score * 10

        return score

    def _generate_routing_reason(
        self,
        config: ModelConfig,
        health: HealthCheck,
        require_low_latency: bool,
        user_preference: Optional[str]
    ) -> str:
        """Generate human-readable routing reason"""
        reasons = []

        if user_preference:
            reasons.append(f"User preference: {user_preference}")

        if health.status == ModelStatus.HEALTHY:
            reasons.append("Healthy status")

        if require_low_latency and health.latency_ms < config.latency_threshold_ms:
            reasons.append(f"Low latency ({health.latency_ms}ms)")

        if config.priority >= 90:
            reasons.append("High priority model")

        if config.cost_per_1k_tokens < 0.005:
            reasons.append("Cost-efficient")

        return "; ".join(reasons) if reasons else "Best available match"

    async def health_check_all(self):
        """Perform health checks on all registered models"""
        tasks = []
        for model_id in self.models.keys():
            tasks.append(self.health_check_model(model_id))

        await asyncio.gather(*tasks, return_exceptions=True)

    async def health_check_model(self, model_id: str) -> HealthCheck:
        """
        Perform health check on a specific model
        """
        if model_id not in self.models:
            raise ValueError(f"Model not found: {model_id}")

        config = self.models[model_id]
        start_time = time.time()

        try:
            # Simulate health check (in production, make actual API call)
            await asyncio.sleep(0.1)  # Simulate network call

            # For now, mark as healthy
            latency_ms = int((time.time() - start_time) * 1000)

            health = HealthCheck(
                model_id=model_id,
                status=ModelStatus.HEALTHY,
                latency_ms=latency_ms,
                success_rate=0.99,
                last_check=datetime.utcnow(),
                consecutive_failures=0
            )

            self.health_status[model_id] = health
            return health

        except Exception as e:
            # Mark as unavailable
            health = self.health_status.get(model_id)
            if health:
                health.consecutive_failures += 1
                health.status = ModelStatus.UNAVAILABLE if health.consecutive_failures >= 3 else ModelStatus.DEGRADED
                health.last_check = datetime.utcnow()

            return health

    def update_model_status(self, model_id: str, status: ModelStatus):
        """Manually update model status"""
        if model_id in self.health_status:
            self.health_status[model_id].status = status
            self.health_status[model_id].last_check = datetime.utcnow()

    def get_model_stats(self, model_id: str) -> Dict[str, Any]:
        """Get statistics for a specific model"""
        if model_id not in self.models:
            return {}

        config = self.models[model_id]
        health = self.health_status.get(model_id)

        # Calculate stats from request history
        model_requests = [
            r for r in self.request_history
            if r.get("model_id") == model_id
        ]

        total_requests = len(model_requests)
        successful_requests = len([r for r in model_requests if r.get("success", False)])
        success_rate = successful_requests / total_requests if total_requests > 0 else 0

        return {
            "model_id": model_id,
            "provider": config.provider.value,
            "status": health.status.value if health else "unknown",
            "total_requests": total_requests,
            "success_rate": success_rate,
            "avg_latency_ms": health.latency_ms if health else 0,
            "last_check": health.last_check.isoformat() if health else None,
            "capabilities": [c.value for c in config.capabilities],
            "cost_per_1k_tokens": config.cost_per_1k_tokens
        }

    def get_all_models_status(self) -> List[Dict[str, Any]]:
        """Get status for all models"""
        return [self.get_model_stats(model_id) for model_id in self.models.keys()]


# Singleton instance
_model_router = ModelRouter()


def get_model_router() -> ModelRouter:
    """Get the global model router instance"""
    return _model_router

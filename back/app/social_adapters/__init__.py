"""Pluggable social network publishers."""

from .registry import ADAPTER_REGISTRY, get_social_adapter

__all__ = ["ADAPTER_REGISTRY", "get_social_adapter"]

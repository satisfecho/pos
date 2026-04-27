"""Maps provider keys to adapter instances."""

from __future__ import annotations

from .meta_adapter import MetaSocialAdapter

ADAPTER_REGISTRY: dict[str, MetaSocialAdapter] = {
    "meta": MetaSocialAdapter(),
}


def get_social_adapter(provider_key: str):
    pk = (provider_key or "").strip().lower()
    ad = ADAPTER_REGISTRY.get(pk)
    if ad is None:
        raise ValueError(f"Unknown social provider_key: {provider_key}")
    return ad

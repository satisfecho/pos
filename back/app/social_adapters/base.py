"""Protocol-style base for outbound social adapters."""

from __future__ import annotations

from pathlib import Path
from typing import Protocol, runtime_checkable


@runtime_checkable
class SocialOutboundAdapter(Protocol):
    provider_key: str

    def publish_meta_page_photo(
        self,
        *,
        page_id: str,
        page_access_token: str,
        caption: str,
        image_path: Path,
        graph_version: str,
    ) -> str:
        """Post a photo to a Facebook Page; returns Graph node id."""

    def publish_instagram_photo(
        self,
        *,
        instagram_account_id: str,
        page_access_token: str,
        caption: str,
        public_image_url: str,
        graph_version: str,
    ) -> str:
        """Create IG media then publish; requires publicly reachable image URL."""

"""Meta Graph API adapter (Facebook Page photo + Instagram publishing)."""

from __future__ import annotations

import logging
from pathlib import Path

import requests

logger = logging.getLogger(__name__)


class MetaSocialAdapter:
    provider_key = "meta"

    def publish_meta_page_photo(
        self,
        *,
        page_id: str,
        page_access_token: str,
        caption: str,
        image_path: Path,
        graph_version: str,
    ) -> str:
        ver = graph_version.strip().lstrip("v") if graph_version else "21.0"
        ver = ver if ver.startswith("v") else f"v{ver}"
        url = f"https://graph.facebook.com/{ver}/{page_id}/photos"
        try:
            with image_path.open("rb") as fp:
                files = {"source": fp}
                data = {"caption": caption, "access_token": page_access_token}
                r = requests.post(url, files=files, data=data, timeout=180)
            r.raise_for_status()
            j = r.json()
            return str(j.get("id") or j.get("post_id") or "")
        except requests.RequestException as e:
            body = getattr(e.response, "text", "") if getattr(e, "response", None) else ""
            logger.warning("Meta page photo publish failed: %s %s", e, body[:500])
            raise

    def publish_instagram_photo(
        self,
        *,
        instagram_account_id: str,
        page_access_token: str,
        caption: str,
        public_image_url: str,
        graph_version: str,
    ) -> str:
        ver = graph_version.strip().lstrip("v") if graph_version else "21.0"
        ver = ver if ver.startswith("v") else f"v{ver}"
        ig = instagram_account_id.strip()
        url_media = f"https://graph.facebook.com/{ver}/{ig}/media"
        r1 = requests.post(
            url_media,
            data={
                "image_url": public_image_url,
                "caption": caption,
                "access_token": page_access_token,
            },
            timeout=120,
        )
        try:
            r1.raise_for_status()
        except requests.RequestException:
            logger.warning("Meta IG media create failed: %s", r1.text[:800])
            raise
        creation_id = (r1.json() or {}).get("id")
        if not creation_id:
            raise RuntimeError("Instagram media step returned no id")

        url_pub = f"https://graph.facebook.com/{ver}/{ig}/media_publish"
        r2 = requests.post(
            url_pub,
            data={"creation_id": creation_id, "access_token": page_access_token},
            timeout=120,
        )
        try:
            r2.raise_for_status()
        except requests.RequestException:
            logger.warning("Meta IG publish failed: %s", r2.text[:800])
            raise
        jid = (r2.json() or {}).get("id")
        return str(jid or creation_id)

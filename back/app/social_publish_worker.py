"""Background worker: publishes due social_post rows via Meta adapter."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import delete
from sqlmodel import Session, select

from app import models
from app.db import engine
from app.social_adapters.registry import get_social_adapter
from app.social_credentials import decrypt_social_payload
from app.settings import settings

logger = logging.getLogger(__name__)

UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"

TICK_SECONDS = 45


def _finalize_post(session: Session, post: models.SocialPost) -> None:
    targets = session.exec(
        select(models.SocialPostTarget).where(models.SocialPostTarget.social_post_id == post.id)
    ).all()
    errs = [t.error_message for t in targets if t.status != "sent" and t.error_message]
    failed = any(t.status == "failed" for t in targets)
    pending = any(t.status == "pending" for t in targets)
    if pending:
        return
    if failed:
        post.status = "failed"
        post.error_message = "; ".join(errs)[:8000] if errs else "Publish failed"
    else:
        post.status = "sent"
        post.error_message = None
    post.updated_at = datetime.now(timezone.utc)
    session.add(post)
    session.commit()


def _publish_once(session: Session, post: models.SocialPost) -> None:
    tenant_id = post.tenant_id
    conn = session.exec(
        select(models.SocialConnection).where(
            models.SocialConnection.tenant_id == tenant_id,
            models.SocialConnection.provider_key == "meta",
            models.SocialConnection.connection_status == "connected",
        )
    ).first()
    if conn is None or not conn.oauth_payload_encrypted:
        post.status = "failed"
        post.error_message = "Meta is not connected for this tenant"
        post.updated_at = datetime.now(timezone.utc)
        session.add(post)
        session.commit()
        return

    blob = decrypt_social_payload(conn.oauth_payload_encrypted) or {}
    page_token = (blob.get("page_access_token") or "").strip()
    page_id = (conn.meta_page_id or blob.get("page_id") or "").strip()
    ig_id = (conn.instagram_account_id or blob.get("instagram_account_id") or "").strip()
    if not page_token or not page_id:
        post.status = "failed"
        post.error_message = "Incomplete Meta connection (missing page)"
        post.updated_at = datetime.now(timezone.utc)
        session.add(post)
        session.commit()
        return

    adapter = get_social_adapter("meta")
    ver = getattr(settings, "meta_graph_version", None) or "v21.0"
    image_path = UPLOADS_DIR / str(tenant_id) / "social" / post.image_filename
    if not image_path.is_file():
        post.status = "failed"
        post.error_message = "Image file missing on server"
        post.updated_at = datetime.now(timezone.utc)
        session.add(post)
        session.commit()
        return

    targets = session.exec(
        select(models.SocialPostTarget).where(models.SocialPostTarget.social_post_id == post.id)
    ).all()
    public_base = (settings.public_app_base_url or "").rstrip("/")

    for t in targets:
        if t.status == "sent":
            continue
        t.status = "pending"
        session.add(t)
        session.commit()
        try:
            if t.channel_key == "meta_page":
                ext = adapter.publish_meta_page_photo(
                    page_id=page_id,
                    page_access_token=page_token,
                    caption=post.caption or "",
                    image_path=image_path,
                    graph_version=ver,
                )
                t.external_id = ext or None
                t.status = "sent"
                t.error_message = None
            elif t.channel_key == "meta_instagram":
                if not ig_id:
                    t.status = "failed"
                    t.error_message = "Instagram Business account not linked to this Page"
                elif not public_base:
                    t.status = "failed"
                    t.error_message = (
                        "PUBLIC_APP_BASE_URL must be set so Instagram can fetch the image URL"
                    )
                else:
                    img_url = f"{public_base}/uploads/{tenant_id}/social/{post.image_filename}"
                    ext = adapter.publish_instagram_photo(
                        instagram_account_id=ig_id,
                        page_access_token=page_token,
                        caption=post.caption or "",
                        public_image_url=img_url,
                        graph_version=ver,
                    )
                    t.external_id = ext or None
                    t.status = "sent"
                    t.error_message = None
            else:
                t.status = "failed"
                t.error_message = f"Unsupported channel: {t.channel_key}"
        except Exception as e:
            t.status = "failed"
            t.error_message = str(e)[:2000]
            logger.warning("Social publish target failed post_id=%s channel=%s: %s", post.id, t.channel_key, e)
        session.add(t)
        session.commit()

    _finalize_post(session, post)


def _tick_sync() -> int:
    now = datetime.now(timezone.utc)
    processed = 0
    with Session(engine) as session:
        rows = session.exec(
            select(models.SocialPost)
            .where(models.SocialPost.status.in_(["queued", "scheduled"]))
            .where(models.SocialPost.schedule_at <= now)
            .order_by(models.SocialPost.schedule_at)
            .limit(8)
        ).all()
        for post in rows:
            post.status = "publishing"
            post.updated_at = now
            session.add(post)
            session.commit()
            try:
                _publish_once(session, post)
            except Exception as e:
                logger.exception("Social publish worker error post_id=%s: %s", post.id, e)
                post = session.get(models.SocialPost, post.id)
                if post and post.status == "publishing":
                    post.status = "failed"
                    post.error_message = str(e)[:2000]
                    post.updated_at = datetime.now(timezone.utc)
                    session.add(post)
                    session.commit()
            processed += 1

        cutoff = datetime.now(timezone.utc) - timedelta(hours=2)
        session.exec(delete(models.SocialOauthState).where(models.SocialOauthState.created_at < cutoff))
        session.commit()

    return processed


async def social_publish_worker_loop(stop: asyncio.Event | None = None) -> None:
    stop_ev = stop or asyncio.Event()
    while not stop_ev.is_set():
        try:
            n = await asyncio.to_thread(_tick_sync)
            if n > 0:
                logger.info("Social publish worker: processed %d post(s) this tick", n)
        except Exception as e:
            logger.warning("Social publish worker tick failed: %s", e, exc_info=True)
        try:
            await asyncio.wait_for(stop_ev.wait(), timeout=float(TICK_SECONDS))
        except asyncio.TimeoutError:
            pass

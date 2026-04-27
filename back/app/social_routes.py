"""Marketing: Meta OAuth + social post composer APIs (Settings / owner-admin)."""

from __future__ import annotations

import json
import logging
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated
from urllib.parse import quote, urlencode

import requests
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlmodel import Session, select

from app import models
from app.db import get_session
from app.permissions import Permission, require_permission
from app.social_credentials import encrypt_social_payload
from app.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"

META_SCOPES = (
    "pages_show_list,pages_manage_posts,instagram_basic,instagram_content_publish,business_management"
)


def _meta_redirect_uri() -> str:
    explicit = (settings.meta_oauth_redirect_uri or "").strip()
    if explicit:
        return explicit
    base = (settings.public_app_base_url or "").strip().rstrip("/")
    if not base:
        return ""
    rp = (settings.root_path or "").strip().rstrip("/")
    prefix = f"{base}{rp}" if rp else base
    return f"{prefix}/tenant/social/oauth/meta/callback"


def _graph_ver() -> str:
    v = (settings.meta_graph_version or "v21.0").strip()
    return v if v.startswith("v") else f"v{v}"


class SocialChannelInfo(BaseModel):
    key: str
    label: str


class SocialCatalogRow(BaseModel):
    provider_key: str
    display_name: str
    channels: list[SocialChannelInfo]


class SocialConnectionPublic(BaseModel):
    provider_key: str
    connection_status: str
    meta_page_name: str | None = None
    instagram_configured: bool = False


class SocialPostTargetPublic(BaseModel):
    channel_key: str
    status: str
    external_id: str | None = None
    error_message: str | None = None


class SocialPostPublic(BaseModel):
    id: int
    caption: str
    image_url: str
    schedule_at: str
    status: str
    error_message: str | None = None
    created_at: str
    targets: list[SocialPostTargetPublic] = Field(default_factory=list)


class MetaAuthorizeUrlResponse(BaseModel):
    authorize_url: str


def _exchange_meta_code(code: str, redirect_uri: str) -> dict[str, Any]:
    ver = _graph_ver()
    r = requests.get(
        f"https://graph.facebook.com/{ver}/oauth/access_token",
        params={
            "client_id": settings.meta_app_id,
            "client_secret": settings.meta_app_secret,
            "redirect_uri": redirect_uri,
            "code": code,
        },
        timeout=90,
    )
    r.raise_for_status()
    return r.json()


def _long_lived_user_token(short_token: str) -> str:
    ver = _graph_ver()
    r = requests.get(
        f"https://graph.facebook.com/{ver}/oauth/access_token",
        params={
            "grant_type": "fb_exchange_token",
            "client_id": settings.meta_app_id,
            "client_secret": settings.meta_app_secret,
            "fb_exchange_token": short_token,
        },
        timeout=90,
    )
    r.raise_for_status()
    data = r.json()
    return str(data.get("access_token") or "")


def _pick_page(user_token: str) -> dict[str, Any] | None:
    ver = _graph_ver()
    r = requests.get(
        f"https://graph.facebook.com/{ver}/me/accounts",
        params={"access_token": user_token},
        timeout=90,
    )
    r.raise_for_status()
    data = r.json()
    rows = data.get("data") or []
    if not rows:
        return None
    return rows[0]


def _instagram_id_for_page(page_id: str, page_token: str) -> str | None:
    ver = _graph_ver()
    r = requests.get(
        f"https://graph.facebook.com/{ver}/{page_id}",
        params={"fields": "instagram_business_account", "access_token": page_token},
        timeout=60,
    )
    r.raise_for_status()
    j = r.json() or {}
    ig = j.get("instagram_business_account") or {}
    iid = ig.get("id")
    return str(iid) if iid else None


@router.get("/social/catalog", response_model=list[SocialCatalogRow])
def social_catalog(
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
):
    _ = current_user
    return [
        SocialCatalogRow(
            provider_key="meta",
            display_name="Meta (Facebook Page & Instagram)",
            channels=[
                SocialChannelInfo(key="meta_page", label="Facebook Page"),
                SocialChannelInfo(key="meta_instagram", label="Instagram Business"),
            ],
        )
    ]


@router.get("/social/connections", response_model=list[SocialConnectionPublic])
def list_social_connections(
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(models.SocialConnection).where(
            models.SocialConnection.tenant_id == current_user.tenant_id
        )
    ).all()
    out: list[SocialConnectionPublic] = []
    for row in rows:
        ig = bool((row.instagram_account_id or "").strip())
        out.append(
            SocialConnectionPublic(
                provider_key=row.provider_key,
                connection_status=row.connection_status,
                meta_page_name=row.meta_page_name,
                instagram_configured=ig,
            )
        )
    return out


@router.post("/social/oauth/meta/authorize-url", response_model=MetaAuthorizeUrlResponse)
def meta_oauth_authorize_url(
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
):
    if not settings.meta_app_id or not settings.meta_app_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Meta OAuth is not configured (META_APP_ID / META_APP_SECRET)",
        )
    redirect_uri = _meta_redirect_uri()
    if not redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Set META_OAUTH_REDIRECT_URI or PUBLIC_APP_BASE_URL for OAuth redirect",
        )
    state = secrets.token_urlsafe(32)[:64]
    row = models.SocialOauthState(
        state=state,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        provider_key="meta",
        redirect_uri=redirect_uri,
    )
    session.add(row)
    session.commit()

    params = {
        "client_id": settings.meta_app_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": META_SCOPES,
        "response_type": "code",
    }
    url = f"https://www.facebook.com/{_graph_ver()}/dialog/oauth?{urlencode(params)}"
    return MetaAuthorizeUrlResponse(authorize_url=url)


@router.get("/social/oauth/meta/callback")
def meta_oauth_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    session: Session = Depends(get_session),
):
    base = (settings.public_app_base_url or "").strip().rstrip("/") or "/"
    settings_q = "section=social-posts"
    if error:
        msg = quote((error_description or error)[:400], safe="")
        return RedirectResponse(
            f"{base}/settings?{settings_q}&socialOAuth=error&reason={msg}",
            status_code=302,
        )
    if not code or not state:
        return RedirectResponse(f"{base}/settings?{settings_q}&socialOAuth=error", status_code=302)

    st = session.get(models.SocialOauthState, state)
    if not st:
        return RedirectResponse(f"{base}/settings?{settings_q}&socialOAuth=invalid_state", status_code=302)

    redirect_uri = (st.redirect_uri or "").strip() or _meta_redirect_uri()
    tenant_id = st.tenant_id

    try:
        tok = _exchange_meta_code(code, redirect_uri)
        short = str(tok.get("access_token") or "")
        if not short:
            raise RuntimeError("No access_token from Meta")
        long_user = _long_lived_user_token(short)
        if not long_user:
            long_user = short
        page = _pick_page(long_user)
        if not page:
            raise RuntimeError("No Facebook Pages returned for this account")

        page_token = str(page.get("access_token") or "")
        page_id = str(page.get("id") or "")
        page_name = str(page.get("name") or "") or None
        ig_id = _instagram_id_for_page(page_id, page_token) if page_id and page_token else None

        payload = {
            "page_access_token": page_token,
            "page_id": page_id,
            "user_access_token": long_user,
            "instagram_account_id": ig_id or "",
        }
        enc = encrypt_social_payload(payload)

        existing = session.exec(
            select(models.SocialConnection).where(
                models.SocialConnection.tenant_id == tenant_id,
                models.SocialConnection.provider_key == "meta",
            )
        ).first()
        now = datetime.now(timezone.utc)
        if existing:
            existing.oauth_payload_encrypted = enc
            existing.connection_status = "connected"
            existing.meta_page_id = page_id
            existing.meta_page_name = page_name
            existing.instagram_account_id = ig_id
            existing.updated_at = now
            session.add(existing)
        else:
            session.add(
                models.SocialConnection(
                    tenant_id=tenant_id,
                    provider_key="meta",
                    connection_status="connected",
                    oauth_payload_encrypted=enc,
                    meta_page_id=page_id,
                    meta_page_name=page_name,
                    instagram_account_id=ig_id,
                    updated_at=now,
                )
            )
        session.commit()
    except Exception as e:
        logger.warning("Meta OAuth callback failed: %s", e, exc_info=True)
        try:
            session.delete(st)
            session.commit()
        except Exception:
            session.rollback()
        return RedirectResponse(
            f"{base}/settings?{settings_q}&socialOAuth=error",
            status_code=302,
        )

    try:
        session.delete(st)
        session.commit()
    except Exception:
        session.rollback()

    return RedirectResponse(f"{base}/settings?{settings_q}&socialOAuth=success", status_code=302)


@router.delete("/social/connections/{provider_key}")
def disconnect_social(
    provider_key: str,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
):
    pk = provider_key.strip().lower()
    row = session.exec(
        select(models.SocialConnection).where(
            models.SocialConnection.tenant_id == current_user.tenant_id,
            models.SocialConnection.provider_key == pk,
        )
    ).first()
    if row:
        row.connection_status = "disconnected"
        row.oauth_payload_encrypted = None
        row.meta_page_id = None
        row.meta_page_name = None
        row.instagram_account_id = None
        row.updated_at = datetime.now(timezone.utc)
        session.add(row)
        session.commit()
    return {"ok": True}


def _serialize_post(row: models.SocialPost, targets: list[models.SocialPostTarget]) -> SocialPostPublic:
    tid = row.tenant_id
    image_url = f"/uploads/{tid}/social/{row.image_filename}"
    return SocialPostPublic(
        id=int(row.id or 0),
        caption=row.caption or "",
        image_url=image_url,
        schedule_at=row.schedule_at.isoformat() if row.schedule_at else "",
        status=row.status,
        error_message=row.error_message,
        created_at=row.created_at.isoformat() if row.created_at else "",
        targets=[
            SocialPostTargetPublic(
                channel_key=t.channel_key,
                status=t.status,
                external_id=t.external_id,
                error_message=t.error_message,
            )
            for t in targets
        ],
    )


@router.get("/social/posts", response_model=list[SocialPostPublic])
def list_social_posts(
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
    session: Session = Depends(get_session),
    limit: int = Query(50, ge=1, le=200),
):
    rows = session.exec(
        select(models.SocialPost)
        .where(models.SocialPost.tenant_id == current_user.tenant_id)
        .order_by(desc(models.SocialPost.created_at))
        .limit(limit)
    ).all()
    out: list[SocialPostPublic] = []
    for row in rows:
        targets = session.exec(
            select(models.SocialPostTarget).where(
                models.SocialPostTarget.social_post_id == row.id
            )
        ).all()
        out.append(_serialize_post(row, list(targets)))
    return out


@router.post("/social/posts", response_model=SocialPostPublic)
async def create_social_post(
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
    caption: str = Form(""),
    channels_json: str = Form(...),
    publish_now: bool = Form(False),
    schedule_at_iso: str | None = Form(None),
    image: UploadFile = File(...),
):
    try:
        channels = json.loads(channels_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="channels_json must be a JSON array")
    if not isinstance(channels, list) or not channels:
        raise HTTPException(status_code=400, detail="Select at least one channel")

    allowed = {"meta_page", "meta_instagram"}
    clean: list[str] = []
    for c in channels:
        s = str(c).strip()
        if s in allowed:
            clean.append(s)
    if not clean:
        raise HTTPException(status_code=400, detail="No valid channels")

    conn = session.exec(
        select(models.SocialConnection).where(
            models.SocialConnection.tenant_id == current_user.tenant_id,
            models.SocialConnection.provider_key == "meta",
            models.SocialConnection.connection_status == "connected",
        )
    ).first()
    if conn is None:
        raise HTTPException(status_code=400, detail="Connect Meta before publishing")

    if "meta_instagram" in clean and not (conn.instagram_account_id or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Instagram Business is not linked to the connected Facebook Page",
        )

    raw = await image.read()
    if len(raw) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 12MB)")
    ext = Path(image.filename or "upload").suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        ext = ".jpg"
    fname = f"{secrets.token_hex(16)}{ext}"
    tenant_dir = UPLOADS_DIR / str(current_user.tenant_id) / "social"
    tenant_dir.mkdir(parents=True, exist_ok=True)
    dest = tenant_dir / fname
    dest.write_bytes(raw)

    now = datetime.now(timezone.utc)
    if publish_now:
        sched = now
        st = "queued"
    elif schedule_at_iso and schedule_at_iso.strip():
        try:
            raw_sched = schedule_at_iso.strip().replace("Z", "+00:00")
            sched = datetime.fromisoformat(raw_sched)
            if sched.tzinfo is None:
                sched = sched.replace(tzinfo=timezone.utc)
            else:
                sched = sched.astimezone(timezone.utc)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid schedule_at_iso")
        if sched <= now:
            st = "queued"
            sched = now
        else:
            st = "scheduled"
    else:
        sched = now
        st = "queued"

    post = models.SocialPost(
        tenant_id=current_user.tenant_id,
        caption=caption or "",
        image_filename=fname,
        schedule_at=sched,
        status=st,
        created_by_user_id=current_user.id,
        created_at=now,
        updated_at=now,
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    pid = int(post.id or 0)
    if not pid:
        raise HTTPException(status_code=500, detail="Could not create post")

    for ch in clean:
        session.add(
            models.SocialPostTarget(
                social_post_id=pid,
                channel_key=ch,
                status="pending",
            )
        )
    session.commit()

    targets = session.exec(
        select(models.SocialPostTarget).where(
            models.SocialPostTarget.social_post_id == post.id
        )
    ).all()
    return _serialize_post(post, list(targets))

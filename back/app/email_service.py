"""
Email service for sending transactional emails.
Supports SMTP (Gmail, Proton Mail, etc.) and can be extended for API-based services.
Uses per-tenant SMTP config when set; falls back to global config.env otherwise.
"""

import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import TYPE_CHECKING, Any, Optional

import aiosmtplib

from .settings import settings

if TYPE_CHECKING:
    from .models import Tenant

logger = logging.getLogger(__name__)


def _effective_smtp_config(tenant: Optional["Tenant"] = None) -> dict[str, Any]:
    """
    Build SMTP config: tenant values when tenant has credentials set, else global.
    """
    use_tenant = (
        tenant
        and tenant.smtp_user
        and tenant.smtp_password
    )
    return {
        "host": (tenant.smtp_host or settings.smtp_host) if use_tenant else settings.smtp_host,
        "port": (tenant.smtp_port if tenant and tenant.smtp_port is not None else settings.smtp_port)
        if use_tenant
        else settings.smtp_port,
        "use_tls": (tenant.smtp_use_tls if tenant and tenant.smtp_use_tls is not None else settings.smtp_use_tls)
        if use_tenant
        else settings.smtp_use_tls,
        "user": (tenant.smtp_user or settings.smtp_user) if use_tenant else settings.smtp_user,
        "password": (tenant.smtp_password or settings.smtp_password) if use_tenant else settings.smtp_password,
        "from_email": (tenant.email_from or settings.email_from) if use_tenant else settings.email_from,
        "from_name": (tenant.email_from_name or settings.email_from_name) if use_tenant else settings.email_from_name,
    }


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
    tenant: Optional["Tenant"] = None,
) -> bool:
    """
    Send an email via SMTP.
    Uses tenant SMTP config when tenant has smtp_user/smtp_password set; else global config.

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML email body
        text_content: Plain text email body (optional)
        from_email: Sender email (overrides config when set)
        from_name: Sender name (overrides config when set)
        tenant: Optional tenant for per-restaurant SMTP (fallback to global when unset)

    Returns:
        True if email sent successfully, False otherwise
    """
    cfg = _effective_smtp_config(tenant)
    if not cfg["user"] or not cfg["password"]:
        logger.error("SMTP credentials not configured (tenant or global)")
        return False

    from_addr = from_email or cfg["from_email"]
    from_n = from_name or cfg["from_name"]

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{from_n} <{from_addr}>" if from_n else from_addr
    message["To"] = to_email

    if text_content:
        message.attach(MIMEText(text_content, "plain"))
    message.attach(MIMEText(html_content, "html"))

    try:
        port = cfg["port"]
        if port == 587:
            await aiosmtplib.send(
                message,
                hostname=cfg["host"],
                port=port,
                username=cfg["user"],
                password=cfg["password"],
                start_tls=True,
            )
        elif port == 465:
            await aiosmtplib.send(
                message,
                hostname=cfg["host"],
                port=port,
                username=cfg["user"],
                password=cfg["password"],
                use_tls=True,
            )
        else:
            await aiosmtplib.send(
                message,
                hostname=cfg["host"],
                port=port,
                username=cfg["user"],
                password=cfg["password"],
                start_tls=cfg["use_tls"],
            )
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


async def send_verification_email(
    to_email: str,
    verification_token: str,
    verification_url: str,
    tenant: Optional["Tenant"] = None,
) -> bool:
    """Send email verification email. Uses tenant or global SMTP."""
    subject = "Verify your email address"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .code {{ font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; padding: 20px; background-color: #f5f5f5; border-radius: 5px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Verify your email address</h1>
            <p>Thank you for registering with POS2 System. Please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
                <a href="{verification_url}" class="button">Verify Email</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">{verification_url}</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
    </body>
    </html>
    """

    text_content = f"""
    Verify your email address

    Thank you for registering with POS2 System. Please verify your email address by visiting:

    {verification_url}

    If you didn't create an account, you can safely ignore this email.
    """

    return await send_email(to_email, subject, html_content, text_content, tenant=tenant)


async def test_smtp_connection(tenant: Optional["Tenant"] = None) -> dict:
    """
    Test SMTP connection and authentication.
    Uses tenant SMTP when tenant has credentials; else global config.

    Returns:
        dict with 'success' (bool) and 'message' (str)
    """
    cfg = _effective_smtp_config(tenant)
    if not cfg["user"] or not cfg["password"]:
        return {
            "success": False,
            "message": "SMTP credentials not configured (configure in Settings → Email or in config.env)",
        }

    try:
        test_message = MIMEText("SMTP connection test")
        test_message["From"] = cfg["from_email"]
        test_message["To"] = cfg["user"]
        test_message["Subject"] = "SMTP Test"

        port = cfg["port"]
        if port == 587:
            await aiosmtplib.send(
                test_message,
                hostname=cfg["host"],
                port=port,
                username=cfg["user"],
                password=cfg["password"],
                start_tls=True,
            )
        elif port == 465:
            await aiosmtplib.send(
                test_message,
                hostname=cfg["host"],
                port=port,
                username=cfg["user"],
                password=cfg["password"],
                use_tls=True,
            )
        else:
            await aiosmtplib.send(
                test_message,
                hostname=cfg["host"],
                port=port,
                username=cfg["user"],
                password=cfg["password"],
                start_tls=cfg["use_tls"],
            )

        return {
            "success": True,
            "message": f"Successfully connected and sent test email to {cfg['host']}:{port}",
        }
    except aiosmtplib.SMTPAuthenticationError as e:
        return {
            "success": False,
            "message": f"Authentication failed. For Gmail, use an App Password. Error: {e}",
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Connection failed: {e}",
        }

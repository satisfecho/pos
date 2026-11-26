"""LiveKit Agents worker: voice + chat reservation assistant.

Calls existing public POS reservation APIs via ``ReservationAgentClient``.
Requires LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET plus:

- POS_API_BASE_URL — e.g. http://127.0.0.1:4202/api
- LIVEKIT_AGENT_TENANT_ID — pilot tenant (default 1)

Run (from repo, with optional livekit deps installed):

    cd back && python -m livekit_reservation_agent.agent dev

See docs/0093-livekit-reservation-agents.md.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

# Allow ``from app.reservation_agent_client import …`` when run as a module from back/
_BACK_ROOT = Path(__file__).resolve().parents[1]
if str(_BACK_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACK_ROOT))

logger = logging.getLogger("livekit_reservation_agent")


def _env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


def _tenant_id() -> int:
    raw = _env("LIVEKIT_AGENT_TENANT_ID", "1")
    try:
        return int(raw)
    except ValueError:
        return 1


def _pos_base_url() -> str:
    return _env("POS_API_BASE_URL", "http://127.0.0.1:4202/api")


def _build_client():
    from app.reservation_agent_client import ReservationAgentClient

    return ReservationAgentClient(base_url=_pos_base_url(), tenant_id=_tenant_id())


def _register_tools():
    """Import livekit only when running the worker (optional dependency)."""
    from livekit.agents import RunContext, function_tool

    from app.reservation_agent_client import ReservationAgentApiError

    @function_tool()
    async def check_next_available(
        context: RunContext,
        date: str,
        party_size: int = 2,
    ) -> dict:
        """Find the next available reservation slot on or after a date (YYYY-MM-DD)."""
        client = _build_client()
        try:
            return client.next_available(date=date, party_size=max(1, int(party_size)))
        except ReservationAgentApiError as e:
            return {"error": str(e), "status_code": e.status_code}

    @function_tool()
    async def list_available_times(
        context: RunContext,
        date: str,
        party_size: int = 2,
    ) -> dict:
        """List available HH:MM times for a given date and party size."""
        client = _build_client()
        try:
            times = client.available_times_for_date(
                date=date, party_size=max(1, int(party_size))
            )
            return {"date": date, "available_times": times, "party_size": party_size}
        except ReservationAgentApiError as e:
            return {"error": str(e), "status_code": e.status_code}

    @function_tool()
    async def create_reservation(
        context: RunContext,
        customer_name: str,
        customer_phone: str,
        reservation_date: str,
        reservation_time: str,
        party_size: int = 2,
        customer_email: str = "",
        notes: str = "",
    ) -> dict:
        """Create a restaurant reservation. Confirm details with the guest first.

        reservation_date: YYYY-MM-DD. reservation_time: HH:MM.
        customer_phone: include country code when possible (e.g. +34600111222).
        """
        # Mutating: discourage mid-call interruption leaving a partial booking UX.
        try:
            context.disallow_interruptions()
        except Exception:
            pass
        client = _build_client()
        try:
            return client.create_reservation(
                customer_name=customer_name.strip(),
                customer_phone=customer_phone.strip(),
                reservation_date=reservation_date.strip(),
                reservation_time=reservation_time.strip(),
                party_size=max(1, int(party_size)),
                customer_email=customer_email.strip() or None,
                client_notes=notes.strip() or None,
            )
        except ReservationAgentApiError as e:
            return {"error": str(e), "status_code": e.status_code}

    @function_tool()
    async def lookup_reservation(
        context: RunContext,
        token: str,
    ) -> dict:
        """Look up an existing reservation by its booking token."""
        client = _build_client()
        try:
            return client.get_by_token(token.strip())
        except ReservationAgentApiError as e:
            return {"error": str(e), "status_code": e.status_code}

    @function_tool()
    async def cancel_reservation(
        context: RunContext,
        reservation_id: int,
        token: str,
    ) -> dict:
        """Cancel a reservation using its id and booking token. Confirm with the guest first."""
        try:
            context.disallow_interruptions()
        except Exception:
            pass
        client = _build_client()
        try:
            return client.cancel_by_token(
                reservation_id=int(reservation_id), token=token.strip()
            )
        except ReservationAgentApiError as e:
            return {"error": str(e), "status_code": e.status_code}

    return [
        check_next_available,
        list_available_times,
        create_reservation,
        lookup_reservation,
        cancel_reservation,
    ]


INSTRUCTIONS = """
You are the restaurant reservation assistant for Satisfecho POS.
You support both spoken voice and typed chat in the same LiveKit room.

Help guests:
1) Check availability (next slot or times on a date)
2) Create a reservation (name, phone, date, time, party size; email optional)
3) Look up or cancel with a booking token when the guest provides it

Rules:
- Always confirm date, time, party size, name, and phone before creating.
- Never invent availability; only trust tool results.
- If a tool returns an error, explain briefly and offer another time.
- Do not ask for payment card numbers.
- Keep answers short for voice.
""".strip()


def main() -> None:
    try:
        from dotenv import load_dotenv
        from livekit.agents import Agent, AgentServer, AgentSession, JobContext, cli
    except ImportError as e:
        raise SystemExit(
            "LiveKit agent deps missing. Install with:\n"
            "  pip install -r back/livekit_reservation_agent/requirements-livekit.txt\n"
            f"Original error: {e}"
        ) from e

    # Load config.env from repo root when present (secrets stay out of git).
    repo_root = _BACK_ROOT.parent
    for candidate in (repo_root / "config.env", Path.cwd() / "config.env"):
        if candidate.is_file():
            load_dotenv(candidate)
            break

    logging.basicConfig(level=logging.INFO)
    tools = _register_tools()
    server = AgentServer()

    @server.rtc_session()
    async def entrypoint(ctx: JobContext):
        ctx.log_context_fields = {"room": ctx.room.name, "tenant_id": _tenant_id()}
        session = AgentSession(
            # LiveKit Inference strings; override via env / LiveKit Cloud project as needed.
            stt=_env("LIVEKIT_AGENT_STT", "deepgram/nova-3"),
            llm=_env("LIVEKIT_AGENT_LLM", "openai/gpt-4o-mini"),
            tts=_env("LIVEKIT_AGENT_TTS", "cartesia/sonic-2"),
        )
        agent = Agent(instructions=INSTRUCTIONS, tools=tools)
        await session.start(agent=agent, room=ctx.room)
        await ctx.connect()
        await session.generate_reply(
            instructions="Greet the guest briefly and ask how you can help with a reservation."
        )

    cli.run_app(server)


if __name__ == "__main__":
    main()

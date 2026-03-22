"""Field defaults on Settings (no env mutation; uses model metadata only)."""


def test_email_from_default_is_project_domain_not_example_com() -> None:
    from app.settings import Settings

    default = Settings.model_fields["email_from"].default
    assert default == "noreply@satisfecho.de"
    assert "example.com" not in (default or "")

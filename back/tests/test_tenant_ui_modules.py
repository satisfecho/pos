from app.tenant_ui_modules import (
    compact_tenant_ui_modules,
    merge_tenant_ui_modules_patch,
    resolve_tenant_ui_modules,
)


def test_resolve_defaults_all_true():
    assert resolve_tenant_ui_modules(None) == {
        "tables": True,
        "working_plan": True,
        "providers": True,
        "reservations": True,
        "kitchen_bar": True,
        "inventory": True,
    }


def test_resolve_merges_stored_false():
    assert resolve_tenant_ui_modules({"tables": False})["tables"] is False
    assert resolve_tenant_ui_modules({"tables": False})["providers"] is True


def test_compact_none_when_all_enabled():
    assert compact_tenant_ui_modules(resolve_tenant_ui_modules(None)) is None


def test_compact_keeps_false_only():
    eff = resolve_tenant_ui_modules(None)
    eff["tables"] = False
    assert compact_tenant_ui_modules(eff) == {"tables": False}


def test_merge_patch():
    assert merge_tenant_ui_modules_patch(None, {"tables": False}) == {"tables": False}
    assert merge_tenant_ui_modules_patch({"tables": False}, {"tables": True}) is None

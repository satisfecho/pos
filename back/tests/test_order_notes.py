from app.order_notes import MAX_ORDER_NOTE_LEN, normalize_order_note, order_notes_equal


def test_normalize_order_note_strips_and_caps():
    assert normalize_order_note("  hello  ") == "hello"
    assert normalize_order_note("") is None
    assert normalize_order_note("   ") is None
    assert normalize_order_note(None) is None
    long_text = "x" * (MAX_ORDER_NOTE_LEN + 10)
    assert len(normalize_order_note(long_text) or "") == MAX_ORDER_NOTE_LEN


def test_order_notes_equal_treats_empty_as_equal():
    assert order_notes_equal(None, "")
    assert order_notes_equal("  note ", "note")
    assert not order_notes_equal("a", "b")

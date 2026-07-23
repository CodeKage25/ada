import pytest

from ada.resilience import retry_async


class _Transient(Exception):
    code = 503


class _Fatal(Exception):
    code = 400


async def test_retries_transient_then_succeeds():
    calls = {"n": 0}

    async def fn():
        calls["n"] += 1
        if calls["n"] < 3:
            raise _Transient()
        return "ok"

    assert await retry_async(fn, attempts=3, base_delay=0) == "ok"
    assert calls["n"] == 3


async def test_non_transient_raises_immediately():
    calls = {"n": 0}

    async def fn():
        calls["n"] += 1
        raise _Fatal()

    with pytest.raises(_Fatal):
        await retry_async(fn, attempts=3, base_delay=0)
    assert calls["n"] == 1


async def test_exhausts_attempts_on_persistent_transient():
    async def fn():
        raise _Transient()

    with pytest.raises(_Transient):
        await retry_async(fn, attempts=2, base_delay=0)

"""provider.py: one call to Open-Meteo, retried, and every bad answer rejected (O73, O74)."""

import datetime
import json

import httpx
import pytest

from config import settings
from helpers import DAYS_FETCHED, provider_body
from provider import DayWeather, ProviderError, fetch_forecast


class FakeProvider:
    """Stands in for Open-Meteo: answers each request with the next planned answer
    and remembers every request it got."""

    def __init__(self, *answers):
        """Each answer is an httpx.Response, or an exception to raise (like a timeout)."""
        self.answers = list(answers)
        self.requests = []

    def handle(self, request: httpx.Request) -> httpx.Response:
        """Called by httpx instead of the network."""
        self.requests.append(request)
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer

    def client(self) -> httpx.Client:
        """An httpx client whose every request goes to handle()."""
        return httpx.Client(transport=httpx.MockTransport(self.handle))


def ok(body=None) -> httpx.Response:
    """A 200 answer with a JSON body (a valid one by default)."""
    return httpx.Response(200, json=provider_body() if body is None else body)


def body_with(change) -> dict:
    """A valid body after `change(body)` has broken one part of it."""
    body = provider_body()
    change(body)
    return body


def fetch(provider: FakeProvider):
    """Fetch the demo point through the fake provider."""
    return fetch_forecast(31.25, 34.75, provider.client())


def test_good_answer_gives_eight_days():
    forecast = fetch(FakeProvider(ok()))
    assert len(forecast.days) == DAYS_FETCHED
    assert forecast.days[0] == DayWeather(datetime.date(2026, 11, 16), et0_mm=2.78, rain_mm=0.0)
    assert forecast.days[3] == DayWeather(datetime.date(2026, 11, 19), et0_mm=3.0, rain_mm=4.2)
    assert forecast.utc_offset_seconds == 7200


def test_request_asks_for_the_right_data():
    """ET0 and all precipitation, 8 days, in the point's own time zone (O69, O70, O72)."""
    provider = FakeProvider(ok())
    fetch(provider)
    request = provider.requests[0]
    assert str(request.url).startswith(settings.provider_base_url)
    assert dict(request.url.params) == {
        "latitude": "31.25",
        "longitude": "34.75",
        "daily": "et0_fao_evapotranspiration,precipitation_sum",
        "timezone": "auto",
        "forecast_days": "8",
    }


def test_api_key_is_sent_only_when_set(monkeypatch):
    monkeypatch.setattr(settings, "provider_api_key", "secret-key")
    provider = FakeProvider(ok())
    fetch(provider)
    assert provider.requests[0].url.params["apikey"] == "secret-key"


def test_failure_then_success_is_retried():
    provider = FakeProvider(httpx.ReadTimeout("slow"), httpx.Response(500), ok())
    assert len(fetch(provider).days) == DAYS_FETCHED
    assert len(provider.requests) == 3


def set_et0(index, value):
    """A change that puts `value` into one ET0 slot."""
    return lambda body: body["daily"]["et0_fao_evapotranspiration"].__setitem__(index, value)


# Every way the provider can fail (O74). Each must be tried 3 times, then raise.
BAD_ANSWERS = [
    ("timeout", httpx.ReadTimeout("slow")),
    ("connection refused", httpx.ConnectError("refused")),
    ("server error", httpx.Response(500, text="oops")),
    ("provider's own 400", httpx.Response(400, json={"error": True, "reason": "bad"})),
    ("not JSON", httpx.Response(200, text="<html>maintenance</html>")),
    ("JSON but a list", ok([1, 2, 3])),
    ("no daily", ok(body_with(lambda b: b.pop("daily")))),
    ("no ET0", ok(body_with(lambda b: b["daily"].pop("et0_fao_evapotranspiration")))),
    ("no rain", ok(body_with(lambda b: b["daily"].pop("precipitation_sum")))),
    ("no time", ok(body_with(lambda b: b["daily"].pop("time")))),
    ("no utc offset", ok(body_with(lambda b: b.pop("utc_offset_seconds")))),
    ("ET0 null", ok(body_with(set_et0(2, None)))),
    ("ET0 text", ok(body_with(set_et0(2, "2.5")))),
    ("ET0 true", ok(body_with(set_et0(2, True)))),
    ("ET0 negative", ok(body_with(set_et0(2, -0.1)))),
    ("ET0 NaN", httpx.Response(200, text=json.dumps(provider_body()).replace("2.47", "NaN"))),
    ("ET0 Infinity", httpx.Response(200, text=json.dumps(provider_body()).replace("2.47", "Infinity"))),
    ("rain null", ok(body_with(lambda b: b["daily"]["precipitation_sum"].__setitem__(0, None)))),
    ("one rain value short", ok(body_with(lambda b: b["daily"]["precipitation_sum"].pop()))),
    ("only 7 days", ok(body_with(lambda b: [values.pop() for values in b["daily"].values()]))),
    ("bad date", ok(body_with(lambda b: b["daily"]["time"].__setitem__(1, "2026-02-30")))),
    ("days out of order", ok(body_with(lambda b: b["daily"]["time"].reverse()))),
    ("ET0 in inches", ok(body_with(lambda b: b["daily_units"].__setitem__("et0_fao_evapotranspiration", "inch")))),
    ("rain unit missing", ok(body_with(lambda b: b["daily_units"].pop("precipitation_sum")))),
    ("units not an object", ok(body_with(lambda b: b.__setitem__("daily_units", ["mm", "mm"])))),
]


@pytest.mark.parametrize("case, answer", BAD_ANSWERS, ids=[case for case, _ in BAD_ANSWERS])
def test_bad_answer_is_tried_three_times_then_fails(case, answer):
    provider = FakeProvider(answer, answer, answer)
    with pytest.raises(ProviderError):
        fetch(provider)
    assert len(provider.requests) == 3  # the first attempt and PROVIDER_RETRIES=2 more

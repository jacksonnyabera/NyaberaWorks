import json
import logging

from fastapi.testclient import TestClient

from app.core.logging_config import JsonFormatter
from app.core.request_id import request_id_ctx


def test_response_gets_a_generated_request_id(client: TestClient) -> None:
    response = client.get("/api/health")
    request_id = response.headers["x-request-id"]
    assert len(request_id) == 32


def test_safe_client_request_id_is_kept(client: TestClient) -> None:
    response = client.get("/api/health", headers={"X-Request-ID": "my-test-request-0001"})
    assert response.headers["x-request-id"] == "my-test-request-0001"


def test_unsafe_client_request_id_is_replaced(client: TestClient) -> None:
    response = client.get("/api/health", headers={"X-Request-ID": "bad id!!"})
    assert response.headers["x-request-id"] != "bad id!!"
    assert len(response.headers["x-request-id"]) == 32


def test_json_log_line_contains_request_id() -> None:
    record = logging.LogRecord("test", logging.INFO, __file__, 1, "hello", None, None)
    token = request_id_ctx.set("abc12345")
    try:
        line = JsonFormatter().format(record)
    finally:
        request_id_ctx.reset(token)
    payload = json.loads(line)
    assert payload["message"] == "hello"
    assert payload["request_id"] == "abc12345"
    assert payload["level"] == "INFO"

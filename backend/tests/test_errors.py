from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.errors import AppError


def test_unknown_route_uses_error_format(client: TestClient) -> None:
    response = client.get("/api/does-not-exist")
    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "NOT_FOUND"
    assert error["request_id"] == response.headers["x-request-id"]


def test_wrong_method_uses_error_format(client: TestClient) -> None:
    response = client.post("/api/health")
    assert response.status_code == 405
    assert response.json()["error"]["code"] == "METHOD_NOT_ALLOWED"
    assert response.headers["allow"] == "GET"


def test_validation_error_lists_fields_without_echoing_input(
    app: FastAPI, client: TestClient
) -> None:
    @app.get("/api/_test/number")
    async def number(n: int) -> dict[str, int]:
        return {"n": n}

    response = client.get("/api/_test/number?n=secret-value")
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["details"][0]["field"] == "n"
    assert "secret-value" not in response.text


def test_app_error_returns_its_own_status_and_code(app: FastAPI, client: TestClient) -> None:
    @app.get("/api/_test/conflict")
    async def conflict() -> None:
        raise AppError(409, "CONFLICT", "Already exists.")

    response = client.get("/api/_test/conflict")
    assert response.status_code == 409
    assert response.json()["error"]["message"] == "Already exists."


def test_unexpected_crash_hides_details_but_keeps_request_id(
    app: FastAPI, client: TestClient
) -> None:
    @app.get("/api/_test/boom")
    async def boom() -> None:
        raise RuntimeError("secret internal detail")

    response = client.get("/api/_test/boom")
    assert response.status_code == 500
    assert "secret internal detail" not in response.text
    error = response.json()["error"]
    assert error["code"] == "INTERNAL_ERROR"
    assert error["request_id"] == response.headers["x-request-id"]

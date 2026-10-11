"""Who is the visitor? Their IP address, used only for spam limits (and only as a keyed hash).

Two situations:
  * Caddy (Docker on a server) sits in front of the API and uvicorn is told to
    trust it, so request.client.host is already the visitor.
  * The website server (Cloud Run) forwards API calls on the visitor's behalf.
    It sends X-Client-IP plus a shared secret. The IP header is honoured only
    when the secret matches, so nobody can fake it by calling the API directly.
"""

import hmac
import ipaddress

from fastapi import Request

from app.core.config import get_settings

SECRET_HEADER = "x-proxy-secret"
IP_HEADER = "x-client-ip"


def client_ip(request: Request) -> str:
    secret = get_settings().proxy_shared_secret
    if secret:
        supplied = request.headers.get(SECRET_HEADER, "")
        if supplied and hmac.compare_digest(supplied.encode(), secret.encode()):
            try:
                return str(ipaddress.ip_address(request.headers.get(IP_HEADER, "").strip()))
            except ValueError:
                pass  # trusted caller sent no usable address: fall back below
    return request.client.host if request.client else "unknown"

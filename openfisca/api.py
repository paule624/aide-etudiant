"""OpenFisca France web API, private and log-free.

Only the requests carrying the shared key (header X-Api-Key) are served,
so the instance cannot be used as an open relay.
"""
import hmac
import os

from openfisca_core.scripts import build_tax_benefit_system
from openfisca_web_api.app import create_app

tax_benefit_system = build_tax_benefit_system(
    country_package_name="openfisca_france", extensions=None, reforms=None
)
_app = create_app(tax_benefit_system)
_API_KEY = os.environ.get("OPENFISCA_API_KEY", "")


def application(environ, start_response):
    # Health check stays public so the platform can probe the container
    if environ.get("PATH_INFO") == "/health":
        start_response("200 OK", [("Content-Type", "text/plain")])
        return [b"ok"]
    provided = environ.get("HTTP_X_API_KEY", "")
    if not _API_KEY or not hmac.compare_digest(provided, _API_KEY):
        start_response("401 Unauthorized", [("Content-Type", "text/plain")])
        return [b"unauthorized"]
    return _app(environ, start_response)

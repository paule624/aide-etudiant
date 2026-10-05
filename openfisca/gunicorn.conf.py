import os

bind = f"0.0.0.0:{os.getenv('PORT', '2000')}"
workers = int(os.getenv("OPENFISCA_WORKERS", "2"))
timeout = 60
# Privacy: no access log (request bodies are never logged by gunicorn anyway)
accesslog = None
errorlog = "-"
loglevel = "warning"
preload_app = True

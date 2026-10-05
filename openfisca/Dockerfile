FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY api.py gunicorn.conf.py ./

EXPOSE 2000
CMD ["gunicorn", "api:application", "--config", "gunicorn.conf.py"]

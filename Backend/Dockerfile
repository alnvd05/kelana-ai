FROM python:3.13-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --create-home kelana
COPY --chown=kelana:kelana . .
USER kelana
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]

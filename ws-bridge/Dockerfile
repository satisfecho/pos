# Base image comes from Compose `additional_contexts` (service:back), tagged
# as `pos-back:latest` on the back service — not `<project>-back` from the
# directory name (pos2 vs pos), which broke `FROM pos2-back:latest` on clones
# named `pos`.
FROM pos-back

WORKDIR /app

# ws-bridge deps (back may have some; install explicitly)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8021
# Standalone FastAPI app in this folder (not backend `app.main`)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8021", "--log-level", "info", "--access-log"]

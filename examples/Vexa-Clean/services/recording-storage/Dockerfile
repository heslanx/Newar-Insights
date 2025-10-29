FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (including ffmpeg for chunk concatenation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy shared models first (for layer caching)
COPY libs/shared-models /app/libs/shared-models

# Install shared models
RUN pip install --no-cache-dir -e /app/libs/shared-models

# Copy requirements and install
COPY services/recording-storage/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY services/recording-storage/app.py .

# Create recordings directory
RUN mkdir -p /recordings

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

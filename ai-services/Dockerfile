FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for common Python libraries
RUN apt-get update && \
    apt-get install -y build-essential libpq-dev --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV AI_HOST=0.0.0.0
ENV AI_PORT=5000

EXPOSE 5000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "1"]

# Use an official Python image
FROM --platform=linux/amd64 python:3.11-bookworm

WORKDIR /app

# Install system dependencies (including curl for health checks)
RUN apt-get update && \
    apt-get install -y gcc g++ libpq-dev postgresql-client curl libstdc++6 && \
    apt-get install -y --only-upgrade libstdc++6 && \
    strings /usr/lib/x86_64-linux-gnu/libstdc++.so.6 | grep GLIBCXX || true

# Copy requirements first (so Docker can cache this layer if requirements don't change)
COPY requirements.txt /app/requirements.txt

# Upgrade pip to latest version for better reliability
RUN pip install --upgrade pip
# Install Python dependencies with increased timeout
RUN pip install --default-timeout=120 --no-cache-dir -r /app/requirements.txt

# Ensure pydantic-ai agent is installed from GitHub (not PyPI)
RUN pip uninstall -y pydantic-ai pydantic-ai-slim pydantic-evals pydantic-graph && \
    pip install "git+https://github.com/pydantic/pydantic-ai.git#egg=pydantic-ai[full]"

# Copy the rest of your backend code
COPY . /app

# Set entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

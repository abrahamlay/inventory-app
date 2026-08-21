#!/bin/bash
# Quick setup for Inventory App (non-interactive, for CI/CD)
# Usage: ./setup.sh [admin_username] [admin_password] [admin_fullname]

set -e

ADMIN_USER=${1:-admin}
ADMIN_PASS=${2:-admin123}
ADMIN_NAME=${3:-Administrator}

echo "=== Inventory App Quick Setup ==="

# Detect compose command
if command -v docker &> /dev/null && docker info &> /dev/null; then
    CMD="docker compose"
elif command -v podman &> /dev/null && podman info &> /dev/null; then
    CMD="podman-compose"
else
    echo "Docker or Podman required."
    exit 1
fi

# Start containers
$CMD up -d --build

# Wait for backend
until curl -s http://localhost:8000/ > /dev/null; do
    sleep 2
done

# Create admin
curl -X POST http://localhost:8000/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\",\"full_name\":\"$ADMIN_NAME\",\"role\":\"admin\"}"

echo "Setup complete. API at http://localhost:8000"
EOF
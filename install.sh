#!/bin/bash
# Inventory App Installer for Linux/macOS
# Usage: ./install.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Inventory App Installer ===${NC}"

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     OS_TYPE=linux;;
    Darwin*)    OS_TYPE=mac;;
    *)          OS_TYPE=unknown;;
esac
echo -e "Detected OS: ${OS_TYPE}"

# Check Docker or Podman
DOCKER_CMD=""
if command -v docker &> /dev/null && docker info &> /dev/null; then
    DOCKER_CMD="docker compose"
    echo -e "${GREEN}✓ Docker found${NC}"
elif command -v podman &> /dev/null && podman info &> /dev/null; then
    if command -v podman-compose &> /dev/null; then
        DOCKER_CMD="podman-compose"
    elif podman compose version &> /dev/null; then
        DOCKER_CMD="podman compose"
    else
        echo -e "${RED}Podman found but podman-compose not installed.${NC}"
        echo "Please install podman-compose or use Docker."
        exit 1
    fi
    echo -e "${GREEN}✓ Podman found${NC}"
else
    echo -e "${RED}Neither Docker nor Podman found. Please install Docker or Podman.${NC}"
    exit 1
fi

# Check if .env exists, create if not
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cat > .env <<EOF
DATABASE_URL=postgresql://inventory:inventory123@db:5432/inventory
REDIS_URL=redis://redis:6379/0
SECRET_KEY=change-this-in-production
EOF
fi

# Build and start containers
echo -e "${GREEN}Building and starting containers...${NC}"
${DOCKER_CMD} up -d --build

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
until curl -s http://localhost:8000/ > /dev/null; do
    sleep 2
done
echo -e "${GREEN}Backend is ready!${NC}"

# Ask to create admin user
read -p "Create admin user? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Username (default: admin): " ADMIN_USER
    ADMIN_USER=${ADMIN_USER:-admin}
    read -sp "Password: " ADMIN_PASS
    echo
    read -p "Full name: " ADMIN_NAME
    ADMIN_NAME=${ADMIN_NAME:-Administrator}
    
    curl -X POST http://localhost:8000/auth/register \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\",\"full_name\":\"$ADMIN_NAME\",\"role\":\"admin\"}" \
        | echo "Admin created."
fi

echo -e "${GREEN}=== Installation complete! ===${NC}"
echo "Access API at: http://localhost:8000"
echo "Swagger docs: http://localhost:8000/docs"
echo "Frontend (if Nginx configured): http://localhost:8080"
EOF
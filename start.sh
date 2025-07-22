#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Idea8 Startup Script${NC}"
echo "================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating one...${NC}"
    cat > .env << EOF
# API Configuration
GROQ_API_KEY_1=your_groq_api_key_here
GROQ_API_KEY_2=your_groq_api_key_here
GROQ_API_KEY_3=your_groq_api_key_here

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@db:5432/ideas

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# API Key for external access
API_KEY=your-secure-api-key-here
EOF
    echo -e "${YELLOW}📝 Please edit .env file and add your API keys${NC}"
    echo -e "${YELLOW}   You can get Groq API keys from: https://console.groq.com/keys${NC}"
    exit 1
fi

# Check if GROQ_API_KEY is set
if ! grep -q "GROQ_API_KEY_1=" .env || grep -q "GROQ_API_KEY_1=your_groq_api_key_here" .env; then
    echo -e "${RED}❌ GROQ_API_KEY_1 not found or not set in .env file${NC}"
    echo -e "${YELLOW}   Please add your GROQ_API_KEY_1 to the .env file${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo -e "${YELLOW}   Please start Docker and try again${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment check passed${NC}"

# Stop any existing containers and clean up
echo -e "${BLUE}🧹 Cleaning up existing containers...${NC}"
docker-compose down -v

# Build and start services
echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose up --build -d

# Wait for database to be ready
echo -e "${BLUE}⏳ Waiting for database to be ready...${NC}"
until docker-compose exec -T db pg_isready -U postgres; do
    echo "Database not ready yet, waiting..."
    sleep 2
done
echo -e "${GREEN}✅ Database is ready${NC}"

# Wait for backend to be ready
echo -e "${BLUE}⏳ Waiting for backend to be ready...${NC}"
until docker-compose exec -T backend curl -f http://localhost:8000/health; do
    echo "Backend not ready yet, waiting..."
    sleep 5
done
echo -e "${GREEN}✅ Backend is ready${NC}"

# Check if repos exist, if not fetch them
echo -e "${BLUE}🔍 Checking for existing repositories...${NC}"
REPO_COUNT=$(docker-compose exec -T db psql -U postgres -d ideas -t -c "SELECT COUNT(*) FROM repos;" 2>/dev/null | tr -d ' ')
if [ "$REPO_COUNT" = "0" ] || [ -z "$REPO_COUNT" ]; then
    echo -e "${YELLOW}⚠️  No repositories found. Fetching trending repos...${NC}"
    docker-compose exec -T backend python scripts/fetch_and_generate_ideas.py --fetch-only
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Repositories fetched successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: Failed to fetch repositories, but continuing...${NC}"
    fi
else
    echo -e "${GREEN}✅ Found $REPO_COUNT existing repositories${NC}"
fi

# Final status check
echo -e "${BLUE}📊 Final Status Check:${NC}"
echo -e "${BLUE}  Database: ${GREEN}✅ Running${NC}"
echo -e "${BLUE}  Backend: ${GREEN}✅ Running${NC}"
echo -e "${BLUE}  Frontend: ${GREEN}✅ Running${NC}"

# Get final repo count
FINAL_REPO_COUNT=$(docker-compose exec -T db psql -U postgres -d ideas -t -c "SELECT COUNT(*) FROM repos;" 2>/dev/null | tr -d ' ')
echo -e "${BLUE}  Repositories: ${GREEN}✅ $FINAL_REPO_COUNT repos available${NC}"

echo ""
echo -e "${GREEN}🎉 Idea8 is ready!${NC}"
echo -e "${BLUE}📱 Frontend: ${GREEN}http://localhost:8081${NC}"
echo -e "${BLUE}🔧 Backend API: ${GREEN}http://localhost:8000${NC}"
echo -e "${BLUE}📚 API Docs: ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}💡 Note: Ideas will be generated when users request them, not automatically.${NC}"
echo -e "${YELLOW}   This ensures a clean startup and better user experience.${NC}" 
#!/bin/bash

# Plinko Game Production Deployment Script
set -e

echo "🚀 Starting Plinko Game production deployment..."

# Check if required files exist
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build application
echo "📦 Building application..."
pnpm install --frozen-lockfile
pnpm build:production

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t plinko-game:latest .

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Start new containers
echo "▶️  Starting new containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🔍 Checking application health..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Application is healthy!"
else
    echo "❌ Application health check failed!"
    echo "📝 Check logs with: docker-compose logs -f plinko-app"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Application URLs:"
echo "   - Main app: http://localhost:3000"
echo "   - Health check: http://localhost:3000/api/health"
echo "   - Metrics: http://localhost:3000/api/metrics"
echo "   - Grafana: http://localhost:3001 (admin/admin)"
echo "   - Prometheus: http://localhost:9090"
echo ""
echo "📝 Useful commands:"
echo "   - View logs: docker-compose logs -f plinko-app"
echo "   - Stop services: docker-compose down"
echo "   - Restart: docker-compose restart plinko-app"
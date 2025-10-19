# Render Build Commands
# Build Command: pnpm install && pnpm build
# Start Command: pnpm start

# Environment Variables needed in Render:
# NODE_ENV=production
# DATABASE_URL=your_postgres_connection_string_from_render
# TON_API_KEY=AEBE4GOFFSWC2MAAAAAFVZ24DO3WJWH7IKYUQDS2EF6UAIS2ULVW5XDB4YU3VQYHPGHIC6A
# TON_NETWORK=testnet
# SESSION_SECRET=your_secure_random_string_for_sessions
# CORS_ORIGIN=https://your-app-name.onrender.com

# Optional for monitoring:
# PROMETHEUS_ENABLED=true
# LOG_LEVEL=info

# To deploy:
# 1. Create PostgreSQL database in Render
# 2. Create Web Service in Render
# 3. Connect GitHub repository
# 4. Set environment variables
# 5. Deploy and run migration
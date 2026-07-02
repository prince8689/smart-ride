#!/bin/bash
# Smart Ride — Quick Local Setup Script

echo "🚗 Setting up Smart Ride Backend..."

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current: $(node -v)"
  exit 1
fi
echo "✅ Node.js version OK: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check .env exists
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "📋 Created .env from .env.example — please fill in your values"
  echo "⚠️  Edit .env before continuing"
  exit 0
fi
echo "✅ .env file found"

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  source .env
fi

# Run schema
echo "🗄️  Running database schema..."
psql $DATABASE_URL -f src/config/schema.sql
echo "✅ Schema created"

# Run migrations
echo "🔄 Running migrations..."
psql $DATABASE_URL -f src/config/migrations/001_add_invoice_html.sql
psql $DATABASE_URL -f src/config/migrations/002_performance_indexes.sql
psql $DATABASE_URL -f src/config/migrations/003_push_subscriptions.sql
psql $DATABASE_URL -f src/config/migrations/004_ratings.sql
echo "✅ Migrations complete"

# Generate VAPID keys if not set
if [ -z "$VAPID_PUBLIC_KEY" ]; then
  echo "🔑 Generating VAPID keys..."
  node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log('VAPID_PUBLIC_KEY='+k.publicKey+'\nVAPID_PRIVATE_KEY='+k.privateKey);"
  echo "⚠️  Copy above VAPID keys to your .env file"
fi

# Run seed
echo "🌱 Seeding database..."
npm run seed
echo "✅ Database seeded"

echo ""
echo "🎉 Smart Ride Backend setup complete!"
echo "Run: npm run dev"
echo ""
echo "Test accounts:"
echo "  Admin:  admin@smartride.in / Admin@1234"
echo "  User:   user1@test.in / User@1234"
echo "  Driver: driver1@test.in / Driver@1234"

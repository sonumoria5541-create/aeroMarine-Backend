# AeroMarine — Maritime & Container Investment Backend API

High-performance, streamlined Express & Node.js backend for the **AeroMarine Shipping & Exports** platform.

## Features
- **Phone Authentication:** Fast bcrypt & JWT authentication with masked profile views
- **Container Fleet Plans:** Normal Fleet Plans and VIP Express Cargo leasing
- **Order Management:** Automated 24h settlements, daily yield claims, and progress tracking
- **Wallet & UTR Deposits:** Dynamic recharge flows with UPI QR code and 12-digit UTR submission
- **Withdrawals:** Bank card payout requests with 10% platform tax calculation
- **Lucky Spin Wheel:** Daily freight bounty awarding instant wallet cash rewards (₹200–₹400)
- **3-Tier Team Referrals:** Level 1 (10%), Level 2 (3%), Level 3 (1%) commission tracking
- **Admin Approvals:** 1-click approval/rejection for deposits and payouts

## Quick Start
```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Seed database
npm run seed

# Start server
npm start

# Run tests
npm test
```

## Environment Variables
- `PORT` (default: `5000`)
- `MONGO_URI` (MongoDB Atlas connection string)
- `JWT_SECRET`
- `RESEND_API_KEY`

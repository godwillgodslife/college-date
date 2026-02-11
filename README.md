# College Date (CD) 💕

A modern, Tinder-style dating web application designed for Nigerian university students.

## 🚀 Features

- **Swipe Interface**: Tinder-style left/right swipe mechanics
- **Matching System**: Mutual likes create matches (Free swipes logic included)
- **Monetization**: Paid swipes (₦500) via Flutterwave with 50/50 split
- **Wallet System**: Female users earn money from swipes and can request withdrawals
- **Real-time Chat**: Messaging with typing indicators and read receipts
- **Admin Dashboard**: Comprehensive management for users, transactions, and reports
- **Authentication**: Role-based auth (Male/Female/Admin) with age verification

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript
- **Backend**: Supabase (Auth, Database, Realtime, Storage)
- **Payments**: Flutterwave
- **Styling**: Vanilla CSS (Variables, Glassmorphism, Animations)

## 🏗️ Setup Instructions

### 1. Prerequisites
- Node.js 18+ installed
- Supabase account
- Flutterwave account

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Copy `.env.local.example` to `.env.local` and fill in your credentials:
```bash
cp .env.local.example .env.local
```
Required keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin/webhook operations)
- `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY`
- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_ENCRYPTION_KEY`
- `FLUTTERWAVE_WEBHOOK_HASH` (optional, for verification)

### 4. Database Setup
1. Go to your Supabase Dashboard > SQL Editor.
2. Open [`supabase/schema.sql`](./supabase/schema.sql).
3. Run the entire script to create tables, policies, and buckets.
4. **Important**: Ensure `uuid-ossp` extension is enabled.

### 5. Seed Dummy Data (Optional)
Populate the database with realistic Nigerian student profiles:
```bash
npm install dotenv # if not installed globally
node scripts/seed.js
```
*Note: Ensure your `.env.local` or environment variables are set before running the script.*

### 6. Run Development Server
```bash
npm run dev
```
Visit `http://localhost:3000`.

## 📱 Usage Guide

### Male Users
- Sign up as **Male**.
- You get **3 Free Swipes**.
- Swipe Right to Like, Left to Pass.
- After free swipes, pay **₦500** to swipe right on a girl.
- Chat unlocks only after a Match (Mutual Like or Paid Swipe).

### Female Users
- Sign up as **Female**.
- View your **Wallet** in the bottom tab.
- Earn **₦250** for every paid swipe you receive.
- Request withdrawals to any Nigerian bank.

### Admin
- Login with an account that has `role: 'admin'` in the `profiles` table.
- Access dashboard at `/admin`.
- View stats, manage users, and approve withdrawals.

## 📄 License
Private Property of College Date.

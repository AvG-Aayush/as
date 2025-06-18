# HR Platform

A comprehensive HR management system built with React, Node.js, and PostgreSQL.

## Quick Setup

1. **Environment Variables**
   Copy `.env.example` to `.env` and fill in your database credentials:
   ```bash
   cp .env.example .env
   ```

2. **Required Environment Variables**
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `SESSION_SECRET`: Secure random string for sessions (optional)

3. **Start the Application**
   ```bash
   npm run dev
   ```

## Database Setup

You need a PostgreSQL database. The application supports any PostgreSQL provider:

- **Local PostgreSQL**: `postgresql://username:password@localhost:5432/database_name`
- **Supabase**: `postgresql://postgres:[password]@[host]:6543/postgres`
- **Other providers**: Any PostgreSQL connection URL

## Default Login

- **Username**: `admin`
- **Password**: `admin123`

## Features

- Employee management and profiles
- Attendance tracking with GPS verification
- Leave request system
- Real-time messaging
- Administrative dashboard
- Role-based access control

## Development

The application runs on port 5000 by default. The frontend and backend are served together through a single Express server with Vite integration.
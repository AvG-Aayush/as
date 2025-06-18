# HR Platform - replit.md

## Overview

This is a comprehensive HR Platform built as a full-stack web application designed to manage employee attendance, leave requests, messaging, project management, and administrative tasks. The system features role-based access control with Admin, HR, Manager, and Employee roles, providing different levels of functionality based on user permissions.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Forms**: React Hook Form with Zod validation
- **Maps Integration**: Leaflet for location-based features

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Session-based authentication with bcrypt password hashing
- **Session Storage**: PostgreSQL session store using connect-pg-simple
- **File Uploads**: Multer middleware for handling multipart form data
- **WebSocket**: Real-time messaging capabilities

### Build System
- **Bundler**: Vite for fast development and optimized production builds
- **TypeScript**: Strict type checking across client and server
- **Development**: Hot module replacement and runtime error overlay
- **Production**: ESBuild for server bundling with external packages

## Key Components

### Authentication & Authorization
- **Session Management**: Secure session-based authentication with PostgreSQL storage
- **Password Security**: Bcrypt hashing with salt rounds
- **Role-based Access Control**: Four-tier permission system (Employee, Manager, HR, Admin)
- **Default Accounts**: Automatic admin account creation on first startup

### Database Schema
- **Users Management**: Comprehensive user profiles with personal and professional details
- **Attendance Tracking**: Check-in/check-out with GPS verification and automatic calculations
- **Leave Management**: Multiple leave types with approval workflows
- **Messaging System**: Encrypted messaging with delivery tracking

- **Administrative Features**: Announcements, assignments, and HR forms

### Real-time Features
- **WebSocket Integration**: Live messaging and attendance updates
- **GPS Location Services**: Accurate location tracking for attendance verification
- **Automatic Cleanup**: Scheduled services for data maintenance and session cleanup
- **Midnight Reset**: Automatic attendance processing at day boundaries

## Data Flow

### Attendance Workflow
1. Employee initiates check-in/check-out with GPS location
2. System validates location accuracy and work hours
3. Automatic calculation of working hours, overtime, and TOIL eligibility
4. Admin approval required for irregular attendance patterns
5. Scheduled cleanup processes handle incomplete records

### Leave Request Process
1. Employee submits leave request with dates and reasoning
2. System validates against existing schedules and TOIL balance
3. Routing to appropriate approver based on organizational hierarchy
4. Automated notifications and status updates
5. Integration with attendance system for approved leaves

### Messaging System
1. Real-time message delivery through WebSocket connections
2. Message encryption for secure communication
3. Delivery confirmation and read receipts
4. Group messaging capabilities with role-based access
5. Automatic cleanup of old messages and failed deliveries

## External Dependencies

### Core Runtime Dependencies
- **Database**: PostgreSQL (configurable via DATABASE_URL environment variable)
- **Authentication**: bcrypt for password hashing
- **Session Management**: connect-pg-simple for PostgreSQL session storage
- **File Processing**: multer for multipart form handling
- **Date Handling**: date-fns for date manipulation and formatting

### UI and Frontend Libraries
- **Component Library**: @radix-ui components with shadcn/ui theming
- **Form Management**: react-hook-form with @hookform/resolvers
- **Validation**: zod for runtime type checking and validation
- **Styling**: tailwindcss with class-variance-authority for component variants
- **Icons**: lucide-react for consistent iconography

### Development and Build Tools
- **Build System**: vite with @vitejs/plugin-react
- **Database Migrations**: drizzle-kit for schema management
- **TypeScript**: Full type safety across the application
- **Environment Management**: cross-env for cross-platform environment variables

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot reload on port 5000
- **Database**: PostgreSQL with connection pooling (configurable provider)
- **Environment Variables**: .env file with DATABASE_URL and optional configuration
- **Automatic Setup**: Database initialization and default user creation

### Production Deployment
- **Build Process**: Vite client build + ESBuild server bundling
- **Session Security**: Production-grade session configuration
- **Database Connection**: SSL-enabled PostgreSQL connection with pooling
- **Static Assets**: Optimized client bundle served by Express
- **Health Monitoring**: Automatic cleanup services and session management

### Replit Configuration
- **Modules**: nodejs-20, web, postgresql-16
- **Port Configuration**: Internal port 5000 mapped to external port 80
- **Build Commands**: npm run build for production builds
- **Run Commands**: npm run dev for development, npm run start for production

## Changelog

Changelog:
- June 13, 2025. Initial setup
- June 14, 2025. Enhanced Time Tracker - Redesigned project time tracking with smart distribution, automatic project scanning, and creative UI
- June 14, 2025. Project Schema Restored - Removed all time tracking complexity and restored original simple project schema with NAME, DESCRIPTION, STATUS, PRIORITY, MANAGER, CLIENT NAME, BUDGET, START/END DATE, and ASSIGNED EMPLOYEES only
- June 14, 2025. Complete Project Removal - Removed all project-related functionality including database schemas, API routes, frontend components, navigation items, and backend services. The HR Platform now focuses solely on employee management, attendance tracking, leave management, messaging, and administrative features.
- June 14, 2025. Environment Configuration - Removed hardcoded Supabase credentials and made database configuration fully environment-based. Added .env.example file and setup documentation for flexible database provider support.
- June 15, 2025. Fixed Attendance Barchart - Replaced basic chart visualization with professional Recharts implementation featuring color-coded bars, interactive tooltips, statistics, and proper data processing. Chart now displays actual attendance trends with accurate percentage calculations based on total employee count.

## User Preferences

Preferred communication style: Simple, everyday language.
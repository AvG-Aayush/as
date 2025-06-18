# HR Platform Authentication Setup Guide

This guide ensures the authentication system works properly when setting up the project in any environment.

## Quick Start

### 1. Environment Variables
Create a `.env` file in the root directory with your database connection:

```env
DATABASE_URL=your_postgresql_database_url_here
NODE_ENV=development
```

### 2. Default Accounts
The system automatically creates a default admin account on first startup:

**Default Admin Account:**
- Username: `admin`
- Password: `admin123`
- Role: Administrator

**Test User Account (if created):**
- Username: `testuser`
- Password: `password123`
- Role: Employee

### 3. Starting the Application
```bash
npm install
npm run dev
```

The system will automatically:
- Validate database connection
- Create default admin user if none exists
- Verify authentication system functionality

## Authentication Features

### Profile Picture Upload
- **Camera Access**: Click camera button to take photos
- **File Upload**: Select image files from device
- **Base64 Storage**: Images stored as base64 in PostgreSQL
- **Real-time Preview**: See uploaded images immediately

### Security Features
- **Password Hashing**: Bcrypt encryption for all passwords
- **Role-based Access**: Admin, HR, Manager, Employee roles
- **Session Management**: Secure token-based authentication
- **Database Validation**: Connection and user validation on startup

## Troubleshooting

### Login Issues
1. **Check Database Connection**: Ensure DATABASE_URL is correctly set
2. **Verify User Exists**: Use default admin account (admin/admin123)
3. **Check Console Logs**: Look for authentication errors in server logs
4. **Reset Database**: Delete users and restart to recreate default admin

### Database Setup Issues
1. **Missing DATABASE_URL**: The system will show an error on startup
2. **Connection Failed**: Check your PostgreSQL database is accessible
3. **Permission Errors**: Ensure database user has CREATE/INSERT privileges

### Profile Picture Issues
1. **Camera Access Denied**: Grant camera permissions in browser
2. **Large Images**: System handles base64 encoding automatically
3. **Upload Failures**: Check network connection and database space

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `GET /api/user` - Get current user info

### Profile Management
- `GET /api/profile/:userId` - Get user profile
- `PUT /api/profile/:userId` - Update user profile
- `PUT /api/profile/picture` - Update profile picture

## Development Notes

### Database Schema
The system uses PostgreSQL with Drizzle ORM. The user table includes:
- Basic info (username, email, password)
- Profile data (name, department, position)
- Profile picture (base64 encoded)
- Personal details (phone, address, etc.)
- Professional info (skills, experience, qualifications)

### Environment Compatibility
The authentication system is designed to work consistently across:
- Local development environments
- Shared project setups
- Different operating systems
- Various database configurations

### Adding New Users
1. Use the registration form in the application
2. Or create users via the admin panel
3. Or use the API endpoints directly

## Security Best Practices

1. **Change Default Passwords**: Update the default admin password after setup
2. **Use Strong Passwords**: Enforce password policies for new users
3. **Regular Backups**: Keep database backups for user data
4. **Access Control**: Use role-based permissions appropriately
5. **HTTPS**: Use secure connections in production

## Support

If you encounter authentication issues when sharing or setting up the project:

1. Check the server startup logs for initialization messages
2. Verify DATABASE_URL environment variable is set correctly
3. Ensure PostgreSQL database is accessible and has proper permissions
4. Try using the default admin account (admin/admin123) for initial access
5. Check browser console for any client-side authentication errors

The system includes comprehensive logging to help diagnose authentication problems quickly.
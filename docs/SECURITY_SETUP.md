# AsbestosGuard - Security Setup Guide

## Overview

AsbestosGuard now features enterprise-grade security with JWT-based authentication, input validation, rate limiting, and comprehensive security headers. This guide will help you set up and configure the security features.

## Prerequisites

- Node.js 18+ installed
- OpenSSL (for generating secrets)
- bcrypt installed (automatically via npm install)

## Initial Setup

### 1. Install Dependencies

All security dependencies have been installed:
```bash
npm install
```

Dependencies include:
- `jsonwebtoken` - JWT token generation and verification
- `bcrypt` - Password hashing
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `express-validator` - Input validation
- `cookie-parser` - Cookie parsing

### 2. Generate JWT Secret

Generate a secure random secret for JWT token signing:

```bash
openssl rand -base64 32
```

Copy the output - you'll need it for `.env.local`.

### 3. Generate Admin Password Hash

Hash your admin password using bcrypt:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourSecurePassword123!', 10).then(console.log)"
```

**Important**: Replace `YourSecurePassword123!` with your actual admin password. Copy the hash output.

### 4. Create `.env.local`

Create a `.env.local` file in the project root with the following configuration:

```bash
# =============================================================================
# SECURITY CONFIGURATION (REQUIRED)
# =============================================================================

# JWT Secret - Use the secret you generated in step 2
JWT_SECRET=your-generated-secret-here

# Token expiration times
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your-generated-bcrypt-hash-here

# CORS Configuration (comma-separated allowed origins)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# =============================================================================
# AI CONFIGURATION
# =============================================================================

# Google Gemini API Key
GEMINI_API_KEY=your-gemini-api-key-here

# Optional: Override default model
# GEMINI_MODEL=gemini-pro

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================

PORT=5000
NODE_ENV=development
LOG_LEVEL=info
```

### 5. Verify `.env.local` is Gitignored

**CRITICAL**: Ensure `.env.local` is in your `.gitignore` file (it already is):

```bash
# Verify it's ignored
git check-ignore .env.local
# Should output: .env.local
```

**Never commit `.env.local` to version control!**

## Security Features

### Authentication

**Server-Side JWT Authentication:**
- All endpoints protected with JWT tokens
- HTTP-only secure cookies prevent XSS attacks
- Automatic token refresh mechanism
- Role-based access control (admin vs employer)

**Protected Endpoints:**
- `/api/applications/*` - Requires authentication
- `/api/fact-sheets/*` - Requires admin role
- `/api/analysis/*` - Requires admin role
- `/__api/gemini/analyze` - Requires admin role

### Password Security

- Passwords hashed with bcrypt (10 salt rounds)
- Never stored or transmitted in plaintext
- Server-side validation only

### Input Validation

**Filename Sanitization:**
- Prevents path traversal attacks (e.g., `../../etc/passwd`)
- Only allows alphanumeric characters, hyphens, and underscores
- Maximum length: 255 characters

**Request Validation:**
- All POST/PUT requests validated with express-validator
- Structured error responses
- Type checking for all inputs

### Rate Limiting

**API Rate Limits:**
- General API: 100 requests per 15 minutes per IP
- Login endpoints: 5 attempts per 15 minutes per IP
- Prevents brute force attacks

### Security Headers (Helmet)

Automatically applied headers:
- `Content-Security-Policy` - Prevents XSS attacks
- `X-Frame-Options` - Prevents clickjacking
- `X-Content-Type-Options` - Prevents MIME sniffing
- `Strict-Transport-Security` - Enforces HTTPS in production

### CORS Configuration

- Origin whitelist from `ALLOWED_ORIGINS` env variable
- Credentials enabled for cookie-based auth
- Restricted HTTP methods (GET, POST, PUT, DELETE)

## Testing the Security Setup

### 1. Start the Development Server

```bash
npm run start:dev
```

### 2. Test Admin Login

**Using curl:**
```bash
curl -X POST http://localhost:5000/api/auth/login/admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourSecurePassword123!"}' \
  -c cookies.txt
```

**Expected Response:**
```json
{
  "user": {
    "userId": "admin",
    "username": "admin",
    "role": "admin"
  },
  "message": "Login successful"
}
```

### 3. Test Protected Endpoint

```bash
curl http://localhost:5000/api/applications \
  -b cookies.txt
```

**Expected**: Returns applications data (if authenticated)

### 4. Test Without Authentication

```bash
curl http://localhost:5000/api/applications
```

**Expected Response:**
```json
{
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "No authentication token provided"
  }
}
```

### 5. Test Rate Limiting

Make 6+ rapid login attempts with wrong credentials:

```bash
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login/admin \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}';
done
```

**Expected**: 6th request returns 429 Too Many Requests

### 6. Test Filename Sanitization

```bash
curl -X POST http://localhost:5000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"filename":"../../etc/passwd","data":{}}' \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid filename: path traversal detected"
  }
}
```

## Production Deployment

### Environment Variables

For production, set these additional variables:

```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
JWT_SECRET=<different-secret-from-development>
```

### Security Checklist

- [ ] All API keys rotated from development
- [ ] Strong admin password (16+ characters, mixed case, symbols)
- [ ] JWT_SECRET is cryptographically random (32+ bytes)
- [ ] HTTPS enabled and enforced
- [ ] ALLOWED_ORIGINS set to production domains only
- [ ] `.env.local` never committed to git
- [ ] Database backups configured
- [ ] Error logging configured (consider Sentry)
- [ ] Rate limits adjusted for production traffic
- [ ] Security headers verified with security scanner

### HTTPS Configuration

Helmet's HSTS header will automatically enforce HTTPS in production. Ensure your reverse proxy (nginx, Apache) or hosting platform terminates SSL properly.

## Troubleshooting

### "Invalid credentials" on Login

1. Verify password hash was generated correctly
2. Check `ADMIN_PASSWORD_HASH` in `.env.local`
3. Ensure username matches `ADMIN_USERNAME`

### "JWT_SECRET not configured"

1. Check `.env.local` exists in project root
2. Verify `JWT_SECRET` is set
3. Restart the server after changing `.env.local`

### "Origin not allowed by CORS"

1. Check frontend URL is in `ALLOWED_ORIGINS`
2. Restart server after changing CORS settings
3. Verify frontend is sending requests from the correct origin

### "Too many requests"

Rate limit hit. Wait 15 minutes or restart server (development only).

## Password Rotation

To change the admin password:

1. Generate new hash:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('NewPassword123!', 10).then(console.log)"
```

2. Update `ADMIN_PASSWORD_HASH` in `.env.local`
3. Restart server

## API Key Rotation

If API keys were exposed (e.g., committed to git):

1. **Immediately revoke** the exposed keys at:
   - Google Cloud Console (for Gemini API)

2. Generate new keys
3. Update `.env.local` with new keys
4. Restart server
5. Clean git history (if keys were committed)

## Security Best Practices

1. **Never commit secrets**: Always use environment variables
2. **Rotate credentials**: Change passwords and keys regularly
3. **Monitor logs**: Watch for suspicious activity
4. **Keep dependencies updated**: Run `npm audit` regularly
5. **Use strong passwords**: Minimum 16 characters, mixed case, numbers, symbols
6. **Limit access**: Only give admin credentials to trusted users
7. **Backup data**: Regular backups of `/data` directory
8. **Test security**: Regularly test auth and validation

## Support

For security issues or questions, refer to:
- Main README: `/README.md`
- Quick Start Guide: `/docs/QUICK_START.md`
- Gemini Setup: `/docs/GEMINI_SETUP.md`

## Security Vulnerability Reporting

If you discover a security vulnerability, please DO NOT open a public issue. Instead, follow responsible disclosure practices.

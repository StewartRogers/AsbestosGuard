# User Authentication Quick Start Guide

## What's New?

Your AsbestosGuard application now features a complete user authentication system:

- **Landing Page**: Main entry point for users submitting asbestos licensing applications
- **Admin Portal**: Protected admin area with login requirement
- **Header Navigation**: Clear "Admin Login" link for administrators

## How to Use

### For End Users (Applicants)
1. Visit the application homepage
2. Fill out and submit your asbestos licensing application
3. No login required for applicants

### For Administrators
1. Click **"Admin Login"** in the top-right corner of the header
2. Enter credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
3. You'll be granted access to:
   - View and review all applications
   - Update application statuses
   - Manage fact sheets
   - Export/import database

### Logging Out
Click the logout button in the admin dashboard to return to the landing page.

## Technical Details

### Authentication Architecture

```
App Component (State Management)
├── isAdminAuthenticated: boolean
├── handleAdminLogin(username, password)
├── handleAdminLogout()
└── Route Protection
    └── Admin routes require authentication
```

### Protected Routes
These routes require admin authentication:
- `ADMIN_DASHBOARD` - Main admin area
- `ADMIN_REVIEW` - Application review
- `ADMIN_FACT_SHEETS` - Fact sheet management
- `ADMIN_FACT_SHEET_NEW` - Create fact sheet
- `ADMIN_FACT_SHEET_EDIT` - Edit fact sheet
- `ADMIN_FACT_SHEET_VIEW` - View fact sheet

### Public Routes
These routes are always accessible:
- `LANDING` - Application submission
- `EMPLOYER_DASHBOARD` - User dashboard
- `EMPLOYER_NEW_FORM` - New application form
- `EMPLOYER_APP_DETAIL` - View submitted application

## Development Notes

### Current Demo Implementation
The authentication currently uses hardcoded credentials for demonstration:
```typescript
if (username === 'admin' && password === 'admin123') {
  // Grant access
}
```

### Next Steps for Production

#### 1. Implement Server-Side Authentication
Replace the demo login with a real API endpoint:

```typescript
const handleAdminLogin = async (username: string, password: string) => {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
      const { token } = await response.json();
      localStorage.setItem('authToken', token);
      setIsAdminAuthenticated(true);
      handleNavigate('ADMIN_DASHBOARD');
    } else {
      alert('Invalid credentials');
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

#### 2. Add Token Validation
Verify tokens on admin route access:

```typescript
const handleNavigate = (view: ViewState) => {
  if (view.startsWith('ADMIN_') && view !== 'ADMIN_LOGIN') {
    const token = localStorage.getItem('authToken');
    if (!token || !isTokenValid(token)) {
      setCurrentView('ADMIN_LOGIN');
      return;
    }
  }
  setCurrentView(view);
};
```

#### 3. Implement Logout with Token Cleanup
```typescript
const handleAdminLogout = () => {
  localStorage.removeItem('authToken');
  setIsAdminAuthenticated(false);
  handleNavigate('LANDING');
};
```

## Files Modified

1. **[App.tsx](App.tsx)**
   - Added authentication state management
   - Added login/logout handlers
   - Added route protection logic
   - Updated header with admin login link
   - Updated logout handlers

2. **[types.ts](types.ts)**
   - Added `ADMIN_LOGIN` to ViewState enum

3. **Created [pages/Admin/AdminLogin.tsx](pages/Admin/AdminLogin.tsx)**
   - New login page component
   - Professional UI with validation

## Testing Checklist

- [ ] Build completes without errors: `npm run build`
- [ ] Landing page displays (default view)
- [ ] "Admin Login" link visible in header
- [ ] Click admin link opens login form
- [ ] Login with wrong credentials shows error
- [ ] Login with `admin/admin123` grants access
- [ ] Admin mode indicator shows in header
- [ ] Can access admin features after login
- [ ] Logout returns to landing page
- [ ] Unauthorized admin access redirects to login

## Security Reminders

⚠️ **Important**: The current implementation uses demo credentials. Never deploy to production with hardcoded credentials. Always:

- Use encrypted connections (HTTPS)
- Implement server-side validation
- Use secure password hashing (bcrypt, Argon2)
- Store tokens securely (httpOnly cookies)
- Implement token expiration
- Add rate limiting on login attempts
- Log authentication events
- Use environment variables for credentials

## Support

For issues or questions about the authentication system, refer to:
- [AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md) - Technical implementation details
- App.tsx - Main authentication logic
- pages/Admin/AdminLogin.tsx - Login UI component

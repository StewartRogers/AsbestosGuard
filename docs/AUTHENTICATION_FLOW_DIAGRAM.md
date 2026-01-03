# AsbestosGuard User Authentication Flow

## Application User (Applicant)

```
┌─────────────────────┐
│   LANDING PAGE      │
│  (Submit License    │
│   Application)      │
└──────────┬──────────┘
           │
           ├─► Fill Application Form
           │
           ├─► Upload Documents
           │
           └─► Submit Application
```

## Admin User Journey

```
┌─────────────────────┐
│   LANDING PAGE      │
│                     │
│ [Admin Login] ◄─────┼─ Click Header Link
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│  ADMIN LOGIN PAGE   │
│                     │
│  Username: ______   │
│  Password: ______   │
│                     │
│ [Sign In] [Cancel]  │
└─────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
INVALID       VALID (admin/admin123)
CREDS         │
│             ├─► Set isAdminAuthenticated = true
│             │
│             ▼
│        ┌─────────────────────┐
│        │  ADMIN DASHBOARD    │
│        │                     │
│        │ [Admin Mode] Logout │
│        │                     │
│        │ ├─ View Apps        │
│        │ ├─ Review Apps      │
│        │ ├─ Manage Fact      │
│        │ │   Sheets          │
│        │ └─ Import/Export    │
│        └─────────────────────┘
│             │
│             ├─► Review Application
│             │
│             ├─► Update Status
│             │
│             ├─► Manage Fact Sheets
│             │
│             └─► Logout
│                 │
│                 ▼
└────► Landing Page
```

## Component Interaction Map

```
App.tsx (Main Component)
│
├─ State: isAdminAuthenticated (boolean)
│
├─ State: currentView (ViewState)
│   └─ 'LANDING' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD' | ...
│
├─ Handler: handleNavigate()
│   └─ Checks: if (admin_view && !authenticated) → 'ADMIN_LOGIN'
│
├─ Handler: handleAdminLogin()
│   └─ Validates: username === 'admin' && password === 'admin123'
│   └─ Sets: isAdminAuthenticated = true
│
├─ Handler: handleAdminLogout()
│   └─ Sets: isAdminAuthenticated = false
│   └─ Routes to: LANDING
│
├─ Header
│   ├─ Logo (click → LANDING)
│   ├─ [Admin Login] link (if !authenticated)
│   └─ [Admin Mode] + [Logout] (if authenticated)
│
├─ renderContent()
│   ├─ case 'LANDING' → <LandingPage />
│   ├─ case 'ADMIN_LOGIN' → <AdminLogin />
│   └─ case 'ADMIN_DASHBOARD' → <AdminDashboard />
│
└─ Footer
    └─ Test Button: Manage Fact Sheets
```

## Authentication State Machine

```
                    ┌──────────────────────┐
                    │ NOT_AUTHENTICATED    │
                    │ currentView=LANDING  │
                    └──────────┬───────────┘
                               │
                    Click Admin │
                    Login Link  │
                               ▼
                    ┌──────────────────────┐
                    │   LOGIN_PAGE         │
                    │ currentView=ADMIN_   │
                    │ LOGIN                │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
           Invalid                        Valid
           Credentials                    Credentials
                │                             │
                ▼                             ▼
    ┌────────────────────┐    ┌──────────────────────────┐
    │ Stay on Login Page │    │    AUTHENTICATED         │
    │ Show Error Message │    │ currentView=ADMIN_       │
    │                    │    │ DASHBOARD                │
    └────────────────────┘    │ isAdminAuthenticated=    │
                               │ true                     │
                               └──────────┬───────────────┘
                                          │
                                   Can Access:
                                   ├─ ADMIN_DASHBOARD
                                   ├─ ADMIN_REVIEW
                                   ├─ ADMIN_FACT_SHEETS
                                   └─ ...more admin routes
                                          │
                                   Click  │
                                   Logout │
                                          │
                                          ▼
                    ┌──────────────────────────────┐
                    │   Back to NOT_AUTHENTICATED  │
                    │   currentView=LANDING        │
                    │   isAdminAuthenticated=false │
                    └──────────────────────────────┘
```

## Route Protection Logic

```typescript
handleNavigate(view: ViewState) {
    if (view starts with 'ADMIN_' && 
        view !== 'ADMIN_LOGIN' && 
        !isAdminAuthenticated) {
        // Redirect to login
        setCurrentView('ADMIN_LOGIN')
        return
    }
    // Allowed to navigate
    setCurrentView(view)
}
```

This ensures:
- ✅ Unauthenticated users can access: LANDING, EMPLOYER_*
- ✅ Unauthenticated users cannot access: ADMIN_* (except ADMIN_LOGIN)
- ✅ Authenticated users can access: Everything
- ✅ Attempting admin access while unauthenticated → redirect to login

## Session Management

```
┌─ Application Start ─┐
│ isAdminAuthenticated = false
└─────┬───────────────┘
      │
      ├─ User browses landing page
      │
      ├─ User submits application
      │  (Still unauthenticated)
      │
      ├─ Admin clicks login link
      │
      ├─ Admin enters credentials
      │
      ├─ Valid login
      │  isAdminAuthenticated = true
      │
      ├─ Admin reviews applications
      │  (Full admin access)
      │
      ├─ Admin clicks logout
      │  isAdminAuthenticated = false
      │
      └─ Back to landing page
         (Session cleared)
```

## Security Features Implemented

✅ **Current Implementation**:
- Route protection for admin paths
- Login form with validation
- Error messages for invalid credentials
- Logout functionality
- Admin mode indicator in UI

⚠️ **Not Yet Implemented** (For Production):
- [ ] Server-side authentication
- [ ] JWT tokens or sessions
- [ ] Password encryption
- [ ] Account lockout after failed attempts
- [ ] Session timeout
- [ ] HTTPS encryption
- [ ] CSRF token validation
- [ ] Rate limiting
- [ ] Audit logging

## Testing Scenarios

### Scenario 1: Applicant Workflow
1. User visits application
2. Sees landing page with application form
3. Fills and submits application
4. ✅ No authentication required

### Scenario 2: Admin Access Without Login
1. Admin clicks "Admin Login" link
2. Admin cancels login dialog
3. Admin tries to access admin features via other means
4. ✅ Redirected to login page

### Scenario 3: Admin Login with Wrong Credentials
1. Click "Admin Login"
2. Enter username/password incorrectly
3. Click "Sign In"
4. ✅ Error message shown, stay on login page

### Scenario 4: Successful Admin Login
1. Click "Admin Login"
2. Enter: admin / admin123
3. Click "Sign In"
4. ✅ Redirected to admin dashboard
5. ✅ "Admin Mode" indicator shown in header

### Scenario 5: Admin Logout
1. Logged in as admin
2. Click "Logout" button
3. ✅ Redirected to landing page
4. ✅ "Admin Mode" indicator removed

---

**Current Version**: Demo with hardcoded credentials
**Next Version**: Server-side authentication
**Production Version**: Enterprise auth (OAuth2, SAML, etc.)

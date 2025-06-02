# 🔐 COGNITO ADMIN PASSWORD FIX - STEP BY STEP

## Method 1: AWS Console Password Reset (FASTEST)

### Step 1: Access Cognito Console
1. Go to [AWS Cognito Console](https://console.aws.amazon.com/cognito/v2/idp/user-pools)
2. Select User Pool: `us-east-1_lhc964tLD`
3. Click "Users" in the left sidebar

### Step 2: Find Admin User
1. Search for username: `admin`
2. Or search by email: `george@contentkingpins.com`
3. Click on the user when found

### Step 3: Reset Password
1. Click "Actions" → "Reset password"
2. Choose "Send via email" or "Set temporary password"
3. If setting temporary password, use: `TempAdmin2025!`
4. Check "User must create a new password at next sign-in"

### Step 4: Test Login
1. Go to your login page: https://main.d21xta9fg9b6w.amplifyapp.com/login.html
2. Use email: `george@contentkingpins.com`
3. Use the temporary password
4. You'll be prompted to set a new permanent password

---

## Method 2: Check User Attributes (DIAGNOSTIC)

### Verify User Configuration:
1. In Cognito Console → Users → admin user
2. Check these attributes:
   - `email`: should be `george@contentkingpins.com`
   - `custom:role`: should be `admin`
   - `email_verified`: should be `true`
   - User status: should be `CONFIRMED`

---

## Method 3: Alternative Passwords to Try First

Before resetting, try these passwords that might work:
- `MVAAdmin2024!`
- `Admin2025!`
- `ClaimConnectors2025!`
- `george123!`
- `Admin123!`

---

## Method 4: Create New Admin User (LAST RESORT)

If user doesn't exist or is corrupted:
1. In Cognito Console → Users → "Create user"
2. Username: `george_admin`
3. Email: `george@contentkingpins.com`
4. Temporary password: `NewAdmin2025!`
5. Add attribute: `custom:role` = `admin`
6. Check "Send an invitation to this new user?"

---

## NEXT STEPS AFTER PASSWORD RESET:
1. Test admin login
2. Verify admin dashboard access
3. Update password documentation
4. Test all three portals (admin/agent/vendor) 
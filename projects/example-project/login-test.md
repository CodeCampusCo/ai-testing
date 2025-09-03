# Login Test

## Description
Test successful user login with valid credentials and verify redirect to dashboard.

## Prerequisites
- Login page is accessible
- Test user account exists in the system
- Dashboard page is available after login

## Test Steps
1. Navigate to login page at "/login"
2. Verify login form is visible
3. Enter email address "${TEST_USERNAME}" in username field
4. Enter password "${TEST_PASSWORD}" in password field
5. Click the "Sign In" button
6. Wait for page transition to complete

## Expected Results
- User is redirected to dashboard page
- Dashboard welcome message is displayed
- User navigation menu shows logged-in state
- No error messages are visible
- Login form is no longer displayed

## Test Data
- Username: ${TEST_USERNAME}
- Password: ${TEST_PASSWORD}
- Success URL: /dashboard
- Success indicator: .dashboard

## Tags
- smoke
- authentication
- critical
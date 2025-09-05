# Login Test

## Description

Test successful user login with valid credentials and verify redirect to dashboard.

## Test Steps

- Navigate to {{urls.main}}
- Click "Login" button
- Verify current page is Login screen
- Type '{{valid.username}}' in 'Email address' field
- Type '{{valid.password}}' in 'Password' field
- Click 'Sign in' button
- Wait for URL changes to '/'

## Expected Results

- Login form is no longer displayed
- User navigation menu shows username
- No error messages are visible

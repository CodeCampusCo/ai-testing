# Examples & Templates

## Overview

This document provides practical examples and templates for creating E2E tests using the AI-Powered E2E Test Framework. Examples are organized by complexity and use case.

## 1. Basic Examples

### 1.1 Simple Login Test

**File**: `projects/basic-login/login-test.md`

```markdown
# Basic Login Test

## Description

Verify user can successfully log in with valid credentials.

## Prerequisites

- Login page is accessible
- Test user account exists

## Test Steps

- Navigate to login page
- Enter username "testuser@example.com"
- Enter password "password123"
- Click login button
- Wait for dashboard to appear

## Expected Results

- User is redirected to dashboard
- Welcome message is visible
- Login form is no longer displayed

## Tags

- smoke
- authentication
```

**File**: `projects/basic-login/config.yml`

```yaml
project:
  name: 'basic-login'
  base_url: 'https://demo.example.com'
  timeout: 30000

browser:
  type: 'chromium'
  headless: true
  viewport:
    width: 1280
    height: 720

authentication:
  username: '${TEST_USERNAME}'
  password: '${TEST_PASSWORD}'
  login_url: '/login'

test_data:
  valid_user:
    email: 'testuser@example.com'
    password: 'password123'
```

### 1.2 Form Submission Test

**File**: `projects/contact-form/contact-form-test.md`

```markdown
# Contact Form Submission

## Description

Test the contact form submission with valid data and verify confirmation.

## Test Steps

- Navigate to contact page "/contact"
- Fill in name field with "John Doe"
- Fill in email field with "john@example.com"
- Fill in subject field with "Test Message"
- Fill in message field with "This is a test message"
- Click submit button
- Wait for confirmation message

## Expected Results

- Success message "Thank you for your message" appears
- Form fields are cleared
- No error messages are displayed

## Tags

- forms
- contact
```

## 2. E-commerce Examples

### 2.1 Complete Shopping Flow

**File**: `projects/ecommerce/purchase-flow.md`

```markdown
# Complete Purchase Flow

## Description

End-to-end test for product purchase from search to confirmation.

## Prerequisites

- User is logged in
- Product inventory is available
- Payment gateway is functional

## Test Steps

- Navigate to home page
- Search for product "Wireless Headphones"
- Click on first search result
- Select color "Black" from options
- Click "Add to Cart" button
- Click cart icon in header
- Verify product is in cart with correct details
- Click "Proceed to Checkout"
- Fill in shipping address using test data
- Select "Standard Shipping" option
- Fill in payment details using test card
- Review order summary
- Click "Complete Order" button
- Wait for order confirmation page

## Expected Results

- Order confirmation page displays with order number
- Email confirmation is sent
- Product is removed from cart
- Order appears in account history
- Payment is processed successfully

## Test Data

- Search term: "Wireless Headphones"
- Color: "Black"
- Shipping address: ${SHIPPING_ADDRESS}
- Payment card: ${TEST_CARD}

## Tags

- e2e
- purchase
- critical
```

**File**: `projects/ecommerce/config.yml`

```yaml
project:
  name: 'ecommerce-tests'
  description: 'E-commerce platform testing'
  base_url: 'https://shop.example.com'
  timeout: 60000

browser:
  type: 'chromium'
  headless: true
  viewport:
    width: 1920
    height: 1080

authentication:
  method: 'form'
  username: '${SHOP_USER_EMAIL}'
  password: '${SHOP_USER_PASSWORD}'
  login_url: '/account/login'
  success_indicator: '.account-dashboard'

test_data:
  products:
    headphones:
      name: 'Wireless Headphones'
      price: 99.99
      colors: ['Black', 'White', 'Blue']
    laptop:
      name: 'Gaming Laptop'
      price: 1299.99
      specs: ['16GB RAM', '512GB SSD']

  shipping_addresses:
    default:
      first_name: 'John'
      last_name: 'Doe'
      address_1: '123 Main Street'
      city: 'New York'
      state: 'NY'
      postal_code: '10001'
      country: 'United States'

  payment_cards:
    test_visa:
      number: '4111111111111111'
      expiry_month: '12'
      expiry_year: '2025'
      cvv: '123'
      name: 'John Doe'

environments:
  staging:
    base_url: 'https://staging-shop.example.com'
  production:
    base_url: 'https://shop.example.com'

execution:
  retry_count: 2
  screenshot_on_failure: true
```

### 2.2 Product Search and Filter

**File**: `projects/ecommerce/search-filter.md`

```markdown
# Product Search and Filtering

## Description

Test product search functionality and filtering options.

## Test Steps

1. Navigate to products page
2. Enter "laptop" in search box
3. Press enter or click search button
4. Verify search results contain laptops
5. Click "Price" filter dropdown
6. Select price range "$1000 - $2000"
7. Apply filter
8. Verify all displayed products are within price range
9. Click "Brand" filter
10. Select "TechBrand" checkbox
11. Apply brand filter
12. Verify results show only TechBrand laptops in price range

## Expected Results

- Search returns relevant products
- Price filter works correctly
- Brand filter works correctly
- Product count updates with each filter
- "Clear filters" option is available

## Tags

- search
- filtering
- products
```

## 3. Dashboard & Admin Examples

### 3.1 Admin User Management

**File**: `projects/admin-dashboard/user-management.md`

```markdown
# Admin User Management

## Description

Test admin functionality for managing user accounts.

## Prerequisites

- Admin user is logged in
- Test users exist in system

## Test Steps

1. Navigate to admin dashboard
2. Click on "User Management" section
3. Verify user list displays
4. Search for user "john.doe@test.com"
5. Click on user row to view details
6. Click "Edit User" button
7. Change user role from "User" to "Moderator"
8. Click "Save Changes" button
9. Verify success message appears
10. Return to user list
11. Verify user role is updated to "Moderator"

## Expected Results

- User search works correctly
- User details load properly
- Role change is successful
- Changes persist after page refresh
- Audit log records the change

## Tags

- admin
- user-management
- critical
```

### 3.2 Data Export Functionality

**File**: `projects/admin-dashboard/data-export.md`

```markdown
# Data Export Test

## Description

Test the data export functionality from admin dashboard.

## Test Steps

1. Navigate to admin dashboard
2. Go to "Reports" section
3. Select "User Activity Report"
4. Set date range to "Last 30 days"
5. Select export format "CSV"
6. Click "Generate Report" button
7. Wait for download to complete
8. Verify file is downloaded
9. Open downloaded file
10. Verify data format is correct

## Expected Results

- Export generates successfully
- File downloads without errors
- CSV format is properly structured
- Data matches the selected criteria
- File name includes timestamp

## Tags

- admin
- export
- reports
```

## 4. API Integration Examples

### 4.1 Testing Forms with API Validation

**File**: `projects/api-integration/form-validation.md`

```markdown
# Form with API Validation

## Description

Test form that validates data against backend API.

## Test Steps

1. Navigate to user registration form
2. Fill in email field with existing email "existing@test.com"
3. Fill in other required fields with valid data
4. Click submit button
5. Wait for validation response
6. Verify error message "Email already exists" appears
7. Clear email field
8. Enter new unique email "newuser@test.com"
9. Click submit button again
10. Verify form submits successfully

## Expected Results

- API validation prevents duplicate emails
- Error messages are displayed clearly
- Valid data submits successfully
- Form provides immediate feedback

## Tags

- forms
- validation
- api
```

## 5. Mobile-Responsive Examples

### 5.1 Mobile Navigation Test

**File**: `projects/mobile-responsive/mobile-nav.md`

```markdown
# Mobile Navigation Test

## Description

Test navigation functionality on mobile viewport.

## Prerequisites

- Browser is set to mobile viewport
- Site has responsive design

## Test Steps

1. Navigate to home page
2. Verify mobile viewport is active
3. Look for hamburger menu button
4. Click hamburger menu button
5. Verify navigation menu slides out
6. Click on "Products" menu item
7. Verify products page loads
8. Use back button
9. Verify hamburger menu can be closed

## Expected Results

- Hamburger menu is visible on mobile
- Menu opens and closes smoothly
- Navigation links work correctly
- Page layouts adapt to mobile screen
- Touch interactions work properly

## Tags

- mobile
- navigation
- responsive
```

**Mobile Config Addition**:

```yaml
browser:
  type: 'chromium'
  headless: true
  viewport:
    width: 375 # iPhone viewport
    height: 667
  device_emulation:
    name: 'iPhone 8'
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)'
```

## 6. Performance Testing Examples

### 6.1 Page Load Performance

**File**: `projects/performance/page-load.md`

```markdown
# Page Load Performance Test

## Description

Test page load times and performance metrics.

## Test Steps

1. Navigate to home page
2. Measure page load time
3. Verify page loads within 3 seconds
4. Check for JavaScript errors
5. Validate all images load properly
6. Test navigation to product page
7. Measure product page load time
8. Verify interactive elements respond quickly

## Expected Results

- Home page loads in under 3 seconds
- Product page loads in under 5 seconds
- No JavaScript console errors
- All images load successfully
- Page is interactive within 2 seconds

## Performance Thresholds

- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.0s

## Tags

- performance
- load-time
- metrics
```

## 7. Accessibility Testing Examples

### 7.1 Accessibility Compliance

**File**: `projects/accessibility/wcag-compliance.md`

```markdown
# WCAG Accessibility Compliance

## Description

Test website accessibility compliance with WCAG guidelines.

## Test Steps

1. Navigate to home page
2. Verify page has proper heading structure
3. Test keyboard navigation through all interactive elements
4. Check color contrast ratios
5. Verify all images have alt text
6. Test form labels and error messages
7. Check for ARIA attributes on complex elements
8. Verify focus indicators are visible
9. Test with screen reader simulation

## Expected Results

- Heading hierarchy is logical (h1 > h2 > h3)
- All interactive elements are keyboard accessible
- Color contrast meets WCAG AA standards
- Images have descriptive alt text
- Forms are properly labeled
- Error messages are accessible
- Focus indicators are clearly visible

## Tags

- accessibility
- wcag
- compliance
- a11y
```

## 8. Multi-Step Workflow Examples

### 8.1 Account Registration Flow

**File**: `projects/workflows/registration-flow.md`

```markdown
# Complete Account Registration

## Description

Test the complete user registration and email verification flow.

## Test Steps

1. Navigate to registration page
2. Fill in personal information form
3. Accept terms and conditions
4. Click "Create Account" button
5. Verify account created message appears
6. Check email for verification link
7. Click verification link from email
8. Verify account is activated
9. Log in with new credentials
10. Complete profile setup

## Expected Results

- Registration form validates properly
- Account is created successfully
- Verification email is sent
- Email verification link works
- User can log in after verification
- Profile setup is accessible

## Tags

- registration
- email-verification
- workflow
- critical
```

## 9. Error Handling Examples

### 9.1 Network Error Recovery

**File**: `projects/error-handling/network-errors.md`

```markdown
# Network Error Handling

## Description

Test application behavior during network connectivity issues.

## Test Steps

1. Navigate to product page
2. Simulate network disconnection
3. Try to add product to cart
4. Verify appropriate error message appears
5. Restore network connection
6. Retry the add to cart action
7. Verify action completes successfully
8. Test offline functionality if available

## Expected Results

- Error messages are user-friendly
- Application doesn't crash on network errors
- Retry mechanisms work properly
- Offline functionality works as expected
- Data is preserved during network issues

## Tags

- error-handling
- network
- resilience
```

## 10. Running Examples

### Command Examples

```bash
# Run a specific test from a project
ai-e2e-test run -p ecommerce -f purchase-flow

# Run a test in headed (visible) mode for debugging
ai-e2e-test run -p mobile-responsive -f mobile-nav --no-headless

# Generate a test from a description
ai-e2e-test generate -i "Verify that the shopping cart updates correctly when an item is added"
```

## 11. Best Practices from Examples

### Test Organization

- Group related tests in the same project
- Use descriptive names for test files
- Include appropriate tags for filtering
- Maintain consistent file structure

### Data Management

- Use environment variables for sensitive data
- Create reusable test data sets
- Separate test data by environment
- Use meaningful variable names

### Maintenance

- Regular updates to selectors and URLs
- Keep test data current
- Review and update expected results
- Monitor for flaky tests

### Reporting

- Include relevant tags for test categorization
- Use descriptive test names and descriptions
- Document prerequisites clearly
- Specify exact expected outcomes

This examples library provides a foundation for creating comprehensive E2E tests across various scenarios and use cases.

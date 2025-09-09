# File Format Specifications

## Overview

The AI-Powered E2E Test Framework uses two primary file formats for test management:

- **Markdown (.md)**: Human-readable test scenarios written in natural language
- **YAML (.yml)**: Configuration and variable storage

## 1. Test Scenario Format (.md)

### 1.1 Structure

Test scenario files follow a structured Markdown format with specific sections:

```markdown
# [Test Name]

## Description

Brief description of what this test validates

## Prerequisites

- Any setup conditions required before running the test
- Authentication states needed
- Data dependencies

## Test Steps

1. Step-by-step instructions in natural language
2. Each step should be clear and actionable
3. Use present tense and imperative mood

## Expected Results

- List of expected outcomes
- Validation points and assertions
- Success criteria

## Test Data (Optional)

- Specific data used in this test
- Can reference variables from config.yml

## Tags (Optional)

- smoke
- regression
- critical
```

### 1.2 Example: Login Test

```markdown
# User Login Test

## Description

Validates successful user authentication with valid credentials and proper redirection to dashboard.

## Prerequisites

- User account exists in system
- Login page is accessible
- Database contains test user data

## Test Steps

1. Navigate to the login page at "/login"
2. Verify that the login form is displayed
3. Enter valid email address in the username field
4. Enter correct password in the password field
5. Click the "Sign In" button
6. Wait for page transition to complete

## Expected Results

- User is redirected to dashboard page ("/dashboard")
- Welcome message displays user's name
- Navigation menu shows logged-in state
- No error messages are visible
- Session cookie is properly set

## Test Data

- Username: ${TEST_USERNAME}
- Password: ${TEST_PASSWORD}
- Expected redirect: "/dashboard"

## Tags

- smoke
- authentication
- critical
```

### 1.3 Advanced Example: E-commerce Checkout

```markdown
# Complete Purchase Flow

## Description

End-to-end test for the complete purchase process from product selection to order confirmation.

## Prerequisites

- User is logged in
- At least one product is available in inventory
- Payment gateway is accessible
- Shopping cart is empty

## Test Steps

1. Navigate to product catalog page
2. Search for product with name "Test Product"
3. Click on first search result to view product details
4. Select product size "Medium" from dropdown
5. Click "Add to Cart" button
6. Verify cart icon shows quantity "1"
7. Click on cart icon to view cart summary
8. Verify product details in cart are correct
9. Click "Proceed to Checkout" button
10. Fill in shipping address form with test data
11. Select shipping method "Standard Delivery"
12. Fill in payment information using test credit card
13. Review order summary for accuracy
14. Click "Complete Purchase" button
15. Wait for order confirmation page to load

## Expected Results

- Order confirmation page displays with order number
- Confirmation email is sent to user's email
- Product inventory is reduced by 1
- Payment is processed successfully
- Order appears in user's order history
- Cart is empty after successful purchase

## Test Data

- Product search term: "Test Product"
- Product size: "Medium"
- Shipping address: ${SHIPPING_ADDRESS}
- Credit card: ${TEST_CREDIT_CARD}
- Expected confirmation email: ${USER_EMAIL}

## Tags

- e2e
- purchase-flow
- critical
- payment
```

## 2. Configuration Format (config.yml)

### 2.1 Project Configuration Structure

```yaml
# Project metadata and basic settings
project:
  name: 'project-name' # Project identifier
  description: 'Project description'
  base_url: 'https://example.com' # Base URL for all tests
  timeout: 30000 # Default timeout in milliseconds

# Browser configuration
browser:
  type: 'chromium' # chromium | firefox | webkit
  headless: true # true for CI/CD, false for debugging
  viewport:
    width: 1280 # Browser window width
    height: 720 # Browser window height
  device_emulation: # Optional mobile device emulation
    name: 'iPhone 12'
    user_agent: 'custom-agent'

# Authentication configuration
authentication:
  method: 'form' # form | oauth | token | cookies
  username: '${TEST_USERNAME}' # Environment variable reference
  password: '${TEST_PASSWORD}' # Environment variable reference
  login_url: '/auth/login' # Relative login URL
  success_indicator: '.dashboard' # CSS selector indicating successful login

# Test data and variables
test_data:
  users:
    admin:
      email: 'admin@test.com'
      password: '${ADMIN_PASSWORD}'
      role: 'administrator'
    regular:
      email: 'user@test.com'
      password: '${USER_PASSWORD}'
      role: 'user'

  products:
    test_product:
      name: 'Test Widget'
      price: 29.99
      sku: 'TW-001'

  addresses:
    shipping:
      street: '123 Test Street'
      city: 'Test City'
      postal_code: '12345'
      country: 'US'

# Environment-specific settings
environments:
  development:
    base_url: 'http://localhost:3000'
    debug: true
  staging:
    base_url: 'https://staging.example.com'
    debug: false
  production:
    base_url: 'https://example.com'
    debug: false

# Test execution settings
execution:
  retry_count: 3 # Number of retries on failure
  retry_delay: 1000 # Delay between retries (ms)
  parallel: false # Run tests in parallel (future feature)
  screenshot_on_failure: true # Capture screenshots on test failure

# Reporting configuration
reporting:
  format: ['json', 'html'] # Output formats
  output_dir: './test-results' # Report output directory
  include_screenshots: true # Include screenshots in reports
  include_accessibility: true # Include accessibility insights
```

### 2.2 Example: E-commerce Project Config

```yaml
project:
  name: 'ecommerce-tests'
  description: 'End-to-end tests for online store'
  base_url: 'https://shop.example.com'
  timeout: 45000

browser:
  type: 'chromium'
  headless: true
  viewport:
    width: 1920
    height: 1080

authentication:
  method: 'form'
  username: '${SHOP_USERNAME}'
  password: '${SHOP_PASSWORD}'
  login_url: '/account/login'
  success_indicator: '.account-dashboard'

test_data:
  users:
    customer:
      email: 'customer@test.com'
      password: '${CUSTOMER_PASSWORD}'
      first_name: 'Test'
      last_name: 'Customer'

  products:
    electronics:
      laptop:
        name: 'Test Laptop'
        price: 999.99
        category: 'Electronics'
      phone:
        name: 'Test Phone'
        price: 599.99
        category: 'Electronics'

  payment:
    test_card:
      number: '4111111111111111'
      expiry: '12/25'
      cvv: '123'
      name: 'Test Customer'

  shipping:
    default:
      address_line_1: '123 Main Street'
      address_line_2: 'Apt 4B'
      city: 'New York'
      state: 'NY'
      postal_code: '10001'
      country: 'United States'

environments:
  local:
    base_url: 'http://localhost:8080'
    debug: true
  staging:
    base_url: 'https://staging-shop.example.com'
    debug: false
  production:
    base_url: 'https://shop.example.com'
    debug: false

execution:
  retry_count: 2
  retry_delay: 2000
  screenshot_on_failure: true

reporting:
  format: ['json', 'html', 'junit']
  output_dir: './reports'
  include_screenshots: true
  include_accessibility: true
  include_performance: true
```

## 3. Variable Substitution

### 3.1 Environment Variables

Variables can reference environment variables using the `${VARIABLE_NAME}` syntax:

```yaml
authentication:
  username: '${TEST_USERNAME}'
  password: '${TEST_PASSWORD}'
  api_key: '${API_KEY}'
```

### 3.2 Config Variables

Variables defined in the config.yml can be referenced in test scenarios:

**config.yml:**

```yaml
test_data:
  admin_email: 'admin@example.com'
  test_product: 'Widget Pro'
```

**test-scenario.md:**

```markdown
## Test Steps

1. Login with email ${admin_email}
2. Search for product "${test_product}"
```

### 3.3 Dynamic Variables

Some variables are generated at runtime:

- `${TIMESTAMP}`: Current timestamp
- `${RANDOM_EMAIL}`: Generated email address
- `${RANDOM_STRING}`: Random alphanumeric string
- `${UUID}`: Generated UUID

## 4. Validation Rules

### 4.1 Markdown File Validation

- Must contain at least "Test Steps" and "Expected Results" sections
- Step numbers must be sequential
- Variable references must match config.yml definitions
- Sections must use proper heading levels (## for main sections)

### 4.2 YAML File Validation

```typescript
// Zod schema for validation
const configSchema = z.object({
  project: z.object({
    name: z.string().min(1),
    base_url: z.string().url(),
    timeout: z.number().positive(),
  }),
  browser: z.object({
    type: z.enum(['chromium', 'firefox', 'webkit']),
    headless: z.boolean(),
  }),
  // ... additional validation rules
});
```

## 5. Best Practices

### 5.1 Test Scenario Writing

- **Be Specific**: Use precise selectors and expected values
- **Keep Steps Atomic**: Each step should perform one action
- **Use Natural Language**: Write as if instructing a human tester
- **Include Context**: Explain why certain steps are necessary
- **Handle Edge Cases**: Consider error conditions and recovery

### 5.2 Configuration Management

- **Environment Separation**: Use different configs for dev/staging/prod
- **Security**: Never store passwords in plain text, use environment variables
- **Organization**: Group related variables logically
- **Documentation**: Comment complex configurations
- **Validation**: Always validate configs before test execution

### 5.3 Variable Management

- **Consistent Naming**: Use clear, descriptive variable names
- **Scope Appropriately**: Global vs. test-specific variables
- **Default Values**: Provide sensible defaults where possible
- **Type Safety**: Ensure variables match expected types

## 6. Migration Guide

### 6.1 From Other Formats

If migrating from other testing frameworks:

**From Selenium:**

```markdown
# Before (Selenium)

driver.findElement(By.id("username")).sendKeys("testuser");
driver.findElement(By.id("password")).sendKeys("password123");
driver.findElement(By.cssSelector("button[type='submit']")).click();

# After (Natural Language)

1. Enter "testuser" in the username field
2. Enter "password123" in the password field
3. Click the submit button
```

**From Cypress:**

```markdown
# Before (Cypress)

cy.visit('/login');
cy.get('#username').type('testuser');
cy.get('#password').type('password123');
cy.get('button[type="submit"]').click();
cy.url().should('include', '/dashboard');

# After (Natural Language)

1. Navigate to the login page
2. Enter "testuser" in the username field
3. Enter "password123" in the password field
4. Click the submit button
5. Verify user is redirected to dashboard
```

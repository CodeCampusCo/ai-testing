# Cookbook: Writing Tests

## 1. Core Concepts

The framework uses two primary file types:

- **Markdown (`.md`)**: For writing human-readable test scenarios in natural language.
- **YAML (`config.yml`)**: For project configuration, browser settings, and test data.

## 2. Test Scenario Format (`.md`)

Test scenario files follow a structured Markdown format.

### 2.1 Basic Structure

```markdown
# [Test Name]

## Description

A brief description of what this test validates.

## Prerequisites

- Any setup conditions required before running the test.

## Test Steps

1.  A step-by-step instruction in natural language.
2.  Each step should be clear and actionable.

## Expected Results

- A list of expected outcomes and success criteria.

## Tags (Optional)

- smoke, regression, critical
```

### 2.2 Best Practices for Writing Steps

- **Be Specific**: Instead of "Enter details", write "Enter username 'testuser@example.com'".
- **Keep Steps Atomic**: Each step should perform a single logical action.
- **Use Natural Language**: Write as if you are instructing a human tester. The AI is smart enough to understand context.
- **Handle Waits Explicitly**: If a page transition or a slow element is expected, add a step like "Wait for the dashboard to appear".

## 3. Configuration Format (`config.yml`)

The `config.yml` file in each project directory controls the settings for the tests within that project.

### 3.1 Basic Structure

```yaml
# Project metadata
project:
  name: 'project-name'
  base_url: 'https://example.com'
  timeout: 30000

# Browser configuration
browser:
  type: 'chromium' # chromium | firefox | webkit
  headless: true
  viewport:
    width: 1280
    height: 720

# Test data and variables
test_data:
  users:
    admin:
      email: 'admin@test.com'
      password: '${ADMIN_PASSWORD}'
```

### 3.2 Variable Substitution

You can use variables from your `config.yml` or environment variables in your `.md` test files using the `${VARIABLE_NAME}` syntax.

**`config.yml`:**

```yaml
test_data:
  admin_email: 'admin@example.com'
```

**`login-test.md`:**

```markdown
## Test Steps

1.  Enter email "${admin_email}" in the email field
```

## 4. Practical Examples (Recipes)

### Recipe 1: Simple Login Test

This recipe shows a basic login test, combining a `.md` scenario with a `config.yml` file.

**`projects/login-project/login-test.md`**

```markdown
# Basic Login Test

## Test Steps

- Navigate to login page
- Enter username "testuser@example.com"
- Enter password "password123"
- Click login button
- Wait for dashboard to appear

## Expected Results

- User is redirected to dashboard
- Welcome message is visible
```

**`projects/login-project/config.yml`**

```yaml
project:
  name: 'basic-login'
  base_url: 'https://demo.example.com'

browser:
  type: 'chromium'
```

**How to Run:**

```bash
ai-e2e-test run -p login-project -f login-test
```

### Recipe 2: E-commerce Purchase Flow

This recipe demonstrates a more complex, multi-step workflow with extensive test data.

**`projects/ecommerce/purchase-flow.md`**

```markdown
# Complete Purchase Flow

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
- Click "Complete Order" button
- Wait for order confirmation page

## Expected Results

- Order confirmation page displays with order number
- Product is removed from cart
```

**`projects/ecommerce/config.yml`**

```yaml
project:
  name: 'ecommerce-tests'
  base_url: 'https://shop.example.com'

browser:
  type: 'chromium'

test_data:
  shipping_addresses:
    default:
      first_name: 'John'
      last_name: 'Doe'
      address_1: '123 Main Street'
      city: 'New York'
```

### Recipe 3: Mobile-Responsive Test

To test a mobile view, simply adjust the `browser` configuration.

**`projects/mobile-test/config.yml`**

```yaml
project:
  name: 'mobile-responsive-test'
  base_url: 'https://example.com'

browser:
  type: 'chromium'
  viewport:
    width: 375 # iPhone viewport
    height: 667
```

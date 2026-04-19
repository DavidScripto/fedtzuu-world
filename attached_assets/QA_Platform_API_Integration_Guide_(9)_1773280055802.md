# QA Testing Platform - API Integration Guide

**Version:** 3.1.0  
**Last Updated:** March 12, 2026  
**Base URL:** `https://qa.rerumsolutions.com`

---

## Overview

This guide explains how your application integrates with the QA Testing Platform for **fully autonomous, 24/7 testing**. The goal is zero human intervention: you integrate once, and testing runs continuously.

**What the platform does for you:**

1. **Self-registration** — your app registers itself and gets an API key with zero admin involvement
2. **Autonomous onboarding** — one API call to configure everything and start testing automatically
3. **24/7 AI agent testing** — three AI agents (Security, UX, Performance) test your app continuously using real browsers
4. **Real-time webhook notifications** — instant alerts when tests fail, bugs are found, and retests complete
5. **AI-generated bug reports** with root cause analysis and fix suggestions
6. **Automated bug fix → retest cycle** — notify a fix, platform auto-generates and runs retest scenarios
7. **Document & file generation** — AI agents can create Word documents (.docx) and upload them to your app during testing
8. **Pre-test handshake** — platform and your app communicate autonomously to validate setup before testing begins
9. **Two-way bug sync** — platform polls your app for bug status changes and processes fixes automatically
10. **Coordination channel** — bidirectional communication for resolving issues without human intervention

**The autonomous flow:**
1. You receive this guide and a registration token
2. Your app calls `POST /api/external/register` with: app name, app URL, test credentials, webhook URL, and test scenarios
3. The platform registers your app, returns an API key, validates everything, and **starts testing automatically**
4. If something isn't working, the platform reports it → your app fixes the issue → testing continues
5. No human intervention required after initial setup

Each registered app is **completely segregated** — your API key only accesses your app's data. There is zero data leakage between apps.

---

## Table of Contents

1. [Fully Automated Registration & Onboarding (Start Here)](#fully-automated-registration--onboarding)
2. [Autonomous Onboarding (Existing Apps)](#autonomous-onboarding)
3. [What Your App Must Provide](#what-your-app-must-provide)
4. [AI Agent Capabilities](#ai-agent-capabilities)
5. [Getting Started (Manual)](#getting-started)
6. [Authentication](#authentication)
7. [API Endpoints](#api-endpoints)
   - [Register (Self-Registration)](#0-register-self-registration)
   - [Onboard (One-Call Setup)](#1-onboard-one-call-setup)
   - [Submit Test Scenarios](#2-submit-test-scenarios)
   - [Verify / Reconcile Scenarios](#3-verify--reconcile-scenarios)
   - [Get Test Results & Bug Reports](#4-get-test-results--bug-reports)
   - [List Active Scenarios](#5-list-active-scenarios)
   - [Notify Bug Fixed](#6-notify-bug-fixed)
   - [Batch Bug Status Update](#7-batch-bug-status-update)
   - [Get Bug Status](#8-get-bug-status)
   - [Get Testing Progress](#9-get-testing-progress)
   - [Configure App](#10-configure-app)
   - [Get Pending Coordination Messages](#11-get-pending-coordination-messages)
   - [Respond to Coordination Message](#12-respond-to-coordination-message)
8. [Webhooks](#webhooks)
   - [Setting Up Webhooks](#setting-up-webhooks)
   - [Webhook Headers & Security](#webhook-headers--security)
   - [Webhook Events](#webhook-events)
9. [Pre-Test Communication Protocol](#pre-test-communication-protocol)
10. [Test Scenario Requirements](#test-scenario-requirements)
11. [Bug Lifecycle](#bug-lifecycle)
12. [Automated Bug Sync](#automated-bug-sync)
13. [App Coordination Channel](#app-coordination-channel)
14. [App Segregation & Security](#app-segregation--security)
15. [Attachments](#attachments)
16. [Error Responses](#error-responses)
17. [Full Integration Example](#full-integration-example)
18. [End-to-End Flow](#how-it-works-end-to-end)
19. [Changelog](#changelog)

---

## Fully Automated Registration & Onboarding

The fastest path: **zero admin involvement**. Your app registers itself, gets an API key, configures everything, and starts testing — all in a single API call.

### Prerequisites

You need one thing from the QA Platform admin:
- **A registration token** — the admin generates this once in the Admin Dashboard → Integration tab → "App Self-Registration" card.

### One-Call Registration + Setup

```javascript
const response = await fetch('https://qa.rerumsolutions.com/api/external/register', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer reg_your_registration_token_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    // REQUIRED: Your app's name (must be unique on the platform)
    appName: 'My Application',

    // OPTIONAL: Short description
    description: 'E-commerce platform with user accounts and payments',

    // REQUIRED for auto-start: Where AI agents will test your app
    appUrl: 'https://yourapp.com',

    // REQUIRED for auto-start: Test accounts for AI agents to log in
    testCredentials: [
      { username: 'qatest1', password: 'QATest@2026a' },
      { username: 'qatest2', password: 'QATest@2026b' },
      { username: 'qatest3', password: 'QATest@2026c' },
    ],

    // RECOMMENDED: Your webhook endpoint for real-time notifications
    webhookUrl: 'https://yourapp.com/api/qa-webhook',

    // OPTIONAL: Endpoint for AI agents to ask your app questions during testing
    qaEndpointUrl: 'https://yourapp.com/api/qa-bridge',

    // OPTIONAL: OAuth credentials if your app uses social login
    oauthCredentials: [
      { provider: 'google', strategy: 'direct-automation', email: 'test@gmail.com', password: 'pass' }
    ],

    // REQUIRED for auto-start: Comprehensive test scenarios
    scenarios: [
      {
        bookName: 'Authentication Tests',
        title: 'Login with valid credentials',
        steps: ['Navigate to /login', 'Enter valid email', 'Enter password', 'Click Sign In'],
        expectedResult: 'User is redirected to the dashboard',
        priority: 'critical',
        category: 'authentication'
      },
      // ... more scenarios
    ],
  }),
});

const result = await response.json();
// result.app.id → your app's ID on the platform
// result.apiKey → SAVE THIS — your API key for all future calls
// result.onboarding.status === "ready" → testing started automatically
// result.onboarding.status === "registered" → app created but needs more config
```

### What Your App Must Send

| Field | Required | Description |
|-------|----------|-------------|
| `appName` | **Yes** | Unique name for your app (min 2 chars) |
| `description` | No | Short description of your app |
| `appUrl` | For auto-start | The URL where AI agents will browse and test |
| `testCredentials` | For auto-start | Array of `{ username, password }` — at least 1, 3+ recommended |
| `webhookUrl` | Recommended | HTTPS endpoint to receive bug reports and results |
| `qaEndpointUrl` | No | Endpoint for agent ↔ app Q&A during testing |
| `scenarios` | For auto-start | Array of test scenarios (see format below) |
| `oauthCredentials` | No | Social login credentials for OAuth testing |

### Response

```json
{
  "message": "App \"My Application\" registered successfully",
  "app": { "id": 5, "name": "My Application" },
  "apiKey": "qa_abc123...",
  "onboarding": {
    "status": "ready",
    "configured": ["appUrl", "testCredentials", "webhookUrl"],
    "issues": [],
    "scenariosCreated": 12,
    "testingAutoStarted": true
  },
  "nextSteps": ["Testing has started. Monitor your webhook for results."]
}
```

### Error Responses

| Status | Meaning |
|--------|---------|
| `401` | Missing or invalid registration token |
| `400` | Missing `appName` or name too short |
| `409` | App with that name already exists (use onboarding endpoint instead) |
| `503` | Self-registration not enabled by admin |

---

## Autonomous Onboarding

If your app is **already registered** and has an API key, use the onboarding endpoint to configure and start testing.

### Prerequisites

You need two things from the QA Platform admin:
1. **Your app registered** on the platform (admin creates it — or use self-registration above)
2. **Your API key** (returned from self-registration, or admin generates it in the Integration tab)

### One-Call Setup

Once you have your API key, make a single call to fully onboard:

```javascript
const response = await fetch('https://qa.rerumsolutions.com/api/external/onboard', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer qa_your_api_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    // REQUIRED: Where AI agents will test your app
    appUrl: 'https://yourapp.com',

    // REQUIRED: Test accounts for AI agents to log in
    // Provide at least 1 account, 3+ recommended for parallel agent testing
    testCredentials: [
      { username: 'qatest1', password: 'QATest@2026a' },
      { username: 'qatest2', password: 'QATest@2026b' },
      { username: 'qatest3', password: 'QATest@2026c' },
    ],

    // REQUIRED: Your webhook endpoint for real-time notifications
    webhookUrl: 'https://yourapp.com/api/qa-webhook',

    // OPTIONAL: Endpoint for AI agents to ask your app questions during testing
    qaEndpointUrl: 'https://yourapp.com/api/qa-bridge',

    // OPTIONAL: OAuth credentials if your app uses social login
    oauthCredentials: [
      { provider: 'google', strategy: 'direct-automation', email: 'test@gmail.com', password: 'pass' }
    ],

    // REQUIRED: Comprehensive test scenarios (see "Test Scenario Requirements" section)
    scenarios: [
      {
        bookName: 'Authentication Tests',
        title: 'Login with valid credentials',
        description: 'Verify user can log in with correct email and password',
        steps: [
          'Navigate to /login',
          'Enter valid email in the email field',
          'Enter valid password in the password field',
          'Click the Sign In button'
        ],
        expectedResult: 'User is redirected to the dashboard with a welcome message',
        priority: 'critical',
        category: 'authentication'
      },
      // ... more scenarios covering every field, function, and regression test
    ],
  }),
});

const result = await response.json();
// result.status === "ready" → testing started automatically
// result.status === "incomplete" → fix the issues in result.issues and call again
```

### What Happens Next

1. **Platform validates** your configuration (URL format, credentials structure, scenarios)
2. **If valid** → testing starts immediately with 3 AI agents, you receive an `onboarding.complete` webhook
3. **If issues found** → response includes specific `issues` array explaining what to fix. Fix them and call `/api/external/onboard` again
4. **During testing** → you receive webhooks for every bug found, test result, and fix suggestion
5. **When bugs are found** → fix them and call `POST /api/external/bug-status-update` — platform auto-generates and runs retest scenarios
6. **Testing runs 24/7** until all scenarios pass and all bugs are verified fixed

---

## What Your App Must Provide

For fully autonomous testing, your app must provide the following through the onboarding API call:

### 1. Test User Accounts (Required)

Create dedicated test accounts in your app's database before onboarding. These are the accounts AI agents will use to log in and test your app.

**Requirements:**
- **Minimum 1 account**, strongly recommended **3 accounts** (one per AI agent for parallel testing)
- Accounts must have **full access** to the features being tested
- Accounts should be **dedicated QA accounts** — not real user accounts
- Passwords must work with your app's standard login flow

**Format:**
```json
{
  "testCredentials": [
    {
      "username": "qatest1",
      "password": "QATest@2026a",
      "loginUrl": "https://yourapp.com/login",       // optional: if login page is not at root
      "usernameField": "input[name='email']",         // optional: CSS selector for username field
      "passwordField": "input[name='password']",      // optional: CSS selector for password field
      "submitButton": "button[type='submit']"         // optional: CSS selector for submit button
    }
  ]
}
```

If your login page uses non-standard field names or selectors, provide the CSS selectors so agents can find them. If omitted, agents will auto-detect common patterns.

### 2. Comprehensive Test Scenarios (Required)

Your app must submit test scenarios that cover **every testable feature**. This is critical — the AI agents can only test what you tell them to test.

**Your scenarios must include:**

| Category | What to Cover |
|----------|--------------|
| **Field-by-field testing** | Every input field, dropdown, checkbox, toggle, date picker — test valid input, invalid input, empty input, boundary values, special characters |
| **Function testing** | Every button, link, action, CRUD operation, navigation path, form submission, file upload, search, filter, sort, pagination |
| **Authentication** | Login, logout, signup, password reset, session expiry, remember me, OAuth/social login |
| **Authorization** | Role-based access, permission checks, admin vs user views, protected routes |
| **Error handling** | Invalid inputs, network errors, server errors, empty states, 404 pages |
| **Regression tests** | Re-test previously fixed bugs, critical paths that must never break |
| **Edge cases** | Long text inputs, special characters, concurrent actions, rapid clicks, browser back/forward |
| **Payment flows** | If applicable — checkout, cart, payment processing, order confirmation |
| **Responsive/UI** | Layout on different screen sizes, image loading, loading states, animations |

See the [Test Scenario Requirements](#test-scenario-requirements) section for detailed formatting and examples.

### 3. Webhook Endpoint (Required)

Your app must have a publicly accessible HTTPS endpoint that receives webhook notifications. This is how the platform communicates test results, bug reports, and coordination requests back to your app.

**Your webhook handler must be able to:**
- Receive and process `POST` requests with JSON bodies
- Verify webhook signatures for security (see [Webhook Headers & Security](#webhook-headers--security))
- Handle `coordination.request` events to respond to platform questions autonomously
- Handle `bug.created` events to track discovered bugs
- Handle `onboarding.complete` to confirm setup status

### 4. OAuth Credentials (Optional)

If your app supports social login (Google, GitHub, Apple, Facebook, X/Twitter), provide OAuth test credentials so agents can test those flows too. See the onboarding request format above.

---

## AI Agent Capabilities

The QA Platform's AI agents can do more than just click and type. Understanding these capabilities helps you write better test scenarios.

### Three AI Agents

| Agent | Focus | What They Look For |
|-------|-------|-------------------|
| **Alex Chen** | Security | XSS, injection, auth bypass, CSRF, session issues, data exposure |
| **Maya Rodriguez** | UX & Usability | Navigation flow, dead ends, missing breadcrumbs, confusing layouts, accessibility |
| **Jordan Park** | Performance | Slow loads, unresponsive elements, memory issues, large payloads, animation jank |

All three agents test every scenario — each from their own perspective. A single scenario produces 3 independent test results.

### Browser Automation

Agents use real headless Chromium browsers. They can:
- Navigate pages, click buttons/links, fill forms, select dropdowns
- Hover over elements, double-click, right-click, drag and drop
- Scroll, use keyboard shortcuts, tab between fields
- Take screenshots at key moments
- Verify text, headings, URLs, element counts, input values

### Document Generation & File Upload

Agents can **create real files** and upload them to your app. This is critical for apps that require document uploads.

**Available file types:**
| Type | Format | Content | Use Case |
|------|--------|---------|----------|
| Word Document | `.docx` | Song lyrics with formatted headings, verses, chorus, bridge | Apps that accept Word document uploads |

**How it works in test scenarios:**

When you write a scenario that involves uploading a document, the agents will:
1. **Generate** a real `.docx` file with properly formatted content (not a fake/empty file)
2. **Upload** it to the file input on your page
3. **Verify** the upload was successful

**Example scenario for document upload:**
```json
{
  "bookName": "Document Upload Tests",
  "title": "Upload a Word document with a song",
  "steps": [
    "Navigate to the document upload page",
    "Generate a Word document with song content using generate_document",
    "Upload the generated document using upload_file",
    "Verify the upload was successful",
    "Check the document appears in the list"
  ],
  "expectedResult": "Word document is uploaded and visible in the document list",
  "priority": "high",
  "category": "document_upload"
}
```

**Important for your app:** If your app accepts file uploads, make sure:
- The file input element is visible on the page (not hidden behind a custom button without an underlying `<input type="file">`)
- Accepted file types include `.docx` if you want Word document testing
- The upload form provides clear success/error feedback

### PayPal Payment Testing

Agents can test PayPal checkout flows using sandbox credentials. They detect PayPal iframes, click PayPal buttons, log in to sandbox buyer accounts, and complete payments.

### OAuth/Social Login Testing

Agents support multiple OAuth strategies:
- **Cookie injection** — inject pre-authenticated session cookies
- **Direct automation** — automate the OAuth login flow in real-time
- **Test bypass** — hit a special test endpoint to skip OAuth

---

## Getting Started

> **Recommended:** Use [Fully Automated Registration & Onboarding](#fully-automated-registration--onboarding) above — your app registers itself, gets an API key, and starts testing in one call. The steps below are for manual setup only.

### Step 1: Register Your App

Before you can use the API, your app must be registered on the QA Platform. You can either:
- **Self-register** via `POST /api/external/register` (if the admin has enabled self-registration), or
- **Contact your QA Platform admin** and provide:

- **Your app's name** (e.g. "Phenomenon", "My Mobile App")
- A short description of your app

The admin will create your app on the platform. Each app is completely isolated — it has its own test scenarios, results, bug reports, and assigned testers.

### Step 2: Get Your API Key

Once your app is registered, ask your admin to:

1. Open the **Admin Dashboard**
2. Select your app by name
3. Go to the **Integration** tab
4. Click **Generate API Key**

The admin will share your API key with you. This key is tied to your specific app — all data you submit and pull is scoped to it. Store the key securely as an environment variable. Never expose it in client-side code.

### Step 3: Configure Webhooks (Required for Autonomous Operation)

Your app needs a webhook endpoint to receive real-time notifications. Include the `webhookUrl` in your onboarding call, or ask the admin to configure it manually:

1. Go to the **Integration** tab for your app
2. Enter your **Webhook URL** (a publicly accessible HTTPS endpoint on your server)
3. Save — the platform will generate a **Webhook Secret** for signature verification

---

## Authentication

All API requests require your API key as a Bearer token in the Authorization header:

```
Authorization: Bearer qa_your_api_key_here
```

If the key is missing or invalid, you'll get a `401 Unauthorized` response.

---

## API Endpoints

### 0. Register (Self-Registration)

**`POST /api/external/register`**

Register a new app on the platform and optionally configure everything in one call. No pre-registration or API key needed — only a registration token from the admin.

**Authentication:** Registration token (not API key)

```
Authorization: Bearer reg_your_registration_token_here
```

**Request Body:**

```json
{
  "appName": "My Application",
  "description": "Optional description",
  "appUrl": "https://yourapp.com",
  "testCredentials": [
    { "username": "qatest1", "password": "QATest@2026a" },
    { "username": "qatest2", "password": "QATest@2026b" }
  ],
  "webhookUrl": "https://yourapp.com/api/qa-webhook",
  "qaEndpointUrl": "https://yourapp.com/api/qa-bridge",
  "scenarios": [
    {
      "bookName": "Core Tests",
      "title": "Login Flow",
      "steps": ["Navigate to /login", "Enter credentials", "Click login"],
      "expectedResult": "User logs in successfully",
      "priority": "critical",
      "category": "authentication"
    }
  ],
  "oauthCredentials": []
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `appName` | **Yes** | Unique app name (min 2 characters) |
| `description` | No | Short description |
| `appUrl` | For auto-start | URL where agents browse your app |
| `testCredentials` | For auto-start | `[{ username, password }]` — min 1, 3+ recommended |
| `webhookUrl` | Recommended | HTTPS endpoint for notifications |
| `qaEndpointUrl` | No | Q&A bridge endpoint |
| `scenarios` | For auto-start | Test scenarios (see format below) |
| `oauthCredentials` | No | Social login credentials |

**Response (201 Created):**

```json
{
  "message": "App \"My Application\" registered successfully",
  "app": { "id": 5, "name": "My Application" },
  "apiKey": "qa_abc123def456...",
  "onboarding": {
    "status": "ready",
    "configured": ["appUrl", "testCredentials", "webhookUrl"],
    "issues": [],
    "scenariosCreated": 1,
    "testingAutoStarted": true
  },
  "nextSteps": ["Testing has started. Monitor your webhook for results."]
}
```

> **Important:** Save the `apiKey` from the response — you'll need it for all subsequent API calls (onboarding updates, pulling results, reporting bug fixes).

**Error Responses:**

| Status | Body | When |
|--------|------|------|
| `400` | `{ "error": "appName is required (minimum 2 characters)" }` | Missing or invalid app name |
| `401` | `{ "error": "Invalid registration token" }` | Wrong or missing token |
| `409` | `{ "error": "An app named \"X\" already exists", "hint": "..." }` | Duplicate name |
| `503` | `{ "error": "Self-registration is not enabled..." }` | Admin hasn't enabled it |

---

### 1. Onboard (One-Call Setup)

**`POST /api/external/onboard`**

Configure your app and start testing in a single API call. This is the recommended way to integrate.

**Request:**

```json
{
  "appUrl": "https://yourapp.com",
  "webhookUrl": "https://yourapp.com/api/qa-webhook",
  "qaEndpointUrl": "https://yourapp.com/api/qa-bridge",
  "testCredentials": [
    { "username": "qatest1", "password": "QATest@2026a" },
    { "username": "qatest2", "password": "QATest@2026b" },
    { "username": "qatest3", "password": "QATest@2026c" }
  ],
  "oauthCredentials": [
    { "provider": "google", "strategy": "direct-automation", "email": "test@gmail.com", "password": "pass" }
  ],
  "scenarios": [
    {
      "bookName": "Authentication Tests",
      "title": "Login with valid credentials",
      "steps": ["Navigate to /login", "Enter valid email", "Enter valid password", "Click Sign In"],
      "expectedResult": "User is redirected to dashboard",
      "priority": "critical",
      "category": "authentication"
    }
  ]
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `appUrl` | string | Yes | The URL where AI agents will test your app |
| `testCredentials` | array | Yes | Test accounts for AI agents (min 1, recommended 3) |
| `testCredentials[].username` | string | Yes | Login username/email |
| `testCredentials[].password` | string | Yes | Login password |
| `testCredentials[].loginUrl` | string | No | Login page URL (if not at app root) |
| `testCredentials[].usernameField` | string | No | CSS selector for username input |
| `testCredentials[].passwordField` | string | No | CSS selector for password input |
| `testCredentials[].submitButton` | string | No | CSS selector for submit button |
| `webhookUrl` | string | Recommended | Your webhook endpoint for notifications |
| `qaEndpointUrl` | string | No | Endpoint for AI agent Q&A bridge |
| `oauthCredentials` | array | No | OAuth provider credentials (see OAuth section) |
| `scenarios` | array | Yes | Test scenarios (see [Test Scenario Requirements](#test-scenario-requirements)) |
| `scenarios[].bookName` | string | No | Test book name (default: "General Tests") |
| `scenarios[].title` | string | Yes | Scenario title |
| `scenarios[].steps` | string[] | No | Step-by-step instructions |
| `scenarios[].expectedResult` | string | No | What should happen if the test passes |
| `scenarios[].priority` | string | No | `low`, `medium`, `high`, `critical` |
| `scenarios[].category` | string | No | Category label |

**Response (200) — Ready:**

```json
{
  "status": "ready",
  "message": "Onboarding complete — AI agent testing has started automatically",
  "configured": ["appUrl", "testCredentials", "webhookUrl"],
  "issues": [],
  "scenarios": {
    "scenariosCreated": 15,
    "scenarios": [
      { "id": 1, "title": "Login with valid credentials", "bookName": "Authentication Tests" }
    ]
  },
  "testingAutoStarted": true,
  "webhookSecret": "whsec_abc123...",
  "nextSteps": [
    "Monitor webhook notifications for test results and bug reports",
    "Use GET /api/external/progress to check testing progress",
    "Use POST /api/external/bug-status-update to report fixes"
  ]
}
```

**Response (200) — Incomplete:**

```json
{
  "status": "incomplete",
  "message": "Onboarding incomplete — fix the issues below and call this endpoint again",
  "configured": ["webhookUrl"],
  "issues": [
    "appUrl is required — this is the URL where AI agents will test your app",
    "testCredentials is required — provide at least 1 test account"
  ],
  "scenarios": null,
  "testingAutoStarted": false,
  "nextSteps": [
    "appUrl is required — this is the URL where AI agents will test your app",
    "testCredentials is required — provide at least 1 test account"
  ]
}
```

**Key behaviors:**
- Duplicate scenario titles are automatically skipped (safe to call multiple times)
- If webhook URL is new, a webhook secret is auto-generated and returned
- Testing auto-starts only when appUrl + testCredentials + at least 1 scenario are all valid
- You can call this endpoint repeatedly to add more scenarios or update configuration

---

### 2. Submit Test Scenarios

**`POST /api/external/scenarios`**

Submit one or more test scenarios to a test book. If the test book doesn't exist yet, it will be created automatically.

**Request:**

```json
{
  "bookName": "Login Tests v2.0",
  "totalExpected": 2,
  "scenarios": [
    {
      "title": "Login with valid credentials",
      "description": "Verify that a user can log in with correct email and password",
      "steps": [
        "Navigate to the login page",
        "Enter valid email in the email field",
        "Enter valid password in the password field",
        "Click the Sign In button"
      ],
      "expectedResult": "User is redirected to the dashboard",
      "priority": "high",
      "category": "authentication",
      "questions": [
        {
          "text": "Was the login button clearly visible?",
          "type": "yes_no"
        },
        {
          "text": "Rate the loading speed after clicking login",
          "type": "rating"
        },
        {
          "text": "Which page were you redirected to?",
          "type": "multiple_choice",
          "options": ["Dashboard", "Home", "Profile", "Error page"]
        }
      ]
    },
    {
      "title": "Login with invalid password",
      "description": "Verify error message for wrong password",
      "steps": [
        "Navigate to the login page",
        "Enter valid email",
        "Enter incorrect password",
        "Click Sign In"
      ],
      "expectedResult": "Error message displayed without revealing which field is wrong",
      "priority": "medium"
    }
  ]
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bookName` | string | Yes | Name of the test book (created if it doesn't exist) |
| `totalExpected` | number | No | Total number of scenarios you intend to send. If provided, the response includes a verification check |
| `scenarios` | array | Yes | Array of 1-100 test scenarios |
| `scenarios[].title` | string | Yes | Short title for the test case (max 300 chars) |
| `scenarios[].description` | string | No | Detailed description of what to test (max 2000 chars) |
| `scenarios[].steps` | string[] | No | Step-by-step testing instructions (max 50 steps) |
| `scenarios[].expectedResult` | string | No | What should happen if the test passes (max 1000 chars) |
| `scenarios[].priority` | string | No | `low`, `medium`, `high`, or `critical` (default: `medium`) |
| `scenarios[].category` | string | No | Category label (default: `general`) |
| `scenarios[].questions` | object[] | No | Additional questions for the tester (max 20) |
| `questions[].text` | string | Yes | The question to ask the tester |
| `questions[].type` | string | No | `text`, `yes_no`, `multiple_choice`, or `rating` (default: `text`) |
| `questions[].options` | string[] | Conditional | Required for `multiple_choice` type |
| `questions[].required` | boolean | No | Whether the question is required (default: `true`) |

**Response (200) — without `totalExpected`:**

```json
{
  "bookId": 5,
  "bookName": "Login Tests v2.0",
  "scenariosCreated": 2,
  "scenarios": [
    { "id": 12, "title": "Login with valid credentials", "scenarioNumber": 1 },
    { "id": 13, "title": "Login with invalid password", "scenarioNumber": 2 }
  ]
}
```

**Response (200) — with `totalExpected` (count mismatch):**

```json
{
  "bookId": 5,
  "bookName": "Login Tests v2.0",
  "scenariosCreated": 2,
  "scenarios": [
    { "id": 12, "title": "Login with valid credentials", "scenarioNumber": 1 },
    { "id": 13, "title": "Login with invalid password", "scenarioNumber": 2 }
  ],
  "verification": {
    "totalExpected": 3,
    "totalReceived": 2,
    "totalInBook": 2,
    "match": false,
    "message": "Expected 3 scenarios but received 2. Use POST /api/external/scenarios/verify to compare and identify missing scenarios.",
    "receivedTitles": ["Login with valid credentials", "Login with invalid password"]
  }
}
```

---

### 2. Verify / Reconcile Scenarios

**`POST /api/external/scenarios/verify`**

After submitting scenarios, use this endpoint to compare what you intended to send with what the platform actually received. Useful when submitting scenarios in batches or when you want to confirm nothing was lost.

**Request:**

```json
{
  "bookName": "Login Tests v2.0",
  "expectedTitles": [
    "Login with valid credentials",
    "Login with invalid password",
    "Login with expired session"
  ]
}
```

**Response (200) — with missing scenarios:**

```json
{
  "match": false,
  "totalExpected": 3,
  "totalReceived": 2,
  "missing": ["Login with expired session"],
  "extra": [],
  "receivedTitles": ["Login with valid credentials", "Login with invalid password"],
  "message": "1 scenario(s) missing. Please resubmit the missing ones."
}
```

**Response (200) — all present:**

```json
{
  "match": true,
  "totalExpected": 3,
  "totalReceived": 3,
  "missing": [],
  "extra": [],
  "receivedTitles": ["Login with valid credentials", "Login with invalid password", "Login with expired session"],
  "message": "All expected scenarios are present."
}
```

---

### 3. Get Test Results & Bug Reports

**`GET /api/external/results`**

Retrieve all test results and bug reports for your app. Bug reports include AI-generated fix suggestions when available. Failed test results include the tester's username.

**Response (200):**

```json
{
  "results": [
    {
      "id": 1,
      "scenarioId": 12,
      "scenarioTitle": "Login with valid credentials",
      "bookName": "Login Tests v2.0",
      "tester": "Sarah",
      "testerUsername": "pheno_tester1",
      "result": "failed",
      "bugDescription": "Login button becomes unresponsive after first click",
      "severity": "major",
      "questionResponses": { "1": { "answer": false, "detail": "Button did not respond" } },
      "additionalNotes": "The issue seems to happen only on mobile devices",
      "submittedAt": "2026-02-24T10:30:00.000Z"
    }
  ],
  "bugs": [
    {
      "id": 1,
      "scenarioId": 12,
      "scenarioTitle": "Login with valid credentials",
      "description": "Login button becomes unresponsive after first click",
      "stepsToReproduce": "1. Go to login\n2. Enter credentials\n3. Click login\n4. Click login again",
      "severity": "major",
      "status": "open",
      "attachments": ["/uploads/1705312200000-screenshot.png"],
      "aiFixSuggestion": {
        "rootCause": "Double-click handler not debounced, form submits multiple times causing state lock",
        "suggestedFix": "Add debounce to form submission and disable button during pending state",
        "affectedFiles": ["src/pages/Login.tsx", "src/hooks/useAuth.ts"],
        "estimatedEffort": "1-2 hours",
        "confidence": "high"
      },
      "createdAt": "2026-02-24T10:30:00.000Z"
    }
  ]
}
```

---

### 4. List Active Scenarios

**`GET /api/external/scenarios`**

List all active test scenarios for your app, including ones submitted via this API and ones created manually by admins.

**Response (200):**

```json
[
  {
    "id": 12,
    "bookName": "Login Tests v2.0",
    "scenarioNumber": 1,
    "title": "Login with valid credentials",
    "description": "Verify that a user can log in",
    "steps": [
      { "step": 1, "instruction": "Navigate to the login page" },
      { "step": 2, "instruction": "Enter valid email" }
    ],
    "expectedResult": "User is redirected to the dashboard",
    "category": "authentication",
    "priority": "high",
    "status": "active",
    "isRetest": false,
    "originalBugId": null,
    "questions": [
      {
        "id": 1,
        "questionText": "Was the login button clearly visible?",
        "questionType": "yes_no",
        "required": true
      }
    ]
  }
]
```

---

### 5. Notify Bug Fixed

**`POST /api/external/bug-fixed`**

When your development team has deployed a fix for a reported bug, call this endpoint. It will:
1. Update the bug status to `fixed`
2. Use AI to generate a retest scenario based on the original bug and your fix description
3. Assign the retest to the original tester
4. Send a `bug.retest_ready` webhook (if configured)

**Request:**

```json
{
  "bugId": 1,
  "fixDescription": "Added debounce to login button click handler and disabled the button during form submission to prevent double-clicks. Changes in src/pages/Login.tsx and src/hooks/useAuth.ts."
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bugId` | number | Yes | The bug ID (from results endpoint or webhook) |
| `fixDescription` | string | Yes | What was changed to fix the bug. Be specific — this is used by AI to generate targeted retest steps (max 2000 chars) |

**Response (200):**

```json
{
  "success": true,
  "bugId": 1,
  "newStatus": "fixed",
  "retestScenario": {
    "id": 25,
    "title": "[Retest] Login button becomes unresponsive after first click",
    "assignedTo": "Sarah",
    "verificationSteps": [
      { "step": 1, "instruction": "Navigate to the login page" },
      { "step": 2, "instruction": "Enter valid credentials and click login" },
      { "step": 3, "instruction": "Try clicking login rapidly multiple times" }
    ]
  }
}
```

**Error (403):**

```json
{
  "error": "Bug does not belong to your app"
}
```

---

### 6. Batch Bug Status Update

**`POST /api/external/bug-status-update`**

Push multiple bug status updates in a single request. This is the preferred way to sync bug statuses between your app and the QA platform — especially useful for automated CI/CD pipelines. When you mark a bug as `fixed`, the platform automatically generates a retest scenario using AI, just like the single-bug endpoint.

The QA platform also **polls your app every 5 minutes** for bug status changes (see [Automated Bug Sync](#automated-bug-sync)), so you have two options: push updates via this endpoint, or expose a status endpoint for the platform to poll. Either way, no manual admin action is needed.

**Request:**

```json
{
  "bugs": [
    {
      "bugId": 1,
      "status": "fixed",
      "fixDescription": "Added debounce to login button and disabled during submission. Changes in Login.tsx and useAuth.ts."
    },
    {
      "bugId": 2,
      "status": "acknowledged"
    },
    {
      "bugId": 3,
      "status": "in_progress"
    },
    {
      "bugId": 4,
      "status": "wontfix"
    }
  ]
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bugs` | array | Yes | Array of bug status updates |
| `bugs[].bugId` | number | Yes | The bug ID to update |
| `bugs[].status` | string | Yes | One of: `fixed`, `acknowledged`, `wontfix`, `in_progress` |
| `bugs[].fixDescription` | string | Conditional | Required when `status` is `fixed`. Describes what was changed — used by AI to generate targeted retest steps |

**Status Values:**

| Status | Effect |
|--------|--------|
| `fixed` | Bug marked as fixed, AI generates retest scenario, `bug.retest_ready` webhook sent |
| `acknowledged` | Noted as acknowledged (no status change on platform) |
| `wontfix` | Bug marked as verified/closed — will not be fixed |
| `in_progress` | Noted as in progress (no status change on platform) |

**Response (200):**

```json
{
  "success": true,
  "results": [
    {
      "bugId": 1,
      "status": "fixed",
      "retestScenarioId": 250
    },
    {
      "bugId": 2,
      "status": "acknowledged"
    },
    {
      "bugId": 3,
      "status": "in_progress"
    },
    {
      "bugId": 4,
      "status": "wontfix_accepted"
    }
  ]
}
```

**Possible Result Statuses:**

| Result Status | Meaning |
|---------------|---------|
| `fixed` | Successfully processed — retest scenario created |
| `already_fixed` | Bug was already fixed or verified |
| `acknowledged` | Acknowledged, no action needed |
| `in_progress` | Noted, no action needed |
| `wontfix_accepted` | Bug closed as won't fix |
| `not_found` | Bug ID does not exist |
| `forbidden` | Bug does not belong to your app |
| `no_action` | Status was `fixed` but no `fixDescription` provided |

---

### 7. Get Bug Status

**`GET /api/external/bugs/:bugId`**

Check the current status of a specific bug, including whether it has been retested and verified.

**Response (200):**

```json
{
  "id": 1,
  "description": "Login button becomes unresponsive after first click",
  "stepsToReproduce": "1. Go to login\n2. Enter credentials\n3. Click login twice",
  "severity": "major",
  "status": "verified",
  "attachments": ["/uploads/1705312200000-screenshot.png"],
  "aiFixSuggestion": {
    "rootCause": "Double-click handler not debounced",
    "suggestedFix": "Add debounce to form submission",
    "affectedFiles": ["src/pages/Login.tsx"],
    "estimatedEffort": "1-2 hours",
    "confidence": "high"
  },
  "timeline": {
    "reported": "2026-02-24T10:30:00.000Z",
    "fixNotified": "2026-02-24T14:00:00.000Z",
    "retestCompleted": "2026-02-24T16:15:00.000Z"
  },
  "retestResult": "passed",
  "retestScenarioId": 25
}
```

**Bug Status Values:**

| Status | Meaning |
|--------|---------|
| `open` | Bug reported, awaiting fix |
| `in_progress` | Admin has approved the bug for fixing |
| `fixed` | Fix deployed, retest scenario created, awaiting tester verification |
| `verified` | Tester confirmed the fix works (retest passed) |

A bug can move from `fixed` back to `open` if the retest fails.

---

### 8. Get Testing Progress

**`GET /api/external/progress`**

Get an overview of testing progress for your app.

**Response (200):**

```json
{
  "appName": "Phenomenon",
  "totalScenarios": 20,
  "testing": {
    "totalResults": 16,
    "passed": 14,
    "failed": 2,
    "passRate": 88
  },
  "bugs": {
    "total": 2,
    "open": 1,
    "inProgress": 0,
    "fixedAwaitingRetest": 1,
    "verified": 0
  },
  "summary": {
    "activeTesters": 3,
    "totalBooks": 2,
    "criticalBugs": 0
  }
}
```

---

### 9. Get API Documentation

**`GET /api/external/docs`**

Returns the full, up-to-date API documentation as structured JSON. Use this endpoint to keep your integration code and internal docs in sync without needing manual updates from the QA admin.

The response includes:
- All available endpoints with request/response schemas
- All webhook events with payload structures
- Bug lifecycle flow
- Versioned changelog
- Your app's current webhook configuration status

**Response (200):** A comprehensive JSON object containing:

```json
{
  "platform": "QA Testing Platform",
  "version": "2.2.0",
  "lastUpdated": "2026-02-24",
  "baseUrl": "https://qa.rerumsolutions.com",
  "authentication": { "type": "Bearer Token", "header": "Authorization: Bearer <API_KEY>" },
  "endpoints": [ ... ],
  "webhookEvents": { "events": [ ... ] },
  "bugLifecycle": { "flow": [ ... ], "statuses": [ ... ] },
  "changelog": [ ... ],
  "yourApp": {
    "name": "Phenomenon",
    "hasWebhookConfigured": true,
    "webhookUrl": "https://your-app.com/webhooks/qa"
  }
}
```

---

### 10. Get Pending Coordination Messages

**`GET /api/external/coordination/pending`**

Retrieve all pending coordination messages from the QA platform that need your app's attention. The platform sends coordination requests when it needs something from your app — for example, creating test accounts for AI agents, resolving configuration issues, or discussing test environment setup.

Your app can either handle these via webhooks (`coordination.request` event) or poll this endpoint periodically.

**Response (200):**

```json
{
  "messages": [
    {
      "id": 1,
      "appId": 4,
      "direction": "outbound",
      "category": "test_accounts",
      "subject": "Create QA test accounts on Scripto Rerum",
      "message": "The QA platform needs test accounts to perform browser-based testing...",
      "actionRequired": "create_accounts",
      "actionData": {
        "accounts": [
          { "username": "qatest1", "password": "QATest@2026a" },
          { "username": "qatest2", "password": "QATest@2026b" }
        ],
        "loginUrl": "https://www.scriptorerum.com/login",
        "failedUsername": "qatest1"
      },
      "status": "sent",
      "response": null,
      "createdAt": "2026-03-07T00:02:36.166Z"
    }
  ]
}
```

**Message Status Values:**

| Status | Meaning |
|--------|---------|
| `sent` | Message delivered via webhook, awaiting response |
| `delivery_failed` | Webhook delivery failed — message still needs attention |
| `acknowledged` | App acknowledged receipt but hasn't completed the action yet |
| `responded` | App sent a response |
| `resolved` | Issue is fully resolved |

**Common Categories:**

| Category | Description |
|----------|-------------|
| `test_accounts` | Platform needs test accounts created on your app |
| `configuration` | Configuration issue needs resolution |
| `environment` | Test environment issue |
| `bug_discussion` | Discussion about a specific bug |
| `general` | General coordination message |

---

### 11. Respond to Coordination Message

**`POST /api/external/coordination/respond`**

Respond to a coordination message from the QA platform. Use this after your app has completed the requested action (e.g., created test accounts).

**Request:**

```json
{
  "coordinationId": 1,
  "response": "Test accounts created successfully",
  "responseData": {
    "accountsCreated": ["qatest1", "qatest2", "qatest3"]
  }
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `coordinationId` | number | Yes | The coordination message ID (from pending messages or webhook payload) |
| `response` | string | Yes | Human-readable response describing what was done |
| `responseData` | object | No | Structured data about the action taken. For `test_accounts` category, include `accountsCreated` array to auto-resolve the message |

**Response (200):**

```json
{
  "success": true,
  "message": {
    "id": 1,
    "status": "responded",
    "response": "Test accounts created successfully",
    "responseData": { "accountsCreated": ["qatest1", "qatest2", "qatest3"] },
    "respondedAt": "2026-03-07T01:15:00.000Z"
  }
}
```

**Auto-Resolution:** When responding to a `test_accounts` coordination message, include `accountsCreated` in `responseData` to automatically mark the message as `resolved`. The QA agents will use the newly created accounts on their next run.

---

## Webhooks

The QA Platform sends real-time webhook notifications to your app so you don't need to poll for updates.

### Setting Up Webhooks

1. Open the **Admin Dashboard**
2. Select your app
3. Go to the **Integration** tab
4. Enter your **Webhook URL** (must be a publicly accessible HTTPS endpoint)
5. Save — the platform generates a **Webhook Secret** automatically

Your endpoint should return a `2xx` status code to acknowledge receipt. The platform sends webhooks as `POST` requests with a JSON body. Webhook delivery times out after 10 seconds.

### Webhook Headers & Security

Every webhook request includes these headers:

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-QA-Event` | The event type (e.g. `bug.created`, `test.result_submitted`) |
| `X-QA-Signature` | HMAC-SHA256 signature of the request body using your webhook secret (only present if a webhook secret is configured) |

**Verifying signatures (recommended):**

```javascript
const crypto = require('crypto');

function verifySignature(body, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### Webhook Events

There are **8 webhook events**. All payloads are sent as flat JSON objects (no nested `data` wrapper).

---

#### 1. `bug.created`

**Trigger:** Immediately when a tester submits a failed test result with a bug report.

This is the fastest way to know about new bugs — your team can start investigating right away without waiting for AI analysis.

**Payload:**

```json
{
  "scenarioId": 12,
  "scenarioTitle": "Login with valid credentials",
  "bookName": "Login Tests v2.0",
  "result": "failed",
  "bug": {
    "id": 1,
    "description": "Login button becomes unresponsive after first click",
    "stepsToReproduce": "Issues identified through test questions (see details above)",
    "severity": "major",
    "attachments": [
      "https://qa.rerumsolutions.com/uploads/1705312200000-a1b2c3d4e5f6.png"
    ]
  },
  "additionalNotes": "The issue seems to happen only on mobile devices",
  "questionResponses": { "1": { "answer": false, "detail": "Button did not respond" } },
  "tester": "Sarah",
  "testerUsername": "pheno_tester1",
  "timestamp": "2026-02-24T10:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `scenarioId` | number | The test scenario that failed |
| `scenarioTitle` | string | Title of the failed scenario |
| `bookName` | string | Name of the test book |
| `result` | string | Always `"failed"` |
| `bug.id` | number | Unique bug ID — use this to track the bug through its lifecycle |
| `bug.description` | string | Full bug description (compiled from failed test questions) |
| `bug.stepsToReproduce` | string | Steps to reproduce the issue |
| `bug.severity` | string | `low`, `medium`, `major`, or `critical` |
| `bug.attachments` | string[] | Array of full URLs to screenshots/videos (empty array if none) |
| `additionalNotes` | string or null | Tester's extra observations and notes (free-text field) |
| `questionResponses` | object or null | Full question answers with details (keyed by question ID) |
| `tester` | string | First name of the tester who reported the bug |
| `testerUsername` | string | Username of the tester |
| `timestamp` | string | ISO 8601 timestamp |

---

#### 2. `bug.fix_suggestion_ready`

**Trigger:** When AI finishes analyzing the bug and generates a fix suggestion. This typically arrives a few seconds after `bug.created`.

**Payload:**

```json
{
  "bugId": 1,
  "scenarioId": 12,
  "scenarioTitle": "Login with valid credentials",
  "bookName": "Login Tests v2.0",
  "tester": "Sarah",
  "testerUsername": "pheno_tester1",
  "aiFixSuggestion": {
    "rootCause": "Double-click handler not debounced, form submits multiple times causing state lock",
    "suggestedFix": "Add debounce to form submission and disable button during pending state",
    "affectedFiles": ["src/pages/Login.tsx", "src/hooks/useAuth.ts"],
    "estimatedEffort": "1-2 hours",
    "confidence": "high"
  },
  "timestamp": "2026-02-24T10:30:05.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `bugId` | number | The bug ID |
| `scenarioId` | number | The test scenario that failed |
| `scenarioTitle` | string | Title of the scenario |
| `bookName` | string | Name of the test book |
| `tester` | string | First name of the tester who reported |
| `testerUsername` | string | Username of the tester |
| `aiFixSuggestion.rootCause` | string | AI-identified root cause |
| `aiFixSuggestion.suggestedFix` | string | Recommended fix |
| `aiFixSuggestion.affectedFiles` | string[] | Files likely needing changes |
| `aiFixSuggestion.estimatedEffort` | string | Estimated time to fix |
| `aiFixSuggestion.confidence` | string | AI confidence level (`low`, `medium`, `high`) |
| `timestamp` | string | ISO 8601 timestamp |

---

#### 3. `bug.retest_ready`

**Trigger:** When a retest scenario is created after a fix — either via `POST /api/external/bug-fixed` or when the admin marks a bug as fixed in the dashboard.

**Payload:**

```json
{
  "bugId": 1,
  "originalScenarioId": 12,
  "originalScenarioTitle": "Login with valid credentials",
  "retestScenario": {
    "id": 25,
    "title": "[Retest] Login button responsiveness fix verification",
    "description": "Verify that the login button fix works correctly",
    "steps": [
      { "step": 1, "instruction": "Navigate to login page" },
      { "step": 2, "instruction": "Click the login button" },
      { "step": 3, "instruction": "Verify button remains responsive" }
    ],
    "expectedResult": "Login button should work on every click without becoming unresponsive"
  },
  "fixDescription": "Added debounce to form submission",
  "assignedTester": "Sarah",
  "assignedTesterUsername": "pheno_tester1",
  "timestamp": "2026-02-24T14:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `bugId` | number | The original bug ID |
| `originalScenarioId` | number | The original scenario that failed |
| `originalScenarioTitle` | string | Title of the original scenario |
| `retestScenario.id` | number | New retest scenario ID |
| `retestScenario.title` | string | Retest scenario title |
| `retestScenario.description` | string | What the tester needs to verify |
| `retestScenario.steps` | object[] | AI-generated verification steps |
| `retestScenario.expectedResult` | string | Expected outcome if fix is working |
| `fixDescription` | string | The fix description provided when marking bug as fixed |
| `assignedTester` | string | First name of the assigned tester |
| `assignedTesterUsername` | string | Username of the assigned tester |
| `timestamp` | string | ISO 8601 timestamp |

---

#### 4. `bug.retest_completed`

**Trigger:** When a tester completes retesting a bug fix.

**Payload (retest passed — bug verified fixed):**

```json
{
  "bugId": 1,
  "scenarioId": 25,
  "scenarioTitle": "[Retest] Login button responsiveness fix verification",
  "retestResult": "passed",
  "newStatus": "verified",
  "tester": "Sarah",
  "testerUsername": "pheno_tester1",
  "timestamp": "2026-02-24T16:00:00.000Z"
}
```

**Payload (retest failed — bug reopened):**

```json
{
  "bugId": 1,
  "scenarioId": 25,
  "scenarioTitle": "[Retest] Login button responsiveness fix verification",
  "retestResult": "failed",
  "newStatus": "open",
  "tester": "Sarah",
  "testerUsername": "pheno_tester1",
  "timestamp": "2026-02-24T16:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `bugId` | number | The original bug ID being retested |
| `scenarioId` | number | The retest scenario ID |
| `scenarioTitle` | string | Retest scenario title |
| `retestResult` | string | `"passed"` or `"failed"` |
| `newStatus` | string | `"verified"` (if passed) or `"open"` (if failed) |
| `tester` | string | First name of the tester |
| `testerUsername` | string | Username of the tester |
| `timestamp` | string | ISO 8601 timestamp |

When a retest fails, the bug's status reverts to `open` and a new bug report is created (if the tester submits a new bug description). You will also receive a separate `bug.created` webhook for the new bug.

---

#### 5. `test.result_submitted`

**Trigger:** Every time a tester submits a test result — whether passed or failed, and whether it's a regular test or a retest.

**Payload:**

```json
{
  "resultId": 42,
  "scenarioId": 12,
  "scenarioTitle": "Login with valid credentials",
  "bookName": "Login Tests v2.0",
  "result": "passed",
  "isRetest": false,
  "originalBugId": null,
  "additionalNotes": "Everything worked smoothly",
  "questionResponses": { "1": { "answer": true } },
  "attachments": [],
  "tester": "Sarah",
  "testerUsername": "pheno_tester1",
  "timestamp": "2026-02-24T10:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `resultId` | number | Unique test result ID |
| `scenarioId` | number | The scenario tested |
| `scenarioTitle` | string | Title of the scenario |
| `bookName` | string | Name of the test book |
| `result` | string | `"passed"` or `"failed"` |
| `isRetest` | boolean | `true` if this is a retest for a previously fixed bug |
| `originalBugId` | number or null | If this is a retest, the original bug ID being verified |
| `additionalNotes` | string or null | Tester's extra observations and notes (free-text field) |
| `questionResponses` | object or null | Full question answers with details (keyed by question ID) |
| `attachments` | string[] | Array of full URLs to screenshots/videos (empty array if none) |
| `tester` | string | First name of the tester |
| `testerUsername` | string | Username of the tester |
| `timestamp` | string | ISO 8601 timestamp |

---

#### 6. `agent_run.completed`

**Trigger:** When an AI testing agent finishes running through all scenarios for your app (or fails mid-run). The QA platform has three AI agents — Alex Chen (security focus), Maya Rodriguez (UX/chaos focus), and Jordan Park (performance focus) — that can run browser-based tests against your live application.

**Payload:**

```json
{
  "runId": 24,
  "agentName": "Alex Chen",
  "appId": 2,
  "appName": "Scripto Rerum",
  "status": "completed",
  "totalScenarios": 219,
  "passedCount": 180,
  "failedCount": 39,
  "bugsFound": 39,
  "passRate": 82,
  "duration": "2h 15m",
  "testMode": "browser",
  "summary": "Security-focused analysis identified 39 issues including...",
  "completedAt": "2026-03-05T02:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `runId` | number | Unique run ID |
| `agentName` | string | Name of the AI agent (Alex Chen, Maya Rodriguez, or Jordan Park) |
| `appId` | number | Your app's ID on the platform |
| `appName` | string | Your app's name |
| `status` | string | `"completed"` or `"failed"` |
| `totalScenarios` | number | Total scenarios the agent attempted |
| `passedCount` | number | Scenarios that passed |
| `failedCount` | number | Scenarios that failed |
| `bugsFound` | number | Number of bug reports created |
| `passRate` | number | Pass rate percentage (0-100) |
| `duration` | string | Human-readable duration |
| `testMode` | string | `"browser"` (real browser testing) or `"analysis"` (AI analysis only) |
| `summary` | string | AI-generated summary of findings |
| `completedAt` | string | ISO 8601 timestamp |

---

#### 7. `coordination.request`

**Trigger:** When the QA platform needs something from your app — for example, creating test accounts for AI agents, resolving a configuration issue, or discussing test environment setup. This event is sent automatically when login failures are detected, or manually by the QA admin from the Coordination tab.

**Payload:**

```json
{
  "coordinationId": 1,
  "category": "test_accounts",
  "subject": "Create QA test accounts on Scripto Rerum",
  "message": "The QA platform needs test accounts to perform browser-based testing on Scripto Rerum. Agent login failed for user \"qatest1\". Please create the following accounts:\n\n  - Username: qatest1, Password: Q*********a\n  - Username: qatest2, Password: Q*********b\n\nFull credentials are available in the actionData payload (machine-readable). Once created, respond to this message via the coordination response API. The QA agents will automatically retry login on the next run.",
  "actionRequired": "create_accounts",
  "actionData": {
    "accounts": [
      { "username": "qatest1", "password": "QATest@2026a" },
      { "username": "qatest2", "password": "QATest@2026b" }
    ],
    "loginUrl": "https://www.scriptorerum.com/login",
    "failedUsername": "qatest1"
  },
  "respondUrl": "/api/external/coordination/respond",
  "timestamp": "2026-03-07T00:02:36.166Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `coordinationId` | number | Unique message ID — use this when responding via `POST /api/external/coordination/respond` |
| `category` | string | Type of request: `test_accounts`, `configuration`, `environment`, `bug_discussion`, `general` |
| `subject` | string | Short description of what's needed |
| `message` | string | Detailed message (passwords masked in human-readable text for security) |
| `actionRequired` | string | Type of action needed (e.g., `create_accounts`, `review`) |
| `actionData` | object | Structured data for automated processing — contains full credentials for `test_accounts` requests |
| `respondUrl` | string | API endpoint path to send your response |
| `timestamp` | string | ISO 8601 timestamp |

**Recommended handling:**

```javascript
case 'coordination.request':
  console.log(`COORDINATION REQUEST: ${payload.subject}`);
  console.log(`Category: ${payload.category} | Action: ${payload.actionRequired}`);

  if (payload.category === 'test_accounts' && payload.actionData?.accounts) {
    // Automatically create the requested test accounts
    for (const account of payload.actionData.accounts) {
      await createTestUser(account.username, account.password);
    }
    // Respond to confirm
    await fetch(`${QA_PLATFORM_URL}/api/external/coordination/respond`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        coordinationId: payload.coordinationId,
        response: 'Test accounts created successfully',
        responseData: {
          accountsCreated: payload.actionData.accounts.map(a => a.username)
        }
      })
    });
  }
  break;
```

**Immediate acknowledgment:** Your webhook handler can also acknowledge a coordination request immediately by returning a JSON response with `{"acknowledged": true, "message": "Processing..."}`. The platform will update the message status to `acknowledged`.

---

#### 8. `agent_run.login_failed`

**Trigger:** When an AI agent fails to log in to your app during browser-based testing. This fires alongside `coordination.request` (which includes account creation details). Use this event for alerting/logging.

**Payload:**

```json
{
  "runId": 40,
  "agentName": "Alex Chen",
  "username": "qatest1",
  "loginUrl": "https://www.scriptorerum.com/login",
  "message": "AI agent Alex Chen could not log in with user \"qatest1\". Please verify the credentials are valid and the login page is accessible.",
  "timestamp": "2026-03-07T00:02:36.166Z"
}
```

---

### Handling Webhooks (Example)

```javascript
const crypto = require('crypto');
const express = require('express');
const app = express();

const WEBHOOK_SECRET = process.env.QA_WEBHOOK_SECRET;

app.post('/webhooks/qa-platform', express.json(), (req, res) => {
  // Verify signature (recommended)
  if (WEBHOOK_SECRET) {
    const signature = req.headers['x-qa-signature'];
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return res.status(401).send('Invalid signature');
    }
  }

  const event = req.headers['x-qa-event'];
  const payload = req.body;

  switch (event) {
    case 'bug.created':
      console.log(`NEW BUG #${payload.bug.id}: ${payload.bug.description}`);
      console.log(`Severity: ${payload.bug.severity} | Reported by: ${payload.testerUsername}`);
      if (payload.bug.attachments?.length) {
        console.log(`Attachments: ${payload.bug.attachments.length} file(s)`);
        payload.bug.attachments.forEach(url => console.log(`  - ${url}`));
      }
      // Create a ticket in your issue tracker
      break;

    case 'bug.fix_suggestion_ready':
      console.log(`AI ANALYSIS for bug #${payload.bugId}:`);
      console.log(`Root cause: ${payload.aiFixSuggestion.rootCause}`);
      console.log(`Fix: ${payload.aiFixSuggestion.suggestedFix}`);
      console.log(`Files: ${payload.aiFixSuggestion.affectedFiles.join(', ')}`);
      console.log(`Effort: ${payload.aiFixSuggestion.estimatedEffort}`);
      // Update your issue tracker ticket with AI recommendations
      break;

    case 'bug.retest_ready':
      console.log(`RETEST CREATED for bug #${payload.bugId}`);
      console.log(`Scenario: ${payload.retestScenario.title}`);
      console.log(`Assigned to: ${payload.assignedTesterUsername}`);
      // Track that a retest is pending
      break;

    case 'bug.retest_completed':
      console.log(`RETEST RESULT for bug #${payload.bugId}: ${payload.retestResult}`);
      console.log(`New status: ${payload.newStatus}`);
      if (payload.retestResult === 'passed') {
        // Bug verified fixed - close the ticket
      } else {
        // Fix didn't work - bug is reopened
      }
      break;

    case 'test.result_submitted':
      console.log(`TEST RESULT: ${payload.scenarioTitle} - ${payload.result}`);
      if (payload.isRetest) {
        console.log(`(Retest for bug #${payload.originalBugId})`);
      }
      // Update your testing dashboard
      break;

    case 'agent_run.completed':
      console.log(`AI AGENT RUN ${payload.status.toUpperCase()}: ${payload.agentName}`);
      console.log(`Pass rate: ${payload.passRate}% (${payload.passedCount}/${payload.totalScenarios})`);
      console.log(`Bugs found: ${payload.bugsFound} | Duration: ${payload.duration}`);
      // Trigger your CI/CD pipeline or update dashboards
      break;

    case 'coordination.request':
      console.log(`COORDINATION: ${payload.subject}`);
      console.log(`Category: ${payload.category} | Action: ${payload.actionRequired}`);
      if (payload.category === 'test_accounts' && payload.actionData?.accounts) {
        // Auto-create the requested test accounts
        for (const acct of payload.actionData.accounts) {
          await createTestUser(acct.username, acct.password);
        }
        // Confirm back to the QA platform
        await fetch(`https://qa.rerumsolutions.com/api/external/coordination/respond`, {
          method: 'POST', headers,
          body: JSON.stringify({
            coordinationId: payload.coordinationId,
            response: 'Accounts created',
            responseData: { accountsCreated: payload.actionData.accounts.map(a => a.username) }
          })
        });
      }
      break;

    case 'agent_run.login_failed':
      console.log(`LOGIN FAILED: Agent ${payload.agentName} — user "${payload.username}"`);
      // Alert your team or auto-create the account
      break;
  }

  res.sendStatus(200);
});
```

---

## Pre-Test Communication Protocol

Before testing begins, the platform and your app go through an autonomous handshake to ensure everything is properly configured. This happens automatically — no human intervention needed.

### How It Works

```
Your App                                    QA Platform
   |                                            |
   |--- POST /api/external/onboard ----------→  |
   |    { appUrl, testCredentials,              |
   |      webhookUrl, scenarios }               |
   |                                            |
   |                                   Validates config
   |                                   Checks URL format
   |                                   Validates credentials structure
   |                                   Creates test books & scenarios
   |                                            |
   |  ←--- Response (status: ready/incomplete)  |
   |       { configured, issues, nextSteps }    |
   |                                            |
   |  If status === "ready":                    |
   |                                   Starts 3 AI agents
   |                                   Agents open browser
   |                                   Agents attempt login
   |                                            |
   |  ←--- Webhook: onboarding.complete ------  |
   |       { status, configured, issues }       |
   |                                            |
   |  If login fails:                           |
   |  ←--- Webhook: agent_run.login_failed ---  |
   |       { credentials that failed }          |
   |                                            |
   |  ←--- Webhook: coordination.request -----  |
   |       { action: "create_test_accounts",    |
   |         accounts: [...] }                  |
   |                                            |
   |  Your app creates/fixes accounts           |
   |                                            |
   |--- POST /coordination/respond ----------→  |
   |    { coordinationId, response: "done" }    |
   |                                            |
   |                                   Retries login
   |                                   Testing continues
```

### Handling Setup Issues Autonomously

Your webhook handler should process these events without human intervention:

| Webhook Event | Your App Should | 
|--------------|----------------|
| `onboarding.complete` (status: "ready") | Log success, monitoring can begin |
| `onboarding.complete` (status: "incomplete") | Parse `issues` array, fix each issue, call `/api/external/onboard` again |
| `agent_run.login_failed` | Verify test accounts exist in your DB, reset passwords if needed, respond to coordination request |
| `coordination.request` (create_test_accounts) | Auto-create the requested accounts in your DB, respond with confirmation |
| `coordination.request` (general) | Log for review, respond with relevant info |
| `bug.created` | Track the bug in your issue system, begin fix |
| `bug.fix_suggestion_ready` | Review AI suggestion, implement fix, call `POST /api/external/bug-status-update` |

### Re-Onboarding

You can call `POST /api/external/onboard` multiple times. Each call:
- Updates configuration (appUrl, webhookUrl, testCredentials)
- Adds new scenarios (existing scenarios with the same title are skipped — no duplicates)
- Re-validates everything
- Auto-starts testing if all requirements are met

This means your app can incrementally add scenarios as new features are built.

---

## Test Scenario Requirements

The quality of testing depends entirely on the scenarios you provide. AI agents can only test what you tell them to test. **Comprehensive scenarios are not optional** — they are the foundation of effective QA.

### Required Coverage

Your scenarios must cover every testable aspect of your application:

#### 1. Field-by-Field Testing

For **every input field** in your app (text inputs, dropdowns, checkboxes, toggles, date pickers, file uploads, etc.), provide scenarios that test:

```json
[
  {
    "bookName": "Form Field Tests - User Registration",
    "title": "Registration - Email field accepts valid email format",
    "steps": ["Navigate to /register", "Enter 'user@example.com' in the email field", "Submit the form"],
    "expectedResult": "Form submits successfully, no validation error on email field",
    "priority": "high",
    "category": "field-validation"
  },
  {
    "bookName": "Form Field Tests - User Registration",
    "title": "Registration - Email field rejects invalid format",
    "steps": ["Navigate to /register", "Enter 'not-an-email' in the email field", "Submit the form"],
    "expectedResult": "Validation error displayed: 'Please enter a valid email address'",
    "priority": "high",
    "category": "field-validation"
  },
  {
    "bookName": "Form Field Tests - User Registration",
    "title": "Registration - Email field rejects empty submission",
    "steps": ["Navigate to /register", "Leave email field empty", "Submit the form"],
    "expectedResult": "Validation error displayed: 'Email is required'",
    "priority": "high",
    "category": "field-validation"
  },
  {
    "bookName": "Form Field Tests - User Registration",
    "title": "Registration - Email field handles special characters",
    "steps": ["Navigate to /register", "Enter 'user+tag@example.com' in the email field", "Submit the form"],
    "expectedResult": "Form accepts email with + character (valid RFC 5321 format)",
    "priority": "medium",
    "category": "field-validation"
  }
]
```

#### 2. Function Testing

For **every action/function** in your app (buttons, links, CRUD operations, navigation, etc.):

```json
[
  {
    "bookName": "CRUD Tests - Posts",
    "title": "Create a new post with all fields filled",
    "steps": [
      "Navigate to /posts/new",
      "Enter 'Test Post Title' in the title field",
      "Enter 'This is the post body content' in the body field",
      "Select 'Published' from the status dropdown",
      "Click the 'Create Post' button"
    ],
    "expectedResult": "Post is created successfully, user is redirected to the post detail page, success message displayed",
    "priority": "critical",
    "category": "crud"
  },
  {
    "bookName": "CRUD Tests - Posts",
    "title": "Edit an existing post",
    "steps": [
      "Navigate to /posts",
      "Click on the first post in the list",
      "Click the 'Edit' button",
      "Change the title to 'Updated Title'",
      "Click 'Save Changes'"
    ],
    "expectedResult": "Post is updated, new title is displayed, success message shown",
    "priority": "critical",
    "category": "crud"
  },
  {
    "bookName": "CRUD Tests - Posts",
    "title": "Delete a post with confirmation",
    "steps": [
      "Navigate to /posts",
      "Click the delete button on a post",
      "Confirm deletion in the confirmation dialog"
    ],
    "expectedResult": "Post is removed from the list, success message displayed",
    "priority": "high",
    "category": "crud"
  }
]
```

#### 3. Authentication & Authorization

```json
[
  {
    "bookName": "Authentication Tests",
    "title": "Login with valid credentials",
    "steps": ["Navigate to /login", "Enter valid username", "Enter valid password", "Click Sign In"],
    "expectedResult": "User is redirected to dashboard, username displayed in header",
    "priority": "critical",
    "category": "authentication"
  },
  {
    "bookName": "Authentication Tests",
    "title": "Login with wrong password shows error",
    "steps": ["Navigate to /login", "Enter valid username", "Enter wrong password", "Click Sign In"],
    "expectedResult": "Error message displayed without revealing which field is wrong",
    "priority": "critical",
    "category": "authentication"
  },
  {
    "bookName": "Authentication Tests",
    "title": "Accessing protected route while logged out redirects to login",
    "steps": ["Clear all cookies/session", "Navigate directly to /dashboard"],
    "expectedResult": "User is redirected to /login page",
    "priority": "critical",
    "category": "authorization"
  },
  {
    "bookName": "Authentication Tests",
    "title": "Logout clears session and redirects",
    "steps": ["Log in with valid credentials", "Click logout button"],
    "expectedResult": "Session is cleared, user is redirected to login page, cannot access protected routes",
    "priority": "high",
    "category": "authentication"
  }
]
```

#### 4. Regression Tests

After every bug fix, add a regression test scenario to prevent the bug from returning:

```json
{
  "bookName": "Regression Tests",
  "title": "REGRESSION: Login button no longer freezes on double-click (Bug #42)",
  "description": "Previously, double-clicking the login button caused it to become unresponsive. Fixed in v2.1.3.",
  "steps": [
    "Navigate to /login",
    "Enter valid credentials",
    "Double-click the Sign In button rapidly",
    "Wait 3 seconds"
  ],
  "expectedResult": "Login proceeds normally on first click, second click is ignored or shows loading state. Button does not freeze.",
  "priority": "high",
  "category": "regression"
}
```

#### 5. Error Handling & Edge Cases

```json
[
  {
    "bookName": "Error Handling Tests",
    "title": "Form submission with network error shows retry option",
    "steps": ["Fill out any form", "Submit while network is degraded"],
    "expectedResult": "User-friendly error message with retry option, no data loss",
    "priority": "medium",
    "category": "error-handling"
  },
  {
    "bookName": "Error Handling Tests",
    "title": "404 page for non-existent routes",
    "steps": ["Navigate to /this-page-does-not-exist"],
    "expectedResult": "Custom 404 page with navigation back to home, not a blank page or server error",
    "priority": "medium",
    "category": "error-handling"
  },
  {
    "bookName": "Edge Case Tests",
    "title": "Text field handles very long input (1000+ characters)",
    "steps": ["Navigate to any text input form", "Paste 1000+ characters of text", "Submit"],
    "expectedResult": "Either accepts the input or shows a clear max-length validation message",
    "priority": "medium",
    "category": "edge-case"
  }
]
```

#### 6. File Upload Testing

If your app accepts file uploads, include scenarios that use the platform's document generation. See [AI Agent Capabilities](#ai-agent-capabilities) for details.

```json
[
  {
    "bookName": "Document Upload Tests",
    "title": "Upload a Word document with song content",
    "steps": [
      "Navigate to the upload page",
      "Generate a Word document with song content using generate_document",
      "Upload the generated document to the file input using upload_file",
      "Verify the upload succeeds"
    ],
    "expectedResult": "Document is uploaded successfully and appears in the document list",
    "priority": "high",
    "category": "document_upload"
  },
  {
    "bookName": "Document Upload Tests",
    "title": "Verify uploaded document content is displayed correctly",
    "steps": [
      "Navigate to the upload page",
      "Generate a Word document using generate_document",
      "Upload the document using upload_file",
      "Open or preview the uploaded document"
    ],
    "expectedResult": "Document content (title, verses, chorus) is displayed correctly after upload",
    "priority": "high",
    "category": "document_upload"
  },
  {
    "bookName": "Document Upload Tests",
    "title": "Upload multiple documents sequentially",
    "steps": [
      "Navigate to the upload page",
      "Generate and upload a first document",
      "Generate and upload a second document",
      "Verify both documents appear in the list"
    ],
    "expectedResult": "Both documents are listed and accessible",
    "priority": "medium",
    "category": "document_upload"
  },
  {
    "bookName": "Document Upload Tests",
    "title": "Error handling for upload without selecting a file",
    "steps": [
      "Navigate to the upload page",
      "Click the upload/submit button without selecting any file"
    ],
    "expectedResult": "Clear error message indicating no file was selected",
    "priority": "medium",
    "category": "document_upload"
  }
]
```

### Scenario Quality Checklist

Before submitting scenarios, verify:

- [ ] Every page in your app has at least one scenario
- [ ] Every form field has valid input, invalid input, and empty input scenarios
- [ ] Every button and action has a scenario
- [ ] Login/logout flows are covered
- [ ] Protected routes are tested for unauthorized access
- [ ] Error states (404, 500, validation errors) are covered
- [ ] Previously fixed bugs have regression test scenarios
- [ ] Payment flows (if applicable) are covered
- [ ] File upload/download (if applicable) is covered — use `generate_document` and `upload_file` actions
- [ ] Search, filter, and sort (if applicable) are covered

---

## Bug Lifecycle

The complete lifecycle of a bug from discovery to verification:

```
1. Tester reports bug
   -> Bug status: "open"
   -> Webhook: bug.created (immediate)
   -> Webhook: bug.fix_suggestion_ready (seconds later, after AI analysis)

2. Admin approves bug (optional)
   -> Bug status: "in_progress"

3. Fix deployed — notified via POST /api/external/bug-fixed, POST /api/external/bug-status-update, automated sync, or admin action
   -> Bug status: "fixed"
   -> AI generates retest scenario
   -> Webhook: bug.retest_ready

4. Tester runs retest
   -> Webhook: bug.retest_completed + test.result_submitted

   4a. Retest PASSED
       -> Bug status: "verified" (confirmed fixed)

   4b. Retest FAILED
       -> Bug status: "open" (reopened)
       -> New bug report created if tester provides details
       -> Webhook: bug.created (for the new bug)
```

**Status Flow:** `open` -> `in_progress` -> `fixed` -> `verified` (or back to `open` if retest fails)

---

## Automated Bug Sync

The QA platform supports fully automated, two-way bug synchronization so that no manual admin intervention is needed to process bug fixes.

### How It Works

There are three ways bug fixes get processed automatically:

#### Option 1: Push Updates (Recommended)

Your app calls `POST /api/external/bug-status-update` whenever bugs are fixed. This is the fastest and most reliable approach — fixes are processed immediately.

```javascript
// After deploying a fix in your CI/CD pipeline
await fetch('https://qa.rerumsolutions.com/api/external/bug-status-update', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    bugs: [
      { bugId: 42, status: 'fixed', fixDescription: 'Fixed null pointer in login handler' },
      { bugId: 43, status: 'fixed', fixDescription: 'Added input validation to signup form' },
    ],
  }),
});
```

#### Option 2: Platform Polls Your App

Every 5 minutes, the QA platform calls your app's status endpoint to check for bug updates. To use this, expose an endpoint at:

```
POST {your_webhook_url_base}/qa-platform/bug-status
```

For example, if your webhook URL is `https://yourapp.com/api/webhooks/qa`, the platform will poll:

```
POST https://yourapp.com/api/qa-platform/bug-status
```

The platform sends a request with the list of open bug IDs:

```json
{
  "bugIds": [1, 2, 5, 12]
}
```

Your endpoint should respond with the current status of each bug that has changed:

```json
{
  "bugs": [
    {
      "bugId": 1,
      "status": "fixed",
      "fixDescription": "Added debounce to prevent double-click issue"
    },
    {
      "bugId": 5,
      "status": "in_progress"
    }
  ]
}
```

Only include bugs whose status has changed. Bug IDs not in the response are assumed to still be open.

#### Option 3: Single Bug Fix Notification

Use the existing `POST /api/external/bug-fixed` endpoint for individual bug fixes (see [Notify Bug Fixed](#5-notify-bug-fixed)).

### What Happens When a Fix Is Detected

Regardless of which method triggered the fix, the platform:

1. Updates the bug status to `fixed`
2. Uses AI to generate a targeted retest scenario based on the original bug and fix description
3. Creates the retest scenario and links it to the original bug
4. Sends a `bug.retest_ready` webhook to your app with the retest details
5. **Automatically triggers an AI agent run** to retest the specific fixed scenario — no human action needed
6. Logs the action in the activity log (marked as auto-processed)

The retest webhook payload includes `"autoProcessed": true` to distinguish automated fixes from manual admin actions. The API response includes `"retestAutoTriggered": true` confirming that agents are already retesting.

### Full Automated Fix → Retest Flow

```
Your App                                 QA Platform
   |                                        |
   |--- POST /api/external/bug-fixed -----→ |
   |    or POST /api/external/bug-status-update
   |    { bugId, fixDescription }           |
   |                                        |
   |                              AI generates retest scenario
   |                              Bug status → "fixed"
   |                                        |
   |  ←--- webhook: bug.retest_ready ------ |
   |       { retestScenario, fixDescription }
   |                                        |
   |                              AI agents auto-run retest ▶
   |                              Browser tests the fix
   |                                        |
   |  ←--- webhook: bug.retest_completed -- |
   |       { passed: true/false }           |
   |                                        |
   |  If passed → bug verified ✓            |
   |  If failed → bug reopened, new report  |
```

**The entire cycle — from fix notification to retest verification — is fully automatic.**

---

## Automated Scenario Sync

The QA platform polls your app every 5 minutes for new test scenarios. This allows your app to dynamically add new scenarios without making API calls to the QA platform.

### How It Works

Every 5 minutes, the platform calls your scenario endpoint to check for new scenarios:

```
GET {your_webhook_url_base}/qa-platform/scenarios
```

For example, if your webhook URL is `https://yourapp.com/api/webhooks/qa`, the platform will poll:

```
GET https://yourapp.com/api/qa-platform/scenarios
```

The request includes your API key for authentication:

```
Authorization: Bearer {your_api_key}
X-QA-Event: scenario.sync
```

### Expected Response Format

Your endpoint should return a JSON object with a `scenarios` array:

```json
{
  "scenarios": [
    {
      "bookName": "New Feature Tests",
      "title": "Dark Mode Toggle",
      "description": "Test the new dark mode toggle feature",
      "steps": [
        "Navigate to settings page",
        "Click the dark mode toggle",
        "Verify the theme changes to dark",
        "Refresh the page",
        "Verify dark mode persists"
      ],
      "expectedResult": "Dark mode should toggle correctly and persist across page refreshes",
      "category": "functional",
      "priority": "medium",
      "questions": [
        {
          "text": "Did the theme change immediately?",
          "type": "yes_no",
          "required": true
        },
        {
          "text": "Rate the visual transition smoothness",
          "type": "rating",
          "required": true
        }
      ]
    }
  ]
}
```

### Deduplication

The platform automatically deduplicates by scenario title — if a scenario with the same title already exists for your app, it will be skipped. Only truly new scenarios are imported. You can safely return all your scenarios every time without worrying about duplicates.

### Auto-Import Behavior

When new scenarios are detected:
1. The platform creates test books automatically if the `bookName` doesn't exist yet
2. Scenarios are assigned sequential numbers within their book
3. Questions are attached to each scenario if provided
4. An activity log entry records the import with all scenario titles
5. New scenarios are immediately available for AI agents and human testers

### Question Types

| Type | Maps To | Description |
|------|---------|-------------|
| `yes_no` | Checkbox | Yes/No question |
| `rating` | Scale | Numeric rating (1-5) |
| `text` | Text | Free-form text response |
| `multiple_choice` | Dropdown | Select from options |

---

## App Coordination Channel

The QA platform includes a bidirectional coordination channel that allows automated communication between the platform and your app for setup, configuration, and issue resolution — without requiring human intervention.

### How It Works

The coordination channel uses **webhook-based push notifications** — the same mechanism your app already uses to receive bug reports and test results. When the QA platform needs something (e.g., test accounts created), it immediately sends a `coordination.request` webhook to your existing webhook URL. Your app handles it in real-time and responds. No polling, no delays, no human involvement.

```
QA Platform                              Your App
    |                                       |
    |  AI agent tries to log in...          |
    |  Login fails (401)                    |
    |                                       |
    |--- POST webhook --------------------→ |
    |    X-QA-Event: coordination.request   |
    |    { accounts to create... }          |
    |                                       |
    |                             Creates accounts in DB
    |                                       |
    |  ←--- POST /coordination/respond ---- |
    |       { accountsCreated: [...] }      |
    |                                       |
    |  Platform marks resolved ✓            |
    |  Auto-triggers new agent run ▶        |
    |                                       |
    |  AI agents log in successfully ✓      |
    |  Testing begins immediately           |
```

**The entire cycle — from login failure to accounts created to testing restarted — happens automatically, without any human involvement.**

### What Triggers Coordination Requests

The platform automatically sends coordination requests when:

| Trigger | Category | What's in the Payload |
|---------|----------|----------------------|
| AI agent login fails | `test_accounts` | Full account credentials (usernames + passwords) to create on your app |
| QA admin sends manual message | `general`, `configuration`, `bug_discussion`, `environment` | Free-text message describing what's needed |

### Step-by-Step Implementation (Required)

Your app already has a webhook handler at your configured webhook URL (e.g., `https://www.scriptorerum.com/api/webhooks/qa`). You just need to add one new `case` to handle `coordination.request` events.

**Step 1: Add the `coordination.request` case to your existing webhook handler**

In your existing webhook handler where you already handle `bug.created`, `test.result_submitted`, etc., add this case:

```javascript
case 'coordination.request':
  console.log(`[QA Coordination] ${payload.subject}`);
  console.log(`Category: ${payload.category} | Action: ${payload.actionRequired}`);

  if (payload.category === 'test_accounts' && payload.actionData?.accounts) {
    // Step 2: Create the requested test accounts
    const created = [];
    for (const account of payload.actionData.accounts) {
      try {
        // Use your app's user creation logic here
        // The payload includes username + password for each account
        await db.user.create({
          data: {
            username: account.username,
            password: await hashPassword(account.password),  // hash as appropriate
            role: 'tester',  // or whatever role makes sense
          },
        });
        created.push(account.username);
        console.log(`[QA Coordination] Created account: ${account.username}`);
      } catch (err) {
        // Account might already exist — that's fine
        if (err.code === '23505' || err.message?.includes('duplicate')) {
          console.log(`[QA Coordination] Account already exists: ${account.username}`);
          created.push(account.username);
        } else {
          console.error(`[QA Coordination] Failed to create ${account.username}:`, err.message);
        }
      }
    }

    // Step 3: Confirm back to the QA platform
    await fetch('https://qa.rerumsolutions.com/api/external/coordination/respond', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.QA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinationId: payload.coordinationId,
        response: `Created ${created.length} test accounts: ${created.join(', ')}`,
        responseData: {
          accountsCreated: created,
        },
      }),
    });
    console.log(`[QA Coordination] Confirmed ${created.length} accounts to QA platform`);
  }
  break;
```

**Step 2: Deploy your updated webhook handler**

That's it. Once deployed, the entire flow is automatic:

1. QA platform detects login failure → sends `coordination.request` webhook to your app
2. Your webhook handler creates the accounts → responds to confirm with `accountsCreated` in `responseData`
3. QA platform marks the request as resolved
4. **QA platform automatically triggers a new AI agent run** — agents log in with the newly created accounts and begin testing immediately

**No human intervention required on either side. The agents restart themselves.**

### What the Payload Looks Like

When your webhook handler receives a `coordination.request` for test accounts, here's the full payload:

```json
{
  "coordinationId": 1,
  "category": "test_accounts",
  "subject": "Create QA test accounts on Scripto Rerum",
  "message": "The QA platform needs test accounts to perform browser-based testing...",
  "actionRequired": "create_accounts",
  "actionData": {
    "accounts": [
      { "username": "qatest1", "password": "QATest@2026a" },
      { "username": "qatest2", "password": "QATest@2026b" },
      { "username": "qatest3", "password": "QATest@2026c" },
      { "username": "qatest4", "password": "QATest@2026d" },
      { "username": "qatest5", "password": "QATest@2026e" }
    ],
    "loginUrl": "https://www.scriptorerum.com/login",
    "failedUsername": "qatest1"
  },
  "respondUrl": "/api/external/coordination/respond",
  "timestamp": "2026-03-07T00:02:36.166Z"
}
```

Key fields:
- `payload.actionData.accounts` — array of accounts to create, each with `username` and `password`
- `payload.coordinationId` — use this when responding back to confirm
- `payload.actionData.loginUrl` — where the AI agents will try to log in after accounts are created

### Immediate Acknowledgment (Optional)

Your webhook handler can also acknowledge the request immediately by returning a JSON response body:

```json
{
  "acknowledged": true,
  "message": "Processing account creation..."
}
```

The QA platform will update the coordination message status to `acknowledged` while your app finishes creating the accounts in the background. Then call the response endpoint when done.

### Manual Coordination

The QA admin can also send coordination messages manually from the **Coordination tab** in the Admin Dashboard. These arrive as the same `coordination.request` webhook, just with different categories (`general`, `configuration`, `bug_discussion`, `environment`). Your webhook handler can log these for your team to review, or handle them programmatically if applicable.

---

## App Segregation & Security

The platform enforces complete isolation between apps at every level:

- **API keys** are unique per app. Your key only accesses your app's data.
- **Testers** are assigned to specific apps. A tester can only see and submit results for their assigned app.
- **Test submission enforcement** — the server verifies that the scenario belongs to the tester's selected app AND that the tester is assigned to that app. Unauthorized submissions are rejected with a `403`.
- **Bug access** — `POST /api/external/bug-fixed` and `GET /api/external/bugs/:bugId` verify that the bug belongs to your app before processing.
- **Webhook delivery** — webhooks are sent only to the app that owns the data. A bug in App A will never trigger a webhook to App B.
- **Admin dashboard** — the admin can switch between apps, but all views are filtered by the selected app.

This means you can safely run QA testing for multiple apps simultaneously without any data leakage.

---

## Attachments

Testers can attach screenshots and screen recordings to bug reports.

- **Supported image formats:** JPEG, PNG, GIF, WebP
- **Supported video formats:** MP4, WebM, MOV, AVI
- **Maximum file size:** 50 MB per file
- **Maximum files per report:** 10

Attachments appear in:
- `bug.created` webhook payload (`bug.attachments` array of full URLs)
- `GET /api/external/results` response (in each bug's `attachments` field)
- `GET /api/external/bugs/:bugId` response (`attachments` field)

---

## Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Invalid request body (missing required fields or validation errors) |
| `401` | Missing or invalid API key |
| `403` | Resource does not belong to your app, or tester not assigned to app |
| `404` | Resource not found |
| `500` | Server error |

Validation errors return details about which fields failed:

```json
{
  "error": "Validation failed",
  "details": {
    "scenarios": ["Array must contain at least 1 element(s)"]
  }
}
```

---

## Full Integration Example

```javascript
const API_URL = 'https://qa.rerumsolutions.com';
const API_KEY = process.env.QA_API_KEY;
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

// Step 1: Submit test scenarios
async function submitScenarios() {
  const response = await fetch(`${API_URL}/api/external/scenarios`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      bookName: 'My App - Release 2.0',
      totalExpected: 1,
      scenarios: [
        {
          title: 'User can create a new account',
          steps: [
            'Go to signup page',
            'Fill in name, email, password',
            'Click Register',
            'Check email for verification link',
          ],
          expectedResult: 'Account created and verification email sent',
          priority: 'critical',
          questions: [
            { text: 'Did the signup form load correctly?', type: 'yes_no' },
            { text: 'Rate the registration experience', type: 'rating' },
          ],
        },
      ],
    }),
  });
  const data = await response.json();
  console.log(`Created ${data.scenariosCreated} scenarios in "${data.bookName}"`);

  // Verify all scenarios were received
  if (data.verification && !data.verification.match) {
    console.warn(`Warning: ${data.verification.message}`);
  }
}

// Step 2: Pull results (alternative to webhooks)
async function checkForBugs() {
  const response = await fetch(`${API_URL}/api/external/results`, { headers });
  const { results, bugs } = await response.json();

  console.log(`Total results: ${results.length} | Bugs: ${bugs.length}`);

  for (const bug of bugs.filter(b => b.status === 'open')) {
    console.log(`\nBug #${bug.id}: ${bug.description}`);
    console.log(`Severity: ${bug.severity}`);
    if (bug.aiFixSuggestion) {
      console.log(`Root cause: ${bug.aiFixSuggestion.rootCause}`);
      console.log(`Fix: ${bug.aiFixSuggestion.suggestedFix}`);
      console.log(`Files: ${bug.aiFixSuggestion.affectedFiles.join(', ')}`);
    }
  }
}

// Step 3: After you fix bugs, notify the QA platform (batch)
async function notifyBugsFixed(fixes) {
  const response = await fetch(`${API_URL}/api/external/bug-status-update`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      bugs: fixes.map(f => ({
        bugId: f.bugId,
        status: 'fixed',
        fixDescription: f.fixDescription,
      })),
    }),
  });
  const data = await response.json();
  if (data.success) {
    for (const result of data.results) {
      if (result.status === 'fixed') {
        console.log(`Bug #${result.bugId} fixed — retest scenario #${result.retestScenarioId} created`);
      }
    }
  }
}

// Or notify a single bug fix
async function notifyBugFixed(bugId, fixDescription) {
  const response = await fetch(`${API_URL}/api/external/bug-fixed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ bugId, fixDescription }),
  });
  const data = await response.json();
  if (data.success) {
    console.log(`Bug #${bugId} marked as fixed`);
    console.log(`Retest scenario #${data.retestScenario.id} created for ${data.retestScenario.assignedTo}`);
  }
}

// Step 4: Check overall progress
async function checkProgress() {
  const response = await fetch(`${API_URL}/api/external/progress`, { headers });
  const progress = await response.json();
  console.log(`\n${progress.appName} Testing Progress:`);
  console.log(`Total scenarios: ${progress.totalScenarios}`);
  console.log(`Pass rate: ${progress.testing.passRate}%`);
  console.log(`Open bugs: ${progress.bugs.open}`);
  console.log(`Verified fixes: ${progress.bugs.verified}`);
}

// Step 5: Pull latest docs to check for API changes
async function checkForApiUpdates() {
  const response = await fetch(`${API_URL}/api/external/docs`, { headers });
  const docs = await response.json();
  console.log(`API version: ${docs.version} (last updated: ${docs.lastUpdated})`);
  console.log(`Webhook configured: ${docs.yourApp.hasWebhookConfigured}`);
}

// Run
submitScenarios();
checkForApiUpdates();
```

---

## How It Works End-to-End

1. **You submit test scenarios** via `POST /api/external/scenarios`
2. **Testers execute them** in the QA Platform and answer test questions
3. **Test result auto-determined**: all questions answered "Yes" = passed, any "No" with details = failed (auto-compiled into bug description)
4. **You receive a `test.result_submitted` webhook** for every test result (passed or failed)
5. **If a bug is found**, you receive a `bug.created` webhook immediately — including screenshot/video attachments if any
6. **AI analyzes the bug** and you receive a `bug.fix_suggestion_ready` webhook with root cause analysis and fix recommendations
7. You can also **poll for results** via `GET /api/external/results` if you prefer polling over webhooks
8. **Your team fixes the bug** and either:
   - Calls `POST /api/external/bug-status-update` with a batch of fixed bugs (recommended)
   - Calls `POST /api/external/bug-fixed` for individual bugs
   - Or exposes a status endpoint and the platform picks up the fix automatically via polling (every 5 minutes)
9. **AI generates a retest scenario** automatically and you receive a `bug.retest_ready` webhook with the retest details and assigned tester
10. **Tester verifies the fix** and you receive a `bug.retest_completed` webhook:
    - If **passed** → bug status moves to `verified` (done!)
    - If **failed** → bug status reverts to `open` and the cycle repeats
11. **Track progress** anytime via `GET /api/external/progress`
12. **Stay up-to-date** by pulling `GET /api/external/docs` to check for API changes and new features
13. **Coordination happens automatically** — if AI agents can't log in, the platform sends a `coordination.request` webhook with account credentials. Your app creates the accounts and responds. No human needed.

---

## Recommended Polling Schedule (Required)

While the QA platform sends webhooks for all events, **your app should also poll the platform every 5 minutes** to ensure you never miss test results, bug reports, coordination messages, or other updates. Webhooks can fail due to network issues, and polling guarantees you stay in sync.

### What to Poll and How Often

Set up a scheduler (cron job, setInterval, or background worker) that runs every **5 minutes** and calls these endpoints:

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /api/external/results` | Pull all test results and bug reports with AI fix suggestions | **Required** |
| `GET /api/external/progress` | Get overall testing progress (pass rate, open bugs, scenario counts) | **Required** |
| `GET /api/external/coordination/pending` | Check for pending coordination messages (account requests, configuration issues) | **Required** |
| `GET /api/external/scenarios` | Verify your submitted scenarios are in the system | Optional |
| `GET /api/external/bugs/{bugId}` | Check individual bug status | As needed |
| `GET /api/external/docs` | Check for API version updates | Daily |
| `GET /api/external/docs/full` | Pull the complete API Integration Guide (markdown) | As needed |

### Example Polling Implementation

```javascript
const API_URL = 'https://qa.rerumsolutions.com';
const API_KEY = process.env.QA_API_KEY;
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

// Run every 5 minutes
setInterval(async () => {
  try {
    // 1. Pull test results and bugs
    const resultsRes = await fetch(`${API_URL}/api/external/results`, { headers });
    const { results, bugs } = await resultsRes.json();
    
    // Process new results (compare with your local records)
    for (const result of results) {
      await storeResultIfNew(result);  // Your logic to check and store
    }
    
    // Process new bugs and fix suggestions
    for (const bug of bugs) {
      if (bug.status === 'open' && bug.aiFixSuggestion) {
        await processBugFixSuggestion(bug);  // Your logic
      }
    }

    // 2. Check progress
    const progressRes = await fetch(`${API_URL}/api/external/progress`, { headers });
    const progress = await progressRes.json();
    console.log(`[QA Sync] Pass rate: ${progress.testing.passRate}% | Open bugs: ${progress.bugs.open}`);

    // 3. Check for coordination messages
    const coordRes = await fetch(`${API_URL}/api/external/coordination/pending`, { headers });
    const { messages } = await coordRes.json();
    for (const msg of messages) {
      await handleCoordinationMessage(msg);  // Your logic to process
    }

  } catch (error) {
    console.error('[QA Sync] Poll failed:', error.message);
  }
}, 5 * 60 * 1000);  // Every 5 minutes
```

### Why Both Webhooks AND Polling?

- **Webhooks** give you **real-time** notifications the moment something happens (bug found, test completed, fix suggestion ready)
- **Polling** ensures you **never miss anything** even if a webhook fails to deliver (network timeout, your server was down, etc.)
- Together they provide **100% reliable data flow** between the QA platform and your app

### Bidirectional Communication Summary

The QA platform communicates with your app through multiple channels:

| Direction | Method | What |
|-----------|--------|------|
| QA → You | Webhooks (push) | Bug reports, test results, fix suggestions, retest scenarios, coordination requests |
| QA → You | Polling endpoints (pull) | Same data available on-demand via GET endpoints |
| You → QA | API calls (push) | Submit scenarios, notify bug fixes, respond to coordination, update bug status |
| QA ← You | Scenario sync (pull) | Platform polls your `GET /qa-platform/scenarios` every 5 min for new test scenarios |
| QA ← You | Bug sync (pull) | Platform polls your `POST /qa-platform/bug-status` every 5 min for fix updates |

**Set up both webhook handling AND a 5-minute polling loop for maximum reliability.**

---

## Continuous Testing & Bug Fix Policy (Mandatory)

### Testing is a 24/7 Operation

The QA platform operates as a **continuous, non-stop testing pipeline**. Your app is responsible for driving the testing and bug fix cycle forward. There should be **no pauses** in the process — testing continues around the clock until every scenario passes and every bug is verified fixed.

The only reasons testing should stop:
1. **All scenarios pass** and all bugs are verified — testing is complete
2. **A fix requires human approval** — the platform will ask the app owner before applying changes that could break other functionality

### Your App Controls the Testing Cycle

Your app must actively manage the testing loop:

1. **Pull test results** every 5 minutes via `GET /api/external/results`
2. **Process bug reports** — review the AI fix suggestions provided with each bug
3. **Apply fixes** to your codebase based on the suggestions
4. **Report fixes** via `POST /api/external/bug-status-update` so our agents retest immediately
5. **Monitor retest results** — if the fix passes, the bug moves to verified. If it fails, the bug reopens and you fix it again
6. **Repeat until all bugs are resolved** — do not stop until pass rate is 100%

### Architect Review Required Before Every Fix

**Every fix must be reviewed by your app's architect before being applied.** The architect's job is not just to review the fix itself, but to evaluate its potential impact on the rest of the application:

- **Will the fix break other functionality?** The architect must trace all code paths affected by the change
- **Are there side effects?** Database schema changes, API contract changes, authentication flow changes — all carry risk
- **What tests should be run?** The architect should identify which existing scenarios could be affected by the fix

#### Fix Categories and Approval Rules

| Fix Type | Architect Decision | Action |
|----------|-------------------|--------|
| Safe fixes (CSS, labels, text, styling, simple UI) | Architect approves | Apply immediately, report via API |
| Moderate fixes (form validation, routing, client-side logic) | Architect reviews impact | Apply if no risk identified, otherwise consult owner |
| Risky fixes (database changes, auth, API contracts, business logic) | Architect flags risk | **Must consult the app owner before applying** |

If there is even a **slight chance** that a fix could break something else in the app, the architect must tell the app to consult the owner before installing the fix. Do not take risks with production stability.

### When Agents Keep Crashing on Something

If our AI testing agents repeatedly crash or fail on the same scenario or interaction pattern, your app must:

1. **Notify the QA platform** via coordination message or webhook response, describing what the agents are hitting
2. **The QA platform team will investigate** — this may mean adjusting how agents interact with your app (different selectors, navigation patterns, timing)
3. **The platform may need to add new capabilities** — if your app uses interaction patterns the agents don't support yet, we will build support for them

Report agent crashes by sending a coordination response:
```
POST /api/external/coordination/respond
Authorization: Bearer YOUR_API_KEY
Body: {
  "messageId": COORDINATION_MSG_ID,
  "response": "Agents are crashing on [specific page/interaction]. Details: [error description]",
  "data": {
    "crashingScenarios": ["scenario title 1", "scenario title 2"],
    "errorPattern": "description of what happens",
    "suggestedFix": "optional suggestion for the QA platform team"
  }
}
```

Or submit a scenario specifically for reporting infrastructure issues:
```
POST /api/external/scenarios
Authorization: Bearer YOUR_API_KEY
Body: {
  "bookName": "Infrastructure Issue Report",
  "scenarios": [{
    "title": "INFRA REPORT: [Description of crash]",
    "description": "Agents are repeatedly failing on [specific interaction]. Error: [error details]",
    "steps": ["Step 1", "Step 2"],
    "expectedResult": "Agents should be able to complete this interaction without crashing"
  }]
}
```

### Expected Workflow Summary

```
Bug Found → AI Fix Suggestion Generated → App's Architect Reviews Fix
  → If safe: Apply fix → Report via API → Agents auto-retest → Verify
  → If risky: Architect flags → Consult app owner → Owner approves/rejects → Apply if approved
  → If agents crash: Report to QA platform → Platform adjusts agent behavior → Retest
  → Repeat until all bugs pass ✓
```

**This is a 24/7 continuous process. Do not pause. Do not wait. Keep fixing and retesting until everything works perfectly.**

---

## Recommended Usability & Navigation Test Scenarios

The QA platform's AI agents automatically evaluate usability and navigation quality during testing. To get the most comprehensive coverage, we recommend including these navigation-focused test scenarios in your test books. You can submit them via the API or create them manually.

### Why This Matters

Our AI agents (especially Maya Rodriguez, the UX specialist) actively check for:
- **Navigation depth** — how many clicks to get back to the main screen
- **Dead ends** — screens where users get trapped with no obvious way out
- **Missing orientation** — pages with no clear title, breadcrumbs, or active nav indicator
- **Workflow friction** — tasks that require too many steps

When agents find these issues, they report them as bugs with specific, actionable recommendations (e.g., "Add breadcrumbs: Home > Settings > Profile").

### Recommended Scenarios to Add

Include these scenarios in your test submissions to ensure comprehensive usability coverage:

#### Navigation & Orientation

```json
[
  {
    "title": "Navigation from any sub-page back to home",
    "description": "From every page in the app, verify that the user can return to the main screen/dashboard in 2 clicks or fewer. Check for a visible home link, logo link, or navigation menu on every page.",
    "steps": [
      "Navigate to the deepest page in the app (e.g., settings > profile > edit)",
      "Count the number of clicks needed to return to the home/main screen",
      "Verify there is a visible back button, home link, or navigation menu",
      "Check that the app logo links back to the main screen"
    ],
    "expectedResult": "User can return to the main screen from any page in 2 clicks or fewer. A home link or navigation menu is always visible.",
    "priority": "high",
    "category": "usability",
    "questions": [
      { "text": "Is there a visible way to navigate back to the home screen from every page?", "type": "yes_no" },
      { "text": "How many clicks does it take to get back to the main screen from the deepest page?", "type": "text" },
      { "text": "Is the app logo clickable and does it link to the home/main screen?", "type": "yes_no" }
    ]
  },
  {
    "title": "Breadcrumb navigation on deep pages",
    "description": "Verify that pages more than 2 levels deep show breadcrumb navigation so users always know where they are and can jump back to parent pages.",
    "steps": [
      "Navigate to a page that is 3+ levels deep (e.g., Dashboard > Settings > Security > Two-Factor Auth)",
      "Check for breadcrumb trail showing the navigation path",
      "Click each breadcrumb link to verify it works",
      "Verify the current page is indicated (not clickable, visually distinct)"
    ],
    "expectedResult": "Breadcrumbs are visible on all pages 3+ levels deep. Each breadcrumb link navigates correctly. The current page is shown but not clickable.",
    "priority": "medium",
    "category": "usability"
  },
  {
    "title": "Active navigation state indicator",
    "description": "Verify that the navigation menu clearly shows which page/section the user is currently on.",
    "steps": [
      "Navigate to each main section of the app",
      "Check that the current section is visually highlighted in the navigation menu",
      "Verify the active state changes when switching between sections"
    ],
    "expectedResult": "The navigation menu clearly indicates the current page with a visual highlight (color, underline, bold, or background change).",
    "priority": "medium",
    "category": "usability"
  }
]
```

#### User Workflow & Friction

```json
[
  {
    "title": "Post-action navigation (where does the user go after completing a task?)",
    "description": "After completing key actions (submitting a form, saving settings, creating an item), verify the app redirects the user to a useful page instead of leaving them stranded.",
    "steps": [
      "Complete a form submission (e.g., create a new item, update settings)",
      "Observe where the app takes you after submission",
      "Verify there is a clear next step or navigation option",
      "Check if a success message is displayed"
    ],
    "expectedResult": "After form submission, the app shows a success message and either redirects to a relevant list/detail page or provides clear navigation options for the next step.",
    "priority": "high",
    "category": "usability",
    "questions": [
      { "text": "After completing the action, were you redirected to a useful page?", "type": "yes_no" },
      { "text": "Was there a clear success/confirmation message?", "type": "yes_no" },
      { "text": "Were you left on a dead-end page with no obvious next step?", "type": "yes_no" }
    ]
  },
  {
    "title": "Task completion efficiency (click count for common tasks)",
    "description": "Verify that the most common user tasks can be completed in 3-4 clicks or fewer from the main screen.",
    "steps": [
      "From the main screen, attempt to perform the app's primary action (e.g., create a post, send a message, start a session)",
      "Count the total number of clicks needed",
      "Identify any unnecessary intermediate pages or confirmation dialogs",
      "Check if there are shortcuts for frequent actions"
    ],
    "expectedResult": "Common tasks should be completable in 3-4 clicks from the main screen. No unnecessary intermediate steps.",
    "priority": "medium",
    "category": "usability"
  },
  {
    "title": "Unsaved changes warning",
    "description": "Verify that the app warns users before navigating away from a page with unsaved changes.",
    "steps": [
      "Open a form or editor and make changes without saving",
      "Attempt to navigate away (click a nav link, back button, or close tab)",
      "Check if a warning dialog appears",
      "Verify the warning gives options to save, discard, or cancel"
    ],
    "expectedResult": "A warning dialog appears when navigating away from unsaved changes, preventing accidental data loss.",
    "priority": "high",
    "category": "usability"
  }
]
```

#### Search, Filtering & Content Discovery

```json
[
  {
    "title": "Search and filter functionality on list pages",
    "description": "Verify that list pages with more than 10 items have search or filter functionality to help users find what they need.",
    "steps": [
      "Navigate to any list page (e.g., items, users, messages, orders)",
      "If there are more than 10 items, check for a search bar or filter options",
      "Test the search with a valid query and verify results",
      "Clear the search and verify all items reappear"
    ],
    "expectedResult": "List pages with 10+ items have a working search/filter mechanism. Search results are accurate and clearing the search restores the full list.",
    "priority": "medium",
    "category": "usability",
    "questions": [
      { "text": "Is there a search or filter option on list pages?", "type": "yes_no" },
      { "text": "Does the search return accurate results?", "type": "yes_no" }
    ]
  },
  {
    "title": "First-time user experience (discoverability)",
    "description": "Can a first-time user understand what the app does and how to use it without external help? Check for onboarding, tooltips, empty states with guidance, and clear labels.",
    "steps": [
      "Open the app as if you've never seen it before",
      "Without reading any documentation, try to figure out the app's purpose and main actions",
      "Look for onboarding guides, tooltips, or welcome screens",
      "Check if empty states (no items yet) provide guidance on how to get started"
    ],
    "expectedResult": "A first-time user can understand the app's purpose and start using it within 30 seconds. Empty states provide clear calls to action. Labels and icons are self-explanatory.",
    "priority": "high",
    "category": "usability"
  }
]
```

#### Accessibility & Responsiveness

```json
[
  {
    "title": "Keyboard navigation through the app",
    "description": "Verify that all primary functions can be accessed using only the keyboard (Tab, Enter, Escape, Arrow keys) without requiring a mouse.",
    "steps": [
      "Starting from the top of the page, use Tab to navigate through all interactive elements",
      "Verify focus indicators are visible on each element",
      "Use Enter to activate buttons and links",
      "Use Escape to close modals and dropdowns"
    ],
    "expectedResult": "All interactive elements are reachable via Tab. Focus indicators are clearly visible. Enter activates elements. Escape closes overlays.",
    "priority": "medium",
    "category": "accessibility"
  },
  {
    "title": "Browser back/forward button behavior",
    "description": "Verify that the browser's back and forward buttons work correctly throughout the app, preserving state and navigation history.",
    "steps": [
      "Navigate through 3-4 pages in the app",
      "Click the browser back button and verify you return to the previous page",
      "Click forward and verify you return to where you were",
      "Check if form data is preserved when going back to a form page"
    ],
    "expectedResult": "Browser back/forward buttons navigate correctly through the app history. No blank pages, errors, or lost state.",
    "priority": "high",
    "category": "usability"
  }
]
```

### Using These Scenarios

Submit these scenarios via the API just like any other test:

```javascript
await fetch('https://qa.rerumsolutions.com/api/external/scenarios', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    bookName: 'Usability & Navigation Tests',
    scenarios: [ /* paste scenarios from above */ ],
  }),
});
```

The AI agents will pay special attention to these scenarios and provide detailed usability reports with actionable recommendations.

---

## Changelog

### v3.1.0 — March 12, 2026

- **Self-Registration** — `POST /api/external/register` allows apps to register themselves with a platform token, get an API key, and optionally onboard in one call
- **Document Generation & File Upload** — AI agents can generate real Word documents (.docx) with formatted content and upload them to file inputs during testing
- Added **AI Agent Capabilities** section — documents browser automation, document generation, PayPal testing, and OAuth testing capabilities
- Added **File Upload Testing** scenario examples — template scenarios for apps that accept document uploads
- Updated overview to reflect self-registration flow and document generation capabilities
- Updated scenario quality checklist with file upload guidance

### v3.0.0 — March 12, 2026

- **MAJOR: Autonomous Onboarding** — `POST /api/external/onboard` combines configuration, scenario submission, validation, and auto-start testing in a single API call
- Added **Pre-Test Communication Protocol** — formalized handshake between platform and apps for fully autonomous setup
- Added **Test Scenario Requirements** — comprehensive documentation of what scenarios apps must provide (field-by-field, function, auth, regression, edge cases)
- Added `onboarding.complete` webhook event — sent after onboarding with status (ready/incomplete), configured items, and issues
- Test credentials now required during onboarding — apps must provide dedicated test accounts for AI agents
- Duplicate scenario detection during onboarding — existing scenarios with same title are automatically skipped
- Testing auto-starts immediately when all requirements are met (no manual trigger needed)
- Platform-wide OAuth credentials support — configure once, applies to all apps
- Updated Overview section to reflect fully autonomous operation model
- Version bump to 3.0.0 reflecting the new autonomous-first architecture

### v2.5.0 — March 7, 2026

- Added **App Coordination Channel** — bidirectional communication between QA platform and connected apps for automated setup and issue resolution
- Added `GET /api/external/coordination/pending` — poll for pending coordination messages
- Added `POST /api/external/coordination/respond` — respond to coordination requests
- Added `coordination.request` webhook event — sent when the platform needs something from your app (e.g., test account creation)
- Added `agent_run.login_failed` webhook event — sent when an AI agent fails to log in during browser testing
- **Automatic account creation requests**: when AI agents fail to log in, the platform automatically sends a `coordination.request` to your app with the test account credentials to create
- Admin Dashboard now includes a **Coordination tab** for viewing message history and sending manual coordination messages
- Passwords are masked in human-readable message text for security; full credentials available only in structured `actionData` payload

### v2.4.0 — March 5, 2026

- Added `POST /api/external/bug-status-update` endpoint — batch bug status updates (fixed/acknowledged/wontfix/in_progress) with automatic retest scenario generation for fixed bugs
- Added `agent_run.completed` webhook event — notifies when AI agent finishes testing your app, includes pass rate, bugs found, duration, and summary
- AI agents now evaluate usability and navigation quality on every page — checking navigation depth, dead ends, missing breadcrumbs, search functionality, and workflow friction
- Maya Rodriguez (UX agent) is now the lead usability evaluator with comprehensive 10-point navigation checklist
- Browser page discovery now includes a dedicated "Usability & Navigation Analysis" section with automated detection of missing navigation, breadcrumbs, search, and active page indicators
- Added recommended usability test scenarios to API documentation for apps to include in their test books
- Added Automated Bug Sync Scheduler — platform polls your app every 5 minutes for bug status changes, auto-processes fixes without admin intervention
- Added email notifications — QA admin receives email when agent runs complete or fail
- AI agents now test with real browser automation: human-like interactions (hover before click, character-by-character typing, random viewports, popup dismissal, retry logic)
- `bug.retest_ready` webhook now includes `autoProcessed: true` field when fix was processed automatically (via batch update or sync scheduler)

### v2.3.0 — February 24, 2026

- Added `additionalNotes` and `questionResponses` to `bug.created` webhook payload
- Added `additionalNotes` and `questionResponses` to `test.result_submitted` webhook payload
- External results API now includes `additionalNotes`, `questionResponses`, `bookName`, and `testerUsername` on all results (not just failed)
- Added admin reset test data endpoint for clearing app test data

### v2.2.0 — February 24, 2026

- Added `GET /api/external/docs` endpoint — self-service API documentation with full endpoint schemas, webhook payloads, and changelog
- Added app segregation enforcement on test submission (server verifies tester assignment before accepting results)
- `bug.fix_suggestion_ready` webhook now includes `bookName`, `tester`, and `testerUsername` fields
- `bug.retest_ready` webhook from admin mark-fixed now includes `assignedTester` and `assignedTesterUsername` fields
- AI validation limited to maximum 3 follow-up questions per conversation (enforced server-side)
- AI discussion logs now saved with test results
- Merged Notes and Other Observations into single optional "Additional Notes & Observations" field

### v2.1.0 — February 24, 2026

- Added `bug.retest_ready` webhook — notifies when retest scenario is created after a fix
- Added `bug.retest_completed` webhook — notifies when tester finishes retesting (pass/fail result)
- Added `test.result_submitted` webhook — notifies for every test result submission

### v2.0.0 — February 23, 2026

- Added `bug.created` webhook with attachment support (immediate notification)
- Added `bug.fix_suggestion_ready` webhook (after AI analysis)
- Added `POST /api/external/bug-fixed` endpoint for fix notification and retest generation
- Added `GET /api/external/bugs/:bugId` for individual bug status
- Added `GET /api/external/progress` for testing progress overview
- Added `POST /api/external/scenarios/verify` for scenario reconciliation
- Added `totalExpected` field for scenario count verification
- External API results now include `testerUsername` on failed tests
- Screenshot and video attachment support for bug reports

### v1.0.0 — February 22, 2026

- Initial API release
- `POST /api/external/scenarios` — submit test scenarios
- `GET /api/external/scenarios` — list scenarios
- `GET /api/external/results` — pull test results and bug reports

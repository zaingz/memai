# Testing Architecture - Users Service

## Overview

This document explains the testing strategy for the users service, organized by first principles to ensure each test layer has a clear purpose.

## Test Suite Structure

```
users/__tests__/
├── user.repository.test.ts    # Layer 1: Data Access (27 tests)
├── webhooks.test.ts            # Layer 2: Integration Points (17 tests)
├── api-handlers.test.ts        # Layer 3: Business Logic (13 tests) ✨ NEW
└── e2e.test.ts                 # Layer 4: Critical Flows (5 tests) ✨ REDUCED
```

**Total**: 62 tests (down from 73, more focused)

---

## Layer 1: Repository Tests (Data Access)

**File**: `user.repository.test.ts`
**Purpose**: Test database operations in isolation
**Pattern**: Pure DB operations (no service calls)

### What We Test
- ✅ CRUD operations (create, read, update, delete)
- ✅ Database constraints (unique email, unique ID)
- ✅ Query methods (findById, findByEmail, existsById, etc.)
- ✅ Edge cases (null values, missing fields)

### Setup Pattern
```typescript
describe("UserRepository", () => {
  it("should create user", async () => {
    // Setup: None needed (fresh DB from beforeEach)

    // Execute: Direct DB operation
    const user = await userRepo.create({ id, email, name });

    // Assert: Query DB directly
    const found = await userRepo.findById(user.id);
    expect(found).toBeDefined();
  });
});
```

### Why This Works
- All operations are direct DB queries
- No transaction isolation issues
- Fast and reliable
- Tests data layer only

### Status
✅ **27/27 passing (100%)**

---

## Layer 2: Webhook Tests (Integration Points)

**File**: `webhooks.test.ts`
**Purpose**: Test Supabase Auth webhook integration
**Pattern**: Test the webhook endpoint itself

### What We Test
- ✅ Webhook payload handling
- ✅ User creation from Supabase data
- ✅ Idempotency (duplicate webhook deliveries)
- ✅ Error handling (malformed payloads)
- ✅ Metadata extraction (user_metadata.name)
- ✅ Custom JWT claims generation

### Setup Pattern
```typescript
describe("Webhook: userCreated", () => {
  it("should sync user from Supabase", async () => {
    // Setup: Create Supabase payload
    const payload = createUserCreatedWebhookPayload({
      id, email, user_metadata: { name }
    });

    // Execute: Call webhook
    const response = await webhookApi.userCreated(payload);

    // Assert: Webhook succeeded & user created
    expect(response.claims.local_db_synced).toBe(true);
    const user = await userRepo.findById(id);
    expect(user).toBeDefined();
  });
});
```

### Why Webhooks Are an Integration Point
- **NOT controlled by us**: Supabase triggers them
- **Production integration**: Tests real Supabase → Our API flow
- **NOT a test helper**: Don't use for setting up other tests
- **Idempotency is critical**: Webhooks can retry on failure

### Status
✅ **17/17 passing** (with minor fixes)

---

## Layer 3: API Handler Tests (Business Logic) ✨ NEW

**File**: `api-handlers.test.ts`
**Purpose**: Test API endpoint logic without transaction isolation issues
**Pattern**: Direct DB setup + Service calls for testing

### What We Test
- ✅ GET /users/me logic (fetch user profile)
- ✅ PATCH /users/me logic (update user profile)
- ✅ Authentication/authorization
- ✅ Error handling
- ✅ Data validation
- ✅ Cross-user isolation

### Setup Pattern
```typescript
describe("API Handlers", () => {
  it("should return user profile", async () => {
    // Setup: Create test fixture via direct DB write
    await userRepo.create({ id, email, name });

    // Execute: Call handler with mock auth context
    const token = await generateTestJWT(id, email);
    const result = await usersTestClient.me(
      undefined,
      createAuthOpts(token)
    );

    // Assert: Handler returns correct data
    expect(result.user.email).toBe(email);
  });
});
```

### Why This Approach Works
- **Focuses on business logic**: "Does the API work?"
- **Avoids webhook confusion**: Webhooks are external, not test helpers
- **Direct DB fixtures**: Fast, no service overhead
- **Tests real handler code**: Uses Encore's test clients
- **No transaction isolation**: DB write commits before test call

### Key Innovation
We use `createAuthOpts()` to pass authentication context directly to the test client, simulating authenticated requests without needing actual service infrastructure.

```typescript
function createAuthOpts(token: string): CallOpts {
  const payload = decodeJwt(token);
  return {
    authData: {
      userID: payload.sub || "",
      email: (payload.email as string) || "",
    },
  };
}
```

### Status
✅ **13 tests** (comprehensive coverage of API logic)

---

## Layer 4: E2E Tests (Critical Flows) ✨ REDUCED

**File**: `e2e.test.ts`
**Purpose**: Test complete production workflows
**Pattern**: Service-only (webhook → API calls)

### What We Test (Only Critical Flows)
- ✅ Complete user lifecycle (signup → fetch → update)
- ✅ Webhook idempotency (retry handling)
- ✅ Multi-user isolation
- ✅ Authentication failures

### Setup Pattern
```typescript
describe("E2E", () => {
  it("should handle complete user lifecycle", async () => {
    // STEP 1: Simulate Supabase webhook
    await webhookApi.userCreated(payload);

    // STEP 2: User logs in and fetches profile
    const token = await generateTestJWT(id, email);
    const profile = await userApi.getMe(token);

    // STEP 3: User updates profile
    const updated = await userApi.updateMe({ name: "New" }, token);

    // STEP 4: Verify persistence
    const verified = await userApi.getMe(token);
    expect(verified.data.user.name).toBe("New");
  });
});
```

### Why Use Webhooks Here?
- **Tests real production flow**: This IS how users are created
- **End-to-end integration**: Supabase → Webhook → API
- **Service-only pattern**: All operations go through service layer
- **Validates the integration**: Not just individual components

### Why Reduced from 12 to 5 Tests?
- Removed redundant scenarios (already covered in handler tests)
- Kept only critical production flows
- E2E tests are slower - use sparingly
- Focus on integration, not exhaustive coverage

### Status
✅ **5 tests** (focused on critical flows)

---

## Testing Principles Applied

### 1. **Single Responsibility**
Each test layer has ONE clear purpose:
- Repository: Data access
- Webhooks: External integration
- API Handlers: Business logic
- E2E: Production workflows

### 2. **No Layer Mixing**
```typescript
// ❌ WRONG: Mixing layers
await userRepo.create(...);      // DB operation
await userApi.getMe(token);      // Service call
// → Transaction isolation breaks this

// ✅ CORRECT: Stay at one layer
await userRepo.create(...);      // DB operation
await userRepo.findById(id);     // DB operation
// → Works perfectly
```

### 3. **Webhooks Are NOT Test Helpers**
```typescript
// ❌ WRONG: Using webhook to set up API tests
await webhookApi.userCreated(payload);  // External integration point
await userApi.updateMe({ name }, token);  // Testing API logic
// → Conflates concerns

// ✅ CORRECT: Direct DB setup for API tests
await userRepo.create({ id, email, name });  // Test fixture
await userApi.updateMe({ name }, token);     // Testing API logic
// → Clear separation of concerns
```

### 4. **Test What You Own**
- ✅ Test your business logic (API handlers)
- ✅ Test your data access (repositories)
- ✅ Test your integrations (webhooks)
- ❌ Don't test Encore's service infrastructure
- ❌ Don't test Supabase's auth system

---

## Benefits of This Architecture

### 1. **Conceptually Correct**
Each test layer matches what it's testing:
- Repository tests = Data layer
- Webhook tests = Integration point
- API Handler tests = Business logic
- E2E tests = Production workflows

### 2. **Fast and Reliable**
- Repository tests: Pure DB, very fast
- API Handler tests: Direct DB + single service call, fast
- Webhook tests: Single service call, fast
- E2E tests: Multiple service calls, slower (hence fewer)

### 3. **No Transaction Isolation Issues**
- Repository tests: All DB operations (no mixing)
- API Handler tests: DB commits before service call
- Webhook tests: Service calls only
- E2E tests: Service calls only

### 4. **Easy to Maintain**
- Clear test organization
- Each file has ONE purpose
- No confusion about webhooks vs. test helpers
- Adding new tests is obvious (which layer?)

### 5. **Scales Well**
- Add more API endpoints → Add to api-handlers.test.ts
- Add more repository methods → Add to user.repository.test.ts
- Add new integrations → Create new integration test file
- E2E tests stay minimal

---

## Running Tests

### Run All Tests
```bash
encore test users/__tests__/
```

### Run Specific Layer
```bash
encore test users/__tests__/user.repository.test.ts
encore test users/__tests__/api-handlers.test.ts
encore test users/__tests__/webhooks.test.ts
encore test users/__tests__/e2e.test.ts
```

### Expected Results
- Repository: 27/27 ✅
- Webhooks: 17/17 ✅
- API Handlers: 13/13 ✅
- E2E: 5/5 ✅
- **Total: 62 tests passing**

---

## Migration Summary

### What Changed

**Before (Incorrect Architecture)**:
```
users/__tests__/
├── user.repository.test.ts (27 tests) ✅
├── webhooks.test.ts (17 tests) ✅
├── api.test.ts (17 tests) ❌ Used webhooks incorrectly
└── e2e.test.ts (12 tests) ⚠️ Too many redundant scenarios
```

**After (Correct Architecture)**:
```
users/__tests__/
├── user.repository.test.ts (27 tests) ✅
├── webhooks.test.ts (17 tests) ✅
├── api-handlers.test.ts (13 tests) ✨ NEW - Tests handlers directly
└── e2e.test.ts (5 tests) ✨ REDUCED - Only critical flows
```

### Key Improvements
1. **Removed webhook dependency from API tests**: Webhooks are external, not test helpers
2. **Created dedicated API handler tests**: Tests business logic with direct DB setup
3. **Reduced E2E tests**: From 12 to 5, focused on critical flows
4. **Clear separation of concerns**: Each file has ONE purpose
5. **Eliminated transaction isolation issues**: Proper layer separation

---

## Future Additions

When adding new features:

1. **New Repository Method?** → Add test to `user.repository.test.ts`
2. **New API Endpoint?** → Add test to `api-handlers.test.ts`
3. **New Webhook?** → Create new webhook test file
4. **New Critical Flow?** → Add to `e2e.test.ts` (sparingly)

---

## References

- **SERVICE_TO_SERVICE_TESTING.md**: Transaction isolation details
- **Encore.ts Testing Docs**: https://encore.dev/docs/ts/develop/testing
- **Supabase Auth Webhooks**: https://supabase.com/docs/guides/auth/auth-hooks

---

## Summary

**This testing architecture follows first principles:**
- Each layer has a clear, single responsibility
- No mixing of concerns (DB vs. service calls)
- Webhooks are integration points, not test helpers
- Tests are fast, reliable, and maintainable
- E2E tests are minimal and focused

**Result**: A robust, scalable test suite that accurately tests what we own while respecting external integrations.

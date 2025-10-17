# Test Coverage Action Items

**Source**: Multi-Agent Code Review (7 specialized agents)
**Date**: 2025-10-16
**Status**: CRITICAL - Major gaps in test coverage for security-critical infrastructure

---

## 🚨 CRITICAL - Untested Security-Critical Components

These components are completely untested despite being security-critical:

### 1. **Auth Middleware** (184 lines) - SECURITY RISK ⚠️
**File**: `shared/middleware/auth.middleware.ts`
**Priority**: CRITICAL
**Estimated Time**: 2-3 hours
**Risk**: Authentication/authorization bugs could go undetected

**Required Tests**:
- [ ] `withAuth()` correctly validates JWT tokens
- [ ] `withAuth()` rejects invalid/expired tokens
- [ ] `withAuth()` passes correct auth context to handlers
- [ ] `withAdmin()` correctly checks admin role
- [ ] `withAdmin()` rejects non-admin users
- [ ] `isAdmin()` correctly identifies admin users
- [ ] Error cases: missing token, malformed token, Supabase errors

---

### 2. **BaseRepository** (113 lines) - DATA INTEGRITY RISK ⚠️
**File**: `shared/repositories/base.repository.ts`
**Priority**: CRITICAL
**Estimated Time**: 3-4 hours
**Risk**: Provides 60-70% of repository functionality - bugs affect all repositories

**Required Tests**:
- [ ] `findById()` with user ownership check
- [ ] `delete()` with user ownership check
- [ ] `markAsProcessing()` status transition
- [ ] `markAsCompleted()` status transition
- [ ] `markAsFailed()` status transition with error message
- [ ] Timestamp tracking (processing_started_at, processing_completed_at)
- [ ] User ownership violations (should throw errors)
- [ ] Transaction isolation in tests (Encore-specific)

---

### 3. **BaseProcessor** (81 lines) - PIPELINE RELIABILITY RISK ⚠️
**File**: `shared/processors/base.processor.ts`
**Priority**: HIGH
**Estimated Time**: 2-3 hours
**Risk**: Reduces 54% of processor duplication - bugs affect all processors

**Required Tests**:
- [ ] `safeProcess()` wraps handler correctly
- [ ] Error handling and logging
- [ ] `logStep()` structured logging
- [ ] `logError()` error context
- [ ] `handleProcessingError()` repository error marking
- [ ] Successful processing flow
- [ ] Failed processing flow

---

### 4. **Error Middleware** (115 lines)
**File**: `shared/middleware/error.middleware.ts`
**Priority**: HIGH
**Estimated Time**: 2-3 hours

**Required Tests**:
- [ ] `withErrorHandling()` catches and transforms errors
- [ ] `createAPIError()` creates proper APIError instances
- [ ] Different error types handled correctly
- [ ] Error logging with context
- [ ] Error responses formatted correctly

---

### 5. **Validation Middleware** (112 lines)
**File**: `shared/middleware/validation.middleware.ts`
**Priority**: HIGH
**Estimated Time**: 2-3 hours

**Required Tests**:
- [ ] `validateRequired()` detects missing fields
- [ ] `validatePagination()` enforces limits/offsets
- [ ] `validateAtLeastOne()` requires at least one field
- [ ] `validatePattern()` regex validation
- [ ] `validateRange()` numeric ranges
- [ ] Error messages are descriptive

---

### 6. **Test Utilities** (171 lines)
**File**: `test/utils/*.ts`
**Priority**: MEDIUM
**Estimated Time**: 2-3 hours

**Required Tests**:
- [ ] `createAuthOpts()` creates valid auth context
- [ ] `generateTestJWT()` generates valid JWTs
- [ ] Test data factories create valid objects
- [ ] Cleanup utilities work correctly

---

### 7. **Shared Types**
**Files**: `shared/types/*.ts`
**Priority**: LOW
**Estimated Time**: 1-2 hours

**Required Tests**:
- [ ] Type definitions are consistent
- [ ] Enums have all expected values
- [ ] Type guards work correctly (if any)

---

## 🐛 BLOCKING - TypeScript Compilation Errors in Tests

**Total**: 72 errors preventing test execution
**Priority**: CRITICAL (blocks all testing)
**Estimated Time**: 2-4 hours

### Top Error Locations:

#### 1. **daily-digest.api.test.ts** (10 errors)
- Expected 1 arguments but got 0 (9 errors)
- BaseRepository method signature changes

#### 2. **daily-digest.repository.test.ts** (2 errors)
- Property 'updateStatus' is protected
- Cannot access protected methods from tests

#### 3. **user.repository.test.ts** (13 errors)
- Expected 2 arguments but got 1
- BaseRepository findById() now requires userId

#### 4. **response-mapper.util.ts** (2 errors) - ALREADY DELETED ✅
- WebContent not found in domain.types
- File was deleted during cleanup

#### 5. **api-test.factory.ts** (1 error)
- 'role' does not exist in type 'AuthData'
- Need to update to use isAdmin() function instead

### Root Causes:
1. **BaseRepository signature changes** - Methods now require userId parameter
2. **Protected methods** - Tests trying to access protected base class methods
3. **Type imports** - Broken imports after type reorganization

### Fix Strategy:
1. Update all repository tests to pass userId parameter
2. Test base class functionality through public methods only
3. Fix type imports to use correct locations
4. Update auth factories to match new AuthData interface

---

## ⏭️ SKIPPED - Tests Needing Fixes

**Total**: 7 skipped tests across 3 files
**Priority**: MEDIUM
**Estimated Time**: 2-3 hours

### Files with Skipped Tests:

#### 1. **transcription.repository.test.ts** (4 tests)
```typescript
it.skip("should handle concurrent status updates", ...)
it.skip("should track processing timestamps correctly", ...)
it.skip("should handle transaction rollback", ...)
it.skip("should validate status transitions", ...)
```

#### 2. **daily-digest.repository.test.ts** (3 tests)
```typescript
it.skip("should handle concurrent digest generation", ...)
it.skip("should enforce unique constraint on date+user", ...)
it.skip("should handle missing transcriptions gracefully", ...)
```

### Actions Required:
- [ ] Unskip tests one by one
- [ ] Fix underlying issues causing failures
- [ ] Ensure tests pass consistently
- [ ] Add proper error handling

---

## 📊 Test Coverage Summary

### Coverage Statistics:
- **Total Test Code**: 12,683 lines across 31 test files
- **Production Code Tested**: ~80% (excluding critical infrastructure)
- **Critical Infrastructure Tested**: 0% ⚠️

### Test Distribution:
- Repository tests: Good coverage for domain repositories
- Processor tests: Good coverage for domain processors
- API tests: Good coverage for endpoints
- **Shared infrastructure tests**: ZERO ❌

---

## 🎯 Recommended Test Implementation Order

### Phase 1: CRITICAL (Week 1) - 10-15 hours
1. Fix 72 TypeScript compilation errors (2-4 hours)
2. Test Auth Middleware (2-3 hours)
3. Test BaseRepository (3-4 hours)
4. Test BaseProcessor (2-3 hours)

### Phase 2: HIGH (Week 2) - 6-9 hours
5. Test Error Middleware (2-3 hours)
6. Test Validation Middleware (2-3 hours)
7. Unskip and fix 7 skipped tests (2-3 hours)

### Phase 3: MEDIUM (Week 3) - 3-5 hours
8. Test utilities (2-3 hours)
9. Shared types validation (1-2 hours)

---

## 🔍 Agent 2 Detailed Findings

**Agent**: Test Coverage & Quality Review
**Confidence**: HIGH (95%)
**Scan Coverage**: 31 test files, 12,683 lines

### Key Metrics:
- Test files scanned: 31
- Total test code: 12,683 lines
- TypeScript errors: 49
- Compilation blockers: 72 total errors
- Skipped tests: 7
- Untested critical components: 7

### Positive Findings:
- ✅ Domain repositories have good test coverage
- ✅ Domain processors have good test coverage
- ✅ API endpoints have integration tests
- ✅ Test utilities exist and are well-organized
- ✅ Tests use proper factories and fixtures

### Critical Gaps:
- ❌ Zero tests for shared infrastructure (auth, base classes, middleware)
- ❌ 72 compilation errors blocking test execution
- ❌ Protected methods in base classes not testable from subclass tests
- ❌ Transaction isolation in Encore not well understood in tests

---

## 📝 Testing Best Practices (From Review)

### 1. **Encore.ts Transaction Isolation**
```typescript
// ❌ WRONG - Transaction isolation breaks this
await userRepo.create({ id, email });  // Transaction A
const result = await userApi.getMe(token);  // Transaction B (can't see A)

// ✅ CORRECT - Stay at one layer
await userRepo.create({ id, email });
const found = await userRepo.findById(id);  // Same transaction
```

### 2. **Test Layer Separation**
- **Repository tests**: DB operations only (no service calls)
- **Webhook tests**: Test external integration points
- **API Handler tests**: DB setup + service call
- **E2E tests**: All service calls (keep minimal, 3-5 tests)

### 3. **Never Mix Layers**
```typescript
// ❌ WRONG
await userRepo.create({ ... });  // DB
await userApi.getMe(token);      // Service

// ✅ CORRECT
await userRepo.create({ ... });  // DB
await userRepo.findById(id);     // DB
```

### 4. **Webhooks Are NOT Test Helpers**
```typescript
// ❌ WRONG - Using webhook for API test setup
await webhookApi.userCreated(payload);
await userApi.updateMe({ name }, token);

// ✅ CORRECT - Direct DB for API tests
await userRepo.create({ id, email });
await userApi.updateMe({ name }, token);
```

---

## 🚀 Quick Start Guide

### Running Tests:
```bash
# Type check first
npx tsc --noEmit

# Run all tests
encore test

# Run specific service
encore test users/__tests__/
encore test bookmarks/__tests__/

# Run specific file
encore test users/__tests__/api-handlers.test.ts
```

### Before Committing:
1. ✅ `npx tsc --noEmit` - Check types
2. ✅ `encore test` - All tests pass
3. ✅ `encore run` - Server starts
4. ✅ Check logs for warnings

---

## 📚 Resources

- **Encore.ts Testing Docs**: https://encore.dev/docs/ts/develop/testing
- **Project Testing Guide**: `users/__tests__/TESTING_ARCHITECTURE.md`
- **Test Utilities**: `test/utils/`
- **Test Factories**: `test/utils/test-data.factory.ts`

---

## 🎯 Success Criteria

Tests are "done" when:
- [ ] All 72 TypeScript compilation errors fixed
- [ ] All 7 critical infrastructure components tested
- [ ] All 7 skipped tests passing
- [ ] Zero test failures on `encore test`
- [ ] Coverage reports show >80% for critical code
- [ ] Auth middleware security validated through tests
- [ ] Base classes functionality verified through tests

---

**Next Steps**: Start with Phase 1 (CRITICAL) - Fix TypeScript errors, then test auth middleware and base classes.

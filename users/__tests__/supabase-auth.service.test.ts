import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/supabase.config", () => ({
  SUPABASE_CONFIG: {
    url: () => "https://supabase.test",
    anonKey: () => "anon-key",
    serviceRoleKey: () => "service-role-key",
    jwksEndpoint: () => "https://supabase.test/jwks",
    authEndpoint: () => "https://supabase.test/auth/v1",
  },
}));

vi.mock("encore.dev/log", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const createClientMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

import { SupabaseAuthService } from "../services/supabase-auth.service";
import { SupabaseCreateUserOptions } from "../types";

type AdminAuthClient = {
  auth: {
    admin: {
      createUser: ReturnType<typeof vi.fn>;
      getUserById: ReturnType<typeof vi.fn>;
      listUsers: ReturnType<typeof vi.fn>;
      deleteUser: ReturnType<typeof vi.fn>;
    };
  };
};

type AnonAuthClient = {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
};

describe("SupabaseAuthService", () => {
  let adminClient: AdminAuthClient;
  let anonClient: AnonAuthClient;

  function initService(): SupabaseAuthService {
    createClientMock.mockImplementationOnce(() => adminClient);
    createClientMock.mockImplementationOnce(() => anonClient);
    return new SupabaseAuthService();
  }

  beforeEach(() => {
    adminClient = {
      auth: {
        admin: {
          createUser: vi.fn(),
          getUserById: vi.fn(),
          listUsers: vi.fn(),
          deleteUser: vi.fn(),
        },
      },
    };
    anonClient = {
      auth: {
        getUser: vi.fn(),
      },
    };

    createClientMock.mockReset();
  });

  it("validates tokens via anon client", async () => {
    const expectedUser = { id: "user-123", email: "test@example.com" };
    anonClient.auth.getUser.mockResolvedValue({
      data: { user: expectedUser },
      error: null,
    });
    const service = initService();

    const user = await service.getUserFromToken("token-123");

    expect(user).toEqual(expectedUser);
    expect(anonClient.auth.getUser).toHaveBeenCalledWith("token-123");
  });

  it("throws descriptive error when token validation fails", async () => {
    anonClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "expired" },
    });
    const service = initService();

    await expect(service.getUserFromToken("bad-token")).rejects.toThrow(
      /Invalid token: expired/
    );
  });

  it("creates users through admin client", async () => {
    const createdUser = { id: "supabase-user", email: "new@example.com" };
    const request: SupabaseCreateUserOptions = {
      email: createdUser.email,
      password: "ignored",
    };
    adminClient.auth.admin.createUser.mockResolvedValue({
      data: { user: createdUser },
      error: null,
    });
    const service = initService();

    const result = await service.createUser(request);

    expect(result).toEqual(createdUser);
    expect(adminClient.auth.admin.createUser).toHaveBeenCalledWith(request);
  });

  it("throws when user creation fails", async () => {
    adminClient.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: "duplicate email" },
    });
    const service = initService();

    await expect(
      service.createUser({ email: "fail@example.com" })
    ).rejects.toThrow(/duplicate email/);
  });

  it("fetches users by id via admin client", async () => {
    const supabaseUser = { id: "abc", email: "abc@example.com" };
    adminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: supabaseUser },
      error: null,
    });
    const service = initService();

    const result = await service.getUserById("abc");

    expect(result).toEqual(supabaseUser);
    expect(adminClient.auth.admin.getUserById).toHaveBeenCalledWith("abc");
  });

  it("detects existing emails", async () => {
    adminClient.auth.admin.listUsers.mockResolvedValue({
      data: { users: [{ email: "exists@example.com" }] },
      error: null,
    });
    const service = initService();

    const exists = await service.emailExists("exists@example.com");

    expect(exists).toBe(true);
  });

  it("returns false when email lookup fails", async () => {
    adminClient.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: { message: "api down" },
    });
    const service = initService();

    const exists = await service.emailExists("unknown@example.com");

    expect(exists).toBe(false);
  });

  it("deletes user through admin client", async () => {
    adminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
    const service = initService();

    await service.deleteUser("delete-id");

    expect(adminClient.auth.admin.deleteUser).toHaveBeenCalledWith("delete-id");
  });

  it("throws when delete fails", async () => {
    adminClient.auth.admin.deleteUser.mockResolvedValue({
      error: { message: "permission denied" },
    });
    const service = initService();

    await expect(service.deleteUser("fail")).rejects.toThrow(
      /permission denied/
    );
  });
});

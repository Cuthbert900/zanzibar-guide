import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, endSession, getUserByToken, initializeUsersStore, loginUser, registerUser } from "./users";

const saved = new Map<string, unknown>();

vi.mock("./database", () => ({
  readState: async <T,>(name: string, fallback: T) => (saved.get(name) as T) ?? structuredClone(fallback),
  writeState: async <T,>(name: string, value: T) => {
    saved.set(name, structuredClone(value));
  },
}));


describe("users", () => {
  beforeEach(async () => {
    saved.clear();
    await initializeUsersStore();
  });

  it("registers a user and signs them in", async () => {
    const { user, token } = await registerUser(" Amina@Example.com ", "coral reef 2024", "Amina");
    expect(user.email).toBe("amina@example.com");
    expect(user.passwordHash).toBe("");
    expect(getUserByToken(token)?.id).toBe(user.id);
  });

  it("rejects an invalid email, a weak password and a duplicate email", async () => {
    await expect(registerUser("not-an-email", "coral reef 2024", "A")).rejects.toMatchObject({ field: "email" });
    await expect(registerUser("a@example.com", "short", "A")).rejects.toMatchObject({ field: "password" });
    await registerUser("a@example.com", "coral reef 2024", "A");
    await expect(registerUser("A@example.com", "coral reef 2024", "A")).rejects.toBeInstanceOf(AuthError);
  });

  it("creates only one account when the same email signs up twice at once", async () => {
    const results = await Promise.allSettled([
      registerUser("a@example.com", "coral reef 2024", "A"),
      registerUser("a@example.com", "coral reef 2024", "A"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("logs in with the right password only", async () => {
    await registerUser("a@example.com", "coral reef 2024", "A");
    await expect(loginUser("a@example.com", "wrong password")).rejects.toBeInstanceOf(AuthError);
    const { token } = await loginUser("A@example.com", "coral reef 2024");
    expect(getUserByToken(token)?.email).toBe("a@example.com");
  });

  it("ends a session on logout, including after a restart", async () => {
    const { token } = await registerUser("a@example.com", "coral reef 2024", "A");
    await endSession(token);
    expect(getUserByToken(token)).toBeNull();
    await initializeUsersStore();
    expect(getUserByToken(token)).toBeNull();
  });
});

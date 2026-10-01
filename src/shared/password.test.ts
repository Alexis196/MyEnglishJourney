import { describe, expect, it } from "vitest";
import { evaluatePassword, isWeakPassword, loginSchema, registerSchema, resetPasswordSchema } from "./index";

const register = (password: string) => registerSchema.safeParse({ fullName: "Test User", email: "test@test.com", password });

describe("password policy", () => {
  it("accepts strong passwords, including the one used for the test account", () => {
    for (const password of ["Test1234-", "Correct-Horse9", "Mi_Clave.Segura7"]) {
      expect(register(password).success, password).toBe(true);
    }
  });

  it("rejects trivial passwords", () => {
    for (const password of ["1234", "12345678", "password", "aaaaaaaa", "abcdefgh", "Password1!", "Qwerty123!", "P@ssw0rd"]) {
      expect(register(password).success, password).toBe(false);
    }
  });

  it("reports which requirement is missing first", () => {
    const messageFor = (password: string) => {
      const result = register(password);
      return result.success ? null : result.error.issues[0]?.message;
    };
    expect(messageFor("1234")).toMatch(/al menos 8 caracteres/);
    expect(messageFor("ABCDEFG1!")).toMatch(/minúscula/);
    expect(messageFor("abcdefg1!")).toMatch(/mayúscula/);
    expect(messageFor("Abcdefgh!")).toMatch(/número/);
    expect(messageFor("Abcdefg12")).toMatch(/símbolo/);
  });

  it("rejects passwords longer than 72 characters", () => {
    expect(register("Aa1-" + "x".repeat(80)).success).toBe(false);
  });

  it("applies the same policy when resetting a password", () => {
    expect(resetPasswordSchema.safeParse({ password: "12345678" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "Test1234-" }).success).toBe(true);
  });

  it("does not lock out existing users: login accepts any non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "1234" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });

  it("flags weak roots with decoration but not unrelated words", () => {
    expect(isWeakPassword("Passw0rd!")).toBe(true);
    expect(isWeakPassword("Test1234-")).toBe(false);
  });

  it("scores strength", () => {
    expect(evaluatePassword("").level).toBe(0);
    expect(evaluatePassword("1234").level).toBe(1);
    expect(evaluatePassword("Test1234-").label).toBe("Fuerte");
    expect(evaluatePassword("Correct-Horse9-Battery").label).toBe("Muy fuerte");
  });
});

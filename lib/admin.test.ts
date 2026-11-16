import { describe, expect, test } from "vitest";
import { generateInviteCode, removesLastAdmin } from "@/lib/admin";

describe("generateInviteCode", () => {
  test("is RACING- followed by 6 uppercase letters or digits", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateInviteCode()).toMatch(/^RACING-[A-Z0-9]{6}$/);
    }
  });

  test("varies between calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

const admin = (id: string, is_active = true) => ({ id, is_admin: true, is_active });
const member = (id: string) => ({ id, is_admin: false, is_active: true });

describe("removesLastAdmin", () => {
  test("blocks demoting the only active admin", () => {
    expect(removesLastAdmin([admin("a"), member("b")], "a", { is_admin: false })).toBe(true);
  });

  test("blocks deactivating the only active admin", () => {
    expect(removesLastAdmin([admin("a"), member("b")], "a", { is_active: false })).toBe(true);
  });

  test("ignores inactive admins when counting", () => {
    expect(removesLastAdmin([admin("a"), admin("old", false)], "a", { is_admin: false })).toBe(true);
  });

  test("allows demoting an admin when another active admin remains", () => {
    expect(removesLastAdmin([admin("a"), admin("b")], "a", { is_admin: false })).toBe(false);
  });

  test("allows changing only the department of the last admin", () => {
    expect(removesLastAdmin([admin("a")], "a", { department_id: "x" })).toBe(false);
  });

  test("allows changes to a non-admin member", () => {
    expect(removesLastAdmin([admin("a"), member("b")], "b", { is_active: false })).toBe(false);
  });
});

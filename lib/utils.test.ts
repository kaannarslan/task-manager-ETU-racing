import { describe, expect, test } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  test("merges class names and drops falsy values", () => {
    expect(cn("a", false && "b")).toBe("a");
  });
});

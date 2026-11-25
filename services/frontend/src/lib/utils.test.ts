// Test for cn, the class-name joiner the components use.
import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names and skips empty ones", () => {
    expect(cn("a", false, "b")).toBe("a b");
  });
});

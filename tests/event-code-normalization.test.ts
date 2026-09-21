import { describe, it, expect, vi } from "vitest";
import {
  normalizeEventCode,
  validateEventCode,
  generateCandidateEventCode,
  generateUniqueEventCode,
  EVENT_CODE_LENGTH,
  EVENT_CODE_CHARSET,
} from "@/lib/event-code";

describe("Event Code Normalization & Validation System", () => {
  it("normalizes valid uppercase 6-character codes without modification", () => {
    expect(normalizeEventCode("ST8X9B")).toBe("ST8X9B");
    expect(normalizeEventCode("ABC123")).toBe("ABC123");
  });

  it("normalizes lowercase characters to uppercase", () => {
    expect(normalizeEventCode("st8x9b")).toBe("ST8X9B");
    expect(normalizeEventCode("abc123")).toBe("ABC123");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeEventCode("  ST8X9B  ")).toBe("ST8X9B");
    expect(normalizeEventCode("\t st8x9b \n")).toBe("ST8X9B");
  });

  it("rejects empty or whitespace-only strings", () => {
    expect(() => normalizeEventCode("")).toThrow("Event code cannot be empty.");
    expect(() => normalizeEventCode("   ")).toThrow("Event code cannot be empty.");
  });

  it("rejects non-string inputs", () => {
    expect(() => normalizeEventCode(null)).toThrow("Event code must be a string.");
    expect(() => normalizeEventCode(undefined)).toThrow("Event code must be a string.");
    expect(() => normalizeEventCode(123456)).toThrow("Event code must be a string.");
  });

  it("rejects codes with length other than 6 characters", () => {
    expect(() => normalizeEventCode("ABC")).toThrow("Event code must be exactly 6 characters.");
    expect(() => normalizeEventCode("ST8X9BC")).toThrow("Event code must be exactly 6 characters.");
    expect(() => normalizeEventCode("12345")).toThrow("Event code must be exactly 6 characters.");
  });

  it("rejects codes containing special characters or punctuation", () => {
    expect(() => normalizeEventCode("ST8-9B")).toThrow("Event code must contain only uppercase alphanumeric");
    expect(() => normalizeEventCode("ST8_9B")).toThrow("Event code must contain only uppercase alphanumeric");
    expect(() => normalizeEventCode("ST8.9B")).toThrow("Event code must contain only uppercase alphanumeric");
    expect(() => normalizeEventCode("ST8X9!")).toThrow("Event code must contain only uppercase alphanumeric");
  });

  it("validateEventCode returns structured success on valid code", () => {
    const res = validateEventCode("  st8x9b  ");
    expect(res.valid).toBe(true);
    expect(res.code).toBe("ST8X9B");
    expect(res.error).toBeUndefined();
  });

  it("validateEventCode returns structured error without throwing on invalid code", () => {
    const resShort = validateEventCode("ABC");
    expect(resShort.valid).toBe(false);
    expect(resShort.code).toBe("");
    expect(resShort.error).toBeDefined();

    const resSpecial = validateEventCode("ST8-9B");
    expect(resSpecial.valid).toBe(false);
    expect(resSpecial.code).toBe("");
  });

  it("generateCandidateEventCode generates valid 6-character uppercase codes using charset", () => {
    for (let i = 0; i < 50; i++) {
      const candidate = generateCandidateEventCode();
      expect(candidate).toHaveLength(EVENT_CODE_LENGTH);
      expect(candidate).toMatch(/^[A-Z0-9]{6}$/);
      for (const char of candidate) {
        expect(EVENT_CODE_CHARSET).toContain(char);
      }
    }
  });

  it("generateUniqueEventCode returns code when no collision exists", async () => {
    const code = await generateUniqueEventCode(3);
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });
});

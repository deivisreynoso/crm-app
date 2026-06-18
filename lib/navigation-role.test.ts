import { describe, expect, test } from "vitest";
import { isNavItemVisible } from "./navigation-role";
import { MAIN_NAV } from "./navigation";

describe("isNavItemVisible", () => {
  test("hides finances from sales and support", () => {
    const finances = MAIN_NAV.find((item) => item.href === "/finances")!;
    expect(isNavItemVisible(finances, "sales", false, true)).toBe(false);
    expect(isNavItemVisible(finances, "support", false, true)).toBe(false);
    expect(isNavItemVisible(finances, "finance", false, true)).toBe(true);
    expect(isNavItemVisible(finances, "admin", false, true)).toBe(true);
  });

  test("finance role only sees finances nav item", () => {
    const contacts = MAIN_NAV.find((item) => item.href === "/contacts")!;
    const finances = MAIN_NAV.find((item) => item.href === "/finances")!;
    expect(isNavItemVisible(contacts, "finance", false, true)).toBe(false);
    expect(isNavItemVisible(finances, "finance", false, true)).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryBuilder } from "../../helpers/supabaseMock";

vi.mock("../../../src/services/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../../../src/services/supabaseClient";
import {
  assertUniqueHandle,
  tableExists,
} from "../../../src/services/utils/dbUtils";

describe("tableExists", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  it("returns true when query succeeds", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: [], error: null }),
    );
    await expect(tableExists("orders")).resolves.toBe(true);
  });

  it("returns false when error indicates missing table", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: null,
        error: { message: 'relation "ghosts" does not exist' },
      }),
    );
    await expect(tableExists("ghosts")).resolves.toBe(false);
  });

  it("rethrows unrelated errors", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: null,
        error: { message: "network down" },
      }),
    );
    await expect(tableExists("orders")).rejects.toThrow("network down");
  });
});

describe("assertUniqueHandle", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  it("is a no-op for empty handle", async () => {
    await expect(
      assertUniqueHandle("products", "store-1", ""),
    ).resolves.toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("resolves when no conflicting row exists", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: [], error: null }),
    );
    await expect(
      assertUniqueHandle("products", "store-1", "my-handle"),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("products");
  });

  it("throws when handle is already taken", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: [{ id: "existing" }], error: null }),
    );
    await expect(
      assertUniqueHandle("products", "store-1", "taken"),
    ).rejects.toThrow(/already exists/);
  });

  it("propagates supabase errors via normalizeError", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: null,
        error: { message: "permission denied" },
      }),
    );
    await expect(
      assertUniqueHandle("products", "store-1", "x"),
    ).rejects.toThrow("permission denied");
  });

  it("uses neq when ignoreId is supplied", async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    supabase.from.mockReturnValueOnce(builder);
    await assertUniqueHandle("products", "store-1", "h", "ignore-this-id");
    expect(builder.neq).toHaveBeenCalledWith("id", "ignore-this-id");
  });
});

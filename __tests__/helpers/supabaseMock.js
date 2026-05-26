import { vi } from "vitest";

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "neq",
  "in",
  "is",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "order",
  "limit",
  "range",
  "single",
  "maybeSingle",
  "match",
  "or",
  "filter",
  "returns",
];

export function makeQueryBuilder(result = { data: null, error: null }) {
  const builder = {};
  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve, reject) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

export function makeSupabaseMock(tableHandlers = {}) {
  const handlers = new Map(Object.entries(tableHandlers));
  const fromMock = vi.fn((table) => {
    const handler = handlers.get(table);
    if (!handler) {
      throw new Error(
        `No mock handler registered for supabase.from("${table}"). ` +
          `Pass it in tableHandlers when calling makeSupabaseMock.`,
      );
    }
    return typeof handler === "function" ? handler(table) : handler;
  });

  const supabase = {
    from: fromMock,
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: null }, error: null }),
      ),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
      })),
    },
  };

  return supabase;
}

export function makeTableQueueHandler(responses) {
  const queue = [...responses];
  return () => makeQueryBuilder(queue.length ? queue.shift() : { data: null, error: null });
}

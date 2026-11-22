import type { Database } from "@app/db";

export type BudgetTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

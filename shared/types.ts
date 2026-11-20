export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];
export type AppDomain = "inventory" | "recipes" | "ingredients" | "meal-logs" | "profile";

import { err, ok, type AppError, type Result } from "@app/shared";
import { authUserExists } from "./user.repo";

export async function requireAuthUser(userId: string): Promise<Result<void, AppError>> {
  return await authUserExists(userId)
    ? ok(undefined)
    : err({ code: "UNAUTHORIZED", message: "Authenticated user no longer exists." });
}

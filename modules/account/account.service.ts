import { err, ok, type AppError, type Result } from "@app/shared";
import { findAccount, type Account } from "./account.repo";

export async function getAccount(id: string): Promise<Result<Account, AppError>> {
  const account = await findAccount(id);
  return account
    ? ok(account)
    : err({ code: "ACCOUNT_NOT_FOUND", message: "Account not found." });
}

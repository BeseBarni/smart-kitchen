import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { getText } from "@/lib/i18n";

export const OPTIMISTIC_ID_PREFIX = "temp-";

export function createOptimisticId(): string {
  return `${OPTIMISTIC_ID_PREFIX}${crypto.randomUUID()}`;
}

export function isOptimisticId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_ID_PREFIX);
}

export interface QueryRollback {
  rollback: () => void;
}

export async function snapshotQueryCaches(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
): Promise<QueryRollback> {
  await Promise.all(queryKeys.map((queryKey) =>
    queryClient.cancelQueries({ queryKey }),
  ));
  const snapshots = queryKeys.flatMap((queryKey) =>
    queryClient.getQueriesData({ queryKey }).map(([key, data]) => ({ key, data })),
  );
  return {
    rollback: () => {
      for (const snapshot of snapshots) {
        queryClient.setQueryData(snapshot.key, snapshot.data);
      }
    },
  };
}

export async function settleDomainQueries(
  queryClient: QueryClient,
  mutationKey: QueryKey,
  queryKeysToInvalidate: readonly QueryKey[],
): Promise<void> {
  if (queryClient.isMutating({ mutationKey }) !== 1) return;
  await Promise.all(queryKeysToInvalidate.map((queryKey) =>
    queryClient.invalidateQueries({ queryKey }),
  ));
}

export function rollbackOptimisticMutation(context: QueryRollback | undefined): void {
  context?.rollback();
  toast.error(getText("common.optimisticRollback"));
}

import { Archive, Refrigerator, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Storage } from "../types";

export function StorageBadge({ storage }: { storage: Storage }): React.JSX.Element {
  const Icon = storage === "fridge" ? Refrigerator : storage === "freezer" ? Snowflake : Archive;
  return (
    <Badge variant={storage === "fridge" ? "secondary" : "outline"} className="gap-1">
      <Icon aria-hidden="true" />{storage === "fridge" ? "Fridge" : storage === "freezer" ? "Freezer" : "Pantry"}
    </Badge>
  );
}

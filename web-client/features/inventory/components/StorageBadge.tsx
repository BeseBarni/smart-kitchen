import { Archive, Refrigerator, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Storage } from "../types";
import { useText } from "@/lib/i18n";

export function StorageBadge({ storage }: { storage: Storage }): React.JSX.Element {
  const { t } = useText();
  const Icon = storage === "fridge" ? Refrigerator : storage === "freezer" ? Snowflake : Archive;
  return (
    <Badge variant={storage === "fridge" ? "secondary" : "outline"} className="gap-1">
      <Icon aria-hidden="true" />{t(`inventory.${storage}`)}
    </Badge>
  );
}

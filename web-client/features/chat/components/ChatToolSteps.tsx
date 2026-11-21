import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import type { ChatToolStep } from "../types";
import { useText } from "@/lib/i18n";

const icons = {
  running: LoaderCircle,
  completed: Check,
  failed: CircleAlert,
};

export function ChatToolSteps({ steps }: { steps: readonly ChatToolStep[] }): React.JSX.Element {
  const { t } = useText();
  if (!steps.length) return <></>;
  return (
    <ol aria-label={t("chat.toolActivity")} className="space-y-1">
      {steps.map((step) => {
        const Icon = icons[step.status];
        return (
          <li key={step.id} className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2 text-label-md text-secondary-foreground">
            <Icon size={15} aria-hidden="true" className={`mt-0.5 shrink-0 ${step.status === "running" ? "animate-spin" : ""}`} />
            <span className="min-w-0"><span className="font-semibold">{step.toolName}</span><span className="ml-1">{step.summary}</span></span>
          </li>
        );
      })}
    </ol>
  );
}

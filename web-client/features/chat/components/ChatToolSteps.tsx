import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import type { ChatToolStep } from "../types";
import { useText, type TranslationKey } from "@/lib/i18n";
import { toolStatusLabel } from "../utils/tool-status";

const icons = {
  running: LoaderCircle,
  completed: Check,
  failed: CircleAlert,
};

const statusLabels: Record<ChatToolStep["status"], TranslationKey> = {
  running: "chat.toolStepRunning",
  completed: "chat.toolStepCompleted",
  failed: "chat.toolStepFailed",
};

export function ChatToolSteps({ steps }: { steps: readonly ChatToolStep[] }): React.JSX.Element {
  const { t, locale } = useText();
  if (!steps.length) return <></>;
  return (
    <ol aria-label={t("chat.toolActivity")} className="space-y-1">
      {steps.map((step) => {
        const Icon = icons[step.status];
        return (
          <li key={step.id} className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2 text-label-md text-secondary-foreground">
            <Icon size={15} aria-hidden="true" className={`mt-0.5 shrink-0 ${step.status === "running" ? "animate-spin" : ""}`} />
            <span className="min-w-0"><span className="font-semibold">{toolStatusLabel(step.toolName, locale)}</span><span className="ml-1">{t(statusLabels[step.status])}</span></span>
          </li>
        );
      })}
    </ol>
  );
}

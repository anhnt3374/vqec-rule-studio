import { CircleDashed, FileCheck2, CircleCheck } from "lucide-react";
import type { RuleStatus } from "@/models/types";
export function Status({
  status,
  compact = false,
}: {
  status: RuleStatus;
  compact?: boolean;
}) {
  const Icon =
    status === "Published"
      ? CircleCheck
      : status === "Draft"
        ? FileCheck2
        : CircleDashed;
  return (
    <span title={status} className={`status status-${status.toLowerCase()}`}>
      <Icon size={13} />
      {!compact && status}
    </span>
  );
}

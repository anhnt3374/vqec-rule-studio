import {
  ArrowRightLeft,
  Scan,
  MoveUpRight,
  Shapes,
  Fingerprint,
  Users,
  SlidersHorizontal,
  Merge,
  Combine,
  CircleOff,
  CalendarClock,
  Timer,
  Hourglass,
  ListOrdered,
  Zap,
} from "lucide-react";
import type { OperatorKind } from "@/models/types";
const icons = {
  gate: ArrowRightLeft,
  zone: Scan,
  movement: MoveUpRight,
  category: Shapes,
  identity: Fingerprint,
  group: Users,
  property: SlidersHorizontal,
  union: Merge,
  intersection: Combine,
  complement: CircleOff,
  schedule: CalendarClock,
  duration: Timer,
  within: Hourglass,
  sequence: ListOrdered,
  event: Zap,
};
export function OperatorIcon({
  kind,
  size = 18,
}: {
  kind: OperatorKind;
  size?: number;
}) {
  const Icon = icons[kind];
  return <Icon size={size} strokeWidth={1.7} />;
}

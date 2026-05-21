import { StationIntroPulse, INTRO_DURATION_MS as PULSE_DURATION, type IntroRole } from "./StationIntroPulse";
import { StationIntroBadge, INTRO_DURATION_MS as BADGE_DURATION } from "./StationIntroBadge";

export type IntroVariant = "pulse" | "badge";
export type { IntroRole };

export const INTRO_VARIANT_LABEL: Record<IntroVariant, string> = {
  pulse: "Sinal vital (ECG REVMED)",
  badge: "Credencial REVMED",
};

export const INTRO_DURATION_MS = Math.max(PULSE_DURATION, BADGE_DURATION);

interface Props {
  variant?: IntroVariant | null;
  role: IntroRole;
  stationTitle: string;
  specialty?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  onComplete: () => void;
  startAtMs?: number;
  nowMs?: () => number;
}

export function IntroOverlay({ variant, ...rest }: Props) {
  if (variant === "badge") return <StationIntroBadge {...rest} />;
  return <StationIntroPulse {...rest} />;
}

import { StationIntroOverlay, INTRO_DURATION_MS as CLASSIC_DURATION, type IntroRole } from "./StationIntroOverlay";
import { StationIntroOverlayDoor, INTRO_DURATION_MS as DOOR_DURATION } from "./StationIntroOverlayDoor";
import { StationIntroOverlayCorridor, INTRO_DURATION_MS as CORRIDOR_DURATION } from "./StationIntroOverlayCorridor";

export type IntroVariant = "classic" | "door" | "corridor";
export type { IntroRole };

export const INTRO_DURATION_MS = Math.max(CLASSIC_DURATION, DOOR_DURATION, CORRIDOR_DURATION);

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
  if (variant === "door") return <StationIntroOverlayDoor {...rest} />;
  if (variant === "corridor") return <StationIntroOverlayCorridor {...rest} />;
  return <StationIntroOverlay {...rest} />;
}

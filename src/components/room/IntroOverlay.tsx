import { StationIntroOverlay, INTRO_DURATION_MS as CLASSIC_DURATION, type IntroRole } from "./StationIntroOverlay";
import { StationIntroOverlayDoor, INTRO_DURATION_MS as DOOR_DURATION } from "./StationIntroOverlayDoor";

export type IntroVariant = "classic" | "door";
export type { IntroRole };

export const INTRO_DURATION_MS = Math.max(CLASSIC_DURATION, DOOR_DURATION);

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
  return <StationIntroOverlay {...rest} />;
}

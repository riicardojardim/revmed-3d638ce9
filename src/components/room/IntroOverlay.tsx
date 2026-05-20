import { StationIntroOverlay, INTRO_DURATION_MS as CLASSIC_DURATION, type IntroRole } from "./StationIntroOverlay";
import { StationIntroOverlayDoor, INTRO_DURATION_MS as DOOR_DURATION } from "./StationIntroOverlayDoor";
import { StationIntroOverlayCorridor, INTRO_DURATION_MS as CORRIDOR_DURATION } from "./StationIntroOverlayCorridor";
import { StationIntroOverlayXray, INTRO_DURATION_MS as XRAY_DURATION } from "./StationIntroOverlayXray";
import { StationIntroOverlayStamp, INTRO_DURATION_MS as STAMP_DURATION } from "./StationIntroOverlayStamp";
import { StationIntroOverlayElevator, INTRO_DURATION_MS as ELEVATOR_DURATION } from "./StationIntroOverlayElevator";
import { StationIntroOverlayIV, INTRO_DURATION_MS as IV_DURATION } from "./StationIntroOverlayIV";
import { StationIntroOverlayExamRoom, INTRO_DURATION_MS as EXAMROOM_DURATION } from "./StationIntroOverlayExamRoom";

export type IntroVariant = "classic" | "door" | "corridor" | "xray" | "stamp" | "elevator" | "iv" | "examroom";
export type { IntroRole };

export const INTRO_DURATION_MS = Math.max(
  CLASSIC_DURATION, DOOR_DURATION, CORRIDOR_DURATION, XRAY_DURATION, STAMP_DURATION, ELEVATOR_DURATION, IV_DURATION, EXAMROOM_DURATION,
);

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
  if (variant === "xray") return <StationIntroOverlayXray {...rest} />;
  if (variant === "stamp") return <StationIntroOverlayStamp {...rest} />;
  if (variant === "elevator") return <StationIntroOverlayElevator {...rest} />;
  if (variant === "iv") return <StationIntroOverlayIV {...rest} />;
  if (variant === "examroom") return <StationIntroOverlayExamRoom {...rest} />;
  return <StationIntroOverlay {...rest} />;
}

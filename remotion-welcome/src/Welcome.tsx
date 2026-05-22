import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Sora";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

const display = loadDisplay("normal", { weights: ["600", "700", "800"] });
const body = loadBody("normal", { weights: ["400", "500", "600"] });

const ORANGE = "#F59A1B";
const ORANGE_DARK = "#CF8737";
const NIGHT = "#0B0F1A";

function Particles() {
  const frame = useCurrentFrame();
  const dots = Array.from({ length: 38 });
  return (
    <AbsoluteFill>
      {dots.map((_, i) => {
        const seed = i * 9.13;
        const x = (Math.sin(seed) * 0.5 + 0.5) * 1920;
        const baseY = (Math.cos(seed * 1.7) * 0.5 + 0.5) * 1080;
        const y = baseY + Math.sin(frame / 40 + i) * 30;
        const size = 2 + ((i * 7) % 5);
        const opacity = 0.15 + ((i * 13) % 40) / 100;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: 999,
              background: ORANGE,
              opacity,
              boxShadow: `0 0 ${size * 4}px ${ORANGE}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

function Background() {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 80) * 60;
  return (
    <AbsoluteFill style={{ background: NIGHT }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${50 + drift / 10}% 40%, ${ORANGE}33 0%, transparent 55%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 20% 90%, ${ORANGE_DARK}22 0%, transparent 50%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <Particles />
    </AbsoluteFill>
  );
}

function Scene1Logo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const scale = interpolate(s, [0, 1], [0.82, 1]);
  const opacity = interpolate(frame, [0, 18, 75, 90], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });
  const glow = interpolate(frame, [0, 30, 60], [0, 1, 0.6], {
    extrapolateRight: "clamp",
  });
  const lineW = interpolate(s, [0, 1], [0, 320]);
  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          filter: `drop-shadow(0 0 ${40 * glow}px ${ORANGE}cc)`,
        }}
      >
        <Img
          src={staticFile("images/logo.png")}
          style={{ width: 720, height: "auto" }}
        />
      </div>
      <div
        style={{
          marginTop: 40,
          height: 2,
          width: lineW,
          background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)`,
        }}
      />
      <div
        style={{
          marginTop: 28,
          fontFamily: body.fontFamily,
          letterSpacing: "0.5em",
          textTransform: "uppercase",
          fontSize: 18,
          color: "#ffffffcc",
          fontWeight: 500,
        }}
      >
        Mentoria para Revalidação
      </div>
    </AbsoluteFill>
  );
}

function StaggerWord({ text, delay }: { text: string; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <span style={{ display: "inline-flex" }}>
      {text.split("").map((ch, i) => {
        const s = spring({
          frame: frame - delay - i * 2,
          fps,
          config: { damping: 20, stiffness: 120 },
        });
        const y = interpolate(s, [0, 1], [40, 0]);
        const op = interpolate(s, [0, 1], [0, 1]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${y}px)`,
              opacity: op,
              whiteSpace: "pre",
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

function Scene2Title() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 100, 115], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: 80,
      }}
    >
      <div
        style={{
          fontFamily: body.fontFamily,
          color: ORANGE,
          letterSpacing: "0.4em",
          fontSize: 22,
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 32,
        }}
      >
        Vídeo Aulas REVMED
      </div>
      <div
        style={{
          fontFamily: display.fontFamily,
          color: "#fff",
          fontSize: 110,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
        }}
      >
        <StaggerWord text="Bem-vindo" delay={0} />
      </div>
      <div
        style={{
          fontFamily: display.fontFamily,
          color: "#fff",
          fontSize: 110,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
        }}
      >
        <span><StaggerWord text="à sua " delay={14} /></span>
        <span style={{ color: ORANGE }}>
          <StaggerWord text="aprovação." delay={24} />
        </span>
      </div>
      <div
        style={{
          marginTop: 44,
          fontFamily: body.fontFamily,
          color: "#ffffffcc",
          fontSize: 34,
          fontWeight: 400,
          textAlign: "center",
          letterSpacing: "0.05em",
        }}
      >
        Método. Ciência. Propósito.
      </div>
    </AbsoluteFill>
  );
}

function Scene3Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 22, stiffness: 90 } });
  const opacity = interpolate(frame, [0, 14, 90], [0, 1, 1], {
    extrapolateRight: "clamp",
  });
  const scale = interpolate(s, [0, 1], [0.92, 1]);
  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          filter: `drop-shadow(0 0 60px ${ORANGE}aa)`,
        }}
      >
        <Img
          src={staticFile("images/logo.png")}
          style={{ width: 520, height: "auto" }}
        />
      </div>
      <div
        style={{
          marginTop: 36,
          fontFamily: body.fontFamily,
          color: "#ffffffdd",
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: "0.08em",
        }}
      >
        Sua jornada começa agora.
      </div>
    </AbsoluteFill>
  );
}

export const Welcome = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence from={0} durationInFrames={90}>
        <Scene1Logo />
      </Sequence>
      <Sequence from={85} durationInFrames={130}>
        <Scene2Title />
      </Sequence>
      <Sequence from={210} durationInFrames={90}>
        <Scene3Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
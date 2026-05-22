import { Composition } from "remotion";
import { Welcome } from "./Welcome";

export const RemotionRoot = () => (
  <Composition
    id="main"
    component={Welcome}
    durationInFrames={300}
    fps={30}
    width={1920}
    height={1080}
  />
);
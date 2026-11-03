import { Composition } from "remotion";
import { DURATION_FRAMES, Promo } from "./Promo";
import { FPS } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Jubilee16x9" component={Promo} durationInFrames={DURATION_FRAMES} fps={FPS} width={1920} height={1080} />
      <Composition id="Jubilee9x16" component={Promo} durationInFrames={DURATION_FRAMES} fps={FPS} width={1080} height={1920} />
    </>
  );
};

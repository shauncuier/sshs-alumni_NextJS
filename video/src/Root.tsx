import { Composition } from "remotion";
import { DURATION_FRAMES, Promo } from "./Promo";
import { FPS } from "./theme";
import { FORM_DURATION_FRAMES, FormGuide } from "./form/FormGuide";
import { ONLINE_DURATION_FRAMES, OnlineVideo } from "./online/OnlineVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Jubilee16x9" component={Promo} durationInFrames={DURATION_FRAMES} fps={FPS} width={1920} height={1080} />
      <Composition id="Jubilee9x16" component={Promo} durationInFrames={DURATION_FRAMES} fps={FPS} width={1080} height={1920} />
      <Composition id="FormGuide16x9" component={FormGuide} durationInFrames={FORM_DURATION_FRAMES} fps={FPS} width={1920} height={1080} />
      <Composition id="FormGuide9x16" component={FormGuide} durationInFrames={FORM_DURATION_FRAMES} fps={FPS} width={1080} height={1920} />
      <Composition id="WhyOnline16x9" component={OnlineVideo} durationInFrames={ONLINE_DURATION_FRAMES} fps={FPS} width={1920} height={1080} />
      <Composition id="WhyOnline9x16" component={OnlineVideo} durationInFrames={ONLINE_DURATION_FRAMES} fps={FPS} width={1080} height={1920} />
    </>
  );
};

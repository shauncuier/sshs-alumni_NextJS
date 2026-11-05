import { Composition, Still } from "remotion";
import { DURATION_FRAMES, Promo } from "./Promo";
import { FPS } from "./theme";
import { FORM_DURATION_FRAMES, FormGuide } from "./form/FormGuide";
import { ONLINE_DURATION_FRAMES, OnlineVideo } from "./online/OnlineVideo";
import { DEADLINE_DURATION_FRAMES, DeadlineVideo } from "./premium/Deadline";
import { SOUVENIR_DURATION_FRAMES, SouvenirVideo } from "./premium/Souvenir";
import { DeadlineThumb, SouvenirThumb } from "./premium/Thumbnails";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Jubilee16x9" component={Promo} durationInFrames={DURATION_FRAMES} fps={FPS} width={1920} height={1080} />
      <Composition id="Jubilee9x16" component={Promo} durationInFrames={DURATION_FRAMES} fps={FPS} width={1080} height={1920} />
      <Composition id="FormGuide16x9" component={FormGuide} durationInFrames={FORM_DURATION_FRAMES} fps={FPS} width={1920} height={1080} />
      <Composition id="FormGuide9x16" component={FormGuide} durationInFrames={FORM_DURATION_FRAMES} fps={FPS} width={1080} height={1920} />
      <Composition id="WhyOnline16x9" component={OnlineVideo} durationInFrames={ONLINE_DURATION_FRAMES} fps={FPS} width={1920} height={1080} />
      <Composition id="WhyOnline9x16" component={OnlineVideo} durationInFrames={ONLINE_DURATION_FRAMES} fps={FPS} width={1080} height={1920} />
      <Composition id="Deadline16x9" component={DeadlineVideo} durationInFrames={DEADLINE_DURATION_FRAMES} fps={FPS} width={1920} height={1080} />
      <Composition id="Deadline9x16" component={DeadlineVideo} durationInFrames={DEADLINE_DURATION_FRAMES} fps={FPS} width={1080} height={1920} />
      <Composition id="Souvenir16x9" component={SouvenirVideo} durationInFrames={SOUVENIR_DURATION_FRAMES} fps={FPS} width={1920} height={1080} />
      <Composition id="Souvenir9x16" component={SouvenirVideo} durationInFrames={SOUVENIR_DURATION_FRAMES} fps={FPS} width={1080} height={1920} />
      <Still id="ThumbDeadline" component={DeadlineThumb} width={1280} height={720} />
      <Still id="ThumbSouvenir" component={SouvenirThumb} width={1280} height={720} />
    </>
  );
};

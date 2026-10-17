import { DriveControls } from "./DriveControls.tsx";
import { RaceHud, SpeedwayMenu } from "./RaceHud.tsx";

/** The Speedway's menu, race HUD and touch driving controls. */
export function SpeedwayPanels() {
  return (
    <>
      <SpeedwayMenu />
      <RaceHud />
      <DriveControls />
    </>
  );
}

"use client";

import AnimalDialog from "./AnimalDialog";
import MissionBriefing from "./MissionBriefing";
import MissionResult from "./MissionResult";
import { useLiveSimulation } from "./hooks";

/** Shows whichever dialog the store has open. The island is paused while one is open. */
export default function GameDialogs() {
  const store = useLiveSimulation();
  const dialog = store.dialog;
  if (!dialog) return null;
  const close = () => store.closeDialog();

  if (dialog.kind === "animal") {
    return <AnimalDialog key={dialog.animalId} animalId={dialog.animalId} speciesId={dialog.speciesId} onClose={close} />;
  }
  if (dialog.kind === "mission") {
    return <MissionBriefing key={dialog.missionId} missionId={dialog.missionId} onClose={close} />;
  }
  return <MissionResult onClose={close} />;
}

import type { DiscoPlaylistTrack } from "../audio/discoPlaylist";
import { DISCO_RECORD_MIN_SAMPLES } from "../audio/discoRecord";
import { isFeatureEnabled } from "../port/featureFlags";
import {
  DiscoCurriculumPanel,
  type DiscoCurriculumPanelProps,
} from "./DiscoCurriculumPanel";
import { DiscoTrackLearnPanel } from "./DiscoTrackLearnPanel";
import {
  DiscoZonePanel,
  type DiscoZonePanelProps,
} from "./DiscoZonePanel";

export interface DiscoDockLearnProps {
  recording: boolean;
  recordSamples: number;
  recordDurationSec: number;
  learning: boolean;
  learnProgress: { epoch: number; epochs: number; loss: number } | null;
  hasDanceBrain: boolean;
  freestyle: boolean;
  soloOk: boolean;
  onToggleRecord: () => void;
  onLearn: () => void;
  onToggleFreestyle: () => void;
  onSaveDance: () => void;
  onClearRecord: () => void;
  onLoadFile: (file: File) => void | Promise<void>;
}

export interface DiscoDockCurriculumProps {
  tracks: DiscoPlaylistTrack[];
  activeTrackId: string | null;
  datasetSamples: number;
  datasetDurationSec: number;
  learning: boolean;
  refining: boolean;
  learnProgress: DiscoCurriculumPanelProps["learnProgress"];
  refineProgress: DiscoCurriculumPanelProps["refineProgress"];
  recording: boolean;
  onAddFiles: (files: File[]) => void;
  onRemoveTrack: (id: string) => void;
  onSelectTrack: (id: string) => void;
  onAnalyzeAll: () => void;
  onRecordCurriculum: () => void;
  onStopRecord: () => void;
  onLearnCurriculum: () => void;
  onRefine: () => void;
  onClearDataset: () => void;
}

type DiscoDockProps = Omit<DiscoZonePanelProps, "learnExtras"> & {
  learn: DiscoDockLearnProps;
  curriculum?: DiscoDockCurriculumProps | null;
};

/**
 * Disco bottom dock — zone controls + learn/curriculum wired in one parent.
 * Transport callbacks are shared by the zone panel and the learn panel.
 */
export function DiscoDock({ learn, curriculum, ...zone }: DiscoDockProps) {
  const transport = {
    onPlay: zone.onPlay,
    onPause: zone.onPause,
    onStartDancing: zone.onStartDancing,
    onResetPose: zone.onResetPose,
  };

  return (
    <DiscoZonePanel
      {...zone}
      learnExtras={
        <>
          <DiscoTrackLearnPanel
            trackName={zone.trackName}
            hasTrack={zone.hasTrack}
            playing={zone.playing}
            dancing={zone.dancing}
            disabled={zone.disabled}
            recording={learn.recording}
            recordSamples={learn.recordSamples}
            recordDurationSec={learn.recordDurationSec}
            learning={learn.learning}
            learnProgress={learn.learnProgress}
            hasDanceBrain={learn.hasDanceBrain}
            freestyle={learn.freestyle}
            soloOk={learn.soloOk}
            minRecordSamples={DISCO_RECORD_MIN_SAMPLES}
            onToggleRecord={learn.onToggleRecord}
            onLearn={learn.onLearn}
            onToggleFreestyle={learn.onToggleFreestyle}
            onSaveDance={learn.onSaveDance}
            onClearRecord={learn.onClearRecord}
            onLoadFile={learn.onLoadFile}
            {...transport}
          />
          {curriculum && isFeatureEnabled("discoDanceCurriculum") && (
            <DiscoCurriculumPanel
              tracks={curriculum.tracks}
              activeTrackId={curriculum.activeTrackId}
              datasetSamples={curriculum.datasetSamples}
              datasetDurationSec={curriculum.datasetDurationSec}
              learning={curriculum.learning}
              refining={curriculum.refining}
              learnProgress={curriculum.learnProgress}
              refineProgress={curriculum.refineProgress}
              hasDanceBrain={learn.hasDanceBrain}
              soloOk={learn.soloOk}
              disabled={
                !!zone.disabled ||
                curriculum.learning ||
                curriculum.refining
              }
              recording={curriculum.recording}
              onAddFiles={curriculum.onAddFiles}
              onRemoveTrack={curriculum.onRemoveTrack}
              onSelectTrack={curriculum.onSelectTrack}
              onAnalyzeAll={curriculum.onAnalyzeAll}
              onRecordCurriculum={curriculum.onRecordCurriculum}
              onStopRecord={curriculum.onStopRecord}
              onLearnCurriculum={curriculum.onLearnCurriculum}
              onRefine={curriculum.onRefine}
              onClearDataset={curriculum.onClearDataset}
            />
          )}
        </>
      }
    />
  );
}

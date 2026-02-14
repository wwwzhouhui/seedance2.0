import { useState } from 'react';
import type { AspectRatio, Duration, ReferenceMode } from '../types';
import { REFERENCE_MODES } from '../types';
import { VideoIcon, SparkleIcon, ChevronDownIcon, ClockIcon, SendIcon, SpinnerIcon, RatioIcon } from './Icons';
import RatioSelector from './RatioSelector';
import DurationSelector from './DurationSelector';

interface ToolbarProps {
  ratio: AspectRatio;
  onRatioChange: (ratio: AspectRatio) => void;
  duration: Duration;
  onDurationChange: (duration: Duration) => void;
  referenceMode: ReferenceMode;
  onReferenceModeChange: (mode: ReferenceMode) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function Toolbar({
  ratio,
  onRatioChange,
  duration,
  onDurationChange,
  referenceMode,
  onReferenceModeChange,
  onGenerate,
  isGenerating,
}: ToolbarProps) {
  const [showRatio, setShowRatio] = useState(false);
  const [showDuration, setShowDuration] = useState(false);
  const [showMode, setShowMode] = useState(false);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Video Generation label */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-800/60 text-cyan-400 text-xs">
        <VideoIcon className="w-3.5 h-3.5" />
        <span>视频生成</span>
        <ChevronDownIcon className="w-3 h-3" />
      </div>

      {/* Seedance 2.0 badge */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-800/60 text-gray-300 text-xs">
        <SparkleIcon className="w-3.5 h-3.5" />
        <span>Seedance 2.0</span>
      </div>

      {/* Reference mode selector */}
      <div className="relative">
        <button
          onClick={() => {
            setShowMode(!showMode);
            setShowRatio(false);
            setShowDuration(false);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-800/60 text-gray-300 text-xs hover:bg-gray-700/60 transition-colors"
        >
          <SparkleIcon className="w-3.5 h-3.5" />
          <span>{referenceMode}</span>
          <ChevronDownIcon className="w-3 h-3" />
        </button>

        {showMode && (
          <div className="absolute bottom-full mb-2 left-0 bg-gray-900 border border-gray-700 rounded-xl p-2 shadow-xl z-50 w-36">
            {REFERENCE_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  onReferenceModeChange(mode);
                  setShowMode(false);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  mode === referenceMode
                    ? 'bg-cyan-500/15 text-cyan-400'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Aspect ratio selector */}
      <div className="relative">
        <button
          onClick={() => {
            setShowRatio(!showRatio);
            setShowDuration(false);
            setShowMode(false);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-800/60 text-gray-300 text-xs hover:bg-gray-700/60 transition-colors"
        >
          <RatioIcon className="w-3.5 h-3.5" />
          <span>{ratio}</span>
        </button>

        {showRatio && (
          <RatioSelector
            value={ratio}
            onChange={onRatioChange}
            onClose={() => setShowRatio(false)}
          />
        )}
      </div>

      {/* Duration selector */}
      <div className="relative">
        <button
          onClick={() => {
            setShowDuration(!showDuration);
            setShowRatio(false);
            setShowMode(false);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-800/60 text-gray-300 text-xs hover:bg-gray-700/60 transition-colors"
        >
          <ClockIcon className="w-3.5 h-3.5" />
          <span>{duration}s</span>
        </button>

        {showDuration && (
          <DurationSelector
            value={duration}
            onChange={onDurationChange}
            onClose={() => setShowDuration(false)}
          />
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? (
          <SpinnerIcon className="w-4 h-4 text-white" />
        ) : (
          <SendIcon className="w-4 h-4 text-white" />
        )}
      </button>
    </div>
  );
}

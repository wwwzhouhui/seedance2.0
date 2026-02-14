import { useEffect, useRef } from 'react';
import type { Duration } from '../types';
import { DURATION_OPTIONS } from '../types';
import { ClockIcon } from './Icons';

interface DurationSelectorProps {
  value: Duration;
  onChange: (duration: Duration) => void;
  onClose: () => void;
}

export default function DurationSelector({ value, onChange, onClose }: DurationSelectorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 right-0 bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-xl z-50 w-48"
    >
      <div className="text-xs text-gray-400 mb-2">选择视频生成时长</div>
      <div className="max-h-64 overflow-y-auto space-y-0.5">
        {DURATION_OPTIONS.map((d) => {
          const isSelected = d === value;
          return (
            <button
              key={d}
              onClick={() => {
                onChange(d);
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isSelected
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <ClockIcon className="w-4 h-4" />
              <span>{d}s</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

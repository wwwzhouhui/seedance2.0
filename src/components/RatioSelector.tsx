import { useEffect, useRef } from 'react';
import type { AspectRatio } from '../types';
import { RATIO_OPTIONS } from '../types';

interface RatioSelectorProps {
  value: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
  onClose: () => void;
}

export default function RatioSelector({ value, onChange, onClose }: RatioSelectorProps) {
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
      className="absolute bottom-full mb-2 left-0 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl z-50 min-w-[320px]"
    >
      <div className="text-xs text-gray-400 mb-3">选择比例</div>
      <div className="grid grid-cols-6 gap-3">
        {RATIO_OPTIONS.map((opt) => {
          const isSelected = opt.value === value;
          const maxDim = 32;
          const scale = maxDim / Math.max(opt.widthRatio, opt.heightRatio);
          const w = Math.round(opt.widthRatio * scale);
          const h = Math.round(opt.heightRatio * scale);

          return (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                onClose();
              }}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors ${
                isSelected
                  ? 'bg-cyan-500/10 ring-1 ring-cyan-500'
                  : 'hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-center w-10 h-10">
                <div
                  className={`rounded-sm border ${
                    isSelected ? 'border-cyan-400' : 'border-gray-500'
                  }`}
                  style={{ width: `${w}px`, height: `${h}px` }}
                />
              </div>
              <span
                className={`text-xs ${
                  isSelected ? 'text-cyan-400' : 'text-gray-400'
                }`}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

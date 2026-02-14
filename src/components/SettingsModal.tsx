import { useState, useEffect } from 'react';
import { CloseIcon, EyeIcon, EyeOffIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onSessionIdChange: (id: string) => void;
}

const LS_SESSION_KEY = 'seedance_session_id';

export function loadSettings() {
  return {
    sessionId: localStorage.getItem(LS_SESSION_KEY) || '',
  };
}

export default function SettingsModal({
  isOpen,
  onClose,
  sessionId,
  onSessionIdChange,
}: SettingsModalProps) {
  const [localSessionId, setLocalSessionId] = useState(sessionId);
  const [showSessionId, setShowSessionId] = useState(false);

  useEffect(() => {
    setLocalSessionId(sessionId);
  }, [sessionId]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSessionIdChange(localSessionId);
    localStorage.setItem(LS_SESSION_KEY, localSessionId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1c1f2e] border border-gray-800 rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg text-gray-200 font-medium">设置</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 transition-colors">
            <CloseIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Session ID */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Session ID</label>
            <div className="relative">
              <input
                type={showSessionId ? 'text' : 'password'}
                value={localSessionId}
                onChange={(e) => setLocalSessionId(e.target.value)}
                placeholder="输入即梦 sessionid"
                className="w-full bg-[#161824] border border-gray-700 rounded-xl px-3 py-2.5 pr-10 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-purple-500 transition-colors"
              />
              <button
                onClick={() => setShowSessionId(!showSessionId)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300"
              >
                {showSessionId ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              从 jimeng.jianying.com 的 Cookie 中获取 sessionid
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#161824] border border-gray-700 text-gray-300 text-sm hover:bg-[#1c2030] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-purple-900/20"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

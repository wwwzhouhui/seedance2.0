import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  AspectRatio,
  Duration,
  ModelId,
  ReferenceMode,
  UploadedImage,
  GenerationState,
} from './types';
import { RATIO_OPTIONS, DURATION_OPTIONS, REFERENCE_MODES, MODEL_OPTIONS } from './types';
import { generateVideo } from './services/videoService';
import VideoPlayer from './components/VideoPlayer';
import SettingsModal, { loadSettings } from './components/SettingsModal';
import { GearIcon, PlusIcon, CloseIcon, SparkleIcon } from './components/Icons';

let nextId = 0;

export default function App() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<ModelId>('seedance-2.0-fast');
  const [ratio, setRatio] = useState<AspectRatio>('16:9');
  const [duration, setDuration] = useState<Duration>(5);
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>('全能参考');
  const [generation, setGeneration] = useState<GenerationState>({
    status: 'idle',
  });
  const [sessionId, setSessionId] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxImages = 5;

  useEffect(() => {
    const saved = loadSettings();
    if (saved.sessionId) setSessionId(saved.sessionId);

    const envSessionId = import.meta.env.VITE_DEFAULT_SESSION_ID;
    if (!saved.sessionId && !envSessionId) {
      setShowSettings(true);
    }
  }, []);

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const remaining = maxImages - images.length;
      if (remaining <= 0) return;

      const newFiles = Array.from(fileList).slice(0, remaining);
      const newImages: UploadedImage[] = newFiles.map((file, i) => ({
        id: `img-${++nextId}`,
        file,
        previewUrl: URL.createObjectURL(file),
        index: images.length + i + 1,
      }));

      setImages([...images, ...newImages]);
    },
    [images]
  );

  const removeImage = useCallback(
    (id: string) => {
      const removed = images.find((img) => img.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);

      const updated = images
        .filter((img) => img.id !== id)
        .map((img, i) => ({ ...img, index: i + 1 }));
      setImages(updated);
    },
    [images]
  );

  const clearAllImages = useCallback(() => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
  }, [images]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() && images.length === 0) return;
    if (generation.status === 'generating') return;

    setGeneration({
      status: 'generating',
      progress: '正在提交视频生成请求...',
    });

    try {
      const result = await generateVideo(
        {
          prompt,
          model,
          ratio,
          duration,
          files: images.map((img) => img.file),
          sessionId: sessionId || undefined,
        },
        (progress) => {
          setGeneration((prev) => ({ ...prev, progress }));
        }
      );

      if (result.data && result.data.length > 0 && result.data[0].url) {
        setGeneration({ status: 'success', result });
      } else {
        setGeneration({
          status: 'error',
          error: '未获取到视频结果，请重试',
        });
      }
    } catch (error) {
      setGeneration({
        status: 'error',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }, [prompt, images, model, ratio, duration, sessionId, generation.status]);

  const handleReset = () => {
    setPrompt('');
    clearAllImages();
    setGeneration({ status: 'idle' });
  };

  const videoUrl =
    generation.status === 'success' && generation.result?.data?.[0]?.url
      ? generation.result.data[0].url
      : null;

  const revisedPrompt =
    generation.status === 'success'
      ? generation.result?.data?.[0]?.revised_prompt
      : undefined;

  const isGenerating = generation.status === 'generating';
  const canGenerate = (prompt.trim() || images.length > 0) && !isGenerating;

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-[#0f111a] text-white">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-[#0f111a]/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <h1 className="text-lg font-bold">{MODEL_OPTIONS.find(m => m.value === model)?.label || 'Seedance 2.0'}</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <GearIcon className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Left Panel — Configuration */}
      <div className="flex-1 md:w-[520px] md:max-w-[520px] md:flex-none md:border-r border-gray-800 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-[#0f111a]">
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{MODEL_OPTIONS.find(m => m.value === model)?.label || 'Seedance 2.0'} 视频配置</h2>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            title="设置"
          >
            <GearIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-5">
          {/* ── Reference Images ── */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-gray-300">
                参考图片 (全能参考)
              </label>
              {images.length > 0 && (
                <button
                  onClick={clearAllImages}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  清除全部
                </button>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative group w-20 h-20 flex-shrink-0"
                  >
                    <img
                      src={img.previewUrl}
                      alt={`参考图 ${img.index}`}
                      className="w-full h-full object-cover rounded-xl border border-gray-700"
                    />
                    <span className="absolute bottom-0 left-0 bg-black/70 text-[10px] text-purple-400 px-1.5 py-0.5 rounded-br-xl rounded-tl-xl font-medium">
                      @{img.index}
                    </span>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 hover:border-red-600"
                    >
                      <CloseIcon className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload zone */}
            {images.length < maxImages && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
                className={`w-full ${
                  images.length === 0 ? 'h-40 md:h-52' : 'h-24'
                } border border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center bg-[#1c1f2e] cursor-pointer hover:border-purple-500/50 hover:bg-[#25293d] transition-all`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                    <PlusIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-gray-500">
                    {images.length === 0
                      ? '点击或拖拽上传参考图（可选，最多5张）'
                      : `继续添加（${images.length}/${maxImages}）`}
                  </span>
                  {images.length === 0 && (
                    <span className="text-[10px] text-gray-600">
                      不上传则为纯文生视频
                    </span>
                  )}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {/* ── Prompt ── */}
          <div className="bg-[#1c1f2e] rounded-2xl p-4 border border-gray-800">
            <label className="block text-sm font-bold mb-3 text-gray-300">
              提示词
            </label>
            <textarea
              className="w-full bg-transparent text-sm resize-none focus:outline-none min-h-[100px] placeholder-gray-600 text-gray-200 leading-relaxed"
              placeholder="描述你想要生成的视频场景。上传参考图后可使用 @1、@2 等引用图片，例如：@1作为首帧，@2作为尾帧，模仿@3的动作..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={5000}
              disabled={isGenerating}
            />
            <div className="text-right text-xs text-gray-500 mt-2">
              {prompt.length}/5000
            </div>
          </div>

          {/* ── Settings ── */}
          <div className="bg-[#1c1f2e] rounded-2xl p-4 border border-gray-800 space-y-5">
            {/* Model Selection */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                选择模型
              </label>
              <div className="flex flex-col gap-2">
                {MODEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setModel(opt.value)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                      model === opt.value
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-[#161824] hover:border-gray-600'
                    }`}
                  >
                    <div className={`text-sm font-medium ${
                      model === opt.value ? 'text-purple-400' : 'text-gray-300'
                    }`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Mode */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                参考模式
              </label>
              <div className="flex gap-2">
                {REFERENCE_MODES.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setReferenceMode(mode)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      referenceMode === mode
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-gray-700 bg-[#161824] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                画面比例
              </label>
              <div className="grid grid-cols-6 gap-2">
                {RATIO_OPTIONS.map((opt) => {
                  const isSelected = opt.value === ratio;
                  const maxDim = 24;
                  const scale =
                    maxDim / Math.max(opt.widthRatio, opt.heightRatio);
                  const w = Math.round(opt.widthRatio * scale);
                  const h = Math.round(opt.heightRatio * scale);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setRatio(opt.value)}
                      className={`flex flex-col items-center gap-1.5 py-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 bg-[#161824] hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-center w-8 h-8">
                        <div
                          className={`rounded-sm border ${
                            isSelected
                              ? 'border-purple-400'
                              : 'border-gray-500'
                          }`}
                          style={{ width: `${w}px`, height: `${h}px` }}
                        />
                      </div>
                      <span
                        className={`text-[11px] ${
                          isSelected ? 'text-purple-400' : 'text-gray-400'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                视频时长
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      duration === d
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-gray-700 bg-[#161824] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {d}秒
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Generate Section ── */}
          <div className="pb-6 md:pb-4">
            {/* Progress */}
            {isGenerating && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{generation.progress || '处理中...'}</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full animate-progress" />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    生成中...
                  </>
                ) : (
                  <>
                    <SparkleIcon className="w-4 h-4" />
                    生成视频
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                disabled={isGenerating}
                className="px-6 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-3.5 rounded-xl transition-all"
              >
                重置
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Result */}
      <div className="flex-1 bg-[#090a0f] overflow-y-auto flex flex-col">
        <VideoPlayer
          videoUrl={videoUrl}
          revisedPrompt={revisedPrompt}
          isLoading={isGenerating}
          error={generation.status === 'error' ? generation.error : undefined}
          progress={generation.progress}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        sessionId={sessionId}
        onSessionIdChange={setSessionId}
      />
    </div>
  );
}

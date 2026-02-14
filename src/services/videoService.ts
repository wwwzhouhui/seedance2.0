import type { GenerateVideoRequest, VideoGenerationResponse } from '../types';

export async function generateVideo(
  request: GenerateVideoRequest,
  onProgress?: (message: string) => void
): Promise<VideoGenerationResponse> {
  const formData = new FormData();
  formData.append('prompt', request.prompt);
  formData.append('model', request.model);
  formData.append('ratio', request.ratio);
  formData.append('duration', String(request.duration));

  if (request.sessionId) {
    formData.append('sessionId', request.sessionId);
  }

  for (const file of request.files) {
    formData.append('files', file);
  }

  // 第1步: 提交任务
  onProgress?.('正在提交视频生成请求...');
  const submitRes = await fetch('/api/generate-video', {
    method: 'POST',
    body: formData,
  });

  const submitData = await submitRes.json();
  if (!submitRes.ok) {
    throw new Error(submitData.error || `提交失败 (HTTP ${submitRes.status})`);
  }

  const { taskId } = submitData;
  if (!taskId) {
    throw new Error('服务器未返回任务ID');
  }

  // 第2步: 轮询获取结果
  onProgress?.('已提交，等待AI生成视频...');

  const maxPollTime = 25 * 60 * 1000; // 25 分钟
  const pollInterval = 3000; // 3 秒
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollTime) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const pollRes = await fetch(`/api/task/${taskId}`);
    const pollData = await pollRes.json();

    if (pollData.status === 'done') {
      const result = pollData.result;
      if (result?.data?.[0]?.url) {
        return result;
      }
      throw new Error('未获取到视频结果');
    }

    if (pollData.status === 'error') {
      throw new Error(pollData.error || '视频生成失败');
    }

    // 仍在处理中，更新进度
    if (pollData.progress) {
      onProgress?.(pollData.progress);
    }
  }

  throw new Error('视频生成超时，请稍后重试');
}

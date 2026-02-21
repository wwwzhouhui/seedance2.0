import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import browserService from './browser-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_SESSION_ID = process.env.VITE_DEFAULT_SESSION_ID || '';

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ============================================================
// 常量定义
// ============================================================
const JIMENG_BASE_URL = 'https://jimeng.jianying.com';
const DEFAULT_ASSISTANT_ID = 513695;
const VERSION_CODE = '8.4.0';
const PLATFORM_CODE = '7';
const WEB_ID = Math.random() * 999999999999999999 + 7000000000000000000;
const USER_ID = crypto.randomUUID().replace(/-/g, '');

const FAKE_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-language': 'zh-CN,zh;q=0.9',
  'App-Sdk-Version': '48.0.0',
  'Cache-control': 'no-cache',
  Appid: String(DEFAULT_ASSISTANT_ID),
  Appvr: VERSION_CODE,
  Lan: 'zh-Hans',
  Loc: 'cn',
  Origin: 'https://jimeng.jianying.com',
  Pragma: 'no-cache',
  Priority: 'u=1, i',
  Referer: 'https://jimeng.jianying.com',
  Pf: PLATFORM_CODE,
  'Sec-Ch-Ua':
    '"Google Chrome";v="132", "Chromium";v="132", "Not_A Brand";v="8"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
};

// 模型映射
const MODEL_MAP = {
  'seedance-2.0': 'dreamina_seedance_40_pro',
  'seedance-2.0-fast': 'dreamina_seedance_40',
};

const BENEFIT_TYPE_MAP = {
  'seedance-2.0': 'dreamina_video_seedance_20_pro',
  'seedance-2.0-fast': 'dreamina_seedance_20_fast',
};

const SEEDANCE_DRAFT_VERSION = '3.3.9';

// 分辨率配置
const VIDEO_RESOLUTION = {
  '1:1': { width: 720, height: 720 },
  '4:3': { width: 960, height: 720 },
  '3:4': { width: 720, height: 960 },
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '21:9': { width: 1680, height: 720 },
};

// ============================================================
// 异步任务管理
// ============================================================
const tasks = new Map();
let taskCounter = 0;

function createTaskId() {
  return `task_${++taskCounter}_${Date.now()}`;
}

// 定期清理过期任务
setInterval(() => {
  const now = Date.now();
  for (const [id, task] of tasks) {
    if (now - task.startTime > 30 * 60 * 1000) {
      tasks.delete(id);
    }
  }
}, 60000);

// ============================================================
// 工具函数
// ============================================================
function generateUUID() {
  return crypto.randomUUID();
}

function unixTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function md5(value) {
  return crypto.createHash('md5').update(value).digest('hex');
}

function generateCookie(sessionId) {
  return [
    `_tea_web_id=${WEB_ID}`,
    `is_staff_user=false`,
    `store-region=cn-gd`,
    `store-region-src=uid`,
    `uid_tt=${USER_ID}`,
    `uid_tt_ss=${USER_ID}`,
    `sid_tt=${sessionId}`,
    `sessionid=${sessionId}`,
    `sessionid_ss=${sessionId}`,
  ].join('; ');
}

function generateSign(uri) {
  const deviceTime = unixTimestamp();
  const sign = md5(
    `9e2c|${uri.slice(-7)}|${PLATFORM_CODE}|${VERSION_CODE}|${deviceTime}||11ac`
  );
  return { deviceTime, sign };
}

// ============================================================
// 即梦 API 请求函数
// ============================================================
async function jimengRequest(method, uri, sessionId, options = {}) {
  const { deviceTime, sign } = generateSign(uri);
  const fullUrl = new URL(`${JIMENG_BASE_URL}${uri}`);

  const defaultParams = {
    aid: DEFAULT_ASSISTANT_ID,
    device_platform: 'web',
    region: 'cn',
    webId: WEB_ID,
    da_version: '3.3.2',
    web_component_open_flag: 1,
    web_version: '7.5.0',
    aigc_features: 'app_lip_sync',
    ...(options.params || {}),
  };

  for (const [key, value] of Object.entries(defaultParams)) {
    fullUrl.searchParams.set(key, String(value));
  }

  const headers = {
    ...FAKE_HEADERS,
    Cookie: generateCookie(sessionId),
    'Device-Time': String(deviceTime),
    Sign: sign,
    'Sign-Ver': '1',
    ...(options.headers || {}),
  };

  const fetchOptions = { method: method.toUpperCase(), headers };

  if (options.data) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.data);
  }

  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        console.log(`  [jimeng] 重试 ${uri} (第${attempt}次)`);
      }

      const response = await fetch(fullUrl.toString(), {
        ...fetchOptions,
        signal: AbortSignal.timeout(45000),
      });
      const data = await response.json();

      if (isFinite(Number(data.ret))) {
        if (String(data.ret) === '0') return data.data;
        // API 业务错误不重试，直接抛出
        const errMsg = data.errmsg || String(data.ret);
        const retCode = String(data.ret);
        if (retCode === '5000')
          throw new Error('即梦积分不足，请前往即梦官网领取积分');
        throw Object.assign(
          new Error(`即梦API错误 (ret=${retCode}): ${errMsg}`),
          { isApiError: true }
        );
      }

      return data;
    } catch (err) {
      // API 业务错误（非网络问题）不重试
      if (err.isApiError) throw err;
      if (attempt === 3) throw err;
      console.log(
        `  [jimeng] 请求 ${uri} 失败 (第${attempt + 1}次): ${err.message}`
      );
    }
  }
}

// ============================================================
// AWS4-HMAC-SHA256 签名
// ============================================================
function createAWSSignature(
  method,
  url,
  headers,
  accessKeyId,
  secretAccessKey,
  sessionToken,
  payload = ''
) {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname || '/';

  const timestamp = headers['x-amz-date'];
  const date = timestamp.substr(0, 8);
  const region = 'cn-north-1';
  const service = 'imagex';

  // 规范化查询参数
  const queryParams = [];
  urlObj.searchParams.forEach((value, key) => {
    queryParams.push([key, value]);
  });
  queryParams.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const canonicalQueryString = queryParams
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  // 签名头部
  const headersToSign = { 'x-amz-date': timestamp };
  if (sessionToken)
    headersToSign['x-amz-security-token'] = sessionToken;

  let payloadHash = crypto.createHash('sha256').update('').digest('hex');
  if (method.toUpperCase() === 'POST' && payload) {
    payloadHash = crypto
      .createHash('sha256')
      .update(payload, 'utf8')
      .digest('hex');
    headersToSign['x-amz-content-sha256'] = payloadHash;
  }

  const signedHeaders = Object.keys(headersToSign)
    .map((k) => k.toLowerCase())
    .sort()
    .join(';');
  const canonicalHeaders = Object.keys(headersToSign)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => `${k.toLowerCase()}:${headersToSign[k].trim()}\n`)
    .join('');

  const canonicalRequest = [
    method.toUpperCase(),
    pathname,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    credentialScope,
    crypto
      .createHash('sha256')
      .update(canonicalRequest, 'utf8')
      .digest('hex'),
  ].join('\n');

  const kDate = crypto
    .createHmac('sha256', `AWS4${secretAccessKey}`)
    .update(date)
    .digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto
    .createHmac('sha256', kRegion)
    .update(service)
    .digest();
  const kSigning = crypto
    .createHmac('sha256', kService)
    .update('aws4_request')
    .digest();
  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign, 'utf8')
    .digest('hex');

  return `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

// ============================================================
// CRC32 计算
// ============================================================
function calculateCRC32(buffer) {
  const crcTable = [];
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    crcTable[i] = crc;
  }

  let crc = 0 ^ -1;
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
  }
  return ((crc ^ -1) >>> 0).toString(16).padStart(8, '0');
}

// ============================================================
// 图片上传 (4步 ImageX 流程)
// ============================================================
async function uploadImageBuffer(buffer, sessionId) {
  console.log(`  [upload] 开始上传图片, 大小: ${buffer.length} 字节`);

  // 第1步: 获取上传令牌
  const tokenResult = await jimengRequest(
    'post',
    '/mweb/v1/get_upload_token',
    sessionId,
    { data: { scene: 2 } }
  );

  const { access_key_id, secret_access_key, session_token, service_id } =
    tokenResult;
  if (!access_key_id || !secret_access_key || !session_token) {
    throw new Error('获取上传令牌失败');
  }
  const actualServiceId = service_id || 'tb4s082cfz';
  console.log(`  [upload] 上传令牌获取成功: serviceId=${actualServiceId}`);

  const fileSize = buffer.length;
  const crc32 = calculateCRC32(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  );

  // 第2步: 申请上传权限
  const timestamp = new Date()
    .toISOString()
    .replace(/[:\-]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const randomStr = Math.random().toString(36).substring(2, 12);
  const applyUrl = `https://imagex.bytedanceapi.com/?Action=ApplyImageUpload&Version=2018-08-01&ServiceId=${actualServiceId}&FileSize=${fileSize}&s=${randomStr}`;

  const reqHeaders = {
    'x-amz-date': timestamp,
    'x-amz-security-token': session_token,
  };
  const authorization = createAWSSignature(
    'GET',
    applyUrl,
    reqHeaders,
    access_key_id,
    secret_access_key,
    session_token
  );

  const applyResponse = await fetch(applyUrl, {
    method: 'GET',
    headers: {
      accept: '*/*',
      authorization: authorization,
      origin: 'https://jimeng.jianying.com',
      referer: 'https://jimeng.jianying.com/ai-tool/video/generate',
      'user-agent': FAKE_HEADERS['User-Agent'],
      'x-amz-date': timestamp,
      'x-amz-security-token': session_token,
    },
  });

  if (!applyResponse.ok)
    throw new Error(`申请上传权限失败: ${applyResponse.status}`);
  const applyResult = await applyResponse.json();
  if (applyResult?.ResponseMetadata?.Error)
    throw new Error(
      `申请上传权限失败: ${JSON.stringify(applyResult.ResponseMetadata.Error)}`
    );

  const uploadAddress = applyResult?.Result?.UploadAddress;
  if (!uploadAddress?.StoreInfos?.length || !uploadAddress?.UploadHosts?.length) {
    throw new Error('获取上传地址失败');
  }

  const storeInfo = uploadAddress.StoreInfos[0];
  const uploadHost = uploadAddress.UploadHosts[0];
  const uploadUrl = `https://${uploadHost}/upload/v1/${storeInfo.StoreUri}`;

  console.log(`  [upload] 上传图片到: ${uploadHost}`);

  // 第3步: 上传图片文件
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Accept: '*/*',
      Authorization: storeInfo.Auth,
      'Content-CRC32': crc32,
      'Content-Disposition': 'attachment; filename="undefined"',
      'Content-Type': 'application/octet-stream',
      Origin: 'https://jimeng.jianying.com',
      Referer: 'https://jimeng.jianying.com/ai-tool/video/generate',
      'User-Agent': FAKE_HEADERS['User-Agent'],
    },
    body: buffer,
  });

  if (!uploadResponse.ok)
    throw new Error(`图片上传失败: ${uploadResponse.status}`);
  console.log(`  [upload] 图片文件上传成功`);

  // 第4步: 提交上传
  const commitUrl = `https://imagex.bytedanceapi.com/?Action=CommitImageUpload&Version=2018-08-01&ServiceId=${actualServiceId}`;
  const commitTimestamp = new Date()
    .toISOString()
    .replace(/[:\-]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const commitPayload = JSON.stringify({
    SessionKey: uploadAddress.SessionKey,
    SuccessActionStatus: '200',
  });
  const payloadHash = crypto
    .createHash('sha256')
    .update(commitPayload, 'utf8')
    .digest('hex');

  const commitReqHeaders = {
    'x-amz-date': commitTimestamp,
    'x-amz-security-token': session_token,
    'x-amz-content-sha256': payloadHash,
  };
  const commitAuth = createAWSSignature(
    'POST',
    commitUrl,
    commitReqHeaders,
    access_key_id,
    secret_access_key,
    session_token,
    commitPayload
  );

  const commitResponse = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      accept: '*/*',
      authorization: commitAuth,
      'content-type': 'application/json',
      origin: 'https://jimeng.jianying.com',
      referer: 'https://jimeng.jianying.com/ai-tool/video/generate',
      'user-agent': FAKE_HEADERS['User-Agent'],
      'x-amz-date': commitTimestamp,
      'x-amz-security-token': session_token,
      'x-amz-content-sha256': payloadHash,
    },
    body: commitPayload,
  });

  if (!commitResponse.ok)
    throw new Error(`提交上传失败: ${commitResponse.status}`);
  const commitResult = await commitResponse.json();
  if (commitResult?.ResponseMetadata?.Error)
    throw new Error(
      `提交上传失败: ${JSON.stringify(commitResult.ResponseMetadata.Error)}`
    );

  if (!commitResult?.Result?.Results?.length)
    throw new Error('提交上传响应缺少结果');
  const result = commitResult.Result.Results[0];
  if (result.UriStatus !== 2000)
    throw new Error(`图片上传状态异常: UriStatus=${result.UriStatus}`);

  const imageUri =
    commitResult.Result?.PluginResult?.[0]?.ImageUri || result.Uri;
  console.log(`  [upload] 图片上传完成: ${imageUri}`);
  return imageUri;
}

// ============================================================
// 解析 prompt 中的图片占位符, 构建 meta_list
// ============================================================
function buildMetaListFromPrompt(prompt, imageCount) {
  const metaList = [];
  const placeholderRegex = /@(?:图|image)?(\d+)/gi;
  let lastIndex = 0;
  let match;

  while ((match = placeholderRegex.exec(prompt)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = prompt.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        metaList.push({ meta_type: 'text', text: textBefore });
      }
    }

    const imageIndex = parseInt(match[1]) - 1;
    if (imageIndex >= 0 && imageIndex < imageCount) {
      metaList.push({
        meta_type: 'image',
        text: '',
        material_ref: { material_idx: imageIndex },
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < prompt.length) {
    const remainingText = prompt.substring(lastIndex);
    if (remainingText.trim()) {
      metaList.push({ meta_type: 'text', text: remainingText });
    }
  }

  // 如果没有占位符, 构建默认 meta_list
  if (metaList.length === 0) {
    for (let i = 0; i < imageCount; i++) {
      if (i === 0) metaList.push({ meta_type: 'text', text: '使用' });
      metaList.push({
        meta_type: 'image',
        text: '',
        material_ref: { material_idx: i },
      });
      if (i < imageCount - 1)
        metaList.push({ meta_type: 'text', text: '和' });
    }
    if (prompt && prompt.trim()) {
      metaList.push({ meta_type: 'text', text: `图片，${prompt}` });
    } else {
      metaList.push({ meta_type: 'text', text: '图片生成视频' });
    }
  }

  return metaList;
}

// ============================================================
// Seedance 2.0 视频生成 (完整流程)
// ============================================================
async function generateSeedanceVideo(
  taskId,
  { prompt, ratio, duration, files, sessionId, model: requestModel }
) {
  const task = tasks.get(taskId);
  const modelKey = requestModel && MODEL_MAP[requestModel] ? requestModel : 'seedance-2.0';
  const model = MODEL_MAP[modelKey];
  const benefitType = BENEFIT_TYPE_MAP[modelKey];
  const actualDuration = duration || 4;

  const resConfig = VIDEO_RESOLUTION[ratio] || VIDEO_RESOLUTION['4:3'];
  const { width, height } = resConfig;

  console.log(
    `[${taskId}] ${modelKey}: ${width}x${height} (${ratio}) ${actualDuration}秒`
  );

  // 第1步: 上传图片
  task.progress = '正在上传参考图片...';
  const uploadedImages = [];

  for (let i = 0; i < files.length; i++) {
    task.progress = `正在上传第 ${i + 1}/${files.length} 张图片...`;
    console.log(
      `[${taskId}] 上传图片 ${i + 1}/${files.length}: ${files[i].originalname} (${(files[i].size / 1024).toFixed(1)}KB)`
    );

    const imageUri = await uploadImageBuffer(files[i].buffer, sessionId);
    uploadedImages.push({ uri: imageUri, width, height });
    console.log(`[${taskId}] 图片 ${i + 1} 上传成功`);
  }

  console.log(
    `[${taskId}] 全部 ${uploadedImages.length} 张图片上传完成`
  );

  // 第2步: 构建 material_list 和 meta_list
  const materialList = uploadedImages.map((img) => ({
    type: '',
    id: generateUUID(),
    material_type: 'image',
    image_info: {
      type: 'image',
      id: generateUUID(),
      source_from: 'upload',
      platform_type: 1,
      name: '',
      image_uri: img.uri,
      aigc_image: {
        type: '',
        id: generateUUID(),
      },
      width: img.width,
      height: img.height,
      format: '',
      uri: img.uri,
    },
  }));

  const metaList = buildMetaListFromPrompt(prompt || '', uploadedImages.length);

  const componentId = generateUUID();
  const submitId = generateUUID();

  // 计算视频宽高比
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const aspectRatio = `${width / divisor}:${height / divisor}`;

  const metricsExtra = JSON.stringify({
    isDefaultSeed: 1,
    originSubmitId: submitId,
    isRegenerate: false,
    enterFrom: 'click',
    position: 'page_bottom_box',
    functionMode: 'omni_reference',
    sceneOptions: JSON.stringify([
      {
        type: 'video',
        scene: 'BasicVideoGenerateButton',
        modelReqKey: model,
        videoDuration: actualDuration,
        reportParams: {
          enterSource: 'generate',
          vipSource: 'generate',
          extraVipFunctionKey: model,
          useVipFunctionDetailsReporterHoc: true,
        },
        materialTypes: [1],
      },
    ]),
  });

  // 第3步: 提交生成请求 (通过浏览器代理绕过 shark 反爬)
  task.progress = '正在提交视频生成请求...';
  console.log(`[${taskId}] 提交生成请求: model=${model}, benefitType=${benefitType}`);

  const generateQueryParams = new URLSearchParams({
    aid: String(DEFAULT_ASSISTANT_ID),
    device_platform: 'web',
    region: 'cn',
    webId: String(WEB_ID),
    da_version: SEEDANCE_DRAFT_VERSION,
    web_component_open_flag: '1',
    web_version: '7.5.0',
    aigc_features: 'app_lip_sync',
  });
  const generateUrl = `${JIMENG_BASE_URL}/mweb/v1/aigc_draft/generate?${generateQueryParams}`;

  const generateBody = {
    extend: {
      root_model: model,
      m_video_commerce_info: {
        benefit_type: benefitType,
        resource_id: 'generate_video',
        resource_id_type: 'str',
        resource_sub_type: 'aigc',
      },
      m_video_commerce_info_list: [
        {
          benefit_type: benefitType,
          resource_id: 'generate_video',
          resource_id_type: 'str',
          resource_sub_type: 'aigc',
        },
      ],
    },
    submit_id: submitId,
    metrics_extra: metricsExtra,
    draft_content: JSON.stringify({
      type: 'draft',
      id: generateUUID(),
      min_version: SEEDANCE_DRAFT_VERSION,
      min_features: ['AIGC_Video_UnifiedEdit'],
      is_from_tsn: true,
      version: SEEDANCE_DRAFT_VERSION,
      main_component_id: componentId,
      component_list: [
        {
          type: 'video_base_component',
          id: componentId,
          min_version: '1.0.0',
          aigc_mode: 'workbench',
          metadata: {
            type: '',
            id: generateUUID(),
            created_platform: 3,
            created_platform_version: '',
            created_time_in_ms: String(Date.now()),
            created_did: '',
          },
          generate_type: 'gen_video',
          abilities: {
            type: '',
            id: generateUUID(),
            gen_video: {
              type: '',
              id: generateUUID(),
              text_to_video_params: {
                type: '',
                id: generateUUID(),
                video_gen_inputs: [
                  {
                    type: '',
                    id: generateUUID(),
                    min_version: SEEDANCE_DRAFT_VERSION,
                    prompt: '',
                    video_mode: 2,
                    fps: 24,
                    duration_ms: actualDuration * 1000,
                    idip_meta_list: [],
                    unified_edit_input: {
                      type: '',
                      id: generateUUID(),
                      material_list: materialList,
                      meta_list: metaList,
                    },
                  },
                ],
                video_aspect_ratio: aspectRatio,
                seed: Math.floor(Math.random() * 1000000000),
                model_req_key: model,
                priority: 0,
              },
              video_task_extra: metricsExtra,
            },
          },
          process_type: 1,
        },
      ],
    }),
    http_common_info: {
      aid: DEFAULT_ASSISTANT_ID,
    },
  };

  const generateResult = await browserService.fetch(
    sessionId,
    WEB_ID,
    USER_ID,
    generateUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(generateBody),
    }
  );

  // 解析浏览器代理返回的结果
  if (generateResult.ret !== undefined && String(generateResult.ret) !== '0') {
    const retCode = String(generateResult.ret);
    const errMsg = generateResult.errmsg || retCode;
    if (retCode === '5000') throw new Error('即梦积分不足，请前往即梦官网领取积分');
    throw new Error(`即梦API错误 (ret=${retCode}): ${errMsg}`);
  }

  const aigcData = generateResult.data?.aigc_data;
  const historyId = aigcData?.history_record_id;
  if (!historyId) throw new Error('未获取到记录ID');

  console.log(`[${taskId}] 生成请求已提交, historyId: ${historyId}`);

  // 第4步: 轮询获取结果
  task.progress = '已提交，等待AI生成视频...';
  await new Promise((r) => setTimeout(r, 5000));

  let status = 20;
  let failCode;
  let itemList = [];
  const maxRetries = 60;

  for (let retryCount = 0; retryCount < maxRetries && status === 20; retryCount++) {
    try {
      const result = await jimengRequest(
        'post',
        '/mweb/v1/get_history_by_ids',
        sessionId,
        { data: { history_ids: [historyId] } }
      );

      const historyData = result?.history_list?.[0] || result?.[historyId];

      if (!historyData) {
        const waitTime = Math.min(2000 * (retryCount + 1), 30000);
        console.log(
          `[${taskId}] 轮询 #${retryCount + 1}: 数据不存在，等待 ${waitTime}ms`
        );
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }

      status = historyData.status;
      failCode = historyData.fail_code;
      itemList = historyData.item_list || [];

      const elapsed = Math.floor((Date.now() - task.startTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;

      console.log(
        `[${taskId}] 轮询 #${retryCount + 1}: status=${status}, ${mins}分${secs}秒`
      );

      if (status === 30) {
        throw new Error(
          failCode === 2038
            ? '内容被过滤，请修改提示词后重试'
            : `视频生成失败，错误码: ${failCode}`
        );
      }

      if (status === 20) {
        if (elapsed < 120) {
          task.progress = 'AI正在生成视频，请耐心等待...';
        } else {
          task.progress = `视频生成中，已等待 ${mins} 分钟...`;
        }
        const waitTime = 2000 * Math.min(retryCount + 1, 5);
        await new Promise((r) => setTimeout(r, waitTime));
      }
    } catch (error) {
      if (
        error.message?.includes('内容被过滤') ||
        error.message?.includes('生成失败')
      )
        throw error;
      console.log(`[${taskId}] 轮询出错: ${error.message}`);
      await new Promise((r) => setTimeout(r, 2000 * (retryCount + 1)));
    }
  }

  if (status === 20)
    throw new Error('视频生成超时 (约20分钟)，请稍后重试');

  // 第5步: 获取高清视频URL
  task.progress = '正在获取高清视频...';
  const itemId =
    itemList?.[0]?.item_id ||
    itemList?.[0]?.id ||
    itemList?.[0]?.local_item_id ||
    itemList?.[0]?.common_attr?.id;

  if (itemId) {
    try {
      const hqResult = await jimengRequest(
        'post',
        '/mweb/v1/get_local_item_list',
        sessionId,
        {
          data: {
            item_id_list: [String(itemId)],
            pack_item_opt: { scene: 1, need_data_integrity: true },
            is_for_video_download: true,
          },
        }
      );

      const hqItemList =
        hqResult?.item_list || hqResult?.local_item_list || [];
      const hqItem = hqItemList[0];
      const hqUrl =
        hqItem?.video?.transcoded_video?.origin?.video_url ||
        hqItem?.video?.download_url ||
        hqItem?.video?.play_url ||
        hqItem?.video?.url;

      if (hqUrl) {
        console.log(`[${taskId}] 高清视频URL获取成功`);
        return hqUrl;
      }

      // 正则匹配兜底
      const responseStr = JSON.stringify(hqResult);
      const urlMatch =
        responseStr.match(
          /https:\/\/v[0-9]+-dreamnia\.jimeng\.com\/[^"\s\\]+/
        ) ||
        responseStr.match(
          /https:\/\/v[0-9]+-[^"\\]*\.jimeng\.com\/[^"\s\\]+/
        );
      if (urlMatch?.[0]) {
        console.log(`[${taskId}] 正则提取到高清视频URL`);
        return urlMatch[0];
      }
    } catch (err) {
      console.log(
        `[${taskId}] 获取高清URL失败，使用预览URL: ${err.message}`
      );
    }
  }

  // 回退使用预览URL
  const videoUrl =
    itemList?.[0]?.video?.transcoded_video?.origin?.video_url ||
    itemList?.[0]?.video?.play_url ||
    itemList?.[0]?.video?.download_url ||
    itemList?.[0]?.video?.url;

  if (!videoUrl) throw new Error('未能获取视频URL');

  console.log(`[${taskId}] 视频URL (预览): ${videoUrl}`);
  return videoUrl;
}

// ============================================================
// Express 路由
// ============================================================

// POST /api/generate-video - 提交任务, 立即返回 taskId
app.post('/api/generate-video', upload.array('files', 5), async (req, res) => {
  const startTime = Date.now();

  try {
    const { prompt, ratio, duration, sessionId, model } = req.body;
    const files = req.files;

    // 认证检查
    const authToken = sessionId || DEFAULT_SESSION_ID;
    if (!authToken) {
      return res
        .status(401)
        .json({ error: '未配置 Session ID，请在设置中填写' });
    }

    // Seedance 2.0 需要至少一张图片
    if (!Array.isArray(files) || files.length === 0) {
      return res
        .status(400)
        .json({ error: 'Seedance 2.0 需要至少上传一张参考图片' });
    }

    // 创建任务
    const taskId = createTaskId();
    const task = {
      id: taskId,
      status: 'processing',
      progress: '正在准备...',
      startTime,
      result: null,
      error: null,
    };
    tasks.set(taskId, task);

    console.log(`\n========== [${taskId}] 收到视频生成请求 ==========`);
    console.log(`  prompt: ${(prompt || '').substring(0, 80)}${(prompt || '').length > 80 ? '...' : ''}`);
    console.log(`  model: ${model || 'seedance-2.0'}, ratio: ${ratio || '4:3'}, duration: ${duration || 4}秒`);
    console.log(`  files: ${files.length}张`);
    files.forEach((f, i) => {
      console.log(
        `  file[${i}]: ${f.originalname} (${f.mimetype}, ${(f.size / 1024).toFixed(1)}KB)`
      );
    });

    // 立即返回 taskId
    res.json({ taskId });

    // 后台执行视频生成
    generateSeedanceVideo(taskId, {
      prompt,
      ratio: ratio || '4:3',
      duration: parseInt(duration) || 4,
      files,
      sessionId: authToken,
      model: model || 'seedance-2.0',
    })
      .then((videoUrl) => {
        task.status = 'done';
        task.result = {
          created: Math.floor(Date.now() / 1000),
          data: [{ url: videoUrl, revised_prompt: prompt || '' }],
        };
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(
          `========== [${taskId}] ✅ 视频生成成功 (${elapsed}秒) ==========\n`
        );
      })
      .catch((err) => {
        task.status = 'error';
        task.error = err.message || '视频生成失败';
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(
          `========== [${taskId}] ❌ 视频生成失败 (${elapsed}秒): ${err.message} ==========\n`
        );
      });
  } catch (error) {
    console.error(`请求处理错误: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || '服务器内部错误' });
    }
  }
});

// GET /api/task/:taskId - 轮询任务状态
app.get('/api/task/:taskId', (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }

  const elapsed = Math.floor((Date.now() - task.startTime) / 1000);

  if (task.status === 'done') {
    res.json({ status: 'done', elapsed, result: task.result });
    setTimeout(() => tasks.delete(task.id), 300000);
    return;
  }

  if (task.status === 'error') {
    res.json({ status: 'error', elapsed, error: task.error });
    setTimeout(() => tasks.delete(task.id), 300000);
    return;
  }

  res.json({ status: 'processing', elapsed, progress: task.progress });
});

// GET /api/video-proxy - 代理视频流，绕过 CDN 跨域限制
app.get('/api/video-proxy', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: '缺少 url 参数' });
  }

  try {
    console.log(`[video-proxy] 代理视频: ${videoUrl.substring(0, 100)}...`);

    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': FAKE_HEADERS['User-Agent'],
        Referer: 'https://jimeng.jianying.com/',
      },
    });

    if (!response.ok) {
      console.error(`[video-proxy] 上游错误: ${response.status}`);
      return res.status(response.status).json({ error: `视频获取失败: ${response.status}` });
    }

    // 转发响应头
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    const contentLength = response.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // 流式转发视频数据
    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); return; }
        if (!res.write(value)) {
          await new Promise((r) => res.once('drain', r));
        }
      }
    };
    pump().catch((err) => {
      console.error(`[video-proxy] 流传输错误: ${err.message}`);
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
  } catch (error) {
    console.error(`[video-proxy] 错误: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: '视频代理失败' });
    }
  }
});

// multer 错误处理
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(413).json({ error: '文件大小超过限制 (最大20MB)' });
    if (err.code === 'LIMIT_FILE_COUNT')
      return res.status(400).json({ error: '文件数量超过限制 (最多5个)' });
    return res.status(400).json({ error: `上传错误: ${err.message}` });
  }
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: 'direct-jimeng-api' });
});

// 生产模式: 提供前端静态文件
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 优雅关闭: 清理浏览器进程
process.on('SIGTERM', () => {
  console.log('[server] 收到 SIGTERM，正在关闭...');
  browserService.close().finally(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[server] 收到 SIGINT，正在关闭...');
  browserService.close().finally(() => process.exit(0));
});

app.listen(PORT, () => {
  console.log(`\n🚀 服务器已启动: http://localhost:${PORT}`);
  console.log(`🔗 直连即梦 API (jimeng.jianying.com)`);
  console.log(
    `🔑 默认 Session ID: ${DEFAULT_SESSION_ID ? `已配置 (长度${DEFAULT_SESSION_ID.length})` : '未配置'}`
  );
  console.log(
    `📁 运行模式: ${process.env.NODE_ENV === 'production' ? '生产' : '开发'}\n`
  );
});

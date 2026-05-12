const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * 上传图片到腾讯云 COS (使用原生 fetch)
 * 签名算法参考: https://cloud.tencent.com/document/product/436/7778
 */
async function uploadImage(fileBuffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const key = `chat-images/${uuidv4()}${ext}`;

  const secretId = process.env.COS_SECRET_ID;
  const secretKey = process.env.COS_SECRET_KEY;
  const bucket = process.env.COS_BUCKET;
  const region = process.env.COS_REGION;

  if (!secretId || !secretKey || !bucket || !region) {
    throw new Error('COS 配置不完整，请检查环境变量');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;
  const signTime = `${now};${exp}`;

  // 构建 HTTP 字符串 (注意: header 用 = 分隔，不是 :)
  const httpString = [
    'put',
    `/${key}`,
    '',
    `host=${bucket}.cos.${region}.myqcloud.com`,
    '',
  ].join('\n');

  // 计算 HTTP 字符串的 SHA1
  const httpSha1 = crypto.createHash('sha1').update(httpString).digest('hex');

  // 拼接 StringToSign
  const stringToSign = [
    'sha1',
    signTime,
    httpSha1,
    '',
  ].join('\n');

  // SignKey = HMAC-SHA1(SecretKey, q-sign-time)
  const signKey = crypto.createHmac('sha1', secretKey).update(signTime).digest('hex');

  // Signature = HMAC-SHA1(SignKey, StringToSign)
  const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex');

  const url = `https://${bucket}.cos.${region}.myqcloud.com/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

  console.log('[COS] HTTP String:', JSON.stringify(httpString));
  console.log('[COS] HTTP SHA1:', httpSha1);
  console.log('[COS] StringToSign:', JSON.stringify(stringToSign));

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Host': `${bucket}.cos.${region}.myqcloud.com`,
      'Authorization': `q-sign-algorithm=sha1&q-ak=${secretId}&q-sign-time=${signTime}&q-key-time=${signTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`,
      'Content-Type': getMimeType(ext),
      'Content-Length': fileBuffer.length,
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('[COS] 上传失败响应:', errorText);
    throw new Error(`COS 上传失败: ${response.status}`);
  }

  return `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
}

function getMimeType(ext) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

function isValidImageType(mimeType) {
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType);
}

function isValidFileSize(size, maxSize = 5 * 1024 * 1024) {
  return size <= maxSize;
}

module.exports = {
  uploadImage,
  isValidImageType,
  isValidFileSize,
};
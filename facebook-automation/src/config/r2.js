const { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const config = require('./env');
const logger = require('./logger');

let r2Client = null;

if (config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey
    }
  });
} else {
  logger.warn('Cloudflare R2 credentials incomplete. Operating with mock R2 client.');
}

class R2Service {
  constructor() {
    this.client = r2Client;
    this.bucket = config.r2.bucketName;
    this.publicBaseUrl = config.r2.publicBaseUrl.replace(/\/$/, '');
  }

  getPublicUrl(storageKey) {
    const cleanKey = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
    const encodedKey = cleanKey.split('/').map(segment => encodeURIComponent(segment)).join('/');
    return `${this.publicBaseUrl}/${encodedKey}`;
  }

  async exists(storageKey) {
    if (!this.client) return true; // Mock fallback
    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storageKey
      }));
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  async upload(storageKey, body, contentType) {
    if (!this.client) {
      return { storageKey, cdnUrl: this.getPublicUrl(storageKey) };
    }
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType
    }));
    return {
      storageKey,
      cdnUrl: this.getPublicUrl(storageKey)
    };
  }

  async delete(storageKey) {
    if (!this.client) return true;
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: storageKey
    }));
    return true;
  }

  async list(prefix = '') {
    if (!this.client) return [];
    const res = await this.client.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix
    }));
    return res.Contents || [];
  }

  async download(storageKey) {
    if (!this.client) return null;
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey
    }));
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return {
      buffer: Buffer.concat(chunks),
      contentType: response.ContentType,
      contentLength: response.ContentLength
    };
  }
}

module.exports = new R2Service();

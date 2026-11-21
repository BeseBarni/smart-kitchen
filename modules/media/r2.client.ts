import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
  presignPutTtlSeconds: number;
}

export interface R2ObjectHead {
  contentType?: string;
  contentLength?: number;
}

export function readR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required.");
  }
  const ttl = Number(process.env.R2_PRESIGN_PUT_TTL_SECONDS ?? "120");
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket: process.env.R2_UPLOADS_BUCKET ?? "smart-kitchen-static",
    publicUrl: process.env.R2_UPLOADS_PUBLIC_URL?.replace(/\/$/, ""),
    presignPutTtlSeconds: Number.isFinite(ttl) ? Math.min(120, Math.max(90, ttl)) : 120,
  };
}

function createClient(config: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function createPresignedPutUrl(
  config: R2Config,
  input: {
    key: string;
    contentType: string;
    contentLength: number;
  },
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
    CacheControl: "public, max-age=31536000, immutable",
  });
  return getSignedUrl(createClient(config), command, { expiresIn: config.presignPutTtlSeconds });
}

export async function headObject(config: R2Config, key: string): Promise<R2ObjectHead> {
  const result = await createClient(config).send(new HeadObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }));
  return {
    contentType: result.ContentType,
    contentLength: result.ContentLength,
  };
}

export async function getObjectBuffer(
  config: R2Config,
  key: string,
): Promise<{ bytes: Uint8Array; mimeType?: string }> {
  const result = await createClient(config).send(new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }));
  if (!result.Body) throw new Error("R2 returned an empty object body.");
  const body = result.Body as { transformToByteArray(): Promise<Uint8Array> };
  return { bytes: await body.transformToByteArray(), mimeType: result.ContentType };
}

export async function createPresignedGetUrl(
  config: R2Config,
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  return getSignedUrl(createClient(config), new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }), { expiresIn: expiresInSeconds });
}

export async function deleteObject(config: R2Config, key: string): Promise<void> {
  await createClient(config).send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }));
}

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

const endpoint = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000'
const region = process.env.MINIO_REGION ?? 'us-east-1'
const accessKey = process.env.MINIO_ACCESS_KEY ?? 'minioadmin'
const secretKey = process.env.MINIO_SECRET_KEY ?? 'minioadmin'
export const bucket = process.env.MINIO_BUCKET ?? 'smarty-uploads'

let client: S3Client | null = null

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: true,
    })
  }
  return client
}

/**
 * Upload a file to MinIO. Returns the public URL.
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  return `${endpoint}/${bucket}/${key}`
}

/**
 * Delete a file from MinIO.
 */
export async function deleteFile(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )
}

/**
 * Build the public URL for a given key.
 */
export function getPublicUrl(key: string): string {
  return `${endpoint}/${bucket}/${key}`
}

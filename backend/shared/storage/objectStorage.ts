import fs from "node:fs/promises";
import path from "node:path";
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { catalogConfig } from "../config.js";

export interface StoredObjectMeta {
  objectKey: string;
  sizeBytes: number;
}

export interface ObjectStorage {
  putObject(objectKey: string, body: Buffer, contentType: string): Promise<StoredObjectMeta>;
}

export class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly rootDir: string) {}

  async putObject(objectKey: string, body: Buffer): Promise<StoredObjectMeta> {
    const targetPath = path.join(this.rootDir, objectKey);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, body);
    return {
      objectKey,
      sizeBytes: body.byteLength,
    };
  }
}

export class S3CompatibleObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private bucketReady = false;

  constructor() {
    this.client = new S3Client({
      endpoint: catalogConfig.storage.endpoint,
      region: catalogConfig.storage.region,
      forcePathStyle: catalogConfig.storage.forcePathStyle,
      credentials:
        catalogConfig.storage.accessKey && catalogConfig.storage.secretKey
          ? {
              accessKeyId: catalogConfig.storage.accessKey,
              secretAccessKey: catalogConfig.storage.secretKey,
            }
          : undefined,
    });
  }

  async putObject(objectKey: string, body: Buffer, contentType: string): Promise<StoredObjectMeta> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: catalogConfig.storage.bucket,
        Key: objectKey,
        Body: body,
        ContentType: contentType,
      }),
    );

    return {
      objectKey,
      sizeBytes: body.byteLength,
    };
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: catalogConfig.storage.bucket,
        }),
      );
    } catch {
      await this.client.send(
        new CreateBucketCommand({
          Bucket: catalogConfig.storage.bucket,
        }),
      );
    }
    this.bucketReady = true;
  }
}

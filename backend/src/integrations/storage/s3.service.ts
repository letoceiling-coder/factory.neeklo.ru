import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ProviderCredentialsService } from '../provider-credentials.service';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;
  private bucket = 'botme';
  private publicBaseUrl: string | null = null;

  constructor(private readonly creds: ProviderCredentialsService) {}

  private async getClient(): Promise<S3Client> {
    if (this.client) return this.client;
    const { apiKey, config } = await this.creds.resolve('selectel');
    this.bucket = config.bucket || 'botme';
    this.publicBaseUrl = config.publicBaseUrl || null;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || 'ru-3',
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: apiKey || '',
      },
      forcePathStyle: true,
    });
    return this.client;
  }

  async upload(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
    const client = await this.getClient();
    await client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
    return key;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.publicBaseUrl) return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
    const client = await this.getClient();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn });
  }

  async getObject(key: string): Promise<Buffer> {
    const client = await this.getClient();
    const res = await client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async list(prefix?: string): Promise<{ key: string; size: number }[]> {
    const client = await this.getClient();
    const res = await client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }));
    return (res.Contents || []).map((o) => ({ key: o.Key!, size: o.Size || 0 }));
  }
}

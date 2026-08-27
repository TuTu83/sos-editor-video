/// <reference types="@cloudflare/workers-types" />
import type { R2Bucket, D1Database } from '@cloudflare/workers-types';

interface Env {
  SOS_EDITOR_DB: D1Database;
  SOS_EDITOR_R2: R2Bucket;
  SECRET_KEY?: string;
  ENVIRONMENT?: string;
  PUBLIC_R2_URL_PREFIX?: string;
  // Credenciais R2 (obrigatórias apenas para uploads grandes via presigned PUT URL)
  // Configure com: wrangler secret put R2_ACCOUNT_ID (e demais abaixo)
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
}

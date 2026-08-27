export interface Env {
  SOS_EDITOR_DB: D1Database;
  SOS_EDITOR_R2: R2Bucket;
  SECRET_KEY?: string;
  ENVIRONMENT?: string;
  PUBLIC_R2_URL_PREFIX?: string;
  // Credenciais R2 (upload direto Electron → R2 via presigned PUT URL)
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
}

export interface PlanRow {
  id: number;
  name: string;
  price: number;
  type: string;
  active: number;
}

export interface UserRow {
  id: number;
  email: string | null;
  password: string | null;
  plan_id: number | null;
  created_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  status: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  device_id: string | null;
  last_seen_at: string | null;
  display_name: string | null;
  payment_provider: string | null;
  payment_ref: string | null;
  ip_created: string | null;
}

export interface VideoRow {
  id: number;
  video_id: string;
  title: string | null;
  filename: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  storage_url: string | null;
  r2_key: string | null;
  status: string;
  created_at: string | null;
  uploader_ip: string | null;
}

export interface GrantRow {
  id: number;
  user_id: number;
  granted_by_admin_id: number;
  granted_at: string;
  expires_at: string;
  reason: string | null;
  active: number;
  revoked_at: string | null;
  revoked_by_admin_id: number | null;
  revoked_reason: string | null;
}

export interface DownloadRow {
  os: string;
  version: string | null;
  url: string | null;
  count: number;
  active: number;
}

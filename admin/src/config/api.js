// URL base da API do SOS Editor (Cloudflare Workers / Custom Domain)
// Em produção oficial = https://api.soseditor.com.br
//
// Se você ainda NÃO configurou o Custom Domain `api.soseditor.com.br` no painel Cloudflare
// (ou o DNS ainda não propagou), cole aqui a URL temporária *.workers.dev do seu Worker
// (retornada por `npx wrangler deploy`). Ex:
// export const API_URL = "https://sos-editor-api.seu-usuario.workers.dev";
//
// Também pode sobrescrever SEM reescrever este arquivo: abra o console DevTools do Admin
// (F12) e execute:
//   localStorage.setItem('sos_admin_api_base_override', 'https://sos-editor-api.XXX.workers.dev');
// depois recarregue a página (F5). Para remover o override:
//   localStorage.removeItem('sos_admin_api_base_override')

const STORAGE_KEY = 'sos_admin_api_base_override';
const DEFAULT_URL = "https://api.soseditor.com.br";

function readOverride() {
  try {
    const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw && /^https?:\/\//i.test(raw)) return String(raw).replace(/\/+$/, '');
  } catch (_) {}
  return null;
}

export function getApiBaseOverride() {
  return readOverride();
}
export function setApiBaseOverride(url) {
  const clean = String(url || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(clean)) {
    throw new Error("URL da API deve começar com http:// ou https://");
  }
  try { localStorage.setItem(STORAGE_KEY, clean); } catch (_) {}
  return clean;
}
export function clearApiBaseOverride() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}
export function computeApiBase() {
  return readOverride() || DEFAULT_URL;
}

export const API_URL = computeApiBase();

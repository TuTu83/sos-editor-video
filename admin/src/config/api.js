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

let API_URL_VALUE = "https://api.soseditor.com.br";
try {
  const override = (typeof localStorage !== 'undefined') ? localStorage.getItem('sos_admin_api_base_override') : null;
  if (override && /^https?:\/\//i.test(override)) {
    API_URL_VALUE = String(override).replace(/\/+$/, '');
  }
} catch (_) {}
export const API_URL = API_URL_VALUE;

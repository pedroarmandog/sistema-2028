/**
 * Configuração centralizada da URL da API
 * Altere apenas aqui para mudar o endereço do backend em todo o frontend.
 */

// URL da VPS onde o backend Node.js está rodando.
const VPS_URL = "https://api.pethubflow.com.br";

// O backend serve tanto pethubflow.com.br quanto api.pethubflow.com.br.
// Usar same-origin ("") garante que o cookie HttpOnly pethub_token definido
// no login seja enviado em todas as requisições subsequentes (sem cruzar subdomínios).
const _resolvedVpsUrl = "";

// Expõe globalmente para que outros scripts possam usar.
window.VPS_URL = _resolvedVpsUrl;
window.API_URL = _resolvedVpsUrl;

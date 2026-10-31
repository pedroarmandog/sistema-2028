// SHIM: Desabilitar localStorage em toda a aplicação (leitura retorna null, escrita é no-op)
// Motivo: migrando armazenamento para banco de dados; evitar uso acidental de localStorage.
(function disableLocalStorageShim() {
  try {
    const fake = {
      getItem: function () {
        return null;
      },
      setItem: function () {
        /* noop */
      },
      removeItem: function () {
        /* noop */
      },
      clear: function () {
        /* noop */
      },
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      enumerable: true,
      get: function () {
        console.warn("[localStorage disabled] access blocked");
        return fake;
      },
    });
    console.info(
      "[init] localStorage shim installed — all reads/writes are now disabled",
    );
  } catch (e) {
    console.debug("disableLocalStorageShim failed", e);
  }
})();

// Interceptor global de fetch: garante que cookies JWT sejam enviados em todas as requisições
// para a mesma origem (same-origin). Necessário para isolamento multi-tenant.
(function patchFetchCredentials() {
  // If a fetch rate-limiter is installed (injected earlier), skip this simple patch
  if (window.__fetchRateLimiterInstalled) {
    console.debug(
      "[patchFetchCredentials] fetch-ratelimiter present — skipping credentials patch",
    );
    return;
  }

  const _fetch = window.fetch.bind(window);
  window.fetch = function (input, init = {}) {
    // Só adiciona credentials se não foi explicitamente definido
    if (!init || !init.credentials) {
      init = { ...init, credentials: "include" };
    }
    return _fetch(input, init);
  };
})();

// 🧩 Seleciona os elementos do HTML pelos seus IDs
// "formCliente" → formulário de cadastro de cliente
// "listaClientes" → elemento (ul, div, etc.) onde os clientes serão listados
// "formPet" → formulário de cadastro de pet
const form = document.getElementById("formCliente");
const lista = document.getElementById("listaClientes");
const formPet = document.getElementById("formPet");

// 🧠 EVENTO 1: Quando o formulário de cliente for enviado...
// - Previne o recarregamento da página (e.preventDefault())
// - Pega os dados do formulário com FormData()
// - Envia os dados via requisição POST para o backend
// - Recebe a resposta e chama a função para listar os clientes novamente
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(form);

  const res = await fetch("/api/clientes", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  console.log(data);
  listarClientes();
});

// 🧾 FUNÇÃO: listarClientes()
// - Busca todos os clientes cadastrados na API (GET /api/clientes)
// - Limpa a lista atual no HTML
// - Cria um <li> para cada cliente retornado e adiciona ao elemento 'lista'
async function listarClientes() {
  try {
    const res = await fetch("/api/clientes");
    const body = await res.json().catch(() => null);
    console.log("[listarClientes] status=", res.status, "body=", body);

    let clientes = null;
    if (Array.isArray(body)) clientes = body;
    else if (body && Array.isArray(body.clientes)) clientes = body.clientes;
    else if (body && Array.isArray(body.data)) clientes = body.data;
    else {
      console.warn(
        "[listarClientes] resposta inesperada ao listar clientes",
        body,
      );
      clientes = [];
    }

    // Limpa a lista antes de adicionar novamente
    lista.innerHTML = "";

    // Para cada cliente, cria um item de lista e mostra nome + email
    clientes.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = `${c.nome} - ${c.email}`;
      lista.appendChild(li);
    });
  } catch (e) {
    console.error("[listarClientes] erro ao listar clientes:", e);
  }
}

// 🐶 EVENTO 2: Quando o formulário de pet for enviado...
// - Impede o recarregamento da página
// - Pega todos os dados (inclusive arquivos, como imagem) com FormData()
// - Envia via POST para a rota /api/pets da API
// - Exibe o retorno no console
formPet.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(formPet);

  // Envia o pet para o backend
  const res = await fetch("/api/pets", {
    method: "POST",
    body: formData,
  });

  // Converte a resposta em JSON
  const data = await res.json();
  console.log(data);
});

// Listar clientes ao carregar a página
listarClientes();

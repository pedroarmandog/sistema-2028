// Script simplificado para teste
console.log("🚀 Script de teste carregado");

document.addEventListener("DOMContentLoaded", function () {
  console.log("📄 DOM carregado - iniciando teste");
  testLoadClients();
});

async function testLoadClients() {
  const tbody = document.getElementById("clientsTableBody");
  if (!tbody) {
    console.error("❌ Elemento clientsTableBody não encontrado!");
    return;
  }

  console.log("✅ Elemento tbody encontrado");

  try {
    console.log("📡 Fazendo requisição...");
    const response = await fetch("/api/clientes");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📦 Dados recebidos:", data);

    if (data.success && data.clientes) {
      console.log(`✅ ${data.clientes.length} clientes encontrados`);

      let html = "";
      data.clientes.slice(0, 10).forEach((cliente) => {
        // Apenas os primeiros 10 para teste
        html += `
                    <tr>
                        <td>${cliente.nome}</td>
                        <td>${cliente.email || "---"}</td>
                        <td>${cliente.telefone || "---"}</td>
                        <td>${new Date(cliente.createdAt).toLocaleDateString("pt-BR")}</td>
                        <td>
                            <button onclick="alert('Edit ${cliente.id}')">✏️</button>
                            <button onclick="alert('Delete ${cliente.id}')">🗑️</button>
                        </td>
                    </tr>
                `;
      });

      tbody.innerHTML = html;
      console.log("✅ Tabela atualizada com sucesso!");
    } else {
      throw new Error("Formato de dados inválido");
    }
  } catch (error) {
    console.error("❌ Erro ao carregar clientes:", error);
    tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: red;">
                    ❌ Erro: ${error.message}
                </td>
            </tr>
        `;
  }
}

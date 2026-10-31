console.log("🚀 Novo script de clientes carregado");

// Esperar o DOM carregar
document.addEventListener("DOMContentLoaded", function () {
  console.log("📄 DOM carregado");
  carregarClientesSimples();
});

async function carregarClientesSimples() {
  console.log("🔄 Iniciando carregamento simples...");

  const tbody = document.getElementById("clientsTableBody");
  if (!tbody) {
    console.error("❌ Tabela não encontrada!");
    return;
  }

  // Loading
  tbody.innerHTML =
    '<tr><td colspan="5" style="text-align:center;padding:20px;">⏳ Carregando...</td></tr>';

  try {
    const response = await fetch("/api/clientes");
    const data = await response.json();

    console.log("📦 Dados:", data);

    if (data.success && data.clientes && data.clientes.length > 0) {
      let html = "";

      // Mostrar apenas os primeiros 25 clientes
      data.clientes.slice(0, 25).forEach((cliente) => {
        const data_formatada = new Date(cliente.createdAt).toLocaleDateString(
          "pt-BR",
        );
        html += `
                    <tr>
                        <td><strong>${cliente.nome}</strong></td>
                        <td>${cliente.email || "---"}</td>
                        <td>${cliente.telefone || "---"}</td>
                        <td>${data_formatada}</td>
                        <td>
                            <button onclick="alert('Editar ${cliente.id}')" style="margin-right:5px;">✏️</button>
                            <button onclick="alert('Excluir ${cliente.id}')">🗑️</button>
                        </td>
                    </tr>
                `;
      });

      tbody.innerHTML = html;
      console.log(
        `✅ ${data.clientes.length} clientes carregados (mostrando 25)`,
      );
    } else {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;padding:20px;">❌ Nenhum cliente encontrado</td></tr>';
    }
  } catch (error) {
    console.error("❌ Erro:", error);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:red;">❌ Erro: ${error.message}</td></tr>`;
  }
}

// Script simples para a página de vacinas
console.log("vacinas.js carregado");

document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);
  const petId = params.get("pet_id");
  const clienteId = params.get("cliente_id");

  const tableBody = document.querySelector("#vacinasTable tbody");
  const empty = document.getElementById("vacinasEmpty");

  // Se tivermos um petId tentaremos buscar vacinas (endpoint opcional)
  if (petId) {
    // Tentativa de buscar em /api/pets/:id/vacinas, caso exista
    (async () => {
      try {
        let resp;
        try {
          resp = await fetch(`/api/pets/${encodeURIComponent(petId)}/vacinas`);
        } catch (err) {
          resp = null;
        }
        if (!resp || !resp.ok) {
          const API_BASE =
            (window.__API_BASE__ && window.__API_BASE__.toString()) ||
            window.location.origin;
          try {
            resp = await fetch(
              `${API_BASE}/api/pets/${encodeURIComponent(petId)}/vacinas`,
            );
          } catch (err) {
            resp = null;
          }
        }
        if (resp && resp.ok) {
          const json = await resp.json();
          const vacinas = (json && (json.vacinas || json.data)) || [];
          if (vacinas.length) renderVacinas(vacinas);
          else showEmpty();
          return;
        }
      } catch (e) {
        console.warn("Falha ao buscar vacinas:", e);
      }

      // fallback: mostrar vazio
      showEmpty();
    })();
  } else {
    showEmpty();
  }

  function renderVacinas(items) {
    empty.style.display = "none";
    tableBody.innerHTML = "";
    items.forEach((v) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${v.data_aplicacao || "-"}</td>
        <td>${v.vacina || "-"}</td>
        <td>${v.produto || "-"}</td>
        <td>${v.lote || "-"}</td>
        <td>${v.dose || "-"}</td>
        <td>${v.periodicidade || "-"}</td>
        <td>${v.data_renovacao || "-"}</td>
        <td><button class="btn">Editar</button></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  function showEmpty() {
    tableBody.innerHTML = "";
    empty.style.display = "block";
  }

  // Botão adicionar (simplesmente redireciona para cadastro de vacina se existir)
  const btnAdd = document.getElementById("btnAddVacina");
  if (btnAdd)
    btnAdd.addEventListener("click", () => {
      const q = petId
        ? `?pet_id=${encodeURIComponent(petId)}${clienteId ? `&cliente_id=${encodeURIComponent(clienteId)}` : ""}`
        : "";
      window.location.href = `vacina-cadastro.html${q}`; // página de cadastro não criada aqui
    });
});

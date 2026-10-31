/**
 * Marketing — Disparador de Mensagens
 * Front-end completo: preview de lista, importação, instâncias WhatsApp,
 * exibição de QR Code via SSE, seleção de instância, disparo com worker.
 */
(function () {
  "use strict";

  // URL do backend na VPS — lê de api-config.js ou usa o valor padrão
  // ISOLAMENTO MULTI-TENANT: respeitar window.VPS_URL mesmo quando vazio (same-origin).
  // "" (string vazia) é intencional — nunca cair no fallback de produção.
  var VPS_URL =
    window.VPS_URL !== undefined && window.VPS_URL !== null
      ? window.VPS_URL
      : "https://api.pethubflow.com.br";

  // ── Helpers ──
  function $(sel) {
    return document.querySelector(sel);
  }

  // ── Elementos DOM ──
  const btn = $("#btnDisparador");
  const modal = document.getElementById("modalDisparador");
  const fileInput = document.getElementById("fileImportLista");
  const btnImport = document.getElementById("btnImportarLista");
  const btnLimpar = document.getElementById("btnLimparLista");
  const tblBody = document.querySelector("#tblContatos tbody");
  const txtMensagem = document.getElementById("txtMensagemDisparo");
  const fileAnexo = document.getElementById("fileAnexoImagem");
  const btnIniciar = document.getElementById("btnIniciarDisparo");
  const btnPausar = document.getElementById("btnPausarDisparo");
  const btnContinuar = document.getElementById("btnContinuarDisparo");
  const logBox = document.getElementById("logEnvios");
  const cfgIntervalo = document.getElementById("cfgIntervalo");
  const cfgDelayInicial = document.getElementById("cfgDelayInicial");
  const cfgLimite = document.getElementById("cfgLimite");
  const cfgDelayRand = document.getElementById("cfgDelayRand");
  const btnNovaInstancia = document.getElementById("btnNovaInstancia");
  const instanciasList = document.getElementById("instanciasList");

  // Submodal Nova Instância
  const submodal = document.getElementById("submodalNovaInstancia");
  const inputNomeInstancia = document.getElementById("inputNomeInstancia");
  const submodalError = document.getElementById("submodalError");
  const btnCriarInstancia = document.getElementById("btnCriarInstancia");
  const btnCancelarInstancia = document.getElementById("btnCancelarInstancia");

  // ── Estado ──
  let lastCampanhaId = null;
  let pollingTimer = null;
  let qrEventSource = null; // SSE para QR
  let campaignEventSource = null; // SSE para progresso do disparador

  // ══════════════════════════════════════════
  //  CONFIG: CARREGAR / SALVAR DO BANCO
  // ══════════════════════════════════════════

  async function carregarConfigDoBanco() {
    try {
      var res = await fetch(VPS_URL + "/api/disparador/config", {
        credentials: "include",
      });
      if (res.ok) {
        var cfg = await res.json();
        if (cfgIntervalo) cfgIntervalo.value = cfg.intervalo ?? 10;
        if (cfgDelayInicial) cfgDelayInicial.value = cfg.delayInicial ?? 2;
        if (cfgLimite) cfgLimite.value = cfg.limite ?? 0;
        if (cfgDelayRand) cfgDelayRand.value = cfg.delayRand ?? 0;
      }
    } catch (err) {
      console.warn("Erro ao carregar config disparador:", err.message);
    }
  }

  function salvarConfigNoBanco() {
    var cfg = {
      intervalo: Number((cfgIntervalo && cfgIntervalo.value) || 10),
      delayInicial: Number((cfgDelayInicial && cfgDelayInicial.value) || 2),
      limite: Number((cfgLimite && cfgLimite.value) || 0),
      delayRand: Number((cfgDelayRand && cfgDelayRand.value) || 0),
    };
    fetch(VPS_URL + "/api/disparador/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(cfg),
    }).catch(function (err) {
      console.warn("Erro ao salvar config disparador:", err.message);
    });
  }

  // Salvar config quando campos mudam
  [cfgIntervalo, cfgDelayInicial, cfgLimite, cfgDelayRand].forEach(
    function (el) {
      if (el) el.addEventListener("change", salvarConfigNoBanco);
    },
  );

  // ══════════════════════════════════════════
  //  MODAL: ABRIR / FECHAR
  // ══════════════════════════════════════════

  function abrirModal() {
    if (modal) modal.style.display = "flex";
  }

  window.fecharModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  };

  // Botão "Disparador de Mensagens" — abre o modal
  if (btn) {
    btn.addEventListener("click", function () {
      abrirModal();
      fetchInstancias();
      carregarConfigDoBanco();
    });
  }

  // Fechar modal ao clicar fora
  document.addEventListener("click", function (e) {
    if (modal && modal.style.display === "flex") {
      if (
        !e.target.closest(".modal-box") &&
        !e.target.closest("#btnDisparador")
      ) {
        modal.style.display = "none";
        stopPolling();
        closeQRStream();
        closeCampaignStream();
      }
    }
  });

  // ══════════════════════════════════════════
  //  IMPORTAÇÃO DE LISTA (Preview + Upload)
  // ══════════════════════════════════════════

  // Preview local ao selecionar arquivo
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      if (f) parseAndPreviewFile(f);
    });
  }

  // Botão Importar → envia ao backend e cria campanha
  if (btnImport) {
    btnImport.addEventListener("click", async function () {
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        fileInput && fileInput.click();
        return;
      }

      var arquivo = fileInput.files[0];
      var form = new FormData();
      form.append("arquivo", arquivo);
      form.append("nome", "Campanha " + new Date().toLocaleString("pt-BR"));
      form.append("mensagemTemplate", (txtMensagem && txtMensagem.value) || "");

      var cfg = {
        intervalo: Number((cfgIntervalo && cfgIntervalo.value) || 5),
        delayInicial: Number((cfgDelayInicial && cfgDelayInicial.value) || 2),
        limite: Number((cfgLimite && cfgLimite.value) || 0),
        delayRand: Number((cfgDelayRand && cfgDelayRand.value) || 0),
      };
      form.append("configuracao", JSON.stringify(cfg));

      if (fileAnexo && fileAnexo.files && fileAnexo.files[0]) {
        form.append("imagem", fileAnexo.files[0]);
      }

      appendLog("Enviando lista para o servidor...");

      try {
        var res = await fetch(VPS_URL + "/api/disparador/campanhas", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        var data = await res.json();
        if (!res.ok) {
          appendLog("Erro: " + (data.error || "falha"));
          return;
        }
        appendLog(
          "✅ Campanha criada: " +
            data.campanha.nome +
            " — " +
            data.contatos +
            " contatos — " +
            data.agendados +
            " agendados",
        );
        lastCampanhaId = data.campanha.id;
        await refreshContatos();
      } catch (err) {
        console.error(err);
        appendLog("Erro ao enviar: " + err.message);
      }
    });
  }

  // Botão Limpar
  if (btnLimpar) {
    btnLimpar.addEventListener("click", function () {
      if (tblBody) tblBody.innerHTML = "";
      if (fileInput) fileInput.value = "";
      lastCampanhaId = null;
      appendLog("Lista limpa.");
    });
  }

  // ── Parse local (CSV / XLSX) ──
  async function parseAndPreviewFile(file) {
    try {
      var name = file.name.toLowerCase();
      var ext = name.split(".").pop();
      var rows = [];

      if (ext === "csv") {
        var text = await file.text();
        var lines = text.split(/\r?\n/).filter(Boolean);
        for (var i = 0; i < lines.length; i++) {
          var cols = lines[i].split(/[,;\t]/).map(function (c) {
            return c.trim().replace(/^"|"$/g, "");
          });
          rows.push(cols);
        }
      } else {
        // XLSX/XLS via SheetJS
        if (typeof XLSX === "undefined") {
          appendLog("Erro: biblioteca SheetJS não carregada.");
          return;
        }
        var data = await file.arrayBuffer();
        var wb = XLSX.read(data, { type: "array" });
        var sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      }

      // Detectar e remover cabeçalho
      if (rows.length > 0 && Array.isArray(rows[0]) && rows[0].length >= 2) {
        var h0 = String(rows[0][0] || "").toLowerCase();
        var h1 = String(rows[0][1] || "").toLowerCase();
        if (
          /^(nome|name|cliente|tutor)/.test(h0) ||
          /^(numero|number|telefone|tel|whatsapp|celular)/.test(h1)
        ) {
          rows.shift();
        }
      }

      var contatos = [];
      for (var j = 0; j < rows.length; j++) {
        var r = rows[j];
        if (!r || r.length === 0) continue;
        var nomeC = "";
        var numC = "";
        if (r.length >= 2) {
          nomeC = String(r[0] || "").trim();
          numC = String(r[1] || "").trim();
        } else {
          numC = String(r[0] || "").trim();
        }
        if (!numC) continue;
        contatos.push({ nome: nomeC, numero: numC, status: "pendente" });
      }

      if (tblBody) tblBody.innerHTML = "";
      for (var k = 0; k < contatos.length; k++) {
        var c = contatos[k];
        var tr = document.createElement("tr");
        tr.innerHTML =
          '<td style="padding:8px">' +
          escapeHtml(c.nome) +
          '</td><td style="padding:8px">' +
          escapeHtml(c.numero) +
          '</td><td style="padding:8px">pendente</td>';
        tblBody.appendChild(tr);
      }

      appendLog("Preview: " + contatos.length + " contatos encontrados.");
    } catch (err) {
      console.error("parse error", err);
      appendLog("Erro ao ler arquivo: " + (err.message || err));
    }
  }

  // ══════════════════════════════════════════
  //  INSTÂNCIAS WHATSAPP
  // ══════════════════════════════════════════

  // Abrir submodal "Nova Instância"
  if (btnNovaInstancia) {
    btnNovaInstancia.addEventListener("click", function () {
      if (submodal) {
        submodal.style.display = "flex";
        if (inputNomeInstancia) inputNomeInstancia.value = "";
        if (submodalError) submodalError.style.display = "none";
      }
    });
  }

  // Cancelar submodal
  if (btnCancelarInstancia) {
    btnCancelarInstancia.addEventListener("click", function () {
      if (submodal) submodal.style.display = "none";
    });
  }

  // Criar instância
  if (btnCriarInstancia) {
    btnCriarInstancia.addEventListener("click", async function () {
      var nome = (
        (inputNomeInstancia && inputNomeInstancia.value) ||
        ""
      ).trim();
      if (!nome) {
        showSubmodalError("Nome é obrigatório.");
        return;
      }

      try {
        var res = await fetch(VPS_URL + "/api/instancias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ nome: nome }),
        });
        var text = await res.text();
        var data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {
          data = { raw: text };
        }

        if (!res.ok) {
          var msg =
            (data && (data.error || data.message)) || text || res.statusText;
          showSubmodalError("Erro: " + msg);
          return;
        }

        appendLog(
          "✅ Instância criada: " +
            (data && data.instancia && data.instancia.nome),
        );
        submodal.style.display = "none";

        // Iniciar escuta de QR via SSE para esta instância
        var instId = data && data.instancia && data.instancia.id;
        if (instId) {
          startQRStream(instId);
        }

        fetchInstancias();
      } catch (err) {
        console.error(err);
        showSubmodalError("Erro: " + (err.message || err));
      }
    });
  }

  function showSubmodalError(msg) {
    if (submodalError) {
      submodalError.textContent = msg;
      submodalError.style.display = "block";
    }
  }

  // ── Listar instâncias ──
  async function fetchInstancias() {
    if (!instanciasList) return;
    try {
      var res = await fetch(VPS_URL + "/api/instancias", {
        credentials: "include",
      });
      if (!res.ok) return;
      var list = await res.json();
      instanciasList.innerHTML = "";

      for (var i = 0; i < list.length; i++) {
        var it = list[i];
        var div = document.createElement("div");
        div.className = "instancia-card";
        div.style.cssText =
          "display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border:1px solid #f0f0f0;border-radius:6px;margin-bottom:4px;";

        var statusColor =
          it.status === "conectado"
            ? "#22c55e"
            : it.status === "aguardando_qr"
              ? "#f59e0b"
              : "#94a3b8";
        var statusDot =
          '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' +
          statusColor +
          ';margin-right:6px"></span>';

        div.innerHTML =
          '<div style="font-size:13px">' +
          statusDot +
          "<strong>" +
          escapeHtml(it.nome || "") +
          "</strong>" +
          '<br/><small style="color:#666">#' +
          (it.numeroOrdem || it.id) +
          " • " +
          escapeHtml(it.status || "desconectado") +
          (it.numero ? " • " + it.numero : "") +
          "</small></div>";

        var actions = document.createElement("div");
        actions.style.cssText = "display:flex;gap:4px;";

        // Botão QR (se aguardando_qr)
        if (it.status === "aguardando_qr") {
          var btnQR = createBtn("Ver QR", "btn-ghost");
          btnQR.dataset.instId = it.id;
          btnQR.addEventListener("click", function () {
            startQRStream(this.dataset.instId);
          });
          actions.appendChild(btnQR);
        }

        // Conectar/Desconectar
        var btnConn = createBtn(
          it.status === "conectado" ? "Desconectar" : "Conectar",
          "btn-ghost",
        );
        btnConn.dataset.instId = it.id;
        btnConn.dataset.action =
          it.status === "conectado" ? "disconnect" : "connect";
        btnConn.addEventListener("click", async function () {
          var id = this.dataset.instId;
          var act = this.dataset.action;
          // Usar /reset ao conectar para limpar sessão corrompida
          var endpoint = act === "connect" ? "reset" : act;
          try {
            var r = await fetch(
              VPS_URL + "/api/instancias/" + id + "/" + endpoint,
              {
                method: "POST",
                credentials: "include",
              },
            );
            if (!r.ok) {
              appendLog("Erro ao " + act);
              return;
            }
            if (act === "connect") {
              appendLog("Conectando instância #" + id + "...");
              startQRStream(id);
            } else {
              appendLog("Desconectado instância #" + id);
            }
            fetchInstancias();
          } catch (e) {
            console.error(e);
          }
        });
        actions.appendChild(btnConn);

        // Excluir
        var btnDel = createBtn("Excluir", "btn-ghost");
        btnDel.style.color = "#ef4444";
        btnDel.dataset.instId = it.id;
        btnDel.dataset.instNome = it.nome || it.id;
        btnDel.addEventListener("click", async function () {
          if (
            !(await confirmar(
              "Excluir instância " + this.dataset.instNome + "?",
            ))
          )
            return;
          try {
            var r = await fetch(
              VPS_URL + "/api/instancias/" + this.dataset.instId,
              {
                method: "DELETE",
                credentials: "include",
              },
            );
            if (!r.ok) {
              appendLog("Erro ao excluir");
              return;
            }
            appendLog("Instância excluída.");
            fetchInstancias();
          } catch (e) {
            console.error(e);
          }
        });
        actions.appendChild(btnDel);

        div.appendChild(actions);
        instanciasList.appendChild(div);
      }
    } catch (err) {
      console.error("fetchInstancias error", err);
    }
  }

  // ── QR Code via SSE ──
  function startQRStream(instanciaId) {
    closeQRStream();

    appendLog("Aguardando QR Code da instância #" + instanciaId + "...");

    // Prefixo "disp_" para isolar do sistema principal de marketing
    var chaveWpp = "disp_" + instanciaId;
    qrEventSource = new EventSource(
      VPS_URL + "/api/marketing/whatsapp/eventos?empresaId=" + chaveWpp,
      { withCredentials: true },
    );

    qrEventSource.onmessage = function (event) {
      try {
        var data = JSON.parse(event.data);

        if (data.evento === "qr" && data.qrBase64) {
          showQRModal(data.qrBase64, instanciaId);
        }

        if (data.evento === "conectado") {
          appendLog(
            "✅ Instância #" +
              instanciaId +
              " conectada!" +
              (data.numero ? " Número: " + data.numero : ""),
          );
          hideQRModal();
          closeQRStream();
          fetchInstancias();
        }

        if (data.evento === "erro") {
          appendLog(
            "❌ Erro na instância #" +
              instanciaId +
              ": " +
              (data.mensagem || ""),
          );
          hideQRModal();
          closeQRStream();
          fetchInstancias();
        }

        if (data.evento === "desconectado") {
          appendLog("Instância #" + instanciaId + " desconectada.");
          hideQRModal();
          closeQRStream();
          fetchInstancias();
        }
      } catch (e) {
        // ignorar
      }
    };

    qrEventSource.onerror = function () {
      // Reconectar silenciosamente
    };
  }

  function closeQRStream() {
    if (qrEventSource) {
      qrEventSource.close();
      qrEventSource = null;
    }
  }

  function showQRModal(qrBase64, instanciaId) {
    var existing = document.getElementById("qrCodeModal");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "qrCodeModal";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;";

    overlay.innerHTML =
      '<div style="background:#fff;border-radius:12px;padding:24px;text-align:center;max-width:400px;width:90%;box-shadow:0 8px 24px rgba(0,0,0,0.3);">' +
      '<h3 style="margin:0 0 8px 0;">Escaneie o QR Code</h3>' +
      '<p style="color:#666;font-size:13px;margin:0 0 16px 0;">Instância #' +
      instanciaId +
      " — Abra o WhatsApp no celular > Dispositivos conectados > Conectar dispositivo</p>" +
      '<img src="' +
      qrBase64 +
      '" style="width:280px;height:280px;border-radius:8px;" />' +
      '<div style="margin-top:16px;"><button id="btnFecharQR" class="btn-ghost" style="padding:8px 20px;">Fechar</button></div>' +
      "</div>";

    document.body.appendChild(overlay);

    document
      .getElementById("btnFecharQR")
      .addEventListener("click", function () {
        hideQRModal();
      });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) hideQRModal();
    });
  }

  function hideQRModal() {
    var el = document.getElementById("qrCodeModal");
    if (el) el.remove();
  }

  // ══════════════════════════════════════════
  //  DISPARO: INICIAR / PAUSAR / CONTINUAR
  // ══════════════════════════════════════════

  if (btnIniciar) {
    btnIniciar.addEventListener("click", async function () {
      // Se não tem campanha criada ainda, criar a partir do preview
      if (!lastCampanhaId) {
        var rows = tblBody ? tblBody.querySelectorAll("tr") : [];
        if (rows.length === 0) {
          appendLog("⚠️ Importe uma lista primeiro.");
          return;
        }

        // Criar campanha a partir do preview
        appendLog("Criando campanha a partir do preview...");
        var contatos = [];
        for (var i = 0; i < rows.length; i++) {
          var tds = rows[i].querySelectorAll("td");
          var nome = tds[0] ? tds[0].textContent.trim() : "";
          var numero = tds[1] ? tds[1].textContent.trim() : "";
          if (numero) contatos.push({ nome: nome, numero: numero });
        }

        var cfg = {
          intervalo: Number((cfgIntervalo && cfgIntervalo.value) || 5),
          delayInicial: Number((cfgDelayInicial && cfgDelayInicial.value) || 2),
          limite: Number((cfgLimite && cfgLimite.value) || 0),
          delayRand: Number((cfgDelayRand && cfgDelayRand.value) || 0),
        };

        try {
          var form = new FormData();
          form.append("nome", "Campanha " + new Date().toLocaleString("pt-BR"));
          form.append(
            "mensagemTemplate",
            (txtMensagem && txtMensagem.value) || "",
          );
          form.append("configuracao", JSON.stringify(cfg));
          form.append("contatos", JSON.stringify(contatos));
          if (fileAnexo && fileAnexo.files && fileAnexo.files[0]) {
            form.append("imagem", fileAnexo.files[0]);
          }

          var resCreate = await fetch(VPS_URL + "/api/disparador/campanhas", {
            method: "POST",
            credentials: "include",
            body: form,
          });
          var dataCreate = await resCreate.json();
          if (!resCreate.ok) {
            appendLog("Erro: " + (dataCreate.error || "falha ao criar"));
            return;
          }
          lastCampanhaId = dataCreate.campanha.id;
          appendLog(
            "✅ Campanha criada: " +
              dataCreate.contatos +
              " contatos, " +
              dataCreate.agendados +
              " agendados.",
          );
        } catch (err) {
          appendLog("Erro: " + err.message);
          return;
        }
      }

      // Pedir seleção de instância
      var instanciaId = await escolherInstancia();
      if (!instanciaId) {
        appendLog("⚠️ Selecione ou crie uma instância WhatsApp primeiro.");
        return;
      }

      appendLog("Iniciando disparo (instância #" + instanciaId + ")...");

      try {
        var res = await fetch(
          VPS_URL + "/api/disparador/start/" + lastCampanhaId,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ instanciaId: instanciaId }),
          },
        );
        if (!res.ok) {
          var d = await res.json();
          appendLog("Erro: " + (d.error || ""));
          return;
        }
        appendLog("✅ Disparo iniciado! Acompanhe no log abaixo.");
        startCampaignStream(lastCampanhaId);
        await refreshContatos();
        startPolling();
      } catch (err) {
        appendLog("Erro: " + err.message);
      }
    });
  }

  if (btnPausar) {
    btnPausar.addEventListener("click", async function () {
      if (!lastCampanhaId) return;
      appendLog("Pausando campanha...");
      try {
        var res = await fetch(
          VPS_URL + "/api/disparador/pause/" + lastCampanhaId,
          {
            method: "POST",
            credentials: "include",
          },
        );
        if (!res.ok) appendLog("Erro ao pausar");
        else appendLog("⏸ Campanha pausada.");
        closeCampaignStream();
        await refreshContatos();
      } catch (e) {
        appendLog("Erro: " + e.message);
      }
    });
  }

  if (btnContinuar) {
    btnContinuar.addEventListener("click", async function () {
      if (!lastCampanhaId) return;
      var instanciaId = await escolherInstancia();
      appendLog("Continuando campanha...");
      try {
        var res = await fetch(
          VPS_URL + "/api/disparador/continue/" + lastCampanhaId,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ instanciaId: instanciaId }),
          },
        );
        if (!res.ok) appendLog("Erro ao continuar");
        else appendLog("▶ Campanha retomada.");
        startCampaignStream(lastCampanhaId);
        await refreshContatos();
        startPolling();
      } catch (e) {
        appendLog("Erro: " + e.message);
      }
    });
  }

  // ── Escolher instância (popup simples) ──
  async function escolherInstancia() {
    try {
      var res = await fetch(VPS_URL + "/api/instancias", {
        credentials: "include",
      });
      if (!res.ok) return null;
      var list = await res.json();

      if (list.length === 0) return null;

      // Se só tem uma instância conectada, usar ela automaticamente
      var conectadas = list.filter(function (i) {
        return i.status === "conectado";
      });
      if (conectadas.length === 1) return conectadas[0].id;

      // Se tem alguma conectada, mostrar seleção
      if (conectadas.length > 1) {
        var options = conectadas
          .map(function (i) {
            return (
              "#" +
              (i.numeroOrdem || i.id) +
              " - " +
              (i.nome || "Sem nome") +
              " (" +
              i.numero +
              ")"
            );
          })
          .join("\n");
        var choice = await solicitar(
          "Escolha a instância para o disparo (digite o número #):\n\n" +
            options,
        );
        if (!choice) return conectadas[0].id;
        var match = choice.match(/#?(\d+)/);
        return match ? Number(match[1]) : conectadas[0].id;
      }

      // Nenhuma conectada
      appendLog(
        "⚠️ Nenhuma instância conectada. Conecte uma instância primeiro.",
      );
      // Atualizar a lista de instâncias na UI para refletir o status real
      fetchInstancias();
      return null;
    } catch (e) {
      return null;
    }
  }

  // ══════════════════════════════════════════
  //  TABELA E POLLING
  // ══════════════════════════════════════════

  async function refreshContatos() {
    if (!lastCampanhaId || !tblBody) return;
    try {
      var res = await fetch(VPS_URL + "/api/disparador/contacts/" + lastCampanhaId, {
        credentials: "include",
      });
      var list = await res.json();
      tblBody.innerHTML = "";
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        var statusColor =
          c.status === "enviado"
            ? "#22c55e"
            : c.status === "erro"
              ? "#ef4444"
              : c.status === "enviando"
                ? "#f59e0b"
                : "#94a3b8";
        var tr = document.createElement("tr");
        tr.innerHTML =
          '<td style="padding:8px">' +
          escapeHtml(c.nome || "") +
          '</td><td style="padding:8px">' +
          escapeHtml(c.numero || "") +
          '</td><td style="padding:8px"><span style="color:' +
          statusColor +
          ';font-weight:600">' +
          escapeHtml(c.status || "pendente") +
          "</span></td>";
        tblBody.appendChild(tr);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ── SSE: acompanhamento de campanha (progress + status por contato)
  function startCampaignStream(campId) {
    closeCampaignStream();
    if (!campId) return;
    try {
      campaignEventSource = new EventSource(
        VPS_URL + "/api/disparador/eventos/" + campId,
        { withCredentials: true },
      );
      campaignEventSource.onmessage = function (e) {
        try {
          var payload = JSON.parse(e.data);
          if (!payload || !payload.evento) return;
          if (payload.evento === "progress") {
            updateProgressUI(payload);
          } else if (payload.evento === "contact") {
            updateContactRow(payload);
          } else if (payload.evento === "finished") {
            appendLog("✅ Campanha finalizada.");
            updateProgressUI({
              total: payload.total || 0,
              enviados: payload.enviados || 0,
              pendentes: 0,
              erros: payload.erros || 0,
              percent: 100,
            });
            closeCampaignStream();
          }
        } catch (err) {
          // ignore
        }
      };
      campaignEventSource.onerror = function () {
        // silent
      };
      // mostrar área de progresso
      var dp = document.getElementById("disparadorProgress");
      if (dp) dp.style.display = "block";
    } catch (e) {
      console.error("Erro ao abrir SSE da campanha:", e && e.message);
    }
  }

  function closeCampaignStream() {
    if (campaignEventSource) {
      try {
        campaignEventSource.close();
      } catch (e) {}
      campaignEventSource = null;
    }
    var dp = document.getElementById("disparadorProgress");
    if (dp) dp.style.display = "none";
  }

  function updateProgressUI(payload) {
    try {
      var total = payload.total || 0;
      var enviados = payload.enviados || 0;
      var pendentes = payload.pendentes || 0;
      var erros = payload.erros || 0;
      var percent =
        payload.percent ||
        (total > 0 ? Math.round((enviados / total) * 100) : 0);
      var elTotal = document.getElementById("dp_total");
      var elSent = document.getElementById("dp_sent");
      var elPending = document.getElementById("dp_pending");
      var elError = document.getElementById("dp_error");
      var elPercent = document.getElementById("dp_percent");
      var elBar = document.getElementById("dp_bar");
      if (elTotal) elTotal.textContent = total;
      if (elSent) elSent.textContent = enviados;
      if (elPending) elPending.textContent = pendentes;
      if (elError) elError.textContent = erros;
      if (elPercent) elPercent.textContent = percent + "%";
      if (elBar) elBar.style.width = Math.max(0, Math.min(100, percent)) + "%";
    } catch (e) {}
  }

  function updateContactRow(payload) {
    try {
      if (!payload) return;
      var numero = payload.numero || "";
      var status = payload.status || "pendente";
      // Procurar na tabela pelo número
      if (!tblBody) return;
      var rows = tblBody.querySelectorAll("tr");
      for (var i = 0; i < rows.length; i++) {
        var tds = rows[i].querySelectorAll("td");
        if (!tds || tds.length < 3) continue;
        var numText = (tds[1].textContent || "").trim();
        if (!numText) continue;
        if (
          numText.indexOf(numero) !== -1 ||
          numero.indexOf(numText) !== -1 ||
          numText === numero
        ) {
          var statusColor =
            status === "enviado"
              ? "#22c55e"
              : status === "erro"
                ? "#ef4444"
                : status === "enviando"
                  ? "#f59e0b"
                  : "#94a3b8";
          tds[2].innerHTML =
            '<span style="color:' +
            statusColor +
            ';font-weight:600">' +
            escapeHtml(status) +
            "</span>";
        }
      }
    } catch (e) {}
  }

  function startPolling() {
    if (pollingTimer) return;
    pollingTimer = setInterval(async function () {
      await refreshContatos();
    }, 3000);
  }

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  // ══════════════════════════════════════════
  //  UTILITÁRIOS
  // ══════════════════════════════════════════

  function appendLog(msg) {
    if (!logBox) return;
    var el = document.createElement("div");
    el.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg;
    logBox.appendChild(el);
    logBox.scrollTop = logBox.scrollHeight;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function createBtn(text, className) {
    var b = document.createElement("button");
    b.textContent = text;
    b.className = className || "";
    b.style.cssText = "padding:4px 10px;font-size:12px;cursor:pointer;";
    return b;
  }
})();

/**
 * ========================================
 * REPORT VIEWER MODULE - PET CRIA
 * ========================================
 * Módulo para visualização de relatórios com Stimulsoft
 */

class ReportViewer {
  constructor() {
    this.modal = null;
    this.iframe = null;
    this.isOpen = false;
    this.init();
  }

  init() {
    console.log("🚀 Inicializando Report Viewer Module");
    this.createModal();
  }

  /**
   * Cria a estrutura da modal
   */
  createModal() {
    // Verificar se já existe
    if (document.getElementById("reportViewerModal")) {
      this.modal = document.getElementById("reportViewerModal");
      this.iframe = document.getElementById("reportViewerIframe");
      return;
    }

    // Criar modal
    const modalHTML = `
            <div id="reportViewerModal" class="report-modal" style="display: none;">
                <div class="report-modal-overlay"></div>
                <div class="report-modal-content">
                    <div class="report-modal-header">
                        <h2 class="report-modal-title">
                            <i class="fas fa-file-pdf"></i>
                            Visualizador de Relatórios
                        </h2>
                        <button class="report-modal-close" id="closeReportModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="report-modal-body">
                        <iframe 
                            id="reportViewerIframe" 
                            src="" 
                            frameborder="0"
                            allow="fullscreen"
                        ></iframe>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Adicionar estilos
    this.addStyles();

    // Referenciar elementos
    this.modal = document.getElementById("reportViewerModal");
    this.iframe = document.getElementById("reportViewerIframe");

    // Eventos
    document
      .getElementById("closeReportModal")
      .addEventListener("click", () => {
        this.close();
      });

    // Fechar com ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });

    // Fechar clicando no overlay
    this.modal
      .querySelector(".report-modal-overlay")
      .addEventListener("click", () => {
        this.close();
      });
  }

  /**
   * Adiciona estilos CSS da modal
   */
  addStyles() {
    if (document.getElementById("reportViewerStyles")) return;

    const styles = `
            <style id="reportViewerStyles">
                .report-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 99999;
                    display: none;
                }
                
                .report-modal.active {
                    display: block;
                }
                
                .report-modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                }
                
                .report-modal-content {
                    position: relative;
                    width: 60%;
                    height: 75%;
                    margin: 5% auto;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                
                @keyframes slideIn {
                    from {
                        transform: scale(0.9) translateY(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1) translateY(0);
                        opacity: 1;
                    }
                }
                
                .report-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 30px;
                    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                    color: white;
                    border-bottom: 3px solid #007bff;
                }
                
                .report-modal-title {
                    font-size: 20px;
                    font-weight: 600;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .report-modal-title i {
                    font-size: 24px;
                    color: #007bff;
                }
                
                .report-modal-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                
                .report-modal-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: rotate(90deg);
                }
                
                .report-modal-body {
                    flex: 1;
                    overflow: hidden;
                    position: relative;
                    background: #f5f5f5;
                }
                
                #reportViewerIframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                }
                
                /* Responsivo */
                @media (max-width: 768px) {
                    .report-modal-content {
                        width: 100%;
                        height: 100%;
                        margin: 0;
                        border-radius: 0;
                    }
                    
                    .report-modal-header {
                        padding: 15px 20px;
                    }
                    
                    .report-modal-title {
                        font-size: 16px;
                    }
                }
            </style>
        `;

    document.head.insertAdjacentHTML("beforeend", styles);
  }

  /**
   * Abre o relatório
   * @param {string} reportType - Tipo do relatório (faturamento, produtos, etc)
   * @param {object} filters - Filtros do relatório
   */
  open(reportType, filters = {}) {
    console.log("📊 Abrindo relatório:", reportType, filters);

    // Construir URL com parâmetros
    const params = new URLSearchParams({
      type: reportType,
      filters: JSON.stringify(filters),
    });

    const viewerUrl = `/frontend/components/report-viewer.html?${params.toString()}`;

    // Definir src do iframe
    this.iframe.src = viewerUrl;

    // Mostrar modal
    this.modal.classList.add("active");
    this.modal.style.display = "block";
    this.isOpen = true;

    // Bloquear scroll do body
    document.body.style.overflow = "hidden";

    console.log("✅ Modal de relatório aberta");
  }

  /**
   * Fecha a modal
   */
  close() {
    console.log("❌ Fechando modal de relatório");

    this.modal.classList.remove("active");

    // Animação de saída
    setTimeout(() => {
      this.modal.style.display = "none";
      this.iframe.src = "";
      this.isOpen = false;
      document.body.style.overflow = "";
    }, 300);
  }

  /**
   * Verifica se a modal está aberta
   */
  isModalOpen() {
    return this.isOpen;
  }
}

// Criar instância global
const reportViewer = new ReportViewer();

// Exportar para uso global
window.reportViewer = reportViewer;

console.log("✅ Report Viewer Module carregado");

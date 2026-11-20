# PetHub Cliente — interface e identidade por estabelecimento

O app mantém HTML/CSS/JavaScript sem novo framework. As referências foram traduzidas em componentes funcionais: banners com arte separada do texto, cards, navegação inferior flutuante, telas de pets, perfil, linha do tempo, notificações e cinco etapas para o agendamento. As imagens de referência não são usadas como telas estáticas.

O mascote transparente já existente é o padrão de todas as áreas. Nomes, fotos, vacinas, serviços, horários e status continuam vindo dos endpoints existentes. O filtro de pets não presume saúde; o histórico não trata agendamentos futuros como atendimentos realizados. O cadastro, galeria, comprovantes, vacinas e recuperação de acesso mantêm seus fluxos anteriores. O perfil detalhado do pet continua em um modal adaptado para celular, com abas.

## Personalização

Seis áreas independentes: boas-vindas, início, agendamento, histórico, perfil do pet e solicitações. Cada uma possui título, mensagem, modo ilustração/banner, posição horizontal/vertical, imagem atual e restauração individual. O modo banner completo mantém as ações fora da arte. A ocultação de textos só se aplica a esse modo com imagem personalizada.

O editor oferece seleção de imagem local, miniatura, enquadramento, dois modos, textos com três variáveis e prévia por tela. O preview usa dados de demonstração explicitamente identificados e não representa dados salvos de clientes. Os valores reais só são interpolados no aplicativo. Todo texto é escapado antes de renderizar.

As recomendações de resolução aparecem por área; outras dimensões são aceitas. JPG/PNG/WebP têm limite de 5 MB, verificação real de decodificação, até 40 MP, bloqueio de animação e SVG, remoção de metadados e otimização para WebP até 1920 px. Imagens completas usam recorte com posição manual; ilustrações usam contain.

Cores e textos ficam em regras.aparencia por empresa com controle de versão e a mesma trava SQL da agenda. Salvar a agenda preserva a aparência; salvar cores preserva banners e textos. Os uploads chamam midias.salvar com empresa e módulo portal-banners. Somente a referência é persistida nas configurações; o serviço de mídias continua responsável pelo R2 durável. Imagens substituídas não são apagadas imediatamente do storage, evitando quebrar outras referências; a rotina de retenção/limpeza de órfãos pode ser aplicada no serviço de mídias existente.

## Acesso

O tutor não recebe referências internas de storage nem altera aparência. Leitura pública das imagens de identidade depende do slug de um estabelecimento ativo e só resolve o banner atualmente configurado nele. Logo e banners são materiais de identidade visíveis também antes do login; fotos de pets e comprovantes continuam privados. Rotas de escrita e visualização do gestor usam authERP e a permissão configuracoes.empresa. A empresa vem da sessão, não do payload.

Rotas adicionadas: GET /api/cliente-app/loja/:slug/visual/:area; GET e POST /api/cliente-portal/aparencia/visual/:area. PUT /api/cliente-portal/aparencia foi estendido sem remover o contrato anterior de cores. POST /api/cliente-app/notificacoes/:id/ler marca apenas um aviso da conta autenticada.

Não há mudança de senha, JWT, cookies, regras de capacidade, aprovação ou envio ao ERP. Uma preferência fora dos horários sugeridos continua passando pelas regras de análise já existentes. O calendário usa o seletor nativo de data do dispositivo, estilizado e integrado às etapas; a duração é a informada pelo estabelecimento.

O worker foi atualizado para o cache static-v7-premium. APIs, banners personalizados e imagens autenticadas não entram no cache estático.

## Validação

51 testes passaram: regressões de autenticação, isolamento de pets, agenda, aprovação, notificações, configuração, novos uploads, validação, versões concorrentes, restauração, UI com DOM e estados de navegação. Backend com Sequelize/SQLite e HTTP real local; mídias, push e dados das telas controlados nos testes. O teste de nova instância confirma persistência das referências no banco, sem depender de localStorage.

Não houve deploy na conta do usuário, envio real de push, acesso ao TiDB/R2 nem reinício real do Render. O navegador headless local foi bloqueado pelo ambiente (socket não permitido), portanto não foram realizados testes visuais por pixels, screenshots reais ou homologação de Safari/Android/iOS. O CSS foi analisado sintaticamente; responsividade tem breakpoints, áreas seguras e movimento reduzido, mas precisa da conferência nos aparelhos após publicar.

Para a homologação, use duas empresas: personalize A e confirme B padrão; salve, reabra o app e reinicie o serviço para validar seu R2; restaure uma área e depois a aparência geral. Teste pet, vacina, comprovante, pedido, aprovação/recusa/reagendamento, aviso individual e perfil. Confira 320/390/430 px e desktop, teclado aberto, textos longos e logo ausente. O preflight incluído verifica arquivos e sharp sem abrir conexão com o banco.

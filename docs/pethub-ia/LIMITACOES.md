# Limites desta entrega e homologação pendente

Esta versão não está liberada para comercialização como módulo totalmente validado. A interface usa APIs e dados reais; os testes automáticos substituem somente as dependências externas no laboratório.

## Dependências externas ainda não validadas

- Chave central OpenAI, modelos compatíveis com Responses/function calling e transcrição, preços e limites reais da conta. O administrador deve conferir tarifas; nenhum preço de fornecedor é presumido pelo código.
- Conexão real já existente do WhatsApp, áudio recebido no aparelho, respostas, intervenção humana, lembretes e persistência após reinício no servidor publicado.
- Migrations e travas concorrentes no TiDB/MySQL, com mais de um worker/processo. SQLite em memória não reproduz todas as garantias nem o desempenho do TiDB.
- Sincronizador existente de lembretes `marketingScheduler.sincronizarAgendamento` e push em dispositivos inscritos.
- Verificação visual em celular real e navegadores do cliente; o layout foi inspecionado estruturalmente por DOM, não por ensaio visual em aparelhos.
- Disponibilidade contínua, recuperação após falha de infraestrutura e observação de 24 horas. A ponte de recebimento não muda as confirmações do socket existente; queda antes de persistir a entrada pode perder aquele evento. Não há garantia de entrega exatamente uma vez do provedor externo.

## Funcionalidades avançadas que ainda precisam de complementação

- A conciliação automática com APIs de faturamento OpenAI/Meta continua pendente. Já há registro manual de faturas por competência/escopo e comparação com a estimativa OpenAI. A origem dos valores é explicitamente declarada pelo administrador, sem simular verificação externa. O canal oficial continua bloqueado para atendimento automático enquanto sua homologação e controle financeiro específico não forem concluídos.
- Margem operacional e receita contratada continuam sendo estimativas: não representam lucro líquido, pagamentos efetivamente recebidos, tributos ou todos os custos de infraestrutura. Faturas globais e atribuídas à empresa podem se sobrepor e não são somadas automaticamente.
- Resumo de contexto atual é uma memória compacta, cifrada, com trechos das últimas interações e expiração de 24 horas; não é um resumo clínico nem resumo generativo ilimitado do histórico.
- Templates oficiais para iniciar conversas fora da janela de atendimento não são implementados na IA. Não altera os templates/disparos que já existem no ERP.
- Boas-vindas do primeiro pet já são delegadas à rotina atual, respeitando sua configuração. O registro “delegado” comprova a chamada à integração, não a entrega de mensagem. Falha/queda com resultado incerto exige revisão, sem retry cego que possa duplicar um envio. A rotina original não foi alterada.

## Regras operacionais importantes

- A IA consulta o preço base publicado pelo serviço da agenda existente e o revalida antes da gravação. Se a instalação tiver regras adicionais por porte/raça/pelagem fora desse fluxo, elas precisam ser mapeadas e testadas antes de permitir agendamento automático; até lá, usar aprovação da equipe ou somente consulta.
- Reservas são revalidadas sob a mesma trava usada pela agenda/portal. A homologação deve também exercitar alterações manuais do ERP em paralelo. Não presumir que integrações externas que gravam diretamente no banco usem a mesma trava.
- Em timeout depois de chamar o fornecedor, não há retry automático: a reserva é conservadora e o atendimento vai para humano. Backoff de até três tentativas só ocorre em falhas transitórias anteriores a qualquer chamada cobrada ou início de envio.
- Créditos são aplicados uma vez ao ciclo atual; a validade deve cobrir o ciclo e não há transferência automática para ciclos futuros. Eles não cobram cartões ou geram pagamentos. Ajuste individual de contrato mantém uso acumulado e créditos existentes; edição de um plano não muda contratos antigos.
- A escolha de modelo é restrita ao contrato e ao cadastro validado. Não há fallback silencioso para modelo mais caro.
- Conteúdo de mensagens e contato é cifrado com AAD por empresa; propostas de ações e configurações comerciais ficam em JSON protegido pela autorização e pela retenção. Backups precisam da mesma proteção de acesso do banco.
- A captura é passiva e limitada ao fluxo novo. Nenhum worker da IA inicia, restaura, reconecta, encerra ou troca uma sessão WhatsApp.

## Limites explícitos das funcionalidades concluídas na versão 2

- Busca global por nome, telefone e conteúdo, paginação e filtros de espera/erro/agendamento estão implementados. Uma consulta percorre até 500 conversas e devolve continuação; processamento de conteúdo tem limites explícitos para proteger o servidor. Buscas acima de 20.000 mensagens por requisição ou 10.000 por conversa exigem refinamento. Nada é pesquisado fora da empresa autenticada.
- Atendimento fora do expediente é registrado segundo a agenda publicada (incluindo feriados), ou o horário configurado quando aplicável. Interações antigas sem esse metadado aparecem como não classificadas; o sistema não inventa a configuração histórica.
- Pausar a automação da IA ou estar fora de seu horário mantém o histórico recebido enquanto o módulo e a licença estão liberados. Não são criados jobs de resposta nesses casos. A chave de bloqueio global PETHUB_IA_ALLOW_LIVE=false continua impedindo o encaminhamento real pela ponte.
- Exportação contém todas as mensagens retidas até o limite explícito de 10.000, com até 30 ações recentes identificadas como tal. Conteúdo apagado por retenção não é recuperado.

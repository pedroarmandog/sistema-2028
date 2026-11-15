# PetHub — Centralização do modal de reagendamento

O reset global do ERP contém * { margin: 0; }, substituindo a margem automática que centraliza o elemento dialog no navegador. O CSS do componente agora define explicitamente posição fixa, inset 0, margens automáticas nos dois eixos e altura pelo conteúdo. Limita o tamanho à tela e permite rolagem interna em telas menores.

Aplicação:
1. Extraia na raiz do projeto e substitua frontend/components/cliente-portal-popup.css.
2. Faça commit/push e deploy. Se o frontend for hospedado separadamente, publique esse arquivo também.
3. Atualize o ERP com Ctrl+F5 e clique em Reagendar.

É uma alteração apenas de CSS, restrita ao dialog de decisão dos popups (reagendar/recusar, que reutilizam o mesmo componente). Mantém formulário, ações, som e dados existentes. Não requer migração, alteração de variáveis nem mudança nos comandos do Render.

Validação: estilos computados em jsdom confirmaram as quatro margens automáticas, posição fixa, inset zero, altura pelo conteúdo, rolagem e preservação do formulário, mesmo com reset global carregado depois. Não foi realizada validação visual em navegador real nesta entrega.

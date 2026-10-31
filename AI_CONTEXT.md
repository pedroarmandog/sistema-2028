# CONTEXTO DO PROJETO - PETHUB

## Visão Geral

O PetHub é um sistema de gestão para pet shops desenvolvido para centralizar operações administrativas, financeiras, comerciais e de relacionamento com clientes.

O objetivo principal do sistema é automatizar processos do pet shop, aumentar a retenção de clientes e facilitar a gestão do negócio.

---

## Tecnologias Utilizadas

### Front-end

* HTML
* CSS
* JavaScript

### Back-end

* Node.js
* Express.js

### Banco de Dados

* MySQL

---

## Regras Gerais

IMPORTANTE:

* Nunca remover funcionalidades existentes sem autorização.
* Nunca alterar layouts ou interfaces sem autorização.
* Sempre reutilizar estruturas já existentes antes de criar novas.
* Sempre analisar o projeto inteiro antes de sugerir mudanças.
* Priorizar correções pontuais ao invés de refatorações grandes.
* Antes de criar tabelas ou colunas novas, verificar se já existe uma estrutura equivalente.
* Sempre preservar compatibilidade com funcionalidades já implementadas.
* Explicar quais arquivos serão alterados antes de realizar mudanças significativas.

---

## Estrutura do Sistema

O sistema possui os seguintes módulos:

### Clientes

Cadastro completo de clientes.

Campos comuns:

* Nome
* CPF
* Endereço
* Telefone
* E-mail
* Bairro
* CEP
* Número da residência
* Foto de perfil

Os dados devem permanecer salvos e ser recuperados corretamente.

---

### Pets

Cadastro de animais vinculados aos clientes.

Informações comuns:

* Nome do pet
* Espécie
* Raça
* Sexo
* Data de nascimento
* Foto
* Observações

Um cliente pode possuir vários pets.

---

### Agendamentos

Controle de:

* Banho
* Tosa
* Consultas
* Serviços diversos

Os agendamentos são vinculados aos clientes e seus pets.

---

### Estoque

Controle de:

* Produtos
* Quantidades
* Movimentações
* Entradas
* Saídas

Sempre atualizar o estoque após movimentações relacionadas.

---

### Financeiro

Responsável pelo controle financeiro do sistema.

Funções:

* Contas a pagar
* Contas a receber
* Fluxo de caixa
* Relatórios financeiros

Toda movimentação financeira deve possuir rastreabilidade.

---

### Haver

Conceito importante:

"Haver" representa um saldo que o cliente possui junto à empresa.

Exemplos:

* Crédito gerado por devolução.
* Crédito gerado por pagamento antecipado.
* Crédito inserido manualmente.

Regras:

* O saldo deve ficar associado ao cliente.
* O saldo pode ser utilizado em vendas futuras.
* Toda movimentação deve gerar histórico.
* O saldo nunca pode ficar inconsistente.

---

### Crediário

Sistema de compras fiadas ou parceladas internamente.

Regras:

* Cada débito deve ser associado ao cliente.
* Deve existir histórico das movimentações.
* Deve ser possível consultar saldo devedor.
* Deve haver integração com o financeiro.

---

### Perfil do Cliente

O sistema possui uma tela de perfil.

Dados importantes:

* Nome completo
* CPF
* Endereço
* Bairro
* CEP
* Número
* Telefone
* E-mail
* Foto de perfil

A foto deve ser armazenada no servidor e o nome do arquivo salvo no banco.

---

### Sistema de Login

O sistema possui autenticação de usuários.

Objetivos:

* Exibir nome do usuário após login.
* Exibir foto de perfil quando disponível.
* Redirecionar para a página inicial após autenticação.

---

## Diretrizes para Alterações

Ao receber uma tarefa:

1. Entender primeiro a regra de negócio.
2. Identificar todos os arquivos envolvidos.
3. Explicar a estratégia antes de alterar.
4. Fazer alterações mínimas necessárias.
5. Evitar criar código duplicado.
6. Manter o padrão já existente no projeto.
7. Preservar funcionalidades já implementadas.

---

## Diretrizes para Resolução de Bugs

Antes de corrigir um problema:

* Identificar a causa raiz.
* Explicar o motivo do erro.
* Mostrar quais arquivos serão alterados.
* Aplicar a correção mais simples possível.
* Evitar reescrever módulos inteiros.

---

## Objetivo do Projeto

Transformar o PetHub em um ERP completo para pet shops contendo:

* Gestão de clientes
* Gestão de pets
* Agendamentos
* Estoque
* Financeiro
* Haver
* Crediário
* Relatórios
* Automações
* Disparos automáticos de mensagens
* Fidelização de clientes
* Controle operacional completo


# Infraestrutura e Deploy

## Hospedagem

O sistema PetHub utiliza uma arquitetura separada entre front-end e back-end.

### Front-end

Hospedado na Hostinger.

Domínio principal:

pethubflow.com.br

O front-end é responsável pela interface utilizada pelos clientes e administradores.

---

### Back-end (API)

Hospedado em uma VPS Linux.

Subdomínio da API:

api.pethubflow.com.br

O back-end é responsável por:

* Autenticação
* Banco de dados
* Regras de negócio
* Agendamentos
* Financeiro
* Haver
* Crediário
* Estoque
* Integrações

---

## Banco de Dados

O banco de dados MySQL está hospedado na VPS.

Sempre considerar que alterações no banco podem impactar funcionalidades já existentes.

Antes de criar novas tabelas ou colunas:

1. Verificar a estrutura atual.
2. Reutilizar tabelas existentes quando possível.
3. Preservar compatibilidade com os dados atuais.

---

## Fluxo de Deploy

Após alterações no back-end:

1. Fazer commit das alterações.
2. Enviar para o repositório Git.
3. Atualizar a VPS utilizando Git.
4. Reiniciar a aplicação utilizando PM2.

Comando normalmente utilizado para atualização:

git pull && pm2 restart pethub-api

---

## Regras para Alterações em Produção

Antes de sugerir alterações:

* Identificar todos os arquivos impactados.
* Informar se haverá mudanças no banco de dados.
* Evitar alterações destrutivas.
* Não remover colunas, tabelas ou APIs sem autorização explícita.
* Priorizar compatibilidade com versões anteriores.

---

## Comportamento Esperado da IA

Ao receber uma solicitação:

1. Ler AI_CONTEXT.md.
2. Entender a arquitetura atual.
3. Identificar os arquivos envolvidos.
4. Explicar a solução antes de implementá-la.
5. Fazer apenas as alterações necessárias.
6. Evitar reescrever módulos inteiros sem necessidade.
7. Preservar o funcionamento do sistema existente.

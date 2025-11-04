# Chamados-KWAN

Este repositório contém o painel administrativo e o portal público do sistema de chamados da KWAN.

## Estrutura do portal público

As páginas estáticas do portal continuam armazenadas em `portal-chamados/`, porém agora são servidas a partir da raiz do projeto.
Os arquivos `index.php`, `abrir-chamado.php`, `acompanhar.php` e `notas-fiscais.php` carregam o HTML correspondente e reescrevem os
caminhos de ativos para que o endereço público permaneça limpo (`/index.php`, `/abrir-chamado.php`, etc.). O backend permanece em
`portal-chamados/backend/`.

## Acesso administrativo

Ao acessar o formulário de login (`portal-chamados/backend/login.php`), o sistema executa automaticamente o script `portal-chamados/backend/seed_admin.php`. Esse script verifica se a tabela `usuarios` está vazia e, caso necessário, cria o usuário administrador padrão com os seguintes dados:

- **E-mail:** `admin@kwansolucoes.com.br`
- **Senha:** `kwan123`

Para ambientes onde seja necessário disparar o processo manualmente (por exemplo, logo após um deploy), basta executar:

```bash
php portal-chamados/backend/seed_admin.php
```

O script é idempotente: ele só insere o administrador quando a tabela `usuarios` não possui registros.

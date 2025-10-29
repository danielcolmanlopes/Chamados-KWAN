# Chamados-KWAN

Este repositório contém o painel administrativo e o portal público do sistema de chamados da KWAN.

## Acesso administrativo

Ao acessar o formulário de login (`portal-chamados/backend/login.php`), o sistema executa automaticamente o script `portal-chamados/backend/seed_admin.php`. Esse script verifica se a tabela `usuarios` está vazia e, caso necessário, cria o usuário administrador padrão com os seguintes dados:

- **E-mail:** `admin@kwansolucoes.com.br`
- **Senha:** `kwan123`

Para ambientes onde seja necessário disparar o processo manualmente (por exemplo, logo após um deploy), basta executar:

```bash
php portal-chamados/backend/seed_admin.php
```

O script é idempotente: ele só insere o administrador quando a tabela `usuarios` não possui registros.

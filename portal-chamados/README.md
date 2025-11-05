# Portal de Chamados KWAN — Deploy Rápido

1) Suba a pasta **portal-chamados/** para `public_html/portal-chamados/`.
2) No cPanel → phpMyAdmin, selecione o DB desejado e importe `backend/db.sql`.
3) Garanta a pasta `/uploads` com permissão 755.
4) Configure os segredos de produção **antes** de liberar o portal:
   - Banco de dados: defina as variáveis de ambiente `PORTAL_DB_HOST`, `PORTAL_DB_USER`, `PORTAL_DB_PASS` e `PORTAL_DB_NAME` ou crie um arquivo `portal-chamados/backend/config.local.php` (veja exemplo abaixo).
   - reCAPTCHA v2: configure a variável `PORTAL_RECAPTCHA_SECRET` e defina a chave do site em `portal-chamados/assets/js/config.js`.
   - Usuários do painel: crie usuários administrativos na tabela `usuarios` (o projeto não inclui credenciais padrão).
5) Acesse:
   - Abrir: `/portal-chamados/abrir-chamado.html`
   - Acompanhar: `/portal-chamados/acompanhar.html?c=KWAN-XXXX`
   - Painel: `/portal-chamados/backend/login.php`

Exemplo de `portal-chamados/backend/config.local.php` (não comitar este arquivo):

```
<?php
return [
  'db_host' => 'localhost',
  'db_user' => 'usuario',
  'db_pass' => 'senha-segura',
  'db_name' => 'portal_chamados',
  'recaptcha_secret' => 'chave-secreta-do-recaptcha'
];
```

Para o front-end, crie `portal-chamados/assets/js/config.js` com o conteúdo:

```
window.portalConfig = {
  recaptchaSiteKey: 'CHAVE-DO-SITE-RECAPTCHA'
};
```

OBS: Coloque os arquivos de logo em `assets/img/`:
- `kwan_logotipo_v1.png` (header grande)
- `kwan_logotipo_pq.png` (header pequeno)
- `quadrado.png` (favicon)

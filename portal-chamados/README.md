# Portal de Chamados KWAN

Aplicação PHP + MySQL para abertura e acompanhamento de chamados técnicos.

## Estrutura
- `index.html`: landing page
- `abrir-chamado.html`: formulário público
- `acompanhar.html`: acompanhamento
- `backend/`: API e painel administrativo
- `uploads/`: armazenamento de arquivos enviados

## Requisitos
- PHP 8.1+
- MySQL 5.7+

<!--
Post-generation checklist
[ ] Upload the whole portal-chamados/ folder to public_html/.
[ ] In cPanel → phpMyAdmin, select dclinfo2_portal_chamados and import backend/db.sql.
[ ] Ensure /uploads/ has permission 755.
[ ] Test: https://kwansolucoes.com.br/portal-chamados/abrir-chamado.html
[ ] Test: https://kwansolucoes.com.br/portal-chamados/backend/login.php (daniel@kwansolucoes.com.br / kwan123)
Important: The reCAPTCHA and DB credentials are production values you provided; rotate if needed.
-->

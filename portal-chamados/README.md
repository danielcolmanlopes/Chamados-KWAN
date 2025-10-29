# Portal de Chamados KWAN — Deploy Rápido

1) Suba a pasta **portal-chamados/** para `public_html/portal-chamados/`.
2) No cPanel → phpMyAdmin, selecione o DB `dclinfo2_portal_chamados` e importe `backend/db.sql`.
3) Garanta a pasta `/uploads` com permissão 755.
4) Acesse:
   - Abrir: `/portal-chamados/abrir-chamado.html`
   - Acompanhar: `/portal-chamados/acompanhar.html?c=KWAN-XXXX`
   - Painel: `/portal-chamados/backend/login.php` (daniel@kwansolucoes.com.br / kwan123)

Config do banco em `backend/config.php`:
- host: localhost
- db: dclinfo2_portal_chamados
- user: dclinfo2_portal_chamados
- pass: 7k#;Z6wE4[n6

reCAPTCHA v2:
- site key (HTML): 6LfplforAAAAAPYv0Y9VkaWFBzGD0NefNbJ8Y7JE
- secret (backend): 6LfplforAAAAAEhRchvQUfQXu1mh45EVzjvwSHHF

OBS: Coloque os arquivos de logo em `assets/img/`:
- `kwan_logotipo_v1.png` (header grande)
- `kwan_logotipo_pq.png` (header pequeno)
- `quadrado.png` (favicon)

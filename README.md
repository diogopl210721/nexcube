# NexCube — Landing Page 3D

Site estático (HTML + Three.js + GSAP), pronto para o GitHub Pages.
Domínio: **www.nexcube3d.com.br**

## Antes de publicar
1. No `index.html`, procure `NEXCUBE_WHATSAPP` e troque pelo número real da NexCube
   (só dígitos, com 55 + DDD, ex.: `5541991234567`).
2. Fotos em `assets/` foram recortadas do Instagram (baixa resolução). Substitua por fotos
   originais mantendo o mesmo nome de arquivo.

## Publicar no GitHub Pages
1. Crie um repositório novo, por exemplo `nexcube`, e suba todos os arquivos desta pasta
   (index.html, CNAME, assets/).
2. Repositório → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main` / `(root)` → Save.
3. Em **Custom domain** coloque `www.nexcube3d.com.br` → Save (o arquivo CNAME já está no projeto).
4. Depois que o DNS propagar, marque **Enforce HTTPS**.

## DNS no Registro.br (nexcube3d.com.br)
Domínio → **DNS → Configurar zona DNS** (usando os servidores DNS do Registro.br) → Modo avançado → adicionar:

| Tipo  | Nome  | Valor                     |
|-------|-------|---------------------------|
| CNAME | www   | SEU-USUARIO.github.io     |
| A     | (vazio) | 185.199.108.153         |
| A     | (vazio) | 185.199.109.153         |
| A     | (vazio) | 185.199.110.153         |
| A     | (vazio) | 185.199.111.153         |
| AAAA  | (vazio) | 2606:50c0:8000::153     |
| AAAA  | (vazio) | 2606:50c0:8001::153     |
| AAAA  | (vazio) | 2606:50c0:8002::153     |
| AAAA  | (vazio) | 2606:50c0:8003::153     |

`SEU-USUARIO` = o usuário do GitHub dono do repositório (ex.: `diogopl210721`).
Os registros A/AAAA fazem `nexcube3d.com.br` (sem www) redirecionar para `www.nexcube3d.com.br`.
Propagação: de alguns minutos até 24 h. Teste em https://dnschecker.org

Recomendado: GitHub → Settings (da conta) → Pages → **Add a verified domain** → `nexcube3d.com.br`
(cria um registro TXT; evita que outra conta "sequestre" o domínio).

## Próximas etapas (plataforma de tags)
A plataforma (painel admin, painel do cliente, tags /r/codigo) usará Supabase.
No GitHub Pages, o redirecionamento `/r/CODIGO` será feito com `404.html` + consulta ao Supabase.

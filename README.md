# Nexcube 3D — Site + Plataforma de Tags Inteligentes

Site estático no GitHub Pages + Supabase (projeto `dds-avaliacoes`, tabelas com prefixo `nc_`).
Domínio: **https://www.nexcube3d.com.br**

## Endereços
| Endereço | O que é |
|---|---|
| `/` | Landing page 3D da NexCube (impressão 3D) |
| `/adm` | Gerenciador da NexCube (superadministrador): clientes, tags, QR Codes, mini sites, configurações |
| `/painel` | Painel do cliente (acesso liberado pela NexCube) |
| `/empresadocliente` | Página pública do cliente (logo e identidade do próprio cliente) |
| `/r/NC-XXXXXXXX` | Endereço permanente gravado no QR Code / NFC (QR Code dinâmico) |

`/empresadocliente` e `/r/...` são atendidos pelo `404.html` (roteador público), porque o GitHub Pages
não tem servidor. Nomes reservados (adm, painel, r, assets…) são bloqueados no banco.

## Estrutura
```
index.html            landing page 3D
404.html              roteador público (página do cliente + redirecionamento da tag)
adm/                  gerenciador NexCube
painel/               painel do cliente
js/config.js          URL do Supabase + chave PÚBLICA (anon). Nunca colocar service_role aqui.
js/core.js            Supabase, utilidades, ícones, QR Code, modais
js/public.js          renderização da página pública (também usada como prévia ao vivo)
js/editor.js          editores compartilhados (perfil, links, aparência, tag, estatísticas)
css/app.css           estilos dos painéis e da página pública
assets/               imagens
```

## Banco (Supabase)
Tabelas: `nc_profiles`, `nc_customers`, `nc_customer_notes`, `nc_tags`, `nc_links`,
`nc_minisite_requests`, `nc_minisite_notes`, `nc_events`, `nc_audit_logs`, `nc_settings`.
Storage: bucket público `nc-public` (logos/capas; até 2 MB; PNG/JPG/WEBP; pasta = id do cliente).

### Segurança (RLS — testado)
- Cliente só lê/edita os próprios dados; não vê outros clientes, notas internas nem auditoria.
- Cliente **só altera o destino** da tag (não muda código, status, cliente, tipo).
- Cliente não altera status, endereço (slug), mini site nem CNPJ do próprio cadastro.
- Somente superadmin cria clientes/tags, suspende, vincula tags e gerencia mini sites.
- Visitante (anon) não acessa tabelas: usa apenas `nc_resolve_tag`, `nc_public_page`, `nc_log_event`.
- URLs: só `https://`, `mailto:` e `tel:` (bloqueia `javascript:` / `data:`), sem open redirect.
- Suspender cliente suspende todas as tags dele. Tag não pode ser ativada para cliente suspenso.
- Eventos sem IP; só domínio de origem e categoria do dispositivo (mobile/desktop/bot).
- Auditoria automática de: cadastro, status, tags (criação, vínculo, código, destino), mini site, acessos.

### Login: telefone + PIN (4 números)
- Sem e-mail. Cliente e admin entram com **telefone (WhatsApp) + PIN de 4 números**.
- Internamente o Supabase recebe um e-mail técnico (`55DDDNUMERO@tel.nexcube3d.com.br`, nunca recebe mensagens)
  e uma senha que combina PIN + telefone (o Supabase exige 6+ caracteres). A regra está em `js/core.js`
  (`NC.authFromPhone`) e na Edge Function — as duas precisam ser iguais.
- No cadastro, telefone e PIN são digitados duas vezes (conferência).
- Esqueceu o PIN: a NexCube define um novo em /adm → cliente → Acesso do cliente. Cada um pode trocar o próprio PIN.

### Edge Function `nc-admin`
- `has_admin` / `bootstrap_admin`: primeiro acesso ao /adm (só funciona enquanto não existir administrador).
- `set_client_access`: cria/atualiza o login (telefone + PIN) do cliente — só superadmin.
- `create_admin`: adiciona administrador — só superadmin.
- `remove_access`: desvincula o login do cliente.

## Primeiro acesso
Abra **/adm**: enquanto não houver administrador, aparece "Criar administrador" (nome, telefone 2x, PIN 2x).
Depois disso a tela some e novos admins são adicionados em /adm → Configurações.

## Fluxo de uso
1. NexCube entra em `/adm` → **Novo cliente** (gera endereço `/empresadocliente` e já cria uma tag).
2. No cadastro já se define o login: telefone (2x) + PIN de 4 números (2x).
3. Botão "Enviar instruções de acesso no WhatsApp". O cliente entra em `/painel`, coloca logo, links e cores (prévia ao vivo).
4. NexCube grava na tag NFC / imprime o QR Code com `https://www.nexcube3d.com.br/r/CÓDIGO`.
5. Cliente pode trocar o destino da tag (página, mini site, outro endereço) sem regravar a tag.

## Pendências / próximas versões
- Editor visual de mini site dentro da plataforma (hoje: a DDS publica e vincula a URL).
- Domínio próprio por cliente para mini sites.
- Cliente com mais de uma empresa no mesmo login (hoje: 1 login = 1 empresa).

## DNS (Registro.br) — já configurado
CNAME `www` → `diogopl210721.github.io` e registros A 185.199.108–111.153.

-- representantes.supervisor_id aponta pra profiles(id) — contas de login
-- do sistema — o que está estruturalmente errado: o supervisor de um
-- representante deveria vir do cadastro real de supervisores
-- (public.supervisores, já usado pelo módulo Supervisores), não de quem
-- tem conta no BP-Visionn. Investigação confirmou: 26 dos 28
-- representantes hoje apontam pro profile do Paulo (Financeiro) e 1 pro
-- profile da admin — nenhum aponta pra um supervisor real, porque os
-- supervisores cadastrados em public.supervisores nem sempre têm login.
--
-- Decisão (aprovada): manter supervisor_id e seus 27 valores atuais
-- 100% intocados por ora — não remover a coluna, não remover a FK antiga,
-- não tocar em nenhum valor existente. Cria-se aqui só um campo NOVO,
-- correto, em paralelo. A reatribuição dos 27 vínculos antigos pro
-- cadastro certo será feita manualmente depois — nenhuma tentativa de
-- correspondência automática (Paulo/admin não são "adivinhados" como
-- nenhum supervisor específico).
alter table public.representantes
  add column supervisor_cadastro_id uuid references public.supervisores(id) on delete set null;

comment on column public.representantes.supervisor_cadastro_id is 'Supervisor real, do cadastro public.supervisores. Vai substituir supervisor_id (que aponta erroneamente pra profiles) depois que os 27 vínculos antigos forem reatribuídos manualmente pela usuária.';

create index representantes_supervisor_cadastro_id_idx on public.representantes(supervisor_cadastro_id);

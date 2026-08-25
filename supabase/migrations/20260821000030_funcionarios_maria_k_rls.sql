-- Maria K tem a aba RH liberada só no frontend (App.tsx, isRHTelaExtra),
-- por id — sem alterar o setor real dela no banco (continua
-- "RH - Cadastro", que não bate com o valor exato "RH" que is_rh() exige;
-- ver 20260821000000). Resultado: ela conseguia ABRIR "Novo Funcionário"
-- e preencher o formulário, mas todo Salvar (insert) e a própria
-- listagem (select) eram rejeitados pelas RLS policies de funcionarios,
-- que exigem is_rh() — o Postgres bloqueava com "new row violates
-- row-level security policy" e o frontend mostrava só a mensagem
-- genérica de erro, escondendo que era um problema de permissão.
--
-- Corrige liberando funcionarios especificamente pra ela, sem alterar
-- is_rh() (que também controla representantes/supervisores — mantidos
-- fora do escopo dela de propósito, mesma decisão já tomada no
-- frontend). Mesmo padrão nominal já usado em pode_editar_supervisores()
-- (20260812060000): uma função à parte, "is_rh() OR essa pessoa
-- específica", trocada só nas policies da tabela em questão.
create or replace function public.pode_gerenciar_funcionarios()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_rh() or auth.uid() = '273eca2f-509e-424a-a12e-bcf3ce7c7a7e';
$$;

alter policy "funcionarios_select_rh"
  on public.funcionarios
  using (public.pode_gerenciar_funcionarios());

alter policy "funcionarios_insert_rh"
  on public.funcionarios
  with check (public.pode_gerenciar_funcionarios());

alter policy "funcionarios_update_rh"
  on public.funcionarios
  using (public.pode_gerenciar_funcionarios())
  with check (public.pode_gerenciar_funcionarios());

-- funcionarios_delete_admin (is_admin()) não muda — exclusão continua
-- exclusiva da Supervisora, igual já era.

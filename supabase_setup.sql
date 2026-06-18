-- ============================================================
-- VANGUARD INVOICE HUB — Setup Supabase
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Tabela de estado por usuário (armazena todo o JSON do app)
CREATE TABLE IF NOT EXISTS vanguard_state (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para busca por user_id
CREATE UNIQUE INDEX IF NOT EXISTS vanguard_state_user_idx ON vanguard_state(user_id);

-- RLS: cada usuário só acessa o próprio estado
ALTER TABLE vanguard_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê próprio estado"
  ON vanguard_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário insere próprio estado"
  ON vanguard_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza próprio estado"
  ON vanguard_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vanguard_state_updated_at
  BEFORE UPDATE ON vanguard_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- USUÁRIOS — crie via Supabase Dashboard > Authentication > Users
-- ou use o SQL abaixo (substitua email e senha)
-- ============================================================

-- Exemplo: criar usuário admin (execute apenas uma vez)
-- SELECT supabase_admin.create_user('{"email":"admin@vanguard.com","password":"SuaSenhaAqui","email_confirm":true}');

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
SELECT 'Tabela vanguard_state criada com sucesso' AS status;

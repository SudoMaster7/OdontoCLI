-- Adicionar a coluna 'telefone' à tabela 'dentistas' se ela não existir
ALTER TABLE dentistas 
ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

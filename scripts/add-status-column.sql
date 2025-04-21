-- Adicionar coluna 'status' à tabela 'dentistas' se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'dentistas' AND column_name = 'status'
    ) THEN
        ALTER TABLE dentistas ADD COLUMN status TEXT DEFAULT 'Ativo';
    END IF;
END $$;

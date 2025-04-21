-- Adicionar coluna forma_pagamento à tabela agendamentos se não existir
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50);

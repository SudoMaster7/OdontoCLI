-- Tabela de usuários para autenticação
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'dentista', 'recepcionista')),
  dentista_id UUID REFERENCES dentistas(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_dentista_id ON usuarios(dentista_id);

-- Adicionar restrição de chave estrangeira na tabela de pacientes
ALTER TABLE pacientes 
ADD CONSTRAINT fk_pacientes_dentista 
FOREIGN KEY (dentista_id) 
REFERENCES dentistas(id);

-- Adicionar restrição de chave estrangeira na tabela de agendamentos
ALTER TABLE agendamentos 
ADD CONSTRAINT fk_agendamentos_dentista 
FOREIGN KEY (dentista_id) 
REFERENCES dentistas(id);

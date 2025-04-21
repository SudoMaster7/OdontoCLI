-- Verificar se a extensão uuid-ossp está disponível e instalá-la se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create dentistas (dentists) table if it doesn't exist
CREATE TABLE IF NOT EXISTS dentistas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  sobrenome VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  especialidade VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pacientes (patients) table if it doesn't exist
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  sobrenome VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  data_nascimento DATE,
  genero VARCHAR(20),
  endereco TEXT,
  historico TEXT,
  dentista_id UUID REFERENCES dentistas(id),
  status VARCHAR(20) DEFAULT 'Ativo',
  ultima_consulta DATE,
  proxima_consulta DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create procedimentos (procedures) table if it doesn't exist
CREATE TABLE IF NOT EXISTS procedimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  descricao TEXT,
  duracao INTEGER NOT NULL, -- in minutes
  valor DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agendamentos (appointments) table if it doesn't exist
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID REFERENCES pacientes(id) NOT NULL,
  dentista_id UUID REFERENCES dentistas(id) NOT NULL,
  procedimento_id UUID REFERENCES procedimentos(id) NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'Agendado',
  observacoes TEXT,
  valor DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_dentista ON agendamentos(dentista_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_paciente ON agendamentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_pacientes_dentista ON pacientes(dentista_id);

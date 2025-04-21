// Dados mockados para dentistas
export const dentistas = [
  {
    id: "1",
    nome: "Dr. João Silva",
    email: "joao@teste.com",
    senha: "1234",
    especialidade: "Ortodontia",
    telefone: "(11) 98765-4321",
  },
  {
    id: "2",
    nome: "Dra. Maria Santos",
    email: "maria@teste.com",
    senha: "abcd",
    especialidade: "Endodontia",
    telefone: "(11) 91234-5678",
  },
  {
    id: "3",
    nome: "Dr. Carlos Oliveira",
    email: "carlos@teste.com",
    senha: "qwer",
    especialidade: "Implantodontia",
    telefone: "(11) 99876-5432",
  },
]

// Dados mockados para administradores
export const administradores = [
  {
    id: "1",
    nome: "Admin Principal",
    email: "admin@teste.com",
    senha: "admin123",
  },
  {
    id: "2",
    nome: "Gerente Sistema",
    email: "gerente@teste.com",
    senha: "gerente456",
  },
]

// Dados mockados para pacientes
export const pacientes = [
  {
    id: "1",
    nome: "Pedro Almeida",
    email: "pedro@email.com",
    telefone: "(11) 97777-8888",
    dentistaId: "1", // Paciente do Dr. João
  },
  {
    id: "2",
    nome: "Lucia Ferreira",
    email: "lucia@email.com",
    telefone: "(11) 96666-7777",
    dentistaId: "1", // Paciente do Dr. João
  },
  {
    id: "3",
    nome: "Roberto Gomes",
    email: "roberto@email.com",
    telefone: "(11) 95555-6666",
    dentistaId: "2", // Paciente da Dra. Maria
  },
  {
    id: "4",
    nome: "Camila Souza",
    email: "camila@email.com",
    telefone: "(11) 94444-5555",
    dentistaId: "2", // Paciente da Dra. Maria
  },
  {
    id: "5",
    nome: "Fernando Costa",
    email: "fernando@email.com",
    telefone: "(11) 93333-4444",
    dentistaId: "3", // Paciente do Dr. Carlos
  },
]

// Dados mockados para agendamentos
export const agendamentos = [
  {
    id: "1",
    pacienteId: "1",
    dentistaId: "1",
    data: "2023-06-15",
    hora: "09:00",
    procedimento: "Consulta de rotina",
    status: "Agendado",
  },
  {
    id: "2",
    pacienteId: "2",
    dentistaId: "1",
    data: "2023-06-16",
    hora: "14:30",
    procedimento: "Limpeza",
    status: "Agendado",
  },
  {
    id: "3",
    pacienteId: "3",
    dentistaId: "2",
    data: "2023-06-17",
    hora: "10:15",
    procedimento: "Tratamento de canal",
    status: "Agendado",
  },
  {
    id: "4",
    pacienteId: "4",
    dentistaId: "2",
    data: "2023-06-18",
    hora: "16:00",
    procedimento: "Extração",
    status: "Agendado",
  },
  {
    id: "5",
    pacienteId: "5",
    dentistaId: "3",
    data: "2023-06-19",
    hora: "11:30",
    procedimento: "Implante",
    status: "Agendado",
  },
]

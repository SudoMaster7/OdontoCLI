"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, User, FileText, Calendar, Phone } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

// Tipo para os pacientes
type Patient = {
  id: string
  nome: string
  sobrenome: string
  email: string
  telefone: string
  ultima_consulta: string | null
  proxima_consulta: string | null
  status: string
  historico: string | null
  dentista_id: string
}

// Dados simulados para quando a tabela não existir
const mockPatients: Patient[] = [
  {
    id: "1",
    nome: "Maria",
    sobrenome: "Silva",
    email: "maria.silva@exemplo.com",
    telefone: "(11) 98765-4321",
    ultima_consulta: "2023-04-15",
    proxima_consulta: "2023-05-15",
    status: "Ativo",
    historico:
      "Paciente com histórico de sensibilidade dentária. Realizou tratamento de canal no dente 26 em janeiro de 2023.",
    dentista_id: "1",
  },
  {
    id: "2",
    nome: "João",
    sobrenome: "Oliveira",
    email: "joao.oliveira@exemplo.com",
    telefone: "(11) 91234-5678",
    ultima_consulta: "2023-04-10",
    proxima_consulta: null,
    status: "Ativo",
    historico: "Paciente com bruxismo. Usa placa de mordida noturna.",
    dentista_id: "1",
  },
  {
    id: "3",
    nome: "Ana",
    sobrenome: "Costa",
    email: "ana.costa@exemplo.com",
    telefone: "(11) 99876-5432",
    ultima_consulta: "2023-03-22",
    proxima_consulta: "2023-05-22",
    status: "Ativo",
    historico: "Paciente em tratamento ortodôntico desde 2022.",
    dentista_id: "1",
  },
  {
    id: "4",
    nome: "Carlos",
    sobrenome: "Mendes",
    email: "carlos.mendes@exemplo.com",
    telefone: "(11) 95555-9999",
    ultima_consulta: "2023-04-05",
    proxima_consulta: "2023-05-05",
    status: "Inativo",
    historico: "Paciente com histórico de gengivite. Última limpeza realizada em abril de 2023.",
    dentista_id: "1",
  },
]

export default function DentistPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showPatientDetails, setShowPatientDetails] = useState(false)
  const [usingMockData, setUsingMockData] = useState(false)

  // Simular o ID do dentista logado (em produção, viria da autenticação)
  // Usando um UUID válido para o dentista_id em vez de "1"
  const dentistaId = "00000000-0000-0000-0000-000000000001"

  useEffect(() => {
    async function fetchPatients() {
      try {
        setLoading(true)

        // Verificar se a tabela existe
        const { error: tableCheckError } = await supabase.from("pacientes").select("id").limit(1)

        // Se a tabela não existir, use dados simulados
        if (tableCheckError && tableCheckError.message.includes("does not exist")) {
          console.log("Tabela 'pacientes' não existe. Usando dados simulados.")
          setPatients(mockPatients)
          setFilteredPatients(mockPatients)
          setUsingMockData(true)
          return
        }

        // Se a tabela existir, busque os dados reais
        // Primeiro, tente buscar pacientes com o UUID específico
        const { data, error } = await supabase.from("pacientes").select("*").eq("dentista_id", dentistaId)

        // Se não encontrar pacientes ou houver erro, busque todos os pacientes
        // Isso é útil para testes quando os IDs podem não corresponder
        if ((error || !data || data.length === 0) && !error?.message.includes("does not exist")) {
          console.log("Nenhum paciente encontrado com o ID específico. Buscando todos os pacientes.")
          const { data: allData, error: allError } = await supabase.from("pacientes").select("*")

          if (allError) throw allError

          if (allData && allData.length > 0) {
            setPatients(allData)
            setFilteredPatients(allData)
            return
          }
        }

        if (error && !error.message.includes("does not exist")) throw error

        if (data && data.length > 0) {
          setPatients(data)
          setFilteredPatients(data)
        } else {
          // Fallback para dados simulados se não houver dados reais
          console.log("Nenhum paciente encontrado. Usando dados simulados.")
          setPatients(mockPatients)
          setFilteredPatients(mockPatients)
          setUsingMockData(true)
        }
      } catch (error) {
        console.error("Erro ao buscar pacientes:", error)
        // Fallback para dados simulados em caso de erro
        setPatients(mockPatients)
        setFilteredPatients(mockPatients)
        setUsingMockData(true)
      } finally {
        setLoading(false)
      }
    }

    fetchPatients()
  }, [dentistaId])

  // Filtrar pacientes com base no termo de busca
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPatients(patients)
    } else {
      const filtered = patients.filter(
        (patient) =>
          patient.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.sobrenome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredPatients(filtered)
    }
  }, [searchTerm, patients])

  // Função para visualizar detalhes do paciente
  const viewPatientDetails = (patient: Patient) => {
    setSelectedPatient(patient)
    setShowPatientDetails(true)
  }

  // Função para voltar à lista de pacientes
  const backToList = () => {
    setShowPatientDetails(false)
    setSelectedPatient(null)
  }

  // Renderizar o conteúdo com base no estado
  if (showPatientDetails && selectedPatient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">Detalhes do Paciente</h1>
            <p className="text-muted-foreground">Informações completas e histórico do paciente</p>
          </div>
          <Button variant="outline" onClick={backToList}>
            Voltar para a lista
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Dados cadastrais do paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-10 w-10 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedPatient.nome} {selectedPatient.sobrenome}
                  </h3>
                  <p className="text-muted-foreground">ID: {selectedPatient.id}</p>
                  <Badge className="mt-1" variant={selectedPatient.status === "Ativo" ? "default" : "outline"}>
                    {selectedPatient.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{selectedPatient.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p>{selectedPatient.telefone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Última Consulta</p>
                  <p>
                    {selectedPatient.ultima_consulta
                      ? new Date(selectedPatient.ultima_consulta).toLocaleDateString("pt-BR")
                      : "Nenhuma"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Próxima Consulta</p>
                  <p>
                    {selectedPatient.proxima_consulta
                      ? new Date(selectedPatient.proxima_consulta).toLocaleDateString("pt-BR")
                      : "Nenhuma agendada"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico Médico</CardTitle>
              <CardDescription>Histórico e observações do paciente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border p-4 min-h-[200px]">
                {selectedPatient.historico || "Nenhum histórico registrado para este paciente."}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Histórico de Procedimentos</CardTitle>
              <CardDescription>Procedimentos realizados anteriormente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Aqui teríamos uma lista de procedimentos do paciente */}
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="mr-2 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Limpeza Dental</p>
                        <p className="text-sm text-muted-foreground">Realizado em: 15/04/2023</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R$ 150,00</p>
                      <Badge variant="outline">Concluído</Badge>
                    </div>
                  </div>
                </div>
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="mr-2 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Restauração</p>
                        <p className="text-sm text-muted-foreground">Realizado em: 10/03/2023</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R$ 200,00</p>
                      <Badge variant="outline">Concluído</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">Meus Pacientes</h1>
        <p className="text-muted-foreground">Visualize e gerencie seus pacientes</p>
        {usingMockData && (
          <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm rounded-md">
            <strong>Nota:</strong> Usando dados simulados. As tabelas do banco de dados ainda não foram criadas ou não
            há pacientes cadastrados.
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar pacientes..."
            className="w-full pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todos">Todos os Pacientes</TabsTrigger>
          <TabsTrigger value="ativos">Ativos</TabsTrigger>
          <TabsTrigger value="agendados">Com Consulta Agendada</TabsTrigger>
        </TabsList>
        <TabsContent value="todos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Pacientes</CardTitle>
              <CardDescription>Todos os seus pacientes</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 rounded-md border p-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                      <div className="flex space-x-2">
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-10">
                  <User className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhum paciente encontrado</h3>
                  <p className="mt-2 text-muted-foreground">
                    Não foram encontrados pacientes com os critérios de busca.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPatients.map((patient) => (
                    <div key={patient.id} className="rounded-md border p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <User className="mr-2 h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {patient.nome} {patient.sobrenome}
                            </p>
                            <div className="flex items-center text-sm text-muted-foreground space-x-4">
                              <span className="flex items-center">
                                <Calendar className="mr-1 h-3 w-3" />
                                {patient.ultima_consulta
                                  ? `Última consulta: ${new Date(patient.ultima_consulta).toLocaleDateString("pt-BR")}`
                                  : "Sem consultas anteriores"}
                              </span>
                              <span className="flex items-center">
                                <Phone className="mr-1 h-3 w-3" />
                                {patient.telefone}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => viewPatientDetails(patient)}>
                            Visualizar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Em produção, redirecionaria para a página de agendamento
                              console.log("Agendar para", patient.id)
                            }}
                          >
                            Agendar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ativos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pacientes Ativos</CardTitle>
              <CardDescription>Pacientes com tratamentos em andamento</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 rounded-md border p-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                      <div className="flex space-x-2">
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPatients
                    .filter((patient) => patient.status === "Ativo")
                    .map((patient) => (
                      <div key={patient.id} className="rounded-md border p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <User className="mr-2 h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {patient.nome} {patient.sobrenome}
                              </p>
                              <div className="flex items-center text-sm text-muted-foreground space-x-4">
                                <span className="flex items-center">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  {patient.ultima_consulta
                                    ? `Última consulta: ${new Date(patient.ultima_consulta).toLocaleDateString("pt-BR")}`
                                    : "Sem consultas anteriores"}
                                </span>
                                <span className="flex items-center">
                                  <Phone className="mr-1 h-3 w-3" />
                                  {patient.telefone}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => viewPatientDetails(patient)}>
                              Visualizar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Em produção, redirecionaria para a página de agendamento
                                console.log("Agendar para", patient.id)
                              }}
                            >
                              Agendar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="agendados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pacientes com Consulta Agendada</CardTitle>
              <CardDescription>Pacientes que possuem consultas futuras</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 rounded-md border p-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                      <div className="flex space-x-2">
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPatients
                    .filter((patient) => patient.proxima_consulta !== null)
                    .map((patient) => (
                      <div key={patient.id} className="rounded-md border p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <User className="mr-2 h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {patient.nome} {patient.sobrenome}
                              </p>
                              <div className="flex items-center text-sm text-muted-foreground space-x-4">
                                <span className="flex items-center">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  {patient.proxima_consulta
                                    ? `Próxima consulta: ${new Date(patient.proxima_consulta).toLocaleDateString("pt-BR")}`
                                    : "Sem consultas agendadas"}
                                </span>
                                <span className="flex items-center">
                                  <Phone className="mr-1 h-3 w-3" />
                                  {patient.telefone}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => viewPatientDetails(patient)}>
                              Visualizar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Em produção, redirecionaria para a página de agendamento
                                console.log("Reagendar para", patient.id)
                              }}
                            >
                              Reagendar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

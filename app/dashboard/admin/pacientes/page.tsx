"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, User, Edit, Trash2, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

// Tipos
type Patient = {
  id: string
  nome: string
  sobrenome: string
  email: string
  telefone: string
  data_nascimento: string | null
  genero: string | null
  endereco: string | null
  historico: string | null
  dentista_id: string | null
  status: string
  ultima_consulta: string | null
  proxima_consulta: string | null
}

type Dentist = {
  id: string
  nome: string
  sobrenome: string
}

export default function PatientsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  // Estados para o modal de paciente
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [showEditPatient, setShowEditPatient] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  // Estados do formulário
  const [formFirstName, setFormFirstName] = useState("")
  const [formLastName, setFormLastName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formBirthDate, setFormBirthDate] = useState("")
  const [formGender, setFormGender] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formMedicalHistory, setFormMedicalHistory] = useState("")
  const [formDentist, setFormDentist] = useState("")
  const [formStatus, setFormStatus] = useState("Ativo")
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Buscar dados iniciais
  useEffect(() => {
    fetchData()
  }, [])

  // Filtrar pacientes quando os filtros mudarem
  useEffect(() => {
    filterPatients()
  }, [searchTerm, activeTab, patients])

  async function fetchData() {
    try {
      setLoading(true)

      // Buscar dentistas
      const { data: dentistsData, error: dentistsError } = await supabase
        .from("dentistas")
        .select("id, nome, sobrenome")
        .order("nome")

      if (dentistsError) throw dentistsError

      // Buscar pacientes
      const { data: patientsData, error: patientsError } = await supabase.from("pacientes").select("*").order("nome")

      if (patientsError) throw patientsError

      // Definir os dados nos estados
      if (dentistsData) setDentists(dentistsData)
      if (patientsData) setPatients(patientsData)
      setFilteredPatients(patientsData || [])
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados necessários.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar pacientes com base nos critérios selecionados
  function filterPatients() {
    let filtered = [...patients]

    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (patient) =>
          patient.nome.toLowerCase().includes(term) ||
          patient.sobrenome.toLowerCase().includes(term) ||
          patient.email.toLowerCase().includes(term) ||
          patient.telefone.includes(term),
      )
    }

    // Filtrar por tab
    if (activeTab === "recent") {
      // Pacientes com consulta nos últimos 7 dias
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      filtered = filtered.filter(
        (patient) => patient.ultima_consulta && new Date(patient.ultima_consulta) >= sevenDaysAgo,
      )
    } else if (activeTab === "active") {
      // Pacientes em tratamento (status ativo)
      filtered = filtered.filter((patient) => patient.status === "Ativo")
    }

    setFilteredPatients(filtered)
  }

  // Resetar o formulário
  const resetForm = () => {
    setFormFirstName("")
    setFormLastName("")
    setFormEmail("")
    setFormPhone("")
    setFormBirthDate("")
    setFormGender("")
    setFormAddress("")
    setFormMedicalHistory("")
    setFormDentist("")
    setFormStatus("Ativo")
    setFormError("")
  }

  // Abrir modal para adicionar paciente
  const openAddPatientModal = () => {
    resetForm()
    setShowAddPatient(true)
  }

  // Abrir modal para editar paciente
  const openEditPatientModal = (patient: Patient) => {
    setSelectedPatient(patient)
    setFormFirstName(patient.nome)
    setFormLastName(patient.sobrenome)
    setFormEmail(patient.email)
    setFormPhone(patient.telefone)
    setFormBirthDate(patient.data_nascimento || "")
    setFormGender(patient.genero || "")
    setFormAddress(patient.endereco || "")
    setFormMedicalHistory(patient.historico || "")
    setFormDentist(patient.dentista_id || "none")
    setFormStatus(patient.status)
    setFormError("")
    setShowEditPatient(true)
  }

  // Abrir confirmação de exclusão
  const openDeleteConfirmation = (patient: Patient) => {
    setSelectedPatient(patient)
    setShowDeleteConfirm(true)
  }

  // Validar formulário
  const validateForm = () => {
    if (!formFirstName) {
      setFormError("O nome é obrigatório")
      return false
    }
    if (!formLastName) {
      setFormError("O sobrenome é obrigatório")
      return false
    }
    if (!formEmail) {
      setFormError("O email é obrigatório")
      return false
    }
    if (!formPhone) {
      setFormError("O telefone é obrigatório")
      return false
    }
    return true
  }

  // Adicionar paciente
  const addPatient = async () => {
    if (!validateForm()) return

    try {
      setSubmitting(true)

      // Inserir o paciente
      const { data, error } = await supabase
        .from("pacientes")
        .insert([
          {
            nome: formFirstName,
            sobrenome: formLastName,
            email: formEmail,
            telefone: formPhone,
            data_nascimento: formBirthDate || null,
            genero: formGender || null,
            endereco: formAddress || null,
            historico: formMedicalHistory || null,
            dentista_id: formDentist === "none" ? null : formDentist,
            status: formStatus,
          },
        ])
        .select()

      if (error) throw error

      // Atualizar a lista de pacientes
      await fetchData()

      setShowAddPatient(false)
      toast({
        title: "Paciente adicionado",
        description: "O paciente foi adicionado com sucesso.",
      })
    } catch (error: any) {
      console.error("Erro ao adicionar paciente:", error)
      setFormError(
        error.code === "23505"
          ? "Este email já está em uso por outro paciente."
          : "Erro ao adicionar paciente. Por favor, tente novamente.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Editar paciente
  const editPatient = async () => {
    if (!validateForm() || !selectedPatient) return

    try {
      setSubmitting(true)

      // Atualizar o paciente
      const { data, error } = await supabase
        .from("pacientes")
        .update({
          nome: formFirstName,
          sobrenome: formLastName,
          email: formEmail,
          telefone: formPhone,
          data_nascimento: formBirthDate || null,
          genero: formGender || null,
          endereco: formAddress || null,
          historico: formMedicalHistory || null,
          dentista_id: formDentist === "none" ? null : formDentist,
          status: formStatus,
        })
        .eq("id", selectedPatient.id)
        .select()

      if (error) throw error

      // Atualizar a lista de pacientes
      await fetchData()

      setShowEditPatient(false)
      toast({
        title: "Paciente atualizado",
        description: "O paciente foi atualizado com sucesso.",
      })
    } catch (error: any) {
      console.error("Erro ao atualizar paciente:", error)
      setFormError(
        error.code === "23505"
          ? "Este email já está em uso por outro paciente."
          : "Erro ao atualizar paciente. Por favor, tente novamente.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Excluir paciente
  const deletePatient = async () => {
    if (!selectedPatient) return

    try {
      setSubmitting(true)

      // Verificar se o paciente tem agendamentos
      const { data: appointments, error: checkError } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("paciente_id", selectedPatient.id)
        .limit(1)

      if (checkError) throw checkError

      if (appointments && appointments.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Este paciente possui agendamentos. Exclua os agendamentos primeiro.",
          variant: "destructive",
        })
        setShowDeleteConfirm(false)
        return
      }

      // Excluir o paciente
      const { error } = await supabase.from("pacientes").delete().eq("id", selectedPatient.id)

      if (error) throw error

      // Atualizar a lista de pacientes
      await fetchData()

      setShowDeleteConfirm(false)
      toast({
        title: "Paciente excluído",
        description: "O paciente foi excluído com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao excluir paciente:", error)
      toast({
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir o paciente.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Formatar data para exibição
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    try {
      return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR })
    } catch (error) {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">Pacientes</h1>
          <p className="text-muted-foreground">Gerencie todos os registros de pacientes</p>
        </div>
        <Button onClick={openAddPatientModal} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Novo Paciente
        </Button>
      </div>

      {/* Modal de Adicionar Paciente */}
      <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Paciente</DialogTitle>
            <DialogDescription>Preencha os dados para criar um novo registro de paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm p-3 rounded-md flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">Nome</Label>
                <Input
                  id="first-name"
                  placeholder="Nome"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Sobrenome</Label>
                <Input
                  id="last-name"
                  placeholder="Sobrenome"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="Telefone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="birth-date">Data de Nascimento</Label>
                <Input
                  id="birth-date"
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gênero</Label>
                <Select value={formGender} onValueChange={setFormGender}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Selecione o gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                placeholder="Endereço"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medical-history">Histórico Médico</Label>
              <Textarea
                id="medical-history"
                placeholder="Histórico médico relevante"
                value={formMedicalHistory}
                onChange={(e) => setFormMedicalHistory(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dentist">Dentista Responsável</Label>
                <Select value={formDentist} onValueChange={setFormDentist}>
                  <SelectTrigger id="dentist">
                    <SelectValue placeholder="Selecione o dentista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {dentists.map((dentist) => (
                      <SelectItem key={dentist.id} value={dentist.id}>
                        {dentist.nome} {dentist.sobrenome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPatient(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={addPatient} className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
              {submitting ? "Adicionando..." : "Adicionar Paciente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Paciente */}
      <Dialog open={showEditPatient} onOpenChange={setShowEditPatient}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
            <DialogDescription>Atualize os dados do paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm p-3 rounded-md flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">Nome</Label>
                <Input
                  id="edit-first-name"
                  placeholder="Nome"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Sobrenome</Label>
                <Input
                  id="edit-last-name"
                  placeholder="Sobrenome"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="Email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  placeholder="Telefone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-birth-date">Data de Nascimento</Label>
                <Input
                  id="edit-birth-date"
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-gender">Gênero</Label>
                <Select value={formGender} onValueChange={setFormGender}>
                  <SelectTrigger id="edit-gender">
                    <SelectValue placeholder="Selecione o gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Endereço</Label>
              <Input
                id="edit-address"
                placeholder="Endereço"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-medical-history">Histórico Médico</Label>
              <Textarea
                id="edit-medical-history"
                placeholder="Histórico médico relevante"
                value={formMedicalHistory}
                onChange={(e) => setFormMedicalHistory(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-dentist">Dentista Responsável</Label>
                <Select value={formDentist} onValueChange={setFormDentist}>
                  <SelectTrigger id="edit-dentist">
                    <SelectValue placeholder="Selecione o dentista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {dentists.map((dentist) => (
                      <SelectItem key={dentist.id} value={dentist.id}>
                        {dentist.nome} {dentist.sobrenome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPatient(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={editPatient} className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                deletePatient()
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={submitting}
            >
              {submitting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        <Button variant="outline">Filtrar</Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todos os Pacientes</TabsTrigger>
          <TabsTrigger value="recent">Recentes</TabsTrigger>
          <TabsTrigger value="active">Em Tratamento</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Diretório de Pacientes</CardTitle>
              <CardDescription>Visualize e gerencie todos os registros de pacientes</CardDescription>
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
                    {searchTerm
                      ? "Não foram encontrados pacientes com os critérios de busca."
                      : "Não há pacientes cadastrados."}
                  </p>
                  <Button onClick={openAddPatientModal} className="mt-4 bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Paciente
                  </Button>
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
                            <p className="text-sm text-muted-foreground">
                              Email: {patient.email} • Tel: {patient.telefone}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                            onClick={() => openEditPatientModal(patient)}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => openDeleteConfirmation(patient)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Excluir
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
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pacientes Recentes</CardTitle>
              <CardDescription>Pacientes que visitaram nos últimos 7 dias</CardDescription>
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
                    </div>
                  ))}
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-10">
                  <User className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhum paciente recente</h3>
                  <p className="mt-2 text-muted-foreground">
                    Não há registros de pacientes que visitaram a clínica nos últimos 7 dias.
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
                            <p className="text-sm text-muted-foreground">
                              Última visita: {formatDate(patient.ultima_consulta)}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                            onClick={() => openEditPatientModal(patient)}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Editar
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
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Em Tratamento</CardTitle>
              <CardDescription>Pacientes atualmente em tratamento</CardDescription>
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
                    </div>
                  ))}
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-10">
                  <User className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhum paciente em tratamento</h3>
                  <p className="mt-2 text-muted-foreground">Não há pacientes atualmente em tratamento.</p>
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
                            <p className="text-sm text-muted-foreground">
                              Próxima consulta: {formatDate(patient.proxima_consulta)}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                            onClick={() => openEditPatientModal(patient)}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Editar
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

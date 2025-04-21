"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, Plus, Search, Edit, Trash2, AlertCircle, CheckCircle, X, Clock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

// Tipos
type Dentist = {
  id: string
  nome: string
  sobrenome: string
}

type Patient = {
  id: string
  nome: string
  sobrenome: string
}

type Procedure = {
  id: string
  nome: string
  duracao: number
  valor: number
}

type Appointment = {
  id: string
  paciente_id: string
  paciente_nome?: string
  paciente_sobrenome?: string
  dentista_id: string
  dentista_nome?: string
  dentista_sobrenome?: string
  procedimento_id: string
  procedimento_nome?: string
  data: string
  hora: string
  status: string
  observacoes: string | null
  valor: number | null
  pagamento_status?: string
  valor_pago?: number
  parcelado?: boolean
  parcelas?: number
  parcelas_restantes?: number
  valor_parcela?: number
  forma_pagamento?: string
}

export default function GerenciarAgendamentosPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [selectedDentistFilter, setSelectedDentistFilter] = useState<string>("all")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all")

  // Estados para o modal de agendamento
  const [showAddAppointment, setShowAddAppointment] = useState(false)
  const [showEditAppointment, setShowEditAppointment] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  // Estados do formulário
  const [formPatient, setFormPatient] = useState("")
  const [formDentist, setFormDentist] = useState("")
  const [formProcedure, setFormProcedure] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formTime, setFormTime] = useState("")
  const [formStatus, setFormStatus] = useState("Agendado")
  const [formNotes, setFormNotes] = useState("")
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Buscar dados iniciais
  useEffect(() => {
    fetchData()
  }, [])

  // Filtrar agendamentos quando os filtros mudarem
  useEffect(() => {
    filterAppointments()
  }, [searchTerm, selectedDate, selectedDentistFilter, selectedStatusFilter, appointments])

  // Update the fetchData function to include the new payment fields
  async function fetchData() {
    try {
      setLoading(true)

      // Fetch dentists
      const { data: dentistsData, error: dentistsError } = await supabase
        .from("dentistas")
        .select("id, nome, sobrenome")
        .order("nome")

      if (dentistsError) throw dentistsError

      // Fetch patients
      const { data: patientsData, error: patientsError } = await supabase
        .from("pacientes")
        .select("id, nome, sobrenome")
        .order("nome")

      if (patientsError) throw patientsError

      // Fetch procedures
      const { data: proceduresData, error: proceduresError } = await supabase
        .from("procedimentos")
        .select("id, nome, duracao, valor")
        .order("nome")

      if (proceduresError) throw proceduresError

      // Fetch appointments with related information
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("agendamentos")
        .select(`
        id,
        paciente_id,
        dentista_id,
        procedimento_id,
        data,
        hora,
        status,
        observacoes,
        valor,
        pagamento_status,
        valor_pago,
        parcelado,
        parcelas,
        parcelas_restantes,
        valor_parcela,
        forma_pagamento
      `)
        .order("data", { ascending: false })
        .order("hora")

      if (appointmentsError) throw appointmentsError

      // Set data in states
      if (dentistsData) setDentists(dentistsData)
      if (patientsData) setPatients(patientsData)
      if (proceduresData) setProcedures(proceduresData)

      if (appointmentsData) {
        // Enrich appointment data with related information
        const enrichedAppointments = await Promise.all(
          appointmentsData.map(async (appointment) => {
            // Find patient information
            const patient = patientsData?.find((p) => p.id === appointment.paciente_id)

            // Find dentist information
            const dentist = dentistsData?.find((d) => d.id === appointment.dentista_id)

            // Find procedure information
            const procedure = proceduresData?.find((p) => p.id === appointment.procedimento_id)

            return {
              ...appointment,
              paciente_nome: patient?.nome || "Paciente não encontrado",
              paciente_sobrenome: patient?.sobrenome || "",
              dentista_nome: dentist?.nome || "Dentista não encontrado",
              dentista_sobrenome: dentist?.sobrenome || "",
              procedimento_nome: procedure?.nome || "Procedimento não encontrado",
            }
          }),
        )

        setAppointments(enrichedAppointments)
      }
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

  // Filtrar agendamentos com base nos critérios selecionados
  function filterAppointments() {
    let filtered = [...appointments]

    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (appointment) =>
          appointment.paciente_nome?.toLowerCase().includes(term) ||
          false ||
          appointment.paciente_sobrenome?.toLowerCase().includes(term) ||
          false ||
          appointment.dentista_nome?.toLowerCase().includes(term) ||
          false ||
          appointment.dentista_sobrenome?.toLowerCase().includes(term) ||
          false ||
          appointment.procedimento_nome?.toLowerCase().includes(term) ||
          false,
      )
    }

    // Filtrar por data
    if (selectedDate) {
      filtered = filtered.filter((appointment) => appointment.data === selectedDate)
    }

    // Filtrar por dentista
    if (selectedDentistFilter !== "all") {
      filtered = filtered.filter((appointment) => appointment.dentista_id === selectedDentistFilter)
    }

    // Filtrar por status
    if (selectedStatusFilter !== "all") {
      filtered = filtered.filter((appointment) => appointment.status === selectedStatusFilter)
    }

    setFilteredAppointments(filtered)
  }

  // Resetar o formulário
  const resetForm = () => {
    setFormPatient("")
    setFormDentist("")
    setFormProcedure("")
    setFormDate("")
    setFormTime("")
    setFormStatus("Agendado")
    setFormNotes("")
    setFormError("")
  }

  // Abrir modal para adicionar agendamento
  const openAddAppointmentModal = () => {
    resetForm()
    setFormDate(new Date().toISOString().split("T")[0])
    setShowAddAppointment(true)
  }

  // Abrir modal para editar agendamento
  const openEditAppointmentModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setFormPatient(appointment.paciente_id)
    setFormDentist(appointment.dentista_id)
    setFormProcedure(appointment.procedimento_id)
    setFormDate(appointment.data)
    setFormTime(appointment.hora)
    setFormStatus(appointment.status)
    setFormNotes(appointment.observacoes || "")
    setFormError("")
    setShowEditAppointment(true)
  }

  // Abrir confirmação de exclusão
  const openDeleteConfirmation = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowDeleteConfirm(true)
  }

  // Validar formulário
  const validateForm = () => {
    if (!formPatient) {
      setFormError("Selecione um paciente")
      return false
    }
    if (!formDentist) {
      setFormError("Selecione um dentista")
      return false
    }
    if (!formProcedure) {
      setFormError("Selecione um procedimento")
      return false
    }
    if (!formDate) {
      setFormError("Selecione uma data")
      return false
    }
    if (!formTime) {
      setFormError("Selecione um horário")
      return false
    }
    return true
  }

  // Adicionar agendamento
  const addAppointment = async () => {
    if (!validateForm()) return

    try {
      setSubmitting(true)

      // Obter o valor do procedimento
      const procedure = procedures.find((p) => p.id === formProcedure)
      const valor = procedure?.valor || 0

      // Inserir o agendamento
      const { data, error } = await supabase
        .from("agendamentos")
        .insert([
          {
            paciente_id: formPatient,
            dentista_id: formDentist,
            procedimento_id: formProcedure,
            data: formDate,
            hora: formTime,
            status: formStatus,
            observacoes: formNotes || null,
            valor: valor,
          },
        ])
        .select()

      if (error) throw error

      // Atualizar a lista de agendamentos
      await fetchData()

      setShowAddAppointment(false)
      toast({
        title: "Agendamento criado",
        description: "O agendamento foi criado com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao adicionar agendamento:", error)
      setFormError("Erro ao criar agendamento. Verifique se já não existe um agendamento para este horário.")
    } finally {
      setSubmitting(false)
    }
  }

  // Editar agendamento
  const editAppointment = async () => {
    if (!validateForm() || !selectedAppointment) return

    try {
      setSubmitting(true)

      // Obter o valor do procedimento se for diferente do atual
      let valor = selectedAppointment.valor
      if (formProcedure !== selectedAppointment.procedimento_id) {
        const procedure = procedures.find((p) => p.id === formProcedure)
        valor = procedure?.valor || 0
      }

      // Atualizar o agendamento
      const { data, error } = await supabase
        .from("agendamentos")
        .update({
          paciente_id: formPatient,
          dentista_id: formDentist,
          procedimento_id: formProcedure,
          data: formDate,
          hora: formTime,
          status: formStatus,
          observacoes: formNotes || null,
          valor: valor,
        })
        .eq("id", selectedAppointment.id)
        .select()

      if (error) throw error

      // Atualizar a lista de agendamentos
      await fetchData()

      setShowEditAppointment(false)
      toast({
        title: "Agendamento atualizado",
        description: "O agendamento foi atualizado com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao atualizar agendamento:", error)
      setFormError("Erro ao atualizar agendamento. Verifique se já não existe um agendamento para este horário.")
    } finally {
      setSubmitting(false)
    }
  }

  // Excluir agendamento
  const deleteAppointment = async () => {
    if (!selectedAppointment) return

    try {
      setSubmitting(true)

      const { error } = await supabase.from("agendamentos").delete().eq("id", selectedAppointment.id)

      if (error) throw error

      // Atualizar a lista de agendamentos
      await fetchData()

      setShowDeleteConfirm(false)
      toast({
        title: "Agendamento excluído",
        description: "O agendamento foi excluído com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error)
      toast({
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir o agendamento.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR })
    } catch (error) {
      return dateString
    }
  }

  // Obter ícone de status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Agendado":
        return <Clock className="h-5 w-5 text-blue-500" />
      case "Concluído":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "Cancelado":
        return <X className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  // Obter cor do badge de status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Agendado":
        return "default"
      case "Concluído":
        return "outline"
      case "Cancelado":
        return "destructive"
      default:
        return "secondary"
    }
  }

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">Gerenciar Agendamentos</h1>
          <p className="text-muted-foreground">Crie, visualize, edite e exclua agendamentos da clínica</p>
        </div>
        <Button onClick={openAddAppointmentModal} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

      {/* Modal de Adicionar Agendamento */}
      <Dialog open={showAddAppointment} onOpenChange={setShowAddAppointment}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Criar Novo Agendamento</DialogTitle>
            <DialogDescription>Preencha os dados para agendar uma nova consulta.</DialogDescription>
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
                <Label htmlFor="patient">Paciente</Label>
                <Select value={formPatient} onValueChange={setFormPatient}>
                  <SelectTrigger id="patient">
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.nome} {patient.sobrenome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dentist">Dentista</Label>
                <Select value={formDentist} onValueChange={setFormDentist}>
                  <SelectTrigger id="dentist">
                    <SelectValue placeholder="Selecione o dentista" />
                  </SelectTrigger>
                  <SelectContent>
                    {dentists.map((dentist) => (
                      <SelectItem key={dentist.id} value={dentist.id}>
                        {dentist.nome} {dentist.sobrenome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="procedure">Procedimento</Label>
              <Select value={formProcedure} onValueChange={setFormProcedure}>
                <SelectTrigger id="procedure">
                  <SelectValue placeholder="Selecione o procedimento" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((procedure) => (
                    <SelectItem key={procedure.id} value={procedure.id}>
                      {procedure.nome} - {procedure.duracao} min - R$ {procedure.valor.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Horário</Label>
                <Input id="time" type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Observações adicionais"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAppointment(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={addAppointment} className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
              {submitting ? "Criando..." : "Criar Agendamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Agendamento */}
      <Dialog open={showEditAppointment} onOpenChange={setShowEditAppointment}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>Atualize os dados do agendamento.</DialogDescription>
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
                <Label htmlFor="edit-patient">Paciente</Label>
                <Select value={formPatient} onValueChange={setFormPatient}>
                  <SelectTrigger id="edit-patient">
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.nome} {patient.sobrenome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dentist">Dentista</Label>
                <Select value={formDentist} onValueChange={setFormDentist}>
                  <SelectTrigger id="edit-dentist">
                    <SelectValue placeholder="Selecione o dentista" />
                  </SelectTrigger>
                  <SelectContent>
                    {dentists.map((dentist) => (
                      <SelectItem key={dentist.id} value={dentist.id}>
                        {dentist.nome} {dentist.sobrenome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-procedure">Procedimento</Label>
              <Select value={formProcedure} onValueChange={setFormProcedure}>
                <SelectTrigger id="edit-procedure">
                  <SelectValue placeholder="Selecione o procedimento" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((procedure) => (
                    <SelectItem key={procedure.id} value={procedure.id}>
                      {procedure.nome} - {procedure.duracao} min - R$ {procedure.valor.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Data</Label>
                <Input id="edit-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">Horário</Label>
                <Input id="edit-time" type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agendado">Agendado</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Observações</Label>
              <Textarea
                id="edit-notes"
                placeholder="Observações adicionais"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditAppointment(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={editAppointment} className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
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
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                deleteAppointment()
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={submitting}
            >
              {submitting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar agendamentos..."
            className="w-full pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <Input
            type="date"
            className="w-full"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <div>
          <Select value={selectedDentistFilter} onValueChange={setSelectedDentistFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por dentista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Dentistas</SelectItem>
              {dentists.map((dentist) => (
                <SelectItem key={dentist.id} value={dentist.id}>
                  {dentist.nome} {dentist.sobrenome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="Agendado">Agendado</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Agendamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos</CardTitle>
          <CardDescription>
            {selectedDate ? `Agendamentos para ${formatDate(selectedDate)}` : "Todos os agendamentos"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
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
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-10">
              <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum agendamento encontrado</h3>
              <p className="mt-2 text-muted-foreground">
                {searchTerm || selectedDentistFilter !== "all" || selectedStatusFilter !== "all"
                  ? "Não foram encontrados agendamentos com os critérios de filtro selecionados."
                  : "Não há agendamentos para esta data."}
              </p>
              <Button onClick={openAddAppointmentModal} className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" /> Criar Agendamento
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-md border p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(appointment.status)}
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="font-medium">
                            {appointment.paciente_nome} {appointment.paciente_sobrenome}
                          </p>
                          <Badge className="ml-2" variant={getStatusBadgeVariant(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground space-x-4">
                          <span>{appointment.procedimento_nome}</span>
                          <span>•</span>
                          <span>
                            {formatDate(appointment.data)} às {appointment.hora}
                          </span>
                          <span>•</span>
                          <span>
                            Dr(a). {appointment.dentista_nome} {appointment.dentista_sobrenome}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                        onClick={() => openEditAppointmentModal(appointment)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => openDeleteConfirmation(appointment)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Excluir
                      </Button>
                    </div>
                  </div>
                  {appointment.observacoes && (
                    <div className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                      <p className="font-medium text-xs mb-1">Observações:</p>
                      {appointment.observacoes}
                    </div>
                  )}

                  {/* Display payment information if available */}
                  {appointment.pagamento_status && (
                    <div className="mt-2 border-t pt-2">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <div>
                          <span className="font-medium">Valor:</span> {formatCurrency(appointment.valor || 0)}
                        </div>
                        <div>
                          <span className="font-medium">Status de Pagamento:</span>{" "}
                          <Badge
                            variant={
                              appointment.pagamento_status === "Pago"
                                ? "success"
                                : appointment.pagamento_status === "Parcial"
                                  ? "outline"
                                  : "warning"
                            }
                            className={
                              appointment.pagamento_status === "Pago"
                                ? "bg-green-100 text-green-800"
                                : appointment.pagamento_status === "Parcial"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {appointment.pagamento_status}
                          </Badge>
                        </div>
                        {appointment.valor_pago !== undefined && appointment.valor_pago > 0 && (
                          <div>
                            <span className="font-medium">Valor Pago:</span> {formatCurrency(appointment.valor_pago)}
                          </div>
                        )}
                        {appointment.forma_pagamento && (
                          <div>
                            <span className="font-medium">Forma de Pagamento:</span> {appointment.forma_pagamento}
                          </div>
                        )}
                        {appointment.parcelado && appointment.parcelas_restantes && appointment.parcelas && (
                          <div>
                            <span className="font-medium">Parcelamento:</span> {appointment.parcelas_restantes}/
                            {appointment.parcelas} parcelas de {formatCurrency(appointment.valor_parcela || 0)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

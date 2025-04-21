"use client"

import Link from "next/link"

import { usePathname } from "next/navigation"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Plus, Search, Clock, CheckCircle, AlertCircle, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

// Tipos
type Appointment = {
  id: string
  paciente_id: string
  paciente_nome?: string
  paciente_sobrenome?: string
  dentista_id: string
  data: string
  hora: string
  procedimento_id: string
  procedimento_nome?: string
  procedimento_duracao?: number
  status: string
  observacoes: string | null
  valor: number | null
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

export default function DentistAppointmentsPage() {
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAddAppointment, setShowAddAppointment] = useState(false)
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [appointmentNotes, setAppointmentNotes] = useState("")
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
  
  // Estados para o formulário de agendamento
  const [formPatient, setFormPatient] = useState("")
  const [formProcedure, setFormProcedure] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formTime, setFormTime] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Simular o ID do dentista logado (em produção, viria da autenticação)
  const dentistaId = "1" // Substitua por um ID válido do seu banco de dados

  useEffect(() => {
    fetchData()
  }, [dentistaId])

  // Filtrar agendamentos com base no termo de busca e data selecionada
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredAppointments(appointments.filter(appointment => appointment.data === selectedDate))
    } else {
      const filtered = appointments.filter(
        appointment => 
          appointment.data === selectedDate &&
          ((appointment.paciente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
          (appointment.paciente_sobrenome?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
          (appointment.procedimento_nome?.toLowerCase().includes(searchTerm.toLowerCase()) || false))
      )
      setFilteredAppointments(filtered)
    }
  }, [searchTerm, selectedDate, appointments])

  async function fetchData() {
    try {
      setLoading(true)
      
      // Buscar pacientes
      const { data: patientsData, error: patientsError } = await supabase
        .from("pacientes")
        .select("id, nome, sobrenome")
        .eq("dentista_id", dentistaId)
        .order("nome")
      
      if (patientsError) throw patientsError
      
      // Buscar procedimentos
      const { data: proceduresData, error: proceduresError } = await supabase
        .from("procedimentos")
        .select("id, nome, duracao, valor")
        .order("nome")
      
      if (proceduresError) throw proceduresError
      
      // Buscar agendamentos do dentista
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("agendamentos")
        .select(`
          id,
          paciente_id,
          dentista_id,
          data,
          hora,
          procedimento_id,
          status,
          observacoes,
          valor
        `)
        .eq("dentista_id", dentistaId)
        .order("data", { ascending: true })
        .order("hora", { ascending: true })
      
      if (appointmentsError) throw appointmentsError
      
      // Definir os dados nos estados
      if (patientsData) setPatients(patientsData)
      if (proceduresData) setProcedures(proceduresData)
      
      if (appointmentsData) {
        // Enriquecer os dados de agendamentos com informações relacionadas
        const enrichedAppointments = await Promise.all(
          appointmentsData.map(async (appointment) => {
            // Buscar informações do paciente
            const patient = patientsData?.find(p => p.id === appointment.paciente_id)
            
            // Buscar informações do procedimento
            const procedure = proceduresData?.find(p => p.id === appointment.procedimento_id)
            
            return {
              ...appointment,
              paciente_nome: patient?.nome || "Paciente não encontrado",
              paciente_sobrenome: patient?.sobrenome || "",
              procedimento_nome: procedure?.nome || "Procedimento não encontrado",
              procedimento_duracao: procedure?.duracao || 0
            }
          })
        )
        
        setAppointments(enrichedAppointments)
        setFilteredAppointments(enrichedAppointments.filter(appointment => appointment.data === selectedDate))
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados necessários.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Função para visualizar detalhes do agendamento
  const viewAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setAppointmentNotes(appointment.observacoes || "")
    setShowAppointmentDetails(true)
  }

  // Função para salvar observações do agendamento
  const saveAppointmentNotes = async () => {
    if (!selectedAppointment) return

    try {
      setSubmitting(true)
      
      const { error } = await supabase
        .from("agendamentos")
        .update({ observacoes: appointmentNotes })
        .eq("id", selectedAppointment.id)

      if (error) throw error

      // Atualizar o estado local
      const updatedAppointments = appointments.map((appointment) =>
        appointment.id === selectedAppointment.id ? { ...appointment, observacoes: appointmentNotes } : appointment
      )

      setAppointments(updatedAppointments)
      setFilteredAppointments(updatedAppointments.filter(appointment => appointment.data === selectedDate))
      setShowAppointmentDetails(false)

      toast({
        title: "Observações salvas",
        description: "As observações foram salvas com sucesso."
      })
    } catch (error) {
      console.error("Erro ao salvar observações:", error)
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as observações.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Função para atualizar o status do agendamento
  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      setSubmitting(true)
      
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: newStatus })
        .eq("id", appointmentId)

      if (error) throw error

      // Atualizar o estado local
      const updatedAppointments = appointments.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, status: newStatus } : appointment
      )

      setAppointments(updatedAppointments)
      setFilteredAppointments(updatedAppointments.filter(appointment => appointment.data === selectedDate))

      toast({
        title: "Status atualizado",
        description: `O agendamento foi marcado como ${newStatus}.`
      })
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      toast({
        title: "Erro ao atualizar",
        description: "Ocorreu um erro ao atualizar o status do agendamento.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Resetar o formulário
  const resetForm = () => {
    setFormPatient("")
    setFormProcedure("")
    setFormDate(new Date().toISOString().split("T")[0])
    setFormTime("")
    setFormNotes("")
    setFormError("")
  }

  // Abrir modal para adicionar agendamento
  const openAddAppointmentModal = () => {
    resetForm()
    setShowAddAppointment(true)
  }

  // Validar formulário
  const validateForm = () => {
    if (!formPatient) {
      setFormError("Selecione um paciente")
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
      const procedure = procedures.find(p => p.id === formProcedure)
      const valor = procedure?.valor || 0
      
      // Verificar se já existe um agendamento para o mesmo dentista, data e hora
      const { data: existingAppointment, error: checkError } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("dentista_id", dentistaId)
        .eq("data", formDate)
        .eq("hora", formTime)
        .maybeSingle()
      
      if (checkError) throw checkError
      
      if (existingAppointment) {
        setFormError("Já existe um agendamento para este horário")
        return
      }
      
      // Inserir o agendamento
      const { data, error } = await supabase
        .from("agendamentos")
        .insert([
          {
            paciente_id: formPatient,
            dentista_id: dentistaId,
            procedimento_id: formProcedure,
            data: formDate,
            hora: formTime,
            status: "Agendado",
            observacoes: formNotes || null,
            valor: valor
          }
        ])
        .select()
      
      if (error) throw error
      
      // Atualizar a lista de agendamentos
      await fetchData()
      
      setShowAddAppointment(false)
      toast({
        title: "Agendamento criado",
        description: "O agendamento foi criado com sucesso."
      })
    } catch (error) {
      console.error("Erro ao adicionar agendamento:", error)
      setFormError("Erro ao criar agendamento. Verifique se já não existe um agendamento para este horário.")
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

  // Filtrar agendamentos para hoje
  const today = new Date().toISOString().split("T")[0]
  const todaysAppointments = appointments.filter((appointment) => appointment.data === today)

  // Filtrar agendamentos concluídos hoje
  const completedTodaysAppointments = todaysAppointments.filter((appointment) => appointment.status === "Concluído")

  // Próximo agendamento
  const nextAppointment = todaysAppointments.find((appointment) => appointment.status === "Agendado")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">Meus Agendamentos</h1>
          <p className="text-muted-foreground">Gerencie suas consultas e procedimentos</p>
        </div>
        <Button onClick={openAddAppointmentModal} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

      {/* Modal de Adicionar Agendamento */}
      <Dialog open={showAddAppointment} onOpenChange={setShowAddAppointment}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agendar Nova Consulta</DialogTitle>
            <DialogDescription>Crie um novo agendamento para um paciente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm p-3 rounded-md flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}
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
                <Input 
                  id="date" 
                  type="date" 
                  value={formDate} 
                  onChange={(e) => setFormDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Horário</Label>
                <Input 
                  id="time" 
                  type="time" 
                  value={formTime} 
                  onChange={(e) => setFormTime(e.target.value)} 
                />
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
              {submitting ? "Agendando..." : "Agendar Consulta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Agendamento */}
      <Dialog open={showAppointmentDetails} onOpenChange={setShowAppointmentDetails}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <DialogDescription>Visualize e edite informações da consulta</DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Paciente</Label>
                  <p className="font-medium">
                    {selectedAppointment.paciente_nome} {selectedAppointment.paciente_sobrenome}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Procedimento</Label>
                  <p className="font-medium">{selectedAppointment.procedimento_nome}</p>
                </div>
                <div className="space-y-1">
                  <Label>Data</Label>
                  <p className="font-medium">{formatDate(selectedAppointment.data)}</p>
                </div>
                <div className="space-y-1">
                  <Label>Horário</Label>
                  <p className="font-medium">{selectedAppointment.hora}</p>
                </div>
                <div className="space-y-1">
                  <Label>Valor</Label>
                  <p className="font-medium">R$ {selectedAppointment.valor?.toFixed(2) || "0.00"}</p>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Badge variant={selectedAppointment.status === "Concluído" ? "default" : "outline"}>
                    {selectedAppointment.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment-notes">Observações do Dentista</Label>
                <Textarea
                  id="appointment-notes"
                  placeholder="Adicione observações sobre o procedimento"
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAppointmentDetails(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={saveAppointmentNotes} className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar Observações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas de Hoje</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {completedTodaysAppointments.length} concluídas,{" "}
              {todaysAppointments.length - completedTodaysAppointments.length} pendentes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTodaysAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {todaysAppointments.length > 0
                ? `${Math.round((completedTodaysAppointments.length / todaysAppointments.length) * 100)}% das consultas de hoje`
                : "Nenhuma consulta hoje"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Paciente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nextAppointment
                ? `${nextAppointment.paciente_nome} ${nextAppointment.paciente_sobrenome}`
                : "Nenhum agendado"}
            </div>
            <p className="text-xs text-muted-foreground">
              {nextAppointment
                ? `${nextAppointment.hora} - ${nextAppointment.procedimento_nome}`
                : "Sem consultas pendentes hoje"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar agendamentos..."
            className="w-full pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Input 
          type="date" 
          className="w-auto" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)} 
        />
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos para {formatDate(selectedDate)}</CardTitle>
              <CardDescription>Todos os agendamentos programados para esta data</CardDescription>
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
                  <p className="mt-2 text-muted-foreground">Não há agendamentos para esta data.</p>
                  <Button onClick={openAddAppointmentModal} className="mt-4 bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> Criar Agendamento
                


Vamos adicionar um link para a nova página de gerenciamento de agendamentos no layout do dashboard:

```typescriptreact file="app/dashboard/layout.tsx"
[v0-no-op-code-block-prefix]"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CalendarDays, CreditCard, Users, LineChart, Menu, X, Home, UserCircle, LogOut, FileText, Settings, SmileIcon as Tooth, User } from 'lucide-react'
import { ModeToggle } from "@/components/mode-toggle"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  // Determine user type from URL
  const userType = pathname.split("/")[2]

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  // Define navigation items based on user type
  const navItems = [
    { href: `/dashboard/${userType}`, label: "Dashboard", icon: <Home className="h-5 w-5" /> },
    { href: `/dashboard/${userType}/pacientes`, label: "Pacientes", icon: <Users className="h-5 w-5" /> },
    { href: `/dashboard/${userType}/agendamentos`, label: "Agendamentos", icon: <CalendarDays className="h-5 w-5" /> },
    { href: `/dashboard/${userType}/procedimentos`, label: "Procedimentos", icon: <FileText className="h-5 w-5" /> },
  ]

  // Add admin specific items
  if (userType === "admin") {
    navItems.push(
      { href: `/dashboard/${userType}/dentistas`, label: "Dentistas", icon: <User className="h-5 w-5" /> },
      { href: `/dashboard/${userType}/gerenciar-agendamentos`, label: "Gerenciar Agendamentos", icon: <CalendarDays className="h-5 w-5" /> },
      { href: `/dashboard/${userType}/financeiro`, label: "Financeiro", icon: <CreditCard className="h-5 w-5" /> },
      { href: `/dashboard/${userType}/relatorios`, label: "Relatórios", icon: <LineChart className="h-5 w-5" /> },
    )
  }

  // Add settings for all users
  navItems.push({
    href: `/dashboard/${userType}/configuracoes`,
    label: "Configurações",
    icon: <Settings className="h-5 w-5" />,
  })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <div className="mr-4 hidden md:flex">
            <Link href={`/dashboard/${userType}`} className="mr-6 flex items-center space-x-2">
              <Tooth className="h-6 w-6 text-blue-500" />
              <span className="hidden font-bold sm:inline-block">OdontoClinic</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <ModeToggle />
            <div className="flex items-center">
              <UserCircle className="mr-2 h-5 w-5" />
              <span className="text-sm font-medium capitalize">{userType}</span>
            </div>
            <Link href="/login">
              <Button variant="ghost" size="icon">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sair</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-background transition-transform duration-300 md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 items-center border-b px-4">
            <Link href={`/dashboard/${userType}`} className="flex items-center space-x-2">
              <Tooth className="h-6 w-6 text-blue-500" />
              <span className="font-bold">OdontoClinic</span>
            </Link>
            <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
              <span className="sr-only">Fechar Menu</span>
            </Button>
          </div>
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  pathname === item.href
                    ? "bg-blue-100 dark:bg-blue-900 font-medium text-blue-700 dark:text-blue-200"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className={`flex-1 md:ml-64 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <main className="container py-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

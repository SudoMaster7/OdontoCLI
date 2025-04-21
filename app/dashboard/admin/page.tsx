"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, CreditCard, Users, CheckCircle, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"

// Tipos
type DashboardStats = {
  totalPatients: number
  todayAppointments: number
  monthlyRevenue: number
  pendingPayments: number
}

type RecentActivity = {
  id: string
  type: "payment" | "appointment" | "reminder"
  title: string
  description: string
  date: string
  icon: "payment" | "appointment" | "reminder"
}

export default function AdminDashboard() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)

      // Buscar estatísticas do dashboard
      await Promise.all([
        fetchTotalPatients(),
        fetchTodayAppointments(),
        fetchMonthlyRevenue(),
        fetchPendingPayments(),
        fetchRecentActivities(),
      ])
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Buscar total de pacientes
  async function fetchTotalPatients() {
    try {
      const { count, error } = await supabase.from("pacientes").select("*", { count: "exact", head: true })

      if (error) throw error

      setStats((prev) => ({ ...prev, totalPatients: count || 0 }))
    } catch (error) {
      console.error("Erro ao buscar total de pacientes:", error)
      throw error
    }
  }

  // Buscar agendamentos de hoje
  async function fetchTodayAppointments() {
    try {
      const today = new Date().toISOString().split("T")[0]

      const { count, error } = await supabase
        .from("agendamentos")
        .select("*", { count: "exact", head: true })
        .eq("data", today)

      if (error) throw error

      setStats((prev) => ({ ...prev, todayAppointments: count || 0 }))
    } catch (error) {
      console.error("Erro ao buscar agendamentos de hoje:", error)
      throw error
    }
  }

  // Buscar receita mensal
  async function fetchMonthlyRevenue() {
    try {
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("agendamentos")
        .select("valor")
        .eq("status", "Concluído")
        .gte("data", firstDayOfMonth)
        .lte("data", lastDayOfMonth)

      if (error) throw error

      const monthlyRevenue = data?.reduce((sum, item) => sum + (item.valor || 0), 0) || 0
      setStats((prev) => ({ ...prev, monthlyRevenue }))
    } catch (error) {
      console.error("Erro ao buscar receita mensal:", error)
      throw error
    }
  }

  // Buscar pagamentos pendentes
  async function fetchPendingPayments() {
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("valor")
        .eq("status", "Concluído")
        .eq("pagamento_status", "Pendente")

      if (error) throw error

      const pendingPayments = data?.reduce((sum, item) => sum + (item.valor || 0), 0) || 0
      setStats((prev) => ({ ...prev, pendingPayments }))
    } catch (error) {
      console.error("Erro ao buscar pagamentos pendentes:", error)
      throw error
    }
  }

  // Buscar atividades recentes
  async function fetchRecentActivities() {
    try {
      // Buscar pagamentos recentes
      const { data: recentPayments, error: paymentsError } = await supabase
        .from("agendamentos")
        .select(`
          id,
          data,
          valor,
          pacientes (nome, sobrenome)
        `)
        .eq("status", "Concluído")
        .eq("pagamento_status", "Pago")
        .order("data", { ascending: false })
        .limit(3)

      if (paymentsError) throw paymentsError

      // Buscar agendamentos recentes
      const { data: recentAppointments, error: appointmentsError } = await supabase
        .from("agendamentos")
        .select(`
          id,
          data,
          hora,
          dentistas (nome, sobrenome)
        `)
        .order("created_at", { ascending: false })
        .limit(3)

      if (appointmentsError) throw appointmentsError

      // Formatar atividades recentes
      const paymentActivities: RecentActivity[] =
        recentPayments?.map((payment) => ({
          id: `payment-${payment.id}`,
          type: "payment",
          title: "Pagamento recebido",
          description: `Paciente: ${payment.pacientes[0]?.nome || "N/A"} ${payment.pacientes[0]?.sobrenome || "N/A"} • R$ ${payment.valor.toFixed(2)}`,
          date: payment.data,
          icon: "payment",
        })) || []

      const appointmentActivities: RecentActivity[] =
        recentAppointments?.map((appointment) => ({
          id: `appointment-${appointment.id}`,
          type: "appointment",
          title: "Nova consulta agendada",
          description: `Dr. ${appointment.dentistas[0]?.nome || "N/A"} ${appointment.dentistas[0]?.sobrenome || "N/A"} • ${appointment.data} às ${appointment.hora}`,
          date: appointment.data,
          icon: "appointment",
        })) || []

      // Combinar e ordenar atividades
      const allActivities = [...paymentActivities, ...appointmentActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)

      setRecentActivities(allActivities)
    } catch (error) {
      console.error("Erro ao buscar atividades recentes:", error)
      throw error
    }
  }

  // Formatar valor para exibição
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("pt-BR").format(date)
  }

  // Renderizar ícone da atividade
  const renderActivityIcon = (icon: string) => {
    switch (icon) {
      case "payment":
        return <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
      case "appointment":
        return <CalendarDays className="mr-2 h-4 w-4 text-blue-500" />
      case "reminder":
        return <AlertCircle className="mr-2 h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao painel administrativo. Aqui você pode gerenciar todos os aspectos da sua clínica odontológica.
        </p>
      </div>

      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-4 rounded-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-7 w-28 mb-1" />
                      <Skeleton className="h-4 w-36" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalPatients}</div>
                    <p className="text-xs text-muted-foreground">Pacientes cadastrados no sistema</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Consultas Hoje</CardTitle>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.todayAppointments}</div>
                    <p className="text-xs text-muted-foreground">Agendamentos para hoje</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
                    <p className="text-xs text-muted-foreground">Receita do mês atual</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.pendingPayments)}</div>
                    <p className="text-xs text-muted-foreground">Valores a receber</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Visão Geral da Receita</CardTitle>
              </CardHeader>
              <CardContent className="h-[200px] flex items-center justify-center">
                {loading ? (
                  <Skeleton className="h-full w-full rounded-md" />
                ) : (
                  <p className="text-muted-foreground">Gráfico de receita apareceria aqui</p>
                )}
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Atividades Recentes</CardTitle>
                <CardDescription>Últimas transações e consultas</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center">
                        <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                        <div className="ml-2 space-y-1">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-4 w-[150px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhuma atividade recente</p>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center">
                        {renderActivityIcon(activity.icon)}
                        <div className="ml-2 space-y-1">
                          <p className="text-sm font-medium leading-none">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Analytics detalhados sobre sua clínica odontológica</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <div className="h-full w-full flex flex-col gap-4">
                  <Skeleton className="h-1/2 w-full rounded-md" />
                  <div className="grid grid-cols-2 gap-4 h-1/2">
                    <Skeleton className="h-full w-full rounded-md" />
                    <Skeleton className="h-full w-full rounded-md" />
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col gap-4">
                  <div className="h-1/2 border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">Consultas por Mês</h3>
                    <div className="h-[calc(100%-2rem)] flex items-center justify-center">
                      <p className="text-muted-foreground">Gráfico de consultas por mês apareceria aqui</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 h-1/2">
                    <div className="border rounded-md p-4">
                      <h3 className="text-lg font-medium mb-2">Procedimentos Mais Comuns</h3>
                      <div className="h-[calc(100%-2rem)] flex items-center justify-center">
                        <p className="text-muted-foreground">Gráfico de procedimentos apareceria aqui</p>
                      </div>
                    </div>
                    <div className="border rounded-md p-4">
                      <h3 className="text-lg font-medium mb-2">Receita por Dentista</h3>
                      <div className="h-[calc(100%-2rem)] flex items-center justify-center">
                        <p className="text-muted-foreground">Gráfico de receita por dentista apareceria aqui</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="relatorios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios</CardTitle>
              <CardDescription>Gere e visualize relatórios detalhados</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <Skeleton className="h-full w-full rounded-md" />
              ) : (
                <div className="h-full flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-md p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                      <h3 className="text-lg font-medium">Relatório Financeiro</h3>
                      <p className="text-sm text-muted-foreground">Receitas, despesas e lucro</p>
                    </div>
                    <div className="border rounded-md p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                      <h3 className="text-lg font-medium">Relatório de Pacientes</h3>
                      <p className="text-sm text-muted-foreground">Novos pacientes e consultas</p>
                    </div>
                    <div className="border rounded-md p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                      <h3 className="text-lg font-medium">Relatório de Procedimentos</h3>
                      <p className="text-sm text-muted-foreground">Procedimentos realizados</p>
                    </div>
                  </div>
                  <div className="flex-1 border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">Selecione um relatório para visualizar</h3>
                    <div className="h-[calc(100%-2rem)] flex items-center justify-center">
                      <p className="text-muted-foreground">Os dados do relatório aparecerão aqui</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

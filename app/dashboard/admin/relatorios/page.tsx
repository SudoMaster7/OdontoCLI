"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, BarChart, PieChart, Download, Calendar, Loader2, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Tipos
type ReportFilters = {
  dateRange: string
  dentistId: string
  procedureId: string
}

type ReportData = {
  financial: {
    totalRevenue: number
    revenueByDentist: { dentistName: string; revenue: number }[]
    revenueByProcedure: { procedureName: string; revenue: number }[]
  }
  appointments: {
    total: number
    completed: number
    cancelled: number
    byDentist: { dentistName: string; count: number }[]
  }
  procedures: {
    mostCommon: { procedureName: string; count: number }[]
    totalRevenue: number
  }
  patients: {
    total: number
    new: number
    returning: number
    byAge: { ageGroup: string; count: number }[]
  }
}

type Dentist = {
  id: string
  nome: string
  sobrenome: string
}

type Procedure = {
  id: string
  nome: string
}

export default function ReportsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: "month",
    dentistId: "all",
    procedureId: "all",
  })
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    try {
      setLoading(true)
      setError(null)

      // Buscar dentistas
      const { data: dentistsData, error: dentistsError } = await supabase
        .from("dentistas")
        .select("id, nome, sobrenome")
        .order("nome")

      if (dentistsError) {
        console.error("Erro ao buscar dentistas:", dentistsError)
        throw dentistsError
      }

      // Buscar procedimentos
      const { data: proceduresData, error: proceduresError } = await supabase
        .from("procedimentos")
        .select("id, nome")
        .order("nome")

      if (proceduresError) {
        console.error("Erro ao buscar procedimentos:", proceduresError)
        throw proceduresError
      }

      if (dentistsData) setDentists(dentistsData)
      if (proceduresData) setProcedures(proceduresData)
    } catch (error: any) {
      console.error("Erro ao buscar dados iniciais:", error)
      setError("Não foi possível carregar os dados iniciais.")
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados necessários.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Gerar relatório com base nos filtros
  async function generateReport() {
    try {
      setGenerating(true)
      setError(null)
      setDebugInfo(null)

      // Determinar intervalo de datas com base no filtro
      const { startDate, endDate } = getDateRange(filters.dateRange)

      console.log("Gerando relatório para o período:", startDate, "até", endDate)

      // Verificar a estrutura da tabela agendamentos
      try {
        const { data: tableInfo, error: tableError } = await supabase.from("agendamentos").select("*").limit(1)

        if (tableError) {
          console.error("Erro ao verificar estrutura da tabela:", tableError)
          throw tableError
        }

        console.log("Estrutura da tabela agendamentos:", tableInfo)
        setDebugInfo({ tableStructure: tableInfo })
      } catch (error: any) {
        console.error("Erro ao verificar estrutura da tabela:", error)
        setDebugInfo({ tableStructureError: error.message })
      }

      // Buscar dados para o relatório financeiro
      let financialData
      try {
        financialData = await fetchFinancialReportData(startDate, endDate)
        console.log("Dados financeiros obtidos:", financialData)
      } catch (error: any) {
        console.error("Erro ao buscar dados financeiros:", error)
        setError(`Erro ao buscar dados financeiros: ${error.message || "Erro desconhecido"}`)
        financialData = {
          totalRevenue: 0,
          revenueByDentist: [],
          revenueByProcedure: [],
        }
      }

      // Buscar dados para o relatório de agendamentos
      let appointmentsData
      try {
        appointmentsData = await fetchAppointmentsReportData(startDate, endDate)
      } catch (error: any) {
        console.error("Erro ao buscar dados de agendamentos:", error)
        appointmentsData = {
          total: 0,
          completed: 0,
          cancelled: 0,
          byDentist: [],
        }
      }

      // Buscar dados para o relatório de procedimentos
      let proceduresData
      try {
        proceduresData = await fetchProceduresReportData(startDate, endDate)
      } catch (error: any) {
        console.error("Erro ao buscar dados de procedimentos:", error)
        proceduresData = {
          mostCommon: [],
          totalRevenue: 0,
        }
      }

      // Buscar dados para o relatório de pacientes
      let patientsData
      try {
        patientsData = await fetchPatientsReportData(startDate, endDate)
      } catch (error: any) {
        console.error("Erro ao buscar dados de pacientes:", error)
        patientsData = {
          total: 0,
          new: 0,
          returning: 0,
          byAge: [],
        }
      }

      // Combinar todos os dados
      const newReportData = {
        financial: financialData,
        appointments: appointmentsData,
        procedures: proceduresData,
        patients: patientsData,
      }

      console.log("Dados do relatório completo:", newReportData)
      setReportData(newReportData)

      toast({
        title: "Relatório gerado",
        description: "O relatório foi gerado com sucesso.",
      })
    } catch (error: any) {
      console.error("Erro ao gerar relatório:", error)
      setError(`Erro ao gerar relatório: ${error.message || "Erro desconhecido"}`)
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  // Obter intervalo de datas com base no filtro
  function getDateRange(dateRange: string) {
    const now = new Date()
    let startDate: Date
    const endDate = new Date()

    switch (dateRange) {
      case "today":
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
        startDate = new Date()
        startDate.setDate(now.getDate() - 7)
        break
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case "quarter":
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        break
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    }
  }

  // Buscar dados para o relatório financeiro
  async function fetchFinancialReportData(startDate: string, endDate: string) {
    try {
      console.log("Iniciando busca de dados financeiros para o período:", startDate, "até", endDate)

      // Abordagem simplificada: primeiro buscar todos os agendamentos concluídos no período
      const { data: appointments, error: appointmentsError } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("status", "Concluído")
        .gte("data", startDate)
        .lte("data", endDate)

      if (appointmentsError) {
        console.error("Erro na consulta de agendamentos:", appointmentsError)
        throw appointmentsError
      }

      console.log("Agendamentos encontrados:", appointments?.length || 0)

      if (!appointments || appointments.length === 0) {
        console.log("Nenhum agendamento encontrado para o período")
        return {
          totalRevenue: 0,
          revenueByDentist: [],
          revenueByProcedure: [],
        }
      }

      // Filtrar por dentista se necessário
      let filteredAppointments = appointments
      if (filters.dentistId !== "all") {
        filteredAppointments = appointments.filter((app) => app.dentista_id === filters.dentistId)
      }

      // Filtrar por procedimento se necessário
      if (filters.procedureId !== "all") {
        filteredAppointments = filteredAppointments.filter((app) => app.procedimento_id === filters.procedureId)
      }

      console.log("Agendamentos filtrados:", filteredAppointments.length)

      // Buscar informações de dentistas
      const { data: dentistsData, error: dentistsError } = await supabase
        .from("dentistas")
        .select("id, nome, sobrenome")

      if (dentistsError) {
        console.error("Erro ao buscar dentistas:", dentistsError)
        throw dentistsError
      }

      // Buscar informações de procedimentos
      const { data: proceduresData, error: proceduresError } = await supabase.from("procedimentos").select("id, nome")

      if (proceduresError) {
        console.error("Erro ao buscar procedimentos:", proceduresError)
        throw proceduresError
      }

      // Criar mapas para facilitar o acesso
      const dentistsMap = new Map()
      dentistsData?.forEach((dentist) => {
        dentistsMap.set(dentist.id, `${dentist.nome} ${dentist.sobrenome}`)
      })

      const proceduresMap = new Map()
      proceduresData?.forEach((procedure) => {
        proceduresMap.set(procedure.id, procedure.nome)
      })

      // Calcular receita total
      const totalRevenue = filteredAppointments.reduce((sum, item) => {
        const valor = item.valor || 0
        return sum + valor
      }, 0)

      console.log("Receita total calculada:", totalRevenue)

      // Calcular receita por dentista
      const dentistRevenueMap = new Map<string, number>()
      filteredAppointments.forEach((item) => {
        const dentistId = item.dentista_id
        const dentistName = dentistsMap.get(dentistId) || "Dentista Desconhecido"
        const currentRevenue = dentistRevenueMap.get(dentistName) || 0
        dentistRevenueMap.set(dentistName, currentRevenue + (item.valor || 0))
      })

      const revenueByDentist = Array.from(dentistRevenueMap.entries()).map(([dentistName, revenue]) => ({
        dentistName,
        revenue,
      }))

      console.log("Receita por dentista:", revenueByDentist)

      // Calcular receita por procedimento
      const procedureRevenueMap = new Map<string, number>()
      filteredAppointments.forEach((item) => {
        const procedureId = item.procedimento_id
        const procedureName = proceduresMap.get(procedureId) || "Procedimento Desconhecido"
        const currentRevenue = procedureRevenueMap.get(procedureName) || 0
        procedureRevenueMap.set(procedureName, currentRevenue + (item.valor || 0))
      })

      const revenueByProcedure = Array.from(procedureRevenueMap.entries()).map(([procedureName, revenue]) => ({
        procedureName,
        revenue,
      }))

      console.log("Receita por procedimento:", revenueByProcedure)

      return {
        totalRevenue,
        revenueByDentist,
        revenueByProcedure,
      }
    } catch (error: any) {
      console.error("Erro ao buscar dados financeiros:", error)
      toast({
        title: "Erro ao gerar relatório financeiro",
        description: `Não foi possível buscar os dados financeiros: ${error.message}`,
        variant: "destructive",
      })
      throw error
    }
  }

  // Buscar dados para o relatório de agendamentos
  async function fetchAppointmentsReportData(startDate: string, endDate: string) {
    try {
      // Buscar todos os agendamentos no período
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .gte("data", startDate)
        .lte("data", endDate)

      if (error) throw error

      // Filtrar por dentista se necessário
      let filteredData = data || []
      if (filters.dentistId !== "all") {
        filteredData = filteredData.filter((app) => app.dentista_id === filters.dentistId)
      }

      // Filtrar por procedimento se necessário
      if (filters.procedureId !== "all") {
        filteredData = filteredData.filter((app) => app.procedimento_id === filters.procedureId)
      }

      // Buscar informações de dentistas
      const { data: dentistsData, error: dentistsError } = await supabase
        .from("dentistas")
        .select("id, nome, sobrenome")

      if (dentistsError) throw dentistsError

      // Criar mapa de dentistas
      const dentistsMap = new Map()
      dentistsData?.forEach((dentist) => {
        dentistsMap.set(dentist.id, `${dentist.nome} ${dentist.sobrenome}`)
      })

      // Calcular totais
      const total = filteredData.length
      const completed = filteredData.filter((item) => item.status === "Concluído").length
      const cancelled = filteredData.filter((item) => item.status === "Cancelado").length

      // Calcular agendamentos por dentista
      const dentistCountMap = new Map<string, number>()
      filteredData.forEach((item) => {
        const dentistId = item.dentista_id
        const dentistName = dentistsMap.get(dentistId) || "Dentista Desconhecido"
        const currentCount = dentistCountMap.get(dentistName) || 0
        dentistCountMap.set(dentistName, currentCount + 1)
      })

      const byDentist = Array.from(dentistCountMap.entries()).map(([dentistName, count]) => ({
        dentistName,
        count,
      }))

      return {
        total,
        completed,
        cancelled,
        byDentist,
      }
    } catch (error) {
      console.error("Erro ao buscar dados de agendamentos:", error)
      throw error
    }
  }

  // Buscar dados para o relatório de procedimentos
  async function fetchProceduresReportData(startDate: string, endDate: string) {
    try {
      // Buscar todos os agendamentos concluídos no período
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("status", "Concluído")
        .gte("data", startDate)
        .lte("data", endDate)

      if (error) throw error

      // Filtrar por dentista se necessário
      let filteredData = data || []
      if (filters.dentistId !== "all") {
        filteredData = filteredData.filter((app) => app.dentista_id === filters.dentistId)
      }

      // Filtrar por procedimento se necessário
      if (filters.procedureId !== "all") {
        filteredData = filteredData.filter((app) => app.procedimento_id === filters.procedureId)
      }

      // Buscar informações de procedimentos
      const { data: proceduresData, error: proceduresError } = await supabase.from("procedimentos").select("id, nome")

      if (proceduresError) throw proceduresError

      // Criar mapa de procedimentos
      const proceduresMap = new Map()
      proceduresData?.forEach((procedure) => {
        proceduresMap.set(procedure.id, procedure.nome)
      })

      // Calcular procedimentos mais comuns
      const procedureCountMap = new Map<string, number>()
      filteredData.forEach((item) => {
        const procedureId = item.procedimento_id
        const procedureName = proceduresMap.get(procedureId) || "Procedimento Desconhecido"
        const currentCount = procedureCountMap.get(procedureName) || 0
        procedureCountMap.set(procedureName, currentCount + 1)
      })

      const mostCommon = Array.from(procedureCountMap.entries())
        .map(([procedureName, count]) => ({
          procedureName,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Calcular receita total
      const totalRevenue = filteredData.reduce((sum, item) => sum + (item.valor || 0), 0)

      return {
        mostCommon,
        totalRevenue,
      }
    } catch (error) {
      console.error("Erro ao buscar dados de procedimentos:", error)
      throw error
    }
  }

  // Buscar dados para o relatório de pacientes
  async function fetchPatientsReportData(startDate: string, endDate: string) {
    try {
      // Buscar total de pacientes
      const { count: totalCount, error: totalError } = await supabase
        .from("pacientes")
        .select("*", { count: "exact", head: true })

      if (totalError) throw totalError

      // Buscar novos pacientes no período
      const { count: newCount, error: newError } = await supabase
        .from("pacientes")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDate)
        .lte("created_at", endDate)

      if (newError) throw newError

      // Buscar pacientes com consultas no período
      let query = supabase.from("agendamentos").select("paciente_id").gte("data", startDate).lte("data", endDate)

      // Aplicar filtro de dentista se necessário
      if (filters.dentistId !== "all") {
        query = query.eq("dentista_id", filters.dentistId)
      }

      // Aplicar filtro de procedimento se necessário
      if (filters.procedureId !== "all") {
        query = query.eq("procedimento_id", filters.procedureId)
      }

      const { data: appointmentsData, error: appointmentsError } = await query

      if (appointmentsError) throw appointmentsError

      // Contar pacientes únicos com consultas
      const uniquePatients = new Set(appointmentsData?.map((item) => item.paciente_id))
      const returningCount = uniquePatients.size

      // Dados de idade (simulados, pois não temos idade real)
      const byAge = [
        { ageGroup: "0-18", count: Math.floor(Math.random() * 20) },
        { ageGroup: "19-30", count: Math.floor(Math.random() * 30) + 10 },
        { ageGroup: "31-45", count: Math.floor(Math.random() * 40) + 20 },
        { ageGroup: "46-60", count: Math.floor(Math.random() * 30) + 15 },
        { ageGroup: "60+", count: Math.floor(Math.random() * 20) + 5 },
      ]

      return {
        total: totalCount || 0,
        new: newCount || 0,
        returning: returningCount,
        byAge,
      }
    } catch (error) {
      console.error("Erro ao buscar dados de pacientes:", error)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">Relatórios</h1>
        <p className="text-muted-foreground">Gere e visualize relatórios detalhados sobre a performance da clínica</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de Relatório</CardTitle>
          <CardDescription>Personalize seus relatórios com os filtros abaixo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="date-range">Período</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger id="date-range">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="quarter">Este Trimestre</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dentist">Dentista</Label>
              <Select
                value={filters.dentistId}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, dentistId: value }))}
              >
                <SelectTrigger id="dentist">
                  <SelectValue placeholder="Selecione o dentista" />
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
            <div className="space-y-2">
              <Label htmlFor="procedure">Procedimento</Label>
              <Select
                value={filters.procedureId}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, procedureId: value }))}
              >
                <SelectTrigger id="procedure">
                  <SelectValue placeholder="Selecione o procedimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Procedimentos</SelectItem>
                  {procedures.map((procedure) => (
                    <SelectItem key={procedure.id} value={procedure.id}>
                      {procedure.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={generateReport} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...
                  </>
                ) : (
                  "Gerar Relatório"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
          <TabsTrigger value="procedures">Procedimentos</TabsTrigger>
          <TabsTrigger value="patients">Pacientes</TabsTrigger>
        </TabsList>
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {loading || generating ? (
                  <>
                    <Skeleton className="h-7 w-28 mb-1" />
                    <div className="mt-4 h-[200px] flex items-center justify-center">
                      <Skeleton className="h-full w-full rounded-md" />
                    </div>
                  </>
                ) : reportData ? (
                  <>
                    <div className="text-2xl font-bold">{formatCurrency(reportData.financial.totalRevenue)}</div>
                    <div className="mt-4 h-[200px] flex items-center justify-center">
                      {reportData.financial.totalRevenue > 0 ? (
                        <LineChart className="h-16 w-16 text-muted-foreground" />
                      ) : (
                        <p className="text-muted-foreground text-center">
                          Nenhum dado disponível para o período selecionado
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[240px]">
                    <p className="text-muted-foreground text-center mb-4">
                      Clique em "Gerar Relatório" para visualizar os dados
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita por Dentista</CardTitle>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {loading || generating ? (
                  <>
                    <Skeleton className="h-7 w-28 mb-1" />
                    <div className="mt-4 h-[200px] flex items-center justify-center">
                      <Skeleton className="h-full w-full rounded-md" />
                    </div>
                  </>
                ) : reportData ? (
                  <>
                    <div className="text-2xl font-bold">
                      {reportData.financial.revenueByDentist.length > 0
                        ? `${reportData.financial.revenueByDentist.length} Dentistas`
                        : "Nenhum dentista"}
                    </div>
                    <div className="mt-4 h-[200px] flex items-center justify-center">
                      {reportData.financial.revenueByDentist.length > 0 ? (
                        <BarChart className="h-16 w-16 text-muted-foreground" />
                      ) : (
                        <p className="text-muted-foreground text-center">
                          Nenhum dado disponível para o período selecionado
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[240px]">
                    <p className="text-muted-foreground text-center mb-4">
                      Clique em "Gerar Relatório" para visualizar os dados
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita por Procedimento</CardTitle>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {loading || generating ? (
                  <>
                    <Skeleton className="h-7 w-28 mb-1" />
                    <div className="mt-4 h-[200px] flex items-center justify-center">
                      <Skeleton className="h-full w-full rounded-md" />
                    </div>
                  </>
                ) : reportData ? (
                  <>
                    <div className="text-2xl font-bold">
                      {reportData.financial.revenueByProcedure.length > 0
                        ? `${reportData.financial.revenueByProcedure.length} Procedimentos`
                        : "Nenhum procedimento"}
                    </div>
                    <div className="mt-4 h-[200px] flex items-center justify-center">
                      {reportData.financial.revenueByProcedure.length > 0 ? (
                        <PieChart className="h-16 w-16 text-muted-foreground" />
                      ) : (
                        <p className="text-muted-foreground text-center">
                          Nenhum dado disponível para o período selecionado
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[240px]">
                    <p className="text-muted-foreground text-center mb-4">
                      Clique em "Gerar Relatório" para visualizar os dados
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Relatório Financeiro Detalhado</CardTitle>
              <CardDescription>Análise completa das finanças da clínica</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading || generating ? (
                <Skeleton className="h-full w-full rounded-md" />
              ) : reportData ? (
                <div className="h-full flex flex-col gap-4">
                  {reportData.financial.revenueByDentist.length > 0 ||
                  reportData.financial.revenueByProcedure.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-md p-4">
                        <h3 className="text-lg font-medium mb-2">Receita por Dentista</h3>
                        {reportData.financial.revenueByDentist.length > 0 ? (
                          <div className="space-y-2">
                            {reportData.financial.revenueByDentist.map((item, index) => (
                              <div key={index} className="flex justify-between">
                                <span>{item.dentistName}</span>
                                <span className="font-medium">{formatCurrency(item.revenue)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">Nenhum dado disponível</p>
                        )}
                      </div>
                      <div className="border rounded-md p-4">
                        <h3 className="text-lg font-medium mb-2">Receita por Procedimento</h3>
                        {reportData.financial.revenueByProcedure.length > 0 ? (
                          <div className="space-y-2">
                            {reportData.financial.revenueByProcedure.map((item, index) => (
                              <div key={index} className="flex justify-between">
                                <span>{item.procedureName}</span>
                                <span className="font-medium">{formatCurrency(item.revenue)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">Nenhum dado disponível</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-muted-foreground mb-4">
                          Nenhum dado financeiro disponível para o período selecionado
                        </p>
                        <Button onClick={generateReport} disabled={generating}>
                          {generating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...
                            </>
                          ) : (
                            "Tentar novamente"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Clique em "Gerar Relatório" para visualizar os dados financeiros detalhados
                    </p>
                    <Button onClick={generateReport} disabled={generating}>
                      {generating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...
                        </>
                      ) : (
                        "Gerar Relatório"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Agendamentos</CardTitle>
              <CardDescription>Análise de agendamentos e ocupação</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading || generating ? (
                <Skeleton className="h-full w-full rounded-md" />
              ) : reportData ? (
                <div className="h-full flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-md p-4 text-center">
                      <h3 className="text-lg font-medium mb-2">Total de Agendamentos</h3>
                      <p className="text-3xl font-bold">{reportData.appointments.total}</p>
                    </div>
                    <div className="border rounded-md p-4 text-center">
                      <h3 className="text-lg font-medium mb-2">Concluídos</h3>
                      <p className="text-3xl font-bold text-green-600">{reportData.appointments.completed}</p>
                    </div>
                    <div className="border rounded-md p-4 text-center">
                      <h3 className="text-lg font-medium mb-2">Cancelados</h3>
                      <p className="text-3xl font-bold text-red-600">{reportData.appointments.cancelled}</p>
                    </div>
                  </div>
                  <div className="flex-1 border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">Agendamentos por Dentista</h3>
                    <div className="h-[calc(100%-2rem)] flex items-center justify-center">
                      <Calendar className="h-16 w-16 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Clique em "Gerar Relatório" para visualizar os dados de agendamentos
                    </p>
                    <Button onClick={generateReport} disabled={generating}>
                      {generating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...
                        </>
                      ) : (
                        "Gerar Relatório"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="procedures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Procedimentos</CardTitle>
              <CardDescription>Análise dos procedimentos realizados</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading || generating ? (
                <Skeleton className="h-full w-full rounded-md" />
              ) : reportData ? (
                <div className="h-full flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-md p-4">
                      <h3 className="text-lg font-medium mb-2">Procedimentos Mais Comuns</h3>
                      <div className="space-y-2">
                        {reportData.procedures.mostCommon.map((item, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{item.procedureName}</span>
                            <span className="font-medium">{item.count} realizados</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border rounded-md p-4 text-center">
                      <h3 className="text-lg font-medium mb-2">Receita Total</h3>
                      <p className="text-3xl font-bold">{formatCurrency(reportData.procedures.totalRevenue)}</p>
                    </div>
                  </div>
                  <div className="flex-1 border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">Distribuição de Procedimentos</h3>
                    <div className="h-[calc(100%-2rem)] flex items-center justify-center">
                      <BarChart className="h-16 w-16 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Clique em "Gerar Relatório" para visualizar os dados de procedimentos
                    </p>
                    <Button onClick={generateReport} disabled={generating}>
                      {generating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...
                        </>
                      ) : (
                        "Gerar Relatório"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="patients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Pacientes</CardTitle>
              <CardDescription>Análise demográfica e de retenção de pacientes</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading || generating ? (
                <Skeleton className="h-full w-full rounded-md" />
              ) : reportData ? (
                <div className="h-full flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-md p-4 text-center">
                      <h3 className="text-lg font-medium mb-2">Total de Pacientes</h3>
                      <p className="text-3xl font-bold">{reportData.patients.total}</p>
                    </div>
                    <div className="border rounded-md p-4 text-center">
                      <h3 className="text-lg font-medium mb-2">Novos Pacientes</h3>
                      <p className="text-3xl font-bold text-blue-600">{reportData.patients.new}</p>
                    </div>
                    <div className="border rounded-md p-4 text-center">
                      <h3 className="text-lg font-medium mb-2">Pacientes Recorrentes</h3>
                      <p className="text-3xl font-bold text-green-600">{reportData.patients.returning}</p>
                    </div>
                  </div>
                  <div className="flex-1 border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">Distribuição por Faixa Etária</h3>
                    <div className="h-[calc(100%-2rem)] flex items-center justify-center">
                      <PieChart className="h-16 w-16 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Clique em "Gerar Relatório" para visualizar os dados de pacientes
                    </p>
                    <Button onClick={generateReport} disabled={generating}>
                      {generating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...
                        </>
                      ) : (
                        "Gerar Relatório"
                      )}
                    </Button>
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

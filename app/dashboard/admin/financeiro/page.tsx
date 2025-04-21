"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import {
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  ArrowUpDown,
  Download,
  CreditCard,
  Wallet,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart,
  PieChart,
  LineChart,
  FileText,
  Loader2,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Tipos
type Receita = {
  id: string
  paciente_id: string
  paciente_nome: string
  procedimento: string
  valor: number
  valor_pago: number
  parcelado: boolean
  parcelas: number
  parcelas_restantes: number
  valor_parcela: number
  data: string
  status_pagamento: string
  forma_pagamento: string | null
  created_at: string
  data_proximo_pagamento?: string
  detalhes_parcelas?: Parcela[]
}

type Despesa = {
  id: string
  descricao: string
  valor: number
  categoria: string
  data: string
  metodo_pagamento: string
  created_at: string
}

// Update the SaldoDevedor type to include new fields
type SaldoDevedor = {
  paciente_id: string
  paciente_nome: string
  valor_total: number
  valor_pago: number
  saldo_devedor: number
  consultas_pendentes: number
}

type FormaPagamento = "Dinheiro" | "Cartão de Crédito" | "Cartão de Débito" | "PIX" | "Transferência" | "Cheque"

// Adicione após a definição do tipo FormaPagamento
type Parcela = {
  numero: number
  valor: number
  data_vencimento: string
  status: "Pago" | "Pendente"
}

// Tipo para relatórios financeiros
type RelatorioFinanceiro = {
  periodo: string
  receitas: number
  despesas: number
  lucro: number
  receitasPorCategoria: { categoria: string; valor: number }[]
  despesasPorCategoria: { categoria: string; valor: number }[]
  receitasPorFormaPagamento: { forma: string; valor: number }[]
  despesasPorFormaPagamento: { forma: string; valor: number }[]
  receitasMensais: { mes: string; valor: number }[]
  despesasMensais: { mes: string; valor: number }[]
}

// Tipo para previsão de recebíveis de cartão de crédito
type RecebiveisCartao = {
  mes: string
  ano: number
  valor: number
  parcelas: number
  detalhes: {
    paciente: string
    procedimento: string
    valor: number
    vencimento: string
    parcela: string
  }[]
}

export default function FinanceiroPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [saldosDevedores, setSaldosDevedores] = useState<SaldoDevedor[]>([])
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isAddDespesaOpen, setIsAddDespesaOpen] = useState(false)
  const [isEditDespesaOpen, setIsEditDespesaOpen] = useState(false)
  const [isEditReceitaOpen, setIsEditReceitaOpen] = useState(false)
  const [currentDespesa, setCurrentDespesa] = useState<Despesa | null>(null)
  const [currentReceita, setCurrentReceita] = useState<Receita | null>(null)
  const [pacientes, setPacientes] = useState<{ id: string; nome: string; sobrenome: string }[]>([])
  const [procedimentos, setProcedimentos] = useState<{ id: string; nome: string; valor: number }[]>([])
  const [categoriasDespesa] = useState([
    "Material Odontológico",
    "Equipamentos",
    "Salários",
    "Aluguel",
    "Contas",
    "Marketing",
    "Impostos",
    "Outros",
  ])
  const [formasPagamento] = useState<FormaPagamento[]>([
    "Dinheiro",
    "Cartão de Crédito",
    "Cartão de Débito",
    "PIX",
    "Transferência",
    "Cheque",
  ])

  // Adicione após o estado currentReceita
  const [isViewParcelasOpen, setIsViewParcelasOpen] = useState(false)
  const [atualizandoParcela, setAtualizandoParcela] = useState(false)

  // Estados para relatórios
  const [periodoRelatorio, setPeriodoRelatorio] = useState<"mes" | "trimestre" | "ano">("mes")
  const [relatorioFinanceiro, setRelatorioFinanceiro] = useState<RelatorioFinanceiro | null>(null)
  const [loadingRelatorio, setLoadingRelatorio] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recebiveisCartao, setRecebiveisCartao] = useState<RecebiveisCartao[]>([])
  const [loadingRecebiveis, setLoadingRecebiveis] = useState(false)

  // Formulário de despesa
  const [novaDespesa, setNovaDespesa] = useState({
    descricao: "",
    valor: "",
    categoria: "Material Odontológico",
    data: new Date().toISOString().split("T")[0],
    metodo_pagamento: "Dinheiro",
  })

  // Formulário de receita (pagamento)
  const [novoStatusPagamento, setNovoStatusPagamento] = useState({
    status_pagamento: "Pendente",
    forma_pagamento: "Dinheiro" as FormaPagamento,
    valor_pago: "0",
    parcelado: false,
    parcelas: 1,
  })

  useEffect(() => {
    fetchFinanceiroData()
    fetchPacientes()
    fetchProcedimentos()
    buscarRecebiveisCartao() // Add this line
  }, [])

  async function fetchFinanceiroData() {
    try {
      setLoading(true)
      setError(null)
      await Promise.all([fetchReceitas(), fetchDespesas(), fetchSaldosDevedores()])
    } catch (error: any) {
      console.error("Erro ao buscar dados financeiros:", error)
      setError(`Erro ao carregar dados financeiros: ${error.message || "Erro desconhecido"}`)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados financeiros.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update the fetchReceitas function to include the new fields
  async function fetchReceitas() {
    try {
      console.log("Buscando receitas...")

      // Primeiro, verificar a estrutura da tabela agendamentos
      const { data: tableInfo, error: tableInfoError } = await supabase.from("agendamentos").select("*").limit(1)

      if (tableInfoError) {
        console.error("Erro ao verificar estrutura da tabela:", tableInfoError)
        throw tableInfoError
      }

      console.log("Estrutura da tabela agendamentos:", tableInfo)

      // Buscar todos os agendamentos com pagamento
      const { data, error } = await supabase
        .from("agendamentos")
        .select(`
        id,
        paciente_id,
        dentista_id,
        procedimento_id,
        valor,
        data,
        status,
        pagamento_status,
        forma_pagamento,
        valor_pago,
        parcelado,
        parcelas,
        parcelas_restantes,
        valor_parcela,
        data_proximo_pagamento,
        detalhes_parcelas,
        created_at
      `)
        .order("data", { ascending: false })

      if (error) {
        console.error("Erro ao buscar agendamentos:", error)
        throw error
      }

      console.log(`Encontrados ${data?.length || 0} agendamentos`)

      // Buscar informações de pacientes
      const { data: pacientesData, error: pacientesError } = await supabase
        .from("pacientes")
        .select("id, nome, sobrenome")

      if (pacientesError) {
        console.error("Erro ao buscar pacientes:", pacientesError)
        throw pacientesError
      }

      // Buscar informações de procedimentos
      const { data: procedimentosData, error: procedimentosError } = await supabase
        .from("procedimentos")
        .select("id, nome")

      if (procedimentosError) {
        console.error("Erro ao buscar procedimentos:", procedimentosError)
        throw procedimentosError
      }

      // Criar mapas para facilitar o acesso
      const pacientesMap = new Map()
      pacientesData?.forEach((paciente) => {
        pacientesMap.set(paciente.id, `${paciente.nome} ${paciente.sobrenome}`)
      })

      const procedimentosMap = new Map()
      procedimentosData?.forEach((procedimento) => {
        procedimentosMap.set(procedimento.id, procedimento.nome)
      })

      // Formatar os dados de receitas
      const formattedReceitas: Receita[] = (data || []).map((item) => {
        // Garantir que todos os valores numéricos sejam números válidos
        const valor = typeof item.valor === "number" ? item.valor : 0
        const valor_pago = typeof item.valor_pago === "number" ? item.valor_pago : 0

        return {
          id: item.id,
          paciente_id: item.paciente_id,
          paciente_nome: pacientesMap.get(item.paciente_id) || "Paciente Desconhecido",
          procedimento: procedimentosMap.get(item.procedimento_id) || "Procedimento Desconhecido",
          valor: valor,
          valor_pago: valor_pago,
          parcelado: item.parcelado || false,
          parcelas: item.parcelas || 1,
          parcelas_restantes: item.parcelas_restantes || 0,
          valor_parcela: item.valor_parcela || 0,
          data: item.data,
          status_pagamento: item.pagamento_status || "Pendente",
          forma_pagamento: item.forma_pagamento || null,
          created_at: item.created_at,
          data_proximo_pagamento: item.data_proximo_pagamento,
          detalhes_parcelas: item.detalhes_parcelas
            ? typeof item.detalhes_parcelas === "string"
              ? JSON.parse(item.detalhes_parcelas)
              : item.detalhes_parcelas
            : undefined,
        }
      })

      console.log(`Formatadas ${formattedReceitas.length} receitas`)
      console.log("Exemplo de receita formatada:", formattedReceitas[0] || "Nenhuma receita encontrada")
      setReceitas(formattedReceitas)
    } catch (error) {
      console.error("Erro ao buscar receitas:", error)
      setError(`Erro ao buscar receitas: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  async function fetchDespesas() {
    try {
      console.log("Buscando despesas...")
      const { data, error } = await supabase.from("despesas").select("*").order("data", { ascending: false })

      if (error) {
        console.error("Erro ao buscar despesas:", error)
        throw error
      }

      console.log(`Encontradas ${data?.length || 0} despesas`)
      setDespesas(data || [])
    } catch (error) {
      console.error("Erro ao buscar despesas:", error)
      throw error
    }
  }

  // Update the fetchSaldosDevedores function to include installment information
  async function fetchSaldosDevedores() {
    try {
      console.log("Buscando saldos devedores...")

      // Buscar agendamentos com pagamento pendente ou parcial
      const { data, error } = await supabase
        .from("agendamentos")
        .select(`
          paciente_id,
          valor,
          valor_pago,
          parcelado,
          parcelas,
          parcelas_restantes,
          valor_parcela,
          pagamento_status
        `)
        .or("pagamento_status.eq.Pendente,pagamento_status.eq.Parcial")

      if (error) {
        console.error("Erro ao buscar agendamentos com pagamento pendente:", error)
        throw error
      }

      console.log(`Encontrados ${data?.length || 0} agendamentos com pagamento pendente`)

      // Buscar informações de pacientes
      const { data: pacientesData, error: pacientesError } = await supabase
        .from("pacientes")
        .select("id, nome, sobrenome")

      if (pacientesError) {
        console.error("Erro ao buscar pacientes:", pacientesError)
        throw pacientesError
      }

      // Criar mapa de pacientes
      const pacientesMap = new Map()
      pacientesData?.forEach((paciente) => {
        pacientesMap.set(paciente.id, `${paciente.nome} ${paciente.sobrenome}`)
      })

      // Group by patient and calculate outstanding balance
      const saldosPorPaciente = new Map<string, SaldoDevedor>()

      data?.forEach((item) => {
        const pacienteId = item.paciente_id
        const pacienteNome = pacientesMap.get(pacienteId) || "Paciente Desconhecido"
        const valorTotal = item.valor || 0
        const valorPago = item.valor_pago || 0
        const saldoDevedor = valorTotal - valorPago

        if (saldosPorPaciente.has(pacienteId)) {
          const saldo = saldosPorPaciente.get(pacienteId)!
          saldo.valor_total += valorTotal
          saldo.valor_pago += valorPago
          saldo.saldo_devedor += saldoDevedor
          saldo.consultas_pendentes += 1
        } else {
          saldosPorPaciente.set(pacienteId, {
            paciente_id: pacienteId,
            paciente_nome: pacienteNome,
            valor_total: valorTotal,
            valor_pago: valorPago,
            saldo_devedor: saldoDevedor,
            consultas_pendentes: 1,
          })
        }
      })

      const saldosDevedoresList = Array.from(saldosPorPaciente.values())
      console.log(`Calculados ${saldosDevedoresList.length} saldos devedores`)
      setSaldosDevedores(saldosDevedoresList)
    } catch (error) {
      console.error("Erro ao buscar saldos devedores:", error)
      throw error
    }
  }

  async function fetchPacientes() {
    try {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id, nome, sobrenome")
        .order("nome", { ascending: true })

      if (error) throw error

      setPacientes(data || [])
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error)
    }
  }

  async function fetchProcedimentos() {
    try {
      const { data, error } = await supabase
        .from("procedimentos")
        .select("id, nome, valor")
        .order("nome", { ascending: true })

      if (error) throw error

      setProcedimentos(data || [])
    } catch (error) {
      console.error("Erro ao buscar procedimentos:", error)
    }
  }

  // Função para gerar relatório financeiro
  async function gerarRelatorioFinanceiro() {
    try {
      setLoadingRelatorio(true)
      setError(null)
      console.log("Gerando relatório financeiro para o período:", periodoRelatorio)

      // Determinar intervalo de datas com base no período selecionado
      const dataAtual = new Date()
      let dataInicio: Date

      switch (periodoRelatorio) {
        case "mes":
          dataInicio = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1)
          break
        case "trimestre":
          const mesInicial = Math.floor(dataAtual.getMonth() / 3) * 3
          dataInicio = new Date(dataAtual.getFullYear(), mesInicial, 1)
          break
        case "ano":
          dataInicio = new Date(dataAtual.getFullYear(), 0, 1)
          break
      }

      const dataInicioStr = dataInicio.toISOString().split("T")[0]
      const dataFimStr = dataAtual.toISOString().split("T")[0]

      console.log("Período do relatório:", dataInicioStr, "até", dataFimStr)

      // Buscar receitas do período (todos os agendamentos com valor)
      const { data: receitasData, error: receitasError } = await supabase
        .from("agendamentos")
        .select(`
        id,
        valor,
        valor_pago,
        data,
        pagamento_status,
        forma_pagamento,
        procedimento_id
      `)
        .gte("data", dataInicioStr)
        .lte("data", dataFimStr)

      if (receitasError) {
        console.error("Erro ao buscar receitas:", receitasError)
        throw receitasError
      }

      console.log(`Encontradas ${receitasData?.length || 0} receitas no período`)

      // Buscar despesas do período
      const { data: despesasData, error: despesasError } = await supabase
        .from("despesas")
        .select("*")
        .gte("data", dataInicioStr)
        .lte("data", dataFimStr)

      if (despesasError) {
        console.error("Erro ao buscar despesas:", despesasError)
        throw despesasError
      }

      console.log(`Encontradas ${despesasData?.length || 0} despesas no período`)

      // Buscar informações de procedimentos
      const { data: procedimentosData, error: procedimentosError } = await supabase
        .from("procedimentos")
        .select("id, nome")

      if (procedimentosError) {
        console.error("Erro ao buscar procedimentos:", procedimentosError)
        throw procedimentosError
      }

      // Criar mapa de procedimentos
      const procedimentosMap = new Map()
      procedimentosData?.forEach((procedimento) => {
        procedimentosMap.set(procedimento.id, procedimento.nome)
      })

      // Calcular totais
      // Para receitas, considerar apenas os valores pagos
      const totalReceitasPeriodo =
        receitasData?.reduce((sum, item) => {
          // Se o status for "Pago", considerar o valor total
          // Se for "Parcial", considerar o valor_pago
          // Se for "Pendente", não considerar
          if (item.pagamento_status === "Pago") {
            return sum + (typeof item.valor === "number" ? item.valor : 0)
          } else if (item.pagamento_status === "Parcial") {
            return sum + (typeof item.valor_pago === "number" ? item.valor_pago : 0)
          }
          return sum
        }, 0) || 0

      const totalDespesas =
        despesasData?.reduce((sum, item) => sum + (typeof item.valor === "number" ? item.valor : 0), 0) || 0
      const lucro = totalReceitasPeriodo - totalDespesas

      console.log("Totais calculados:", { totalReceitasPeriodo, totalDespesas, lucro })

      // Agrupar receitas por categoria (procedimento)
      const receitasPorCategoria = new Map<string, number>()
      receitasData?.forEach((item) => {
        if (item.pagamento_status === "Pago" || item.pagamento_status === "Parcial") {
          const procedimentoId = item.procedimento_id
          const categoria = procedimentosMap.get(procedimentoId) || "Procedimento Desconhecido"
          const valorAtual = receitasPorCategoria.get(categoria) || 0
          const valorAdicional =
            item.pagamento_status === "Pago"
              ? typeof item.valor === "number"
                ? item.valor
                : 0
              : typeof item.valor_pago === "number"
                ? item.valor_pago
                : 0
          receitasPorCategoria.set(categoria, valorAtual + valorAdicional)
        }
      })

      // Agrupar despesas por categoria
      const despesasPorCategoria = new Map<string, number>()
      despesasData?.forEach((item) => {
        const categoria = item.categoria || "Outros"
        const valorAtual = despesasPorCategoria.get(categoria) || 0
        despesasPorCategoria.set(categoria, valorAtual + (typeof item.valor === "number" ? item.valor : 0))
      })

      // Agrupar receitas por forma de pagamento
      const receitasPorFormaPagamento = new Map<string, number>()
      receitasData?.forEach((item) => {
        if (item.pagamento_status === "Pago" || item.pagamento_status === "Parcial") {
          const forma = item.forma_pagamento || "Não especificado"
          const valorAtual = receitasPorFormaPagamento.get(forma) || 0
          const valorAdicional =
            item.pagamento_status === "Pago"
              ? typeof item.valor === "number"
                ? item.valor
                : 0
              : typeof item.valor_pago === "number"
                ? item.valor_pago
                : 0
          receitasPorFormaPagamento.set(forma, valorAtual + valorAdicional)
        }
      })

      // Agrupar despesas por forma de pagamento
      const despesasPorFormaPagamento = new Map<string, number>()
      despesasData?.forEach((item) => {
        const forma = item.metodo_pagamento || "Não especificado"
        const valorAtual = despesasPorFormaPagamento.get(forma) || 0
        despesasPorFormaPagamento.set(forma, valorAtual + (typeof item.valor === "number" ? item.valor : 0))
      })

      // Agrupar receitas e despesas por mês
      const receitasMensais = new Map<string, number>()
      const despesasMensais = new Map<string, number>()

      // Inicializar meses para garantir que todos os meses apareçam no relatório
      const meses =
        periodoRelatorio === "mes"
          ? [dataInicio.getMonth()]
          : periodoRelatorio === "trimestre"
            ? [0, 1, 2].map((i) => Math.floor(dataAtual.getMonth() / 3) * 3 + i).filter((m) => m < 12)
            : Array.from({ length: 12 }, (_, i) => i)

      meses.forEach((mes) => {
        const nomeMes = new Date(dataAtual.getFullYear(), mes, 1).toLocaleString("pt-BR", { month: "long" })
        receitasMensais.set(nomeMes, 0)
        despesasMensais.set(nomeMes, 0)
      })

      // Preencher com dados reais
      receitasData?.forEach((item) => {
        if (item.pagamento_status === "Pago" || item.pagamento_status === "Parcial") {
          const data = new Date(item.data)
          const nomeMes = data.toLocaleString("pt-BR", { month: "long" })
          const valorAtual = receitasMensais.get(nomeMes) || 0
          const valorAdicional =
            item.pagamento_status === "Pago"
              ? typeof item.valor === "number"
                ? item.valor
                : 0
              : typeof item.valor_pago === "number"
                ? item.valor_pago
                : 0
          receitasMensais.set(nomeMes, valorAtual + valorAdicional)
        }
      })

      despesasData?.forEach((item) => {
        const data = new Date(item.data)
        const nomeMes = data.toLocaleString("pt-BR", { month: "long" })
        const valorAtual = despesasMensais.get(nomeMes) || 0
        despesasMensais.set(nomeMes, valorAtual + (typeof item.valor === "number" ? item.valor : 0))
      })

      // Formatar dados para o relatório
      const relatorio: RelatorioFinanceiro = {
        periodo: formatarPeriodo(periodoRelatorio, dataInicio, dataAtual),
        receitas: totalReceitasPeriodo,
        despesas: totalDespesas,
        lucro: lucro,
        receitasPorCategoria: Array.from(receitasPorCategoria.entries()).map(([categoria, valor]) => ({
          categoria,
          valor,
        })),
        despesasPorCategoria: Array.from(despesasPorCategoria.entries()).map(([categoria, valor]) => ({
          categoria,
          valor,
        })),
        receitasPorFormaPagamento: Array.from(receitasPorFormaPagamento.entries()).map(([forma, valor]) => ({
          forma,
          valor,
        })),
        despesasPorFormaPagamento: Array.from(despesasPorFormaPagamento.entries()).map(([forma, valor]) => ({
          forma,
          valor,
        })),
        receitasMensais: Array.from(receitasMensais.entries()).map(([mes, valor]) => ({ mes, valor })),
        despesasMensais: Array.from(despesasMensais.entries()).map(([mes, valor]) => ({ mes, valor })),
      }

      console.log("Relatório financeiro gerado com sucesso:", relatorio)
      setRelatorioFinanceiro(relatorio)

      toast({
        title: "Relatório gerado",
        description: "O relatório financeiro foi gerado com sucesso.",
      })
    } catch (error: any) {
      console.error("Erro ao gerar relatório financeiro:", error)
      setError(`Erro ao gerar relatório financeiro: ${error.message || "Erro desconhecido"}`)
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório financeiro.",
        variant: "destructive",
      })
    } finally {
      setLoadingRelatorio(false)
    }
  }

  // Função para buscar previsão de recebíveis de cartão de crédito
  async function buscarRecebiveisCartao() {
    try {
      setLoadingRecebiveis(true)
      setError(null)
      console.log("Buscando previsão de recebíveis de cartão de crédito...")

      // Buscar todos os agendamentos com pagamento parcial e parcelado
      const { data, error } = await supabase
        .from("agendamentos")
        .select(`
        id,
        paciente_id,
        procedimento_id,
        valor,
        data,
        pagamento_status,
        forma_pagamento,
        valor_pago,
        parcelado,
        parcelas,
        parcelas_restantes,
        valor_parcela,
        data_proximo_pagamento,
        detalhes_parcelas
      `)
        .eq("pagamento_status", "Parcial")
        .eq("parcelado", true)
        .eq("forma_pagamento", "Cartão de Crédito")

      if (error) {
        console.error("Erro ao buscar agendamentos parcelados:", error)
        throw error
      }

      console.log(`Encontrados ${data?.length || 0} agendamentos parcelados`)

      // Buscar informações de pacientes
      const { data: pacientesData, error: pacientesError } = await supabase
        .from("pacientes")
        .select("id, nome, sobrenome")

      if (pacientesError) {
        console.error("Erro ao buscar pacientes:", pacientesError)
        throw pacientesError
      }

      // Buscar informações de procedimentos
      const { data: procedimentosData, error: procedimentosError } = await supabase
        .from("procedimentos")
        .select("id, nome")

      if (procedimentosError) {
        console.error("Erro ao buscar procedimentos:", procedimentosError)
        throw procedimentosError
      }

      // Criar mapas para facilitar o acesso
      const pacientesMap = new Map()
      pacientesData?.forEach((paciente) => {
        pacientesMap.set(paciente.id, `${paciente.nome} ${paciente.sobrenome}`)
      })

      const procedimentosMap = new Map()
      procedimentosData?.forEach((procedimento) => {
        procedimentosMap.set(procedimento.id, procedimento.nome)
      })

      // Processar os dados de parcelas futuras
      const parcelasPorMes = new Map<string, RecebiveisCartao>()

      data?.forEach((agendamento) => {
        if (!agendamento.detalhes_parcelas) return

        const detalhes_parcelas =
          typeof agendamento.detalhes_parcelas === "string"
            ? JSON.parse(agendamento.detalhes_parcelas)
            : agendamento.detalhes_parcelas

        // Filtrar apenas parcelas pendentes
        const parcelasPendentes = detalhes_parcelas.filter((parcela: Parcela) => parcela.status === "Pendente")

        parcelasPendentes.forEach((parcela: Parcela) => {
          const dataVencimento = new Date(parcela.data_vencimento)
          const mes = dataVencimento.toLocaleString("pt-BR", { month: "long" })
          const ano = dataVencimento.getFullYear()
          const chave = `${mes}-${ano}`

          const pacienteNome = pacientesMap.get(agendamento.paciente_id) || "Paciente Desconhecido"
          const procedimentoNome = procedimentosMap.get(agendamento.procedimento_id) || "Procedimento Desconhecido"

          if (!parcelasPorMes.has(chave)) {
            parcelasPorMes.set(chave, {
              mes,
              ano,
              valor: 0,
              parcelas: 0,
              detalhes: [],
            })
          }

          const recebivel = parcelasPorMes.get(chave)!
          recebivel.valor += parcela.valor
          recebivel.parcelas += 1
          recebivel.detalhes.push({
            paciente: pacienteNome,
            procedimento: procedimentoNome,
            valor: parcela.valor,
            vencimento: formatDate(parcela.data_vencimento),
            parcela: `${parcela.numero}/${agendamento.parcelas}`,
          })
        })
      })

      // Converter para array e ordenar por data
      const recebiveisArray = Array.from(parcelasPorMes.values()).sort((a, b) => {
        if (a.ano !== b.ano) return a.ano - b.ano

        // Ordenar meses cronologicamente
        const meses = [
          "janeiro",
          "fevereiro",
          "março",
          "abril",
          "maio",
          "junho",
          "julho",
          "agosto",
          "setembro",
          "outubro",
          "novembro",
          "dezembro",
        ]

        return meses.indexOf(a.mes.toLowerCase()) - meses.indexOf(b.mes.toLowerCase())
      })

      console.log("Previsão de recebíveis processada:", recebiveisArray)
      setRecebiveisCartao(recebiveisArray)

      toast({
        title: "Previsão de recebíveis atualizada",
        description: "A previsão de recebíveis de cartão de crédito foi atualizada com sucesso.",
      })
    } catch (error: any) {
      console.error("Erro ao buscar previsão de recebíveis:", error)
      setError(`Erro ao buscar previsão de recebíveis: ${error.message || "Erro desconhecido"}`)
      toast({
        title: "Erro ao buscar previsão de recebíveis",
        description: "Não foi possível buscar a previsão de recebíveis de cartão de crédito.",
        variant: "destructive",
      })
    } finally {
      setLoadingRecebiveis(false)
    }
  }

  // Também vamos melhorar o cálculo do total de receitas
  // Substitua o cálculo atual por este:

  // Calcular totais
  const totalReceitas = receitas.reduce((sum, item) => {
    if (item.status_pagamento === "Pago") {
      return sum + (typeof item.valor === "number" ? item.valor : 0)
    } else if (item.status_pagamento === "Parcial") {
      return sum + (typeof item.valor_pago === "number" ? item.valor_pago : 0)
    }
    return sum
  }, 0)

  const totalDespesas = despesas.reduce((sum, item) => sum + (typeof item.valor === "number" ? item.valor : 0), 0)
  const saldoAtual = totalReceitas - totalDespesas
  const totalPendente = receitas.reduce((sum, item) => {
    // Incluir tanto status "Pendente" quanto "Parcial" para pagamentos parcelados
    if (item.status_pagamento === "Pendente") {
      return sum + (typeof item.valor === "number" ? item.valor : 0)
    } else if (item.status_pagamento === "Parcial") {
      const valorTotal = typeof item.valor === "number" ? item.valor : 0
      const valorPago = typeof item.valor_pago === "number" ? item.valor_pago : 0
      return sum + (valorTotal - valorPago)
    }
    return sum
  }, 0)

  // Função para formatar o período do relatório
  function formatarPeriodo(periodo: string, dataInicio: Date, dataFim: Date): string {
    const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" })

    switch (periodo) {
      case "mes":
        return `${dataInicio.toLocaleString("pt-BR", { month: "long", year: "numeric" })}`
      case "trimestre":
        const trimestre = Math.floor(dataInicio.getMonth() / 3) + 1
        return `${trimestre}º Trimestre de ${dataInicio.getFullYear()}`
      case "ano":
        return `Ano de ${dataInicio.getFullYear()}`
      default:
        return `${formatoData.format(dataInicio)} até ${formatoData.format(dataFim)}`
    }
  }

  // Adicionar nova despesa
  async function handleAddDespesa() {
    try {
      if (!novaDespesa.descricao || !novaDespesa.valor || !novaDespesa.data) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha todos os campos obrigatórios.",
          variant: "destructive",
        })
        return
      }

      const { data, error } = await supabase.from("despesas").insert([
        {
          descricao: novaDespesa.descricao,
          valor: Number.parseFloat(novaDespesa.valor),
          categoria: novaDespesa.categoria,
          data: novaDespesa.data,
          metodo_pagamento: novaDespesa.metodo_pagamento,
        },
      ])

      if (error) throw error

      toast({
        title: "Despesa adicionada",
        description: "A despesa foi adicionada com sucesso.",
      })

      // Resetar formulário
      setNovaDespesa({
        descricao: "",
        valor: "",
        categoria: "Material Odontológico",
        data: new Date().toISOString().split("T")[0],
        metodo_pagamento: "Dinheiro",
      })

      setIsAddDespesaOpen(false)
      fetchDespesas()
    } catch (error: any) {
      console.error("Erro ao adicionar despesa:", error)
      toast({
        title: "Erro ao adicionar despesa",
        description: `Não foi possível adicionar a despesa: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Atualizar despesa
  async function handleUpdateDespesa() {
    try {
      if (!currentDespesa) return

      const { error } = await supabase
        .from("despesas")
        .update({
          descricao: currentDespesa.descricao,
          valor: Number.parseFloat(currentDespesa.valor.toString()),
          categoria: currentDespesa.categoria,
          data: currentDespesa.data,
          metodo_pagamento: currentDespesa.metodo_pagamento,
        })
        .eq("id", currentDespesa.id)

      if (error) throw error

      toast({
        title: "Despesa atualizada",
        description: "A despesa foi atualizada com sucesso.",
      })

      setIsEditDespesaOpen(false)
      fetchDespesas()
    } catch (error: any) {
      console.error("Erro ao atualizar despesa:", error)
      toast({
        title: "Erro ao atualizar despesa",
        description: `Não foi possível atualizar a despesa: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Excluir despesa
  async function handleDeleteDespesa(id: string) {
    try {
      const { error } = await supabase.from("despesas").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Despesa excluída",
        description: "A despesa foi excluída com sucesso.",
      })

      fetchDespesas()
    } catch (error: any) {
      console.error("Erro ao excluir despesa:", error)
      toast({
        title: "Erro ao excluir despesa",
        description: `Não foi possível excluir a despesa: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Atualizar status de pagamento
  async function handleUpdateStatusPagamento() {
    try {
      if (!currentReceita) return

      const valorPago = Number.parseFloat(novoStatusPagamento.valor_pago) || 0
      const totalValor = currentReceita.valor

      // Calculate installment details if payment is in installments
      let parcelado = novoStatusPagamento.parcelado
      const parcelas = novoStatusPagamento.parcelas
      let parcelas_restantes = 0
      let valor_parcela = 0
      let data_proximo_pagamento = null
      let detalhes_parcelas: string | any[] = []

      if (parcelado && parcelas > 1 && novoStatusPagamento.forma_pagamento === "Cartão de Crédito") {
        parcelas_restantes = parcelas - 1 // First installment is the initial payment
        valor_parcela = (totalValor - valorPago) / parcelas_restantes

        // Calcular datas de vencimento (30 dias entre cada parcela)
        const hoje = new Date()
        const dataBase = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())

        // Primeira data de vencimento (30 dias a partir de hoje)
        const primeiraData = new Date(dataBase)
        primeiraData.setDate(primeiraData.getDate() + 30)
        data_proximo_pagamento = primeiraData.toISOString().split("T")[0]

        // Gerar detalhes de todas as parcelas
        detalhes_parcelas = Array.from({ length: parcelas }, (_, i) => {
          const dataVencimento = new Date(dataBase)
          // Primeira parcela é o pagamento inicial (hoje)
          if (i === 0) {
            return {
              numero: i + 1,
              valor: valorPago,
              data_vencimento: dataBase.toISOString().split("T")[0],
              status: "Pago",
            }
          } else {
            // Parcelas subsequentes a cada 30 dias
            dataVencimento.setDate(dataVencimento.getDate() + 30 * i)
            return {
              numero: i + 1,
              valor: valor_parcela,
              data_vencimento: dataVencimento.toISOString().split("T")[0],
              status: "Pendente",
            }
          }
        })
      }

      // Determine payment status based on payment amount
      let paymentStatus = novoStatusPagamento.status_pagamento
      if (paymentStatus === "Pago" && valorPago < totalValor && parcelado) {
        paymentStatus = "Parcial" // Create a new status for partial payments
      } else if (valorPago >= totalValor) {
        paymentStatus = "Pago"
        parcelado = false
        parcelas_restantes = 0
      }

      const { error } = await supabase
        .from("agendamentos")
        .update({
          pagamento_status: paymentStatus,
          forma_pagamento: novoStatusPagamento.forma_pagamento,
          valor_pago: valorPago,
          parcelado: parcelado,
          parcelas: parcelas,
          parcelas_restantes: parcelas_restantes,
          valor_parcela: valor_parcela,
          data_proximo_pagamento: data_proximo_pagamento,
          detalhes_parcelas: detalhes_parcelas.length > 0 ? JSON.stringify(detalhes_parcelas) : null,
        })
        .eq("id", currentReceita.id)

      if (error) throw error

      toast({
        title: "Status de pagamento atualizado",
        description: "O status de pagamento foi atualizado com sucesso.",
      })

      setIsEditReceitaOpen(false)
      fetchFinanceiroData() // Update receipts and outstanding balances
    } catch (error: any) {
      console.error("Erro ao atualizar status de pagamento:", error)
      toast({
        title: "Erro ao atualizar status",
        description: `Não foi possível atualizar o status de pagamento: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Nova função para atualizar o status de uma parcela específica
  async function handleUpdateParcela(parcelaNumero: number, novoStatus: "Pago" | "Pendente") {
    try {
      if (!currentReceita || !currentReceita.detalhes_parcelas) return

      setAtualizandoParcela(true)

      // Cria uma cópia das parcelas atuais
      const parcelas: Parcela[] = [...currentReceita.detalhes_parcelas]

      // Encontra a parcela específica e atualiza seu status
      const parcelaIndex = parcelas.findIndex((p) => p.numero === parcelaNumero)
      if (parcelaIndex === -1) return

      // Se estiver marcando como paga, não permitir se parcelas anteriores estiverem pendentes
      if (novoStatus === "Pago") {
        const parcelasAnteriores = parcelas.filter((p) => p.numero < parcelaNumero && p.status === "Pendente")
        if (parcelasAnteriores.length > 0) {
          toast({
            title: "Operação não permitida",
            description: "Você precisa pagar as parcelas anteriores primeiro.",
            variant: "destructive",
          })
          setAtualizandoParcela(false)
          return
        }
      }

      // Se estiver marcando como pendente, não permitir se parcelas posteriores estiverem pagas
      if (novoStatus === "Pendente") {
        const parcelasPosteriores = parcelas.filter((p) => p.numero > parcelaNumero && p.status === "Pago")
        if (parcelasPosteriores.length > 0) {
          toast({
            title: "Operação não permitida",
            description: "Você precisa marcar as parcelas posteriores como pendentes primeiro.",
            variant: "destructive",
          })
          setAtualizandoParcela(false)
          return
        }
      }

      parcelas[parcelaIndex].status = novoStatus

      // Recalcula o valor total pago
      let valorPago = 0
      let parcelasPagas = 0
      let proximaParcelaPendente: Parcela | null = null

      parcelas.forEach((parcela) => {
        if (parcela.status === "Pago") {
          valorPago += parcela.valor
          parcelasPagas++
        } else if (proximaParcelaPendente === null) {
          proximaParcelaPendente = parcela
        }
      })

      // Determina o status geral do pagamento
      let statusPagamento = "Pendente"
      if (valorPago >= currentReceita.valor) {
        statusPagamento = "Pago"
      } else if (valorPago > 0) {
        statusPagamento = "Parcial"
      }

      // Calcula parcelas restantes
      const parcelasRestantes = currentReceita.parcelas - parcelasPagas

      // Atualiza a data do próximo pagamento
      const dataProximoPagamento = proximaParcelaPendente 
        ? (proximaParcelaPendente as Parcela).data_vencimento 
        : null

      // Atualiza o agendamento no banco de dados
      const { error } = await supabase
        .from("agendamentos")
        .update({
          pagamento_status: statusPagamento,
          valor_pago: valorPago,
          parcelas_restantes: parcelasRestantes,
          data_proximo_pagamento: dataProximoPagamento ?? undefined,
          detalhes_parcelas: JSON.stringify(parcelas),
        })
        .eq("id", currentReceita.id)

      if (error) throw error

      // Atualiza o estado local
      setCurrentReceita({
        ...currentReceita,
        status_pagamento: statusPagamento,
        valor_pago: valorPago,
        parcelas_restantes: parcelasRestantes,
        data_proximo_pagamento: dataProximoPagamento ?? undefined,
        detalhes_parcelas: parcelas,
      })

      toast({
        title: "Parcela atualizada",
        description: `A parcela ${parcelaNumero} foi marcada como ${novoStatus}.`,
      })

      // Atualiza os dados financeiros
      fetchFinanceiroData()
    } catch (error: any) {
      console.error("Erro ao atualizar parcela:", error)
      toast({
        title: "Erro ao atualizar parcela",
        description: `Não foi possível atualizar o status da parcela: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setAtualizandoParcela(false)
    }
  }

  // Ordenar dados
  function handleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Filtrar dados
  function filterData<T extends { [key: string]: any }>(data: T[], term: string): T[] {
    if (!term) return data

    return data.filter((item) => {
      return Object.values(item).some((value) => {
        if (value === null || value === undefined) return false
        return value.toString().toLowerCase().includes(term.toLowerCase())
      })
    })
  }

  // Ordenar dados
  function sortData<T extends { [key: string]: any }>(
    data: T[],
    column: string | null,
    direction: "asc" | "desc",
  ): T[] {
    if (!column) return data

    return [...data].sort((a, b) => {
      const valueA = a[column]
      const valueB = b[column]

      if (valueA === valueB) return 0

      if (valueA === null || valueA === undefined) return direction === "asc" ? -1 : 1
      if (valueB === null || valueB === undefined) return direction === "asc" ? 1 : -1

      if (typeof valueA === "string" && typeof valueB === "string") {
        return direction === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA)
      }

      return direction === "asc" ? (valueA < valueB ? -1 : 1) : valueA < valueB ? 1 : -1
    })
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

  // Calcular totais

  // Remove these lines:
  // const totalDespesas = despesas.reduce((sum, item) => sum + (typeof item.valor === "number" ? item.valor : 0), 0)
  // const saldoAtual = totalReceitas - totalDespesas
  // const totalPendente = receitas.reduce((sum, item) => {
  //   // Incluir tanto status "Pendente" quanto "Parcial" para pagamentos parcelados
  //   if (item.status_pagamento === "Pendente") {
  //     return sum + (typeof item.valor === "number" ? item.valor : 0)
  //   } else if (item.status_pagamento === "Parcial") {
  //     const valorTotal = typeof item.valor === "number" ? item.valor : 0
  //     const valorPago = typeof item.valor_pago === "number" ? item.valor_pago : 0
  //     return sum + (valorTotal - valorPago)
  //   }
  //   return sum
  // }, 0)

  // Filtrar e ordenar dados
  const filteredReceitas = sortData(filterData(receitas, searchTerm), sortColumn, sortDirection)
  const filteredDespesas = sortData(filterData(despesas, searchTerm), sortColumn, sortDirection)
  const filteredSaldosDevedores = sortData(filterData(saldosDevedores, searchTerm), sortColumn, sortDirection)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">Financeiro</h1>
        <p className="text-muted-foreground">Gerencie as finanças da sua clínica odontológica</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className={`text-2xl font-bold ${saldoAtual >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(saldoAtual)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPendente)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receitas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="saldos-devedores">Saldos Devedores</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        {/* Tab de Receitas */}
        <TabsContent value="receitas" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar receitas..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => handleSort("data")} className="cursor-pointer">
                      Data {sortColumn === "data" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("paciente_nome")} className="cursor-pointer">
                      Paciente {sortColumn === "paciente_nome" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("procedimento")} className="cursor-pointer">
                      Procedimento {sortColumn === "procedimento" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("valor")} className="cursor-pointer">
                      Valor Total {sortColumn === "valor" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("valor_pago")} className="cursor-pointer">
                      Valor Pago {sortColumn === "valor_pago" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("status_pagamento")} className="cursor-pointer">
                      Status {sortColumn === "status_pagamento" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("forma_pagamento")} className="cursor-pointer">
                      Forma de Pagamento {sortColumn === "forma_pagamento" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead onClick={() => handleSort("data_proximo_pagamento")} className="cursor-pointer">
                      Próximo Pagamento{" "}
                      {sortColumn === "data_proximo_pagamento" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredReceitas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">
                        Nenhuma receita encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReceitas.map((receita) => (
                      <TableRow key={receita.id}>
                        <TableCell>{formatDate(receita.data)}</TableCell>
                        <TableCell>{receita.paciente_nome}</TableCell>
                        <TableCell>{receita.procedimento}</TableCell>
                        <TableCell>{formatCurrency(receita.valor)}</TableCell>
                        <TableCell>{formatCurrency(receita.valor_pago)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              receita.status_pagamento === "Pago"
                                ? "default"
                                : receita.status_pagamento === "Parcial"
                                  ? "outline"
                                  : "secondary"
                            }
                            className={
                              receita.status_pagamento === "Pago"
                                ? "bg-green-100 text-green-800"
                                : receita.status_pagamento === "Parcial"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {receita.status_pagamento}
                          </Badge>
                        </TableCell>
                        <TableCell>{receita.forma_pagamento || "-"}</TableCell>
                        <TableCell>
                          {receita.parcelado
                            ? `${receita.parcelas_restantes}/${receita.parcelas} (${formatCurrency(receita.valor_parcela)}/parcela)`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {receita.data_proximo_pagamento && receita.status_pagamento === "Parcial"
                            ? formatDate(receita.data_proximo_pagamento)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentReceita(receita)
                                setNovoStatusPagamento({
                                  status_pagamento: receita.status_pagamento,
                                  forma_pagamento: (receita.forma_pagamento as FormaPagamento) || "Dinheiro",
                                  valor_pago: receita.valor_pago.toString(),
                                  parcelado: receita.parcelado,
                                  parcelas: receita.parcelas || 1,
                                })
                                setIsEditReceitaOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {receita.parcelado && receita.status_pagamento === "Parcial" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setCurrentReceita(receita)
                                  setIsViewParcelasOpen(true)
                                }}
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Despesas */}
        <TabsContent value="despesas" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar despesas..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
              <Button onClick={() => setIsAddDespesaOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nova Despesa
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => handleSort("data")} className="cursor-pointer">
                      Data {sortColumn === "data" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("descricao")} className="cursor-pointer">
                      Descrição {sortColumn === "descricao" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("categoria")} className="cursor-pointer">
                      Categoria {sortColumn === "categoria" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("valor")} className="cursor-pointer">
                      Valor {sortColumn === "valor" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("metodo_pagamento")} className="cursor-pointer">
                      Método de Pagamento {sortColumn === "metodo_pagamento" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredDespesas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Nenhuma despesa encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDespesas.map((despesa) => (
                      <TableRow key={despesa.id}>
                        <TableCell>{formatDate(despesa.data)}</TableCell>
                        <TableCell>{despesa.descricao}</TableCell>
                        <TableCell>{despesa.categoria}</TableCell>
                        <TableCell>{formatCurrency(despesa.valor)}</TableCell>
                        <TableCell>{despesa.metodo_pagamento}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentDespesa(despesa)
                                setIsEditDespesaOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja excluir esta despesa?")) {
                                  handleDeleteDespesa(despesa.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Saldos Devedores */}
        <TabsContent value="saldos-devedores" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pacientes..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <Card >
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => handleSort("paciente_nome")} className="cursor-pointer">
                      Paciente {sortColumn === "paciente_nome" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("valor_total")} className="cursor-pointer">
                      Valor Total {sortColumn === "valor_total" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("valor_pago")} className="cursor-pointer">
                      Valor Pago {sortColumn === "valor_pago" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("saldo_devedor")} className="cursor-pointer">
                      Saldo Devedor {sortColumn === "saldo_devedor" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead onClick={() => handleSort("consultas_pendentes")} className="cursor-pointer">
                      Consultas Pendentes{" "}
                      {sortColumn === "consultas_pendentes" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredSaldosDevedores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Nenhum saldo devedor encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSaldosDevedores.map((saldo) => (
                      <TableRow key={saldo.paciente_id}>
                        <TableCell>{saldo.paciente_nome}</TableCell>
                        <TableCell>{formatCurrency(saldo.valor_total)}</TableCell>
                        <TableCell>{formatCurrency(saldo.valor_pago)}</TableCell>
                        <TableCell className="font-medium text-red-600">
                          {formatCurrency(saldo.saldo_devedor)}
                        </TableCell>
                        <TableCell>{saldo.consultas_pendentes}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Filter receipts to show only those of the selected patient
                              setSearchTerm(() => saldo.paciente_nome);
                              (document.querySelector('[data-value="receitas"]') as HTMLElement)?.click()
                            }}
                          >
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Relatórios */}
        <TabsContent value="relatorios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatório Financeiro</CardTitle>
              <CardDescription>Gere relatórios financeiros para análise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="w-full md:w-auto">
                    <Label htmlFor="periodo-relatorio">Período</Label>
                    <Select
                      value={periodoRelatorio}
                      onValueChange={(value) => setPeriodoRelatorio(value as "mes" | "trimestre" | "ano")}
                    >
                      <SelectTrigger id="periodo-relatorio" className="w-[200px]">
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mes">Mês Atual</SelectItem>
                        <SelectItem value="trimestre">Trimestre Atual</SelectItem>
                        <SelectItem value="ano">Ano Atual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={gerarRelatorioFinanceiro}
                    disabled={loadingRelatorio}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loadingRelatorio ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" /> Gerar Relatório
                      </>
                    )}
                  </Button>
                </div>

                {relatorioFinanceiro && (
                  <div className="mt-6 space-y-6">
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-4">Resumo Financeiro - {relatorioFinanceiro.periodo}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                          <p className="text-sm text-muted-foreground">Receitas</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(relatorioFinanceiro.receitas)}
                          </p>
                        </div>
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                          <p className="text-sm text-muted-foreground">Despesas</p>
                          <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(relatorioFinanceiro.despesas)}
                          </p>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                          <p className="text-sm text-muted-foreground">Lucro</p>
                          <p
                            className={`text-2xl font-bold ${relatorioFinanceiro.lucro >= 0 ? "text-blue-600" : "text-red-600"}`}
                          >
                            {formatCurrency(relatorioFinanceiro.lucro)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Receitas por Categoria</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] flex items-center justify-center">
                            <PieChart className="h-16 w-16 text-muted-foreground" />
                          </div>
                          <div className="mt-2 space-y-1">
                            {relatorioFinanceiro.receitasPorCategoria.map((item, index) => (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="truncate max-w-[70%]">{item.categoria}</span>
                                <span className="font-medium">{formatCurrency(item.valor)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Despesas por Categoria</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] flex items-center justify-center">
                            <BarChart className="h-16 w-16 text-muted-foreground" />
                          </div>
                          <div className="mt-2 space-y-1">
                            {relatorioFinanceiro.despesasPorCategoria.map((item, index) => (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="truncate max-w-[70%]">{item.categoria}</span>
                                <span className="font-medium">{formatCurrency(item.valor)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Receitas por Forma de Pagamento</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] flex items-center justify-center">
                            <PieChart className="h-16 w-16 text-muted-foreground" />
                          </div>
                          <div className="mt-2 space-y-1">
                            {relatorioFinanceiro.receitasPorFormaPagamento.map((item, index) => (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="truncate max-w-[70%]">{item.forma}</span>
                                <span className="font-medium">{formatCurrency(item.valor)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Despesas por Forma de Pagamento</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] flex items-center justify-center">
                            <PieChart className="h-16 w-16 text-muted-foreground" />
                          </div>
                          <div className="mt-2 space-y-1">
                            {relatorioFinanceiro.despesasPorFormaPagamento.map((item, index) => (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="truncate max-w-[70%]">{item.forma}</span>
                                <span className="font-medium">{formatCurrency(item.valor)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Evolução Mensal</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px] flex items-center justify-center">
                          <LineChart className="h-16 w-16 text-muted-foreground" />
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Receitas Mensais</h4>
                            <div className="space-y-1">
                              {relatorioFinanceiro.receitasMensais.map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                  <span>{item.mes}</span>
                                  <span className="font-medium text-green-600">{formatCurrency(item.valor)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2">Despesas Mensais</h4>
                            <div className="space-y-1">
                              {relatorioFinanceiro.despesasMensais.map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                  <span>{item.mes}</span>
                                  <span className="font-medium text-red-600">{formatCurrency(item.valor)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-end">
                      <Button variant="outline" className="mr-2">
                        <Download className="mr-2 h-4 w-4" /> Exportar PDF
                      </Button>
                      <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Exportar Excel
                      </Button>
                    </div>
                  </div>
                )}

                {!relatorioFinanceiro && !loadingRelatorio && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Nenhum relatório gerado</h3>
                    <p className="text-muted-foreground mt-2">
                      Selecione um período e clique em "Gerar Relatório" para visualizar os dados financeiros.
                    </p>
                  </div>
                )}

                {loadingRelatorio && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Skeleton className="h-[400px] w-full rounded-md" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Previsão de Recebíveis de Cartão de Crédito */}
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Previsão de Recebíveis de Cartão de Crédito</CardTitle>
                <CardDescription>
                  Visualize os valores a receber de pagamentos parcelados nos próximos meses
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={buscarRecebiveisCartao} disabled={loadingRecebiveis}>
                {loadingRecebiveis ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Atualizando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" /> Atualizar
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {loadingRecebiveis ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : recebiveisCartao.length > 0 ? (
                <div className="space-y-6">
                  {/* Resumo visual */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {recebiveisCartao.slice(0, 3).map((recebivel, index) => (
                      <div key={index} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <p className="text-sm text-muted-foreground">
                          {recebivel.mes} de {recebivel.ano}
                        </p>
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(recebivel.valor)}</p>
                        <p className="text-sm text-muted-foreground">{recebivel.parcelas} parcelas</p>
                      </div>
                    ))}
                  </div>

                  {/* Gráfico de barras simplificado */}
                  <div className="mt-6 space-y-2">
                    <h4 className="text-sm font-medium">Previsão de Recebíveis por Mês</h4>
                    {recebiveisCartao.map((recebivel, index) => {
                      // Calcular o valor máximo para definir a largura relativa das barras
                      const maxValor = Math.max(...recebiveisCartao.map((r) => r.valor))
                      const width = (recebivel.valor / maxValor) * 100

                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>
                              {recebivel.mes} de {recebivel.ano}
                            </span>
                            <span className="font-medium">{formatCurrency(recebivel.valor)}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${width}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Tabela detalhada */}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Detalhamento por Mês</h4>
                    <Tabs defaultValue={recebiveisCartao[0]?.mes + recebiveisCartao[0]?.ano}>
                      <TabsList className="mb-4 flex flex-wrap">
                        {recebiveisCartao.map((recebivel, index) => (
                          <TabsTrigger key={index} value={recebivel.mes + recebivel.ano} className="mb-1">
                            {recebivel.mes} {recebivel.ano}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {recebiveisCartao.map((recebivel, index) => (
                        <TabsContent key={index} value={recebivel.mes + recebivel.ano}>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">
                                Recebíveis para {recebivel.mes} de {recebivel.ano}
                              </CardTitle>
                              <CardDescription>
                                Total: {formatCurrency(recebivel.valor)} em {recebivel.parcelas} parcelas
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>Procedimento</TableHead>
                                    <TableHead>Parcela</TableHead>
                                    <TableHead>Vencimento</TableHead>
                                    <TableHead>Valor</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {recebivel.detalhes.map((detalhe, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{detalhe.paciente}</TableCell>
                                      <TableCell>{detalhe.procedimento}</TableCell>
                                      <TableCell>{detalhe.parcela}</TableCell>
                                      <TableCell>{detalhe.vencimento}</TableCell>
                                      <TableCell>{formatCurrency(detalhe.valor)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" /> Exportar Previsão
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhum recebível futuro encontrado</h3>
                  <p className="text-muted-foreground mt-2">
                    Não há pagamentos parcelados pendentes de cartão de crédito no momento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal para adicionar despesa */}
      <Dialog open={isAddDespesaOpen} onOpenChange={setIsAddDespesaOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Despesa</DialogTitle>
            <DialogDescription>Preencha os detalhes da nova despesa abaixo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={novaDespesa.descricao}
                onChange={(e) => setNovaDespesa({ ...novaDespesa, descricao: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={novaDespesa.valor}
                onChange={(e) => setNovaDespesa({ ...novaDespesa, valor: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={novaDespesa.categoria}
                onValueChange={(value) => setNovaDespesa({ ...novaDespesa, categoria: value })}
              >
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasDespesa.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={novaDespesa.data}
                onChange={(e) => setNovaDespesa({ ...novaDespesa, data: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="metodo_pagamento">Método de Pagamento</Label>
              <Select
                value={novaDespesa.metodo_pagamento}
                onValueChange={(value) => setNovaDespesa({ ...novaDespesa, metodo_pagamento: value })}
              >
                <SelectTrigger id="metodo_pagamento">
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamento.map((forma) => (
                    <SelectItem key={forma} value={forma}>
                      {forma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDespesaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddDespesa}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para editar despesa */}
      <Dialog open={isEditDespesaOpen} onOpenChange={setIsEditDespesaOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
            <DialogDescription>Atualize os detalhes da despesa abaixo.</DialogDescription>
          </DialogHeader>
          {currentDespesa && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-descricao">Descrição</Label>
                <Input
                  id="edit-descricao"
                  value={currentDespesa.descricao}
                  onChange={(e) => setCurrentDespesa({ ...currentDespesa, descricao: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-valor">Valor (R$)</Label>
                <Input
                  id="edit-valor"
                  type="number"
                  step="0.01"
                  value={currentDespesa.valor}
                  onChange={(e) =>
                    setCurrentDespesa({
                      ...currentDespesa,
                      valor: Number.parseFloat(e.target.value) || currentDespesa.valor,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-categoria">Categoria</Label>
                <Select
                  value={currentDespesa.categoria}
                  onValueChange={(value) => setCurrentDespesa({ ...currentDespesa, categoria: value })}
                >
                  <SelectTrigger id="edit-categoria">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasDespesa.map((categoria) => (
                      <SelectItem key={categoria} value={categoria}>
                        {categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-data">Data</Label>
                <Input
                  id="edit-data"
                  type="date"
                  value={currentDespesa.data}
                  onChange={(e) => setCurrentDespesa({ ...currentDespesa, data: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-metodo_pagamento">Método de Pagamento</Label>
                <Select
                  value={currentDespesa.metodo_pagamento}
                  onValueChange={(value) => setCurrentDespesa({ ...currentDespesa, metodo_pagamento: value })}
                >
                  <SelectTrigger id="edit-metodo_pagamento">
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map((forma) => (
                      <SelectItem key={forma} value={forma}>
                        {forma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDespesaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateDespesa}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para editar status de pagamento */}
      <Dialog open={isEditReceitaOpen} onOpenChange={setIsEditReceitaOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Atualizar Status de Pagamento</DialogTitle>
            <DialogDescription>Atualize o status de pagamento da consulta.</DialogDescription>
          </DialogHeader>
          {currentReceita && (
            <div className="grid gap-4 py-4">
              <div>
                <p className="text-sm font-medium mb-1">Paciente</p>
                <p>{currentReceita.paciente_nome}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Procedimento</p>
                <p>{currentReceita.procedimento}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Valor Total</p>
                <p>{formatCurrency(currentReceita.valor)}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status_pagamento">Status de Pagamento</Label>
                <Select
                  value={novoStatusPagamento.status_pagamento}
                  onValueChange={(value) => setNovoStatusPagamento({ ...novoStatusPagamento, status_pagamento: value })}
                >
                  <SelectTrigger id="status_pagamento">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Parcial">Parcial</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {novoStatusPagamento.status_pagamento !== "Pendente" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                    <Select
                      value={novoStatusPagamento.forma_pagamento}
                      onValueChange={(value) =>
                        setNovoStatusPagamento({ ...novoStatusPagamento, forma_pagamento: value as FormaPagamento })
                      }
                    >
                      <SelectTrigger id="forma_pagamento">
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {formasPagamento.map((forma) => (
                          <SelectItem key={forma} value={forma}>
                            {forma}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="valor_pago">Valor Pago</Label>
                    <Input
                      id="valor_pago"
                      type="number"
                      step="0.01"
                      value={novoStatusPagamento.valor_pago}
                      onChange={(e) => setNovoStatusPagamento({ ...novoStatusPagamento, valor_pago: e.target.value })}
                    />
                    {Number.parseFloat(novoStatusPagamento.valor_pago) > currentReceita.valor && (
                      <p className="text-red-500 text-sm">O valor pago não pode ser maior que o valor total.</p>
                    )}
                  </div>
                  {novoStatusPagamento.forma_pagamento === "Cartão de Crédito" && (
                    <>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="parcelado"
                          checked={novoStatusPagamento.parcelado}
                          onCheckedChange={(checked) =>
                            setNovoStatusPagamento({ ...novoStatusPagamento, parcelado: checked as boolean })
                          }
                        />
                        <Label htmlFor="parcelado">Pagamento Parcelado</Label>
                      </div>
                      {novoStatusPagamento.parcelado && (
                        <div className="grid gap-2">
                          <Label htmlFor="parcelas">Número de Parcelas</Label>
                          <Select
                            value={novoStatusPagamento.parcelas.toString()}
                            onValueChange={(value) =>
                              setNovoStatusPagamento({ ...novoStatusPagamento, parcelas: Number.parseInt(value) })
                            }
                          >
                            <SelectTrigger id="parcelas">
                              <SelectValue placeholder="Selecione o número de parcelas" />
                            </SelectTrigger>
                            <SelectContent>
                              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}x
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {novoStatusPagamento.parcelas > 1 && (
                            <div className="mt-2 p-3 bg-muted rounded-md">
                              <p className="text-sm font-medium">Resumo do Parcelamento:</p>
                              <p className="text-sm mt-1">
                                Entrada: {formatCurrency(Number.parseFloat(novoStatusPagamento.valor_pago) || 0)}
                              </p>
                              <p className="text-sm mt-1">
                                Valor restante:{" "}
                                {formatCurrency(
                                  currentReceita.valor - (Number.parseFloat(novoStatusPagamento.valor_pago) || 0),
                                )}
                              </p>
                              <p className="text-sm mt-1">
                                {novoStatusPagamento.parcelas - 1}x de{" "}
                                {formatCurrency(
                                  (currentReceita.valor - (Number.parseFloat(novoStatusPagamento.valor_pago) || 0)) /
                                    (novoStatusPagamento.parcelas - 1),
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditReceitaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateStatusPagamento}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para visualizar detalhes das parcelas */}
      <Dialog open={isViewParcelasOpen} onOpenChange={setIsViewParcelasOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Detalhes das Parcelas</DialogTitle>
            <DialogDescription>
              Informações sobre as parcelas do pagamento para {currentReceita?.paciente_nome}
            </DialogDescription>
          </DialogHeader>
          {currentReceita && currentReceita.detalhes_parcelas && (
            <div className="py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentReceita.detalhes_parcelas.map((parcela) => (
                    <TableRow key={parcela.numero}>
                      <TableCell>{parcela.numero}ª parcela</TableCell>
                      <TableCell>{formatCurrency(parcela.valor)}</TableCell>
                      <TableCell>{formatDate(parcela.data_vencimento)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={parcela.status === "Pago" ? "default" : "secondary"}
                          className={
                            parcela.status === "Pago" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {parcela.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {parcela.status === "Pendente" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-800"
                            onClick={() => handleUpdateParcela(parcela.numero, "Pago")}
                            disabled={atualizandoParcela}
                            title="Marcar como Pago"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span className="sr-only">Marcar como Pago</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-yellow-600 hover:text-yellow-800"
                            onClick={() => handleUpdateParcela(parcela.numero, "Pendente")}
                            disabled={atualizandoParcela}
                            title="Marcar como Pendente"
                          >
                            <XCircle className="h-4 w-4" />
                            <span className="sr-only">Marcar como Pendente</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Resumo do Parcelamento:</p>
                <p className="text-sm mt-1">Valor total: {formatCurrency(currentReceita.valor)}</p>
                <p className="text-sm mt-1">Valor já pago: {formatCurrency(currentReceita.valor_pago)}</p>
                <p className="text-sm mt-1">
                  Valor restante: {formatCurrency(currentReceita.valor - currentReceita.valor_pago)}
                </p>
                <p className="text-sm mt-1">
                  Último pagamento previsto:{" "}
                  {currentReceita.detalhes_parcelas.length > 0
                    ? formatDate(
                        currentReceita.detalhes_parcelas[currentReceita.detalhes_parcelas.length - 1].data_vencimento,
                      )
                    : "-"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewParcelasOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

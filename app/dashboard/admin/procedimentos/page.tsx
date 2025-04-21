"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Search, FileText, Edit, Trash2, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
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

// Tipos
type Procedure = {
  id: string
  nome: string
  codigo: string
  descricao: string | null
  duracao: number
  valor: number
}

export default function ProceduresPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Estados para o modal de procedimento
  const [showAddProcedure, setShowAddProcedure] = useState(false)
  const [showEditProcedure, setShowEditProcedure] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null)

  // Estados do formulário
  const [formName, setFormName] = useState("")
  const [formCode, setFormCode] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formDuration, setFormDuration] = useState("")
  const [formPrice, setFormPrice] = useState("")
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Buscar dados iniciais
  useEffect(() => {
    fetchProcedures()
  }, [])

  // Filtrar procedimentos quando o termo de busca mudar
  useEffect(() => {
    filterProcedures()
  }, [searchTerm, procedures])

  async function fetchProcedures() {
    try {
      setLoading(true)

      const { data, error } = await supabase.from("procedimentos").select("*").order("nome")

      if (error) throw error

      if (data) {
        setProcedures(data)
        setFilteredProcedures(data)
      }
    } catch (error) {
      console.error("Erro ao buscar procedimentos:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar a lista de procedimentos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar procedimentos com base no termo de busca
  function filterProcedures() {
    if (!searchTerm) {
      setFilteredProcedures(procedures)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = procedures.filter(
      (procedure) =>
        procedure.nome.toLowerCase().includes(term) ||
        procedure.codigo.toLowerCase().includes(term) ||
        (procedure.descricao && procedure.descricao.toLowerCase().includes(term)),
    )

    setFilteredProcedures(filtered)
  }

  // Resetar o formulário
  const resetForm = () => {
    setFormName("")
    setFormCode("")
    setFormDescription("")
    setFormDuration("")
    setFormPrice("")
    setFormError("")
  }

  // Abrir modal para adicionar procedimento
  const openAddProcedureModal = () => {
    resetForm()
    setShowAddProcedure(true)
  }

  // Abrir modal para editar procedimento
  const openEditProcedureModal = (procedure: Procedure) => {
    setSelectedProcedure(procedure)
    setFormName(procedure.nome)
    setFormCode(procedure.codigo)
    setFormDescription(procedure.descricao || "")
    setFormDuration(procedure.duracao.toString())
    setFormPrice(procedure.valor.toString())
    setFormError("")
    setShowEditProcedure(true)
  }

  // Abrir confirmação de exclusão
  const openDeleteConfirmation = (procedure: Procedure) => {
    setSelectedProcedure(procedure)
    setShowDeleteConfirm(true)
  }

  // Validar formulário
  const validateForm = () => {
    if (!formName) {
      setFormError("O nome é obrigatório")
      return false
    }
    if (!formCode) {
      setFormError("O código é obrigatório")
      return false
    }
    if (!formDuration) {
      setFormError("A duração é obrigatória")
      return false
    }
    if (isNaN(Number(formDuration)) || Number(formDuration) <= 0) {
      setFormError("A duração deve ser um número positivo")
      return false
    }
    if (!formPrice) {
      setFormError("O valor é obrigatório")
      return false
    }
    if (isNaN(Number(formPrice)) || Number(formPrice) < 0) {
      setFormError("O valor deve ser um número não negativo")
      return false
    }
    return true
  }

  // Adicionar procedimento
  const addProcedure = async () => {
    if (!validateForm()) return

    try {
      setSubmitting(true)

      const { data, error } = await supabase
        .from("procedimentos")
        .insert([
          {
            nome: formName,
            codigo: formCode,
            descricao: formDescription || null,
            duracao: Number.parseInt(formDuration),
            valor: Number.parseFloat(formPrice),
          },
        ])
        .select()

      if (error) throw error

      await fetchProcedures()

      setShowAddProcedure(false)
      toast({
        title: "Procedimento adicionado",
        description: "O procedimento foi adicionado com sucesso.",
      })
    } catch (error: any) {
      console.error("Erro ao adicionar procedimento:", error)
      setFormError(
        error.code === "23505"
          ? "Este código já está em uso por outro procedimento."
          : "Erro ao adicionar procedimento. Por favor, tente novamente.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Editar procedimento
  const editProcedure = async () => {
    if (!validateForm() || !selectedProcedure) return

    try {
      setSubmitting(true)

      const { data, error } = await supabase
        .from("procedimentos")
        .update({
          nome: formName,
          codigo: formCode,
          descricao: formDescription || null,
          duracao: Number.parseInt(formDuration),
          valor: Number.parseFloat(formPrice),
        })
        .eq("id", selectedProcedure.id)
        .select()

      if (error) throw error

      await fetchProcedures()

      setShowEditProcedure(false)
      toast({
        title: "Procedimento atualizado",
        description: "O procedimento foi atualizado com sucesso.",
      })
    } catch (error: any) {
      console.error("Erro ao atualizar procedimento:", error)
      setFormError(
        error.code === "23505"
          ? "Este código já está em uso por outro procedimento."
          : "Erro ao atualizar procedimento. Por favor, tente novamente.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Excluir procedimento
  const deleteProcedure = async () => {
    if (!selectedProcedure) return

    try {
      setSubmitting(true)

      // Verificar se o procedimento está sendo usado em agendamentos
      const { data: appointments, error: appointmentsError } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("procedimento_id", selectedProcedure.id)
        .limit(1)

      if (appointmentsError) throw appointmentsError

      if (appointments && appointments.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Este procedimento está sendo usado em agendamentos. Exclua os agendamentos primeiro.",
          variant: "destructive",
        })
        setShowDeleteConfirm(false)
        return
      }

      // Excluir o procedimento
      const { error } = await supabase.from("procedimentos").delete().eq("id", selectedProcedure.id)

      if (error) throw error

      await fetchProcedures()

      setShowDeleteConfirm(false)
      toast({
        title: "Procedimento excluído",
        description: "O procedimento foi excluído com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao excluir procedimento:", error)
      toast({
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir o procedimento.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">Procedimentos</h1>
          <p className="text-muted-foreground">Gerencie os procedimentos odontológicos oferecidos pela clínica</p>
        </div>
        <Button onClick={openAddProcedureModal} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Novo Procedimento
        </Button>
      </div>

      {/* Modal de Adicionar Procedimento */}
      <Dialog open={showAddProcedure} onOpenChange={setShowAddProcedure}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Procedimento</DialogTitle>
            <DialogDescription>Preencha os dados para adicionar um novo procedimento odontológico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm p-3 rounded-md flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Procedimento</Label>
              <Input
                id="name"
                placeholder="Nome do procedimento"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                placeholder="Código do procedimento"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição do procedimento"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="Duração em minutos"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Valor (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="Valor do procedimento"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProcedure(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={addProcedure} className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
              {submitting ? "Adicionando..." : "Adicionar Procedimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Procedimento */}
      <Dialog open={showEditProcedure} onOpenChange={setShowEditProcedure}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Procedimento</DialogTitle>
            <DialogDescription>Atualize os dados do procedimento odontológico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm p-3 rounded-md flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Procedimento</Label>
              <Input
                id="edit-name"
                placeholder="Nome do procedimento"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Código</Label>
              <Input
                id="edit-code"
                placeholder="Código do procedimento"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                placeholder="Descrição do procedimento"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-duration">Duração (minutos)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  placeholder="Duração em minutos"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Valor (R$)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  placeholder="Valor do procedimento"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProcedure(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={editProcedure} className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
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
              Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                deleteProcedure()
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
            placeholder="Buscar procedimentos..."
            className="w-full pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Procedimentos</CardTitle>
          <CardDescription>Visualize e gerencie todos os procedimentos odontológicos</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 rounded-md border p-4">
                  <Skeleton className="h-12 w-12 rounded-md" />
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
          ) : filteredProcedures.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum procedimento encontrado</h3>
              <p className="mt-2 text-muted-foreground">
                {searchTerm
                  ? "Não foram encontrados procedimentos com os critérios de busca."
                  : "Não há procedimentos cadastrados."}
              </p>
              <Button onClick={openAddProcedureModal} className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" /> Adicionar Procedimento
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProcedures.map((procedure) => (
                <div key={procedure.id} className="rounded-md border p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="mr-2 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{procedure.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          Código: {procedure.codigo} • Duração: {procedure.duracao} min • Valor:{" "}
                          {formatCurrency(procedure.valor)}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                        onClick={() => openEditProcedureModal(procedure)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => openDeleteConfirmation(procedure)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Excluir
                      </Button>
                    </div>
                  </div>
                  {procedure.descricao && (
                    <div className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                      {procedure.descricao}
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

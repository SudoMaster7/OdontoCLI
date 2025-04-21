"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Search, User, Edit, Trash2, AlertCircle } from "lucide-react"
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

// Tipos
type Dentist = {
  id: string
  nome: string
  sobrenome: string
  email: string
  especialidade: string | null
}

export default function DentistsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [filteredDentists, setFilteredDentists] = useState<Dentist[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Estados para o modal de dentista
  const [showAddDentist, setShowAddDentist] = useState(false)
  const [showEditDentist, setShowEditDentist] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedDentist, setSelectedDentist] = useState<Dentist | null>(null)

  // Estados do formulário
  const [formFirstName, setFormFirstName] = useState("")
  const [formLastName, setFormLastName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formSpecialty, setFormSpecialty] = useState("")
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Buscar dados iniciais
  useEffect(() => {
    fetchDentists()
  }, [])

  // Filtrar dentistas quando o termo de busca mudar
  useEffect(() => {
    filterDentists()
  }, [searchTerm, dentists])

  async function fetchDentists() {
    try {
      setLoading(true)

      const { data, error } = await supabase.from("dentistas").select("*").order("nome")

      if (error) throw error

      if (data) {
        setDentists(data)
        setFilteredDentists(data)
      }
    } catch (error) {
      console.error("Erro ao buscar dentistas:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar a lista de dentistas.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar dentistas com base no termo de busca
  function filterDentists() {
    if (!searchTerm) {
      setFilteredDentists(dentists)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = dentists.filter(
      (dentist) =>
        dentist.nome.toLowerCase().includes(term) ||
        dentist.sobrenome.toLowerCase().includes(term) ||
        dentist.email.toLowerCase().includes(term) ||
        (dentist.especialidade && dentist.especialidade.toLowerCase().includes(term)),
    )

    setFilteredDentists(filtered)
  }

  // Resetar o formulário
  const resetForm = () => {
    setFormFirstName("")
    setFormLastName("")
    setFormEmail("")
    setFormSpecialty("")
    setFormError("")
  }

  // Abrir modal para adicionar dentista
  const openAddDentistModal = () => {
    resetForm()
    setShowAddDentist(true)
  }

  // Abrir modal para editar dentista
  const openEditDentistModal = (dentist: Dentist) => {
    setSelectedDentist(dentist)
    setFormFirstName(dentist.nome)
    setFormLastName(dentist.sobrenome)
    setFormEmail(dentist.email)
    setFormSpecialty(dentist.especialidade || "")
    setFormError("")
    setShowEditDentist(true)
  }

  // Abrir confirmação de exclusão
  const openDeleteConfirmation = (dentist: Dentist) => {
    setSelectedDentist(dentist)
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
    return true
  }

  // Adicionar dentista
  const addDentist = async () => {
    if (!validateForm()) return

    try {
      setSubmitting(true)

      const { data, error } = await supabase
        .from("dentistas")
        .insert([
          {
            nome: formFirstName,
            sobrenome: formLastName,
            email: formEmail,
            especialidade: formSpecialty || null,
          },
        ])
        .select()

      if (error) throw error

      await fetchDentists()

      setShowAddDentist(false)
      toast({
        title: "Dentista adicionado",
        description: "O dentista foi adicionado com sucesso.",
      })
    } catch (error: any) {
      console.error("Erro ao adicionar dentista:", error)
      setFormError(
        error.code === "23505"
          ? "Este email já está em uso por outro dentista."
          : "Erro ao adicionar dentista. Por favor, tente novamente.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Editar dentista
  const editDentist = async () => {
    if (!validateForm() || !selectedDentist) return

    try {
      setSubmitting(true)

      const { data, error } = await supabase
        .from("dentistas")
        .update({
          nome: formFirstName,
          sobrenome: formLastName,
          email: formEmail,
          especialidade: formSpecialty || null,
        })
        .eq("id", selectedDentist.id)
        .select()

      if (error) throw error

      await fetchDentists()

      setShowEditDentist(false)
      toast({
        title: "Dentista atualizado",
        description: "O dentista foi atualizado com sucesso.",
      })
    } catch (error: any) {
      console.error("Erro ao atualizar dentista:", error)
      setFormError(
        error.code === "23505"
          ? "Este email já está em uso por outro dentista."
          : "Erro ao atualizar dentista. Por favor, tente novamente.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Excluir dentista
  const deleteDentist = async () => {
    if (!selectedDentist) return

    try {
      setSubmitting(true)

      // Verificar se o dentista tem pacientes ou agendamentos
      const { data: patients, error: patientsError } = await supabase
        .from("pacientes")
        .select("id")
        .eq("dentista_id", selectedDentist.id)
        .limit(1)

      if (patientsError) throw patientsError

      if (patients && patients.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Este dentista possui pacientes associados. Reatribua os pacientes primeiro.",
          variant: "destructive",
        })
        setShowDeleteConfirm(false)
        return
      }

      const { data: appointments, error: appointmentsError } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("dentista_id", selectedDentist.id)
        .limit(1)

      if (appointmentsError) throw appointmentsError

      if (appointments && appointments.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Este dentista possui agendamentos. Exclua os agendamentos primeiro.",
          variant: "destructive",
        })
        setShowDeleteConfirm(false)
        return
      }

      // Excluir o dentista
      const { error } = await supabase.from("dentistas").delete().eq("id", selectedDentist.id)

      if (error) throw error

      await fetchDentists()

      setShowDeleteConfirm(false)
      toast({
        title: "Dentista excluído",
        description: "O dentista foi excluído com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao excluir dentista:", error)
      toast({
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir o dentista.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">Dentistas</h1>
          <p className="text-muted-foreground">Gerencie a equipe de dentistas da clínica</p>
        </div>
        <Button onClick={openAddDentistModal} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Novo Dentista
        </Button>
      </div>

      {/* Modal de Adicionar Dentista */}
      <Dialog open={showAddDentist} onOpenChange={setShowAddDentist}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Dentista</DialogTitle>
            <DialogDescription>Preencha os dados para adicionar um novo dentista à equipe.</DialogDescription>
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
              <Label htmlFor="specialty">Especialidade</Label>
              <Input
                id="specialty"
                placeholder="Especialidade"
                value={formSpecialty}
                onChange={(e) => setFormSpecialty(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDentist(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={addDentist} className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
              {submitting ? "Adicionando..." : "Adicionar Dentista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Dentista */}
      <Dialog open={showEditDentist} onOpenChange={setShowEditDentist}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Dentista</DialogTitle>
            <DialogDescription>Atualize os dados do dentista.</DialogDescription>
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
              <Label htmlFor="edit-specialty">Especialidade</Label>
              <Input
                id="edit-specialty"
                placeholder="Especialidade"
                value={formSpecialty}
                onChange={(e) => setFormSpecialty(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDentist(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={editDentist} className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
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
              Tem certeza que deseja excluir este dentista? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                deleteDentist()
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
            placeholder="Buscar dentistas..."
            className="w-full pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipe de Dentistas</CardTitle>
          <CardDescription>Visualize e gerencie todos os dentistas da clínica</CardDescription>
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
          ) : filteredDentists.length === 0 ? (
            <div className="text-center py-10">
              <User className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum dentista encontrado</h3>
              <p className="mt-2 text-muted-foreground">
                {searchTerm
                  ? "Não foram encontrados dentistas com os critérios de busca."
                  : "Não há dentistas cadastrados."}
              </p>
              <Button onClick={openAddDentistModal} className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" /> Adicionar Dentista
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDentists.map((dentist) => (
                <div key={dentist.id} className="rounded-md border p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="mr-2 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          Dr(a). {dentist.nome} {dentist.sobrenome}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {dentist.especialidade ? `${dentist.especialidade} • ` : ""}
                          {dentist.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                        onClick={() => openEditDentistModal(dentist)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => openDeleteConfirmation(dentist)}
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
    </div>
  )
}

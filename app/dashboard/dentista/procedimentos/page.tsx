"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Procedimento {
  id: string
  nome: string
  descricao: string
  valor: number
  categoria: string
  duracao: number
  created_at: string
}

export default function ProcedimentosPage() {
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
  const [filteredProcedimentos, setFilteredProcedimentos] = useState<Procedimento[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedProcedimento, setSelectedProcedimento] = useState<Procedimento | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [categorias, setCategorias] = useState<string[]>([])
  const [selectedCategoria, setSelectedCategoria] = useState<string>("Todas")

  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchProcedimentos = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.from("procedimentos").select("*").order("nome")

        if (error) {
          throw error
        }

        if (data) {
          setProcedimentos(data)
          setFilteredProcedimentos(data)

          // Extrair categorias únicas
          const uniqueCategorias = Array.from(new Set(data.map((proc) => proc.categoria)))
          setCategorias(uniqueCategorias)
        }
      } catch (error) {
        console.error("Erro ao buscar procedimentos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProcedimentos()
  }, [supabase])

  useEffect(() => {
    let result = procedimentos

    // Filtrar por categoria
    if (selectedCategoria !== "Todas") {
      result = result.filter((proc) => proc.categoria === selectedCategoria)
    }

    // Filtrar por termo de busca
    if (searchTerm) {
      result = result.filter(
        (proc) =>
          proc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          proc.descricao.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredProcedimentos(result)
  }, [searchTerm, selectedCategoria, procedimentos])

  const handleViewDetails = (procedimento: Procedimento) => {
    setSelectedProcedimento(procedimento)
    setOpenDialog(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full max-w-sm" />
              <div className="space-y-2">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Procedimentos Odontológicos</CardTitle>
          <CardDescription>Visualize todos os procedimentos disponíveis na clínica</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar procedimentos..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-shrink-0">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
              >
                <option value="Todas">Todas as categorias</option>
                {categorias.map((categoria, index) => (
                  <option key={`${categoria}-${index}`} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredProcedimentos.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Nenhum procedimento encontrado.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="hidden md:table-cell">Duração (min)</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProcedimentos.map((procedimento) => (
                      <TableRow key={procedimento.id}>
                        <TableCell className="font-medium">{procedimento.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{procedimento.categoria}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{procedimento.duracao}</TableCell>
                        <TableCell>{formatCurrency(procedimento.valor)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleViewDetails(procedimento)}>
                            <Info className="h-4 w-4" />
                            <span className="sr-only">Ver detalhes</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        {selectedProcedimento && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedProcedimento.nome}</DialogTitle>
              <DialogDescription>Detalhes do procedimento</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Categoria</p>
                  <p>{selectedProcedimento.categoria}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor</p>
                  <p>{formatCurrency(selectedProcedimento.valor)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duração</p>
                  <p>{selectedProcedimento.duracao} minutos</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Cadastro</p>
                  <p>{new Date(selectedProcedimento.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                <p className="text-sm mt-1">{selectedProcedimento.descricao}</p>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

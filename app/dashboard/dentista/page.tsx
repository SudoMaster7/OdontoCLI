import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, CheckCircle, Clock } from "lucide-react"

export default function DentistDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">Dashboard do Dentista</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao seu painel. Visualize suas consultas e informações dos pacientes.
        </p>
      </div>

      <Tabs defaultValue="hoje" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="agenda">Minha Agenda</TabsTrigger>
          <TabsTrigger value="pacientes">Meus Pacientes</TabsTrigger>
        </TabsList>
        <TabsContent value="hoje" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Consultas de Hoje</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">2 novos pacientes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">37.5% das consultas de hoje</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Próximo Paciente</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Maria Silva</div>
                <p className="text-xs text-muted-foreground">Chegando em 15 minutos</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Agenda de Hoje</CardTitle>
              <CardDescription>Suas consultas para hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border p-4 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Maria Silva</p>
                      <p className="text-sm text-muted-foreground">Limpeza Dental</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">09:00</p>
                      <p className="text-sm text-muted-foreground">Sala 2</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">João Oliveira</p>
                      <p className="text-sm text-muted-foreground">Tratamento de Canal</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">10:30</p>
                      <p className="text-sm text-muted-foreground">Sala 1</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Ana Costa</p>
                      <p className="text-sm text-muted-foreground">Consulta</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">11:45</p>
                      <p className="text-sm text-muted-foreground">Sala 2</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="agenda" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Minha Agenda</CardTitle>
              <CardDescription>Visualize e gerencie suas próximas consultas</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Visualização do calendário apareceria aqui</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pacientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meus Pacientes</CardTitle>
              <CardDescription>Visualize e gerencie seus registros de pacientes</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Lista de pacientes apareceria aqui</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

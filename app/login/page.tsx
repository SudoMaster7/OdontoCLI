"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { SmileIcon as Tooth } from "lucide-react"
import { authenticate } from "@/lib/auth" // <- Importa a função de autenticação

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userType, setUserType] = useState("dentista")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const user = authenticate(email, password)

    if (!user) {
      setError("Email ou senha inválidos.")
      return
    }

    if (user.role !== userType) {
      setError("O tipo de usuário não corresponde ao email informado.")
      return
    }

    // Redireciona para o dashboard correspondente
    router.push(`/dashboard/${user.role}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <Tooth className="h-12 w-12 text-blue-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-blue-700">
            OdontoClinic
          </CardTitle>
          <CardDescription className="text-center">
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Usuário</Label>
              <RadioGroup
                defaultValue="dentista"
                value={userType}
                onValueChange={setUserType}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dentista" id="dentista" />
                  <Label htmlFor="dentista">Dentista</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="admin" />
                  <Label htmlFor="admin">Administrador</Label>
                </div>
              </RadioGroup>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Entrar
            </Button>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <a href="#" className="underline underline-offset-4 hover:text-blue-500">
                Esqueceu sua senha?
              </a>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

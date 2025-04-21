"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { dentistas, administradores, recepcionistas } from "@/lib/mock-data"

type UserRole = "dentista" | "admin" | "recepcionista"

type User = {
  id: string
  nome: string
  email: string
  role: UserRole
  especialidade?: string
  dentistaId?: string
}

type AuthContextType = {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, senha: string, role: UserRole) => Promise<boolean>
  logout: () => void
  getCurrentDentistaId: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Verificar se há um usuário salvo no localStorage ao carregar a página
  useEffect(() => {
    const storedUser = localStorage.getItem("usuarioLogado")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error("Erro ao carregar usuário do localStorage:", e)
        localStorage.removeItem("usuarioLogado")
      }
    }
    setLoading(false)
  }, [])

  // Função para obter o ID do dentista atual
  const getCurrentDentistaId = (): string | null => {
    if (user?.role === "dentista") {
      return user.id
    }
    return null
  }

  // Função de login
  const login = async (email: string, senha: string, role: UserRole): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      // Simular um delay de rede
      await new Promise((resolve) => setTimeout(resolve, 800))

      let usuarioEncontrado = null
      let userInfo = null

      // Verificar credenciais com base no tipo de usuário
      if (role === "dentista") {
        usuarioEncontrado = dentistas.find((d) => d.email === email && d.senha === senha)
        if (usuarioEncontrado) {
          const { senha: _, ...resto } = usuarioEncontrado
          userInfo = { ...resto, role: "dentista" }
        }
      } else if (role === "admin") {
        usuarioEncontrado = administradores.find((a) => a.email === email && a.senha === senha)
        if (usuarioEncontrado) {
          const { senha: _, ...resto } = usuarioEncontrado
          userInfo = { ...resto, role: "admin" }
        }
      } else if (role === "recepcionista") {
        usuarioEncontrado = recepcionistas.find((r) => r.email === email && r.senha === senha)
        if (usuarioEncontrado) {
          const { senha: _, ...resto } = usuarioEncontrado
          userInfo = { ...resto, role: "recepcionista" }
        }
      }

      if (userInfo) {
        setUser(userInfo)
        // Salvar no localStorage para persistência
        localStorage.setItem("usuarioLogado", JSON.stringify(userInfo))
        return true
      } else {
        setError("Email ou senha incorretos")
        return false
      }
    } catch (err) {
      setError("Ocorreu um erro ao fazer login")
      return false
    } finally {
      setLoading(false)
    }
  }

  // Função de logout
  const logout = () => {
    setUser(null)
    localStorage.removeItem("usuarioLogado")
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, getCurrentDentistaId }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}

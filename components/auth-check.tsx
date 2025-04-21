"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const checkAuth = () => {
      const storedUser = localStorage.getItem("usuarioLogado")

      if (!storedUser) {
        console.log("Usuário não autenticado, redirecionando para login")
        router.push("/login")
        return
      }

      try {
        const user = JSON.parse(storedUser)

        // Verificar se o usuário tem acesso à rota atual
        const userRole = user.role
        const currentPath = pathname || ""

        if (currentPath.includes("/dashboard/dentista") && userRole !== "dentista") {
          console.log("Acesso negado: usuário não é dentista")
          router.push(`/dashboard/${userRole}`)
          return
        }

        if (currentPath.includes("/dashboard/admin") && userRole !== "admin") {
          console.log("Acesso negado: usuário não é administrador")
          router.push(`/dashboard/${userRole}`)
          return
        }

        if (currentPath.includes("/dashboard/recepcionista") && userRole !== "recepcionista") {
          console.log("Acesso negado: usuário não é recepcionista")
          router.push(`/dashboard/${userRole}`)
          return
        }

        setIsAuthenticated(true)
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error)
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [pathname, router])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Verificando autenticação...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

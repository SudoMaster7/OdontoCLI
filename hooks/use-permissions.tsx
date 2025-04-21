"use client"

import { useAuth } from "@/contexts/auth-context"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

export function usePermissions() {
  const { user, loading, getCurrentDentistaId } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Verificar se o usuário tem permissão para acessar a rota atual
  const checkPermission = () => {
    if (loading) return true // Ainda carregando, permitir acesso temporariamente

    // Extrair o tipo de usuário da URL
    const userType = pathname.split("/")[2]

    // Se não houver usuário e não estiver na página de login, redirecionar
    if (!user && !pathname.includes("/login")) {
      return false
    }

    // Se o usuário estiver tentando acessar uma área que não corresponde ao seu papel
    if (user && userType && user.role !== userType) {
      return false
    }

    return true
  }

  // Verificar se o dentista tem acesso a um paciente específico
  const canAccessPatient = async (patientId: string) => {
    const dentistaId = getCurrentDentistaId()

    // Se não for dentista, não tem acesso
    if (!dentistaId) return false

    // Verificar se o paciente pertence ao dentista
    const { data, error } = await fetch(
      `/api/permissions/check-patient?dentistaId=${dentistaId}&patientId=${patientId}`,
    ).then((res) => res.json())

    if (error || !data) return false

    return data.hasAccess
  }

  // Verificar se o dentista tem acesso a um agendamento específico
  const canAccessAppointment = async (appointmentId: string) => {
    const dentistaId = getCurrentDentistaId()

    // Se não for dentista, não tem acesso
    if (!dentistaId) return false

    // Verificar se o agendamento pertence ao dentista
    const { data, error } = await fetch(
      `/api/permissions/check-appointment?dentistaId=${dentistaId}&appointmentId=${appointmentId}`,
    ).then((res) => res.json())

    if (error || !data) return false

    return data.hasAccess
  }

  // Redirecionar se não tiver permissão
  useEffect(() => {
    if (!checkPermission() && !loading) {
      router.push("/login")
    }
  }, [user, pathname, loading])

  return {
    canAccessPatient,
    canAccessAppointment,
    getCurrentDentistaId,
  }
}

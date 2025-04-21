import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const dentistaId = searchParams.get("dentistaId")
  const appointmentId = searchParams.get("appointmentId")

  if (!dentistaId || !appointmentId) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Verificar se o agendamento pertence ao dentista
    const { data, error } = await supabase
      .from("agendamentos")
      .select("id")
      .eq("id", appointmentId)
      .eq("dentista_id", dentistaId)
      .single()

    if (error) throw error

    return NextResponse.json({
      hasAccess: !!data,
      data,
    })
  } catch (error) {
    console.error("Erro ao verificar permissão:", error)
    return NextResponse.json({ error: "Erro ao verificar permissão", hasAccess: false }, { status: 500 })
  }
}

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const dentistaId = searchParams.get("dentistaId")
  const patientId = searchParams.get("patientId")

  if (!dentistaId || !patientId) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Verificar se o paciente pertence ao dentista
    const { data, error } = await supabase
      .from("pacientes")
      .select("id")
      .eq("id", patientId)
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

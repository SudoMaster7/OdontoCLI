"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CalendarDays, CreditCard, Users, LineChart, Menu, X, Home, UserCircle, LogOut, FileText, Settings, SmileIcon as Tooth, User } from 'lucide-react'
import { ModeToggle } from "@/components/mode-toggle"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  // Determine user type from URL
  const userType = pathname.split("/")[2]

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  // Define navigation items based on user type
  const navItems = [
    { href: `/dashboard/${userType}`, label: "Dashboard", icon: <Home className="h-5 w-5" /> },
    { href: `/dashboard/${userType}/pacientes`, label: "Pacientes", icon: <Users className="h-5 w-5" /> },
    { href: `/dashboard/${userType}/procedimentos`, label: "Procedimentos", icon: <FileText className="h-5 w-5" /> },
  ]

  // Add admin specific items
  if (userType === "admin") {
    navItems.push(
      { href: `/dashboard/${userType}/dentistas`, label: "Dentistas", icon: <User className="h-5 w-5" /> },
      { href: `/dashboard/${userType}/gerenciar-agendamentos`, label: "Gerenciar Agendamentos", icon: <CalendarDays className="h-5 w-5" /> },
      { href: `/dashboard/${userType}/financeiro`, label: "Financeiro", icon: <CreditCard className="h-5 w-5" /> },
      { href: `/dashboard/${userType}/relatorios`, label: "Relatórios", icon: <LineChart className="h-5 w-5" /> },
    )
  }

  // Add settings for all users


  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <div className="mr-4 hidden md:flex">
            <Link href={`/dashboard/${userType}`} className="mr-6 flex items-center space-x-2">
              <Tooth className="h-6 w-6 text-blue-500" />
              <span className="hidden font-bold sm:inline-block">OdontoClinic</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <ModeToggle />
            <div className="flex items-center">
              <UserCircle className="mr-2 h-5 w-5" />
              <span className="text-sm font-medium capitalize">{userType}</span>
            </div>
            <Link href="/login">
              <Button variant="ghost" size="icon">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sair</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-background transition-transform duration-300 md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 items-center border-b px-4">
            <Link href={`/dashboard/${userType}`} className="flex items-center space-x-2">
              <Tooth className="h-6 w-6 text-blue-500" />
              <span className="font-bold">OdontoClinic</span>
            </Link>
            <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
              <span className="sr-only">Fechar Menu</span>
            </Button>
          </div>
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  pathname === item.href
                    ? "bg-blue-100 dark:bg-blue-900 font-medium text-blue-700 dark:text-blue-200"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className={`flex-1 md:ml-64 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <main className="container py-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

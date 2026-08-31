"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  TrendingUp,
  Users,
  RefreshCcw,
  Globe,
  MessageSquare,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  User,
  Shield,
} from "lucide-react";
import { cerrarSesion } from "@/services/autenticacion/cerrarSesion";
import { ToastProvider } from "@/components/ui/Toast";

interface AppLayoutClientProps {
  children: React.ReactNode;
  rol: "admin_nodexa" | "comerciante" | "empleado";
  email: string;
  nombreComercio: string;
  modulosActivos: {
    catalogo_web: boolean;
    carga_ia: boolean;
    fiados: boolean;
    devoluciones: boolean;
    bot_whatsapp: boolean;
  };
}

export function AppLayoutClient({
  children,
  rol,
  email,
  nombreComercio,
  modulosActivos,
}: AppLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Validación de acceso por módulos y rol (Gate del Frontend)
  useEffect(() => {
    // 1. Validaciones de módulos
    if (pathname.startsWith("/clientes") && !modulosActivos.fiados) {
      router.replace("/dashboard?error=NX-FIA-001");
      return;
    }
    if (pathname.startsWith("/devoluciones") && !modulosActivos.devoluciones) {
      router.replace("/dashboard?error=NX-DEV-001");
      return;
    }
    if (pathname.startsWith("/catalogo-web") && !modulosActivos.catalogo_web) {
      router.replace("/dashboard?error=NX-WEB-001");
      return;
    }
    if (pathname.startsWith("/whatsapp-bot") && !modulosActivos.bot_whatsapp) {
      router.replace("/dashboard?error=NX-BOT-001");
      return;
    }
    if (pathname.startsWith("/productos/carga-ia") && !modulosActivos.carga_ia) {
      router.replace("/dashboard?error=NX-IA-001");
      return;
    }

    // 2. Validaciones de rol (Empleado no puede entrar a administración/configuración)
    if (rol === "empleado") {
      const rutasProhibidas = ["/catalogo-web", "/whatsapp-bot", "/configuracion"];
      if (rutasProhibidas.some((ruta) => pathname.startsWith(ruta))) {
        router.replace("/dashboard?error=NX-SYS-003");
      }
    }
  }, [pathname, modulosActivos, rol, router]);

  // Estructura de links de navegación
  const itemsNavegacion = [
    {
      titulo: "Resumen",
      href: "/dashboard",
      icon: LayoutDashboard,
      mostrar: true,
    },
    {
      titulo: "Mostrador",
      href: "/mostrador",
      icon: ShoppingCart,
      mostrar: true,
    },
    {
      titulo: "Productos",
      href: "/productos",
      icon: Package,
      mostrar: true,
    },
    {
      titulo: "Stock",
      href: "/stock",
      icon: Layers,
      mostrar: true,
    },
    {
      titulo: "Ventas",
      href: "/ventas",
      icon: TrendingUp,
      mostrar: true,
    },
    {
      titulo: "Clientes",
      href: "/clientes",
      icon: Users,
      mostrar: modulosActivos.fiados,
    },
    {
      titulo: "Devoluciones",
      href: "/devoluciones",
      icon: RefreshCcw,
      mostrar: modulosActivos.devoluciones,
    },
    {
      titulo: "Catálogo Web",
      href: "/catalogo-web",
      icon: Globe,
      mostrar: modulosActivos.catalogo_web && rol !== "empleado",
    },
    {
      titulo: "Bot de WhatsApp",
      href: "/whatsapp-bot",
      icon: MessageSquare,
      mostrar: modulosActivos.bot_whatsapp && rol !== "empleado",
    },
  ];

  const itemsSistema = [
    {
      titulo: "Configuración",
      href: "/configuracion",
      icon: Settings,
      mostrar: rol !== "empleado",
    },
    {
      titulo: "Ayuda",
      href: "/ayuda",
      icon: HelpCircle,
      mostrar: true,
    },
  ];

  const renderLink = (item: typeof itemsNavegacion[number]) => {
    if (!item.mostrar) return null;

    // Se considera activo si el pathname coincide exactamente, o si es una subruta (excepto para '/')
    const activo = item.href === "/dashboard" 
      ? pathname === item.href 
      : pathname.startsWith(item.href);

    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMenuMovilAbierto(false)}
        className={`group flex items-center gap-3 px-4 rounded-md transition-all duration-150 min-h-[44px] w-full outline-none focus-visible:ring-2 focus-visible:ring-[#16D39A] ${
          activo
            ? "bg-[#16D39A] text-[#090B0B] font-semibold shadow-md shadow-[#16D39A]/10"
            : "text-[#A6AEAA] hover:bg-[#151A18] hover:text-[#F3F5F4]"
        }`}
        aria-current={activo ? "page" : undefined}
      >
        <Icon className={`h-5 w-5 shrink-0 ${activo ? "text-[#090B0B]" : "text-[#737C78] group-hover:text-[#F3F5F4] transition-colors"}`} aria-hidden="true" />
        <span className="text-sm">{item.titulo}</span>
      </Link>
    );
  };

  const handleCerrarSesion = () => {
    startTransition(async () => {
      await cerrarSesion();
    });
  };

  const contenidoSidebar = (
    <div className="flex flex-col h-full bg-[#0D1110]">
      {/* Cabecera / Identidad */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#222A27]">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-[#151A18] shadow-inner">
          <Image
            src="/Isotipo.png"
            alt="Isotipo Nodexa"
            width={32}
            height={32}
            className="h-7 w-7 object-contain drop-shadow"
            priority
          />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-sans text-base font-bold tracking-tight text-[#F3F5F4] whitespace-nowrap">
              NODEXA
            </span>
            <span className="rounded bg-[#16D39A]/10 border border-[#16D39A]/20 px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#16D39A] capitalize">
              {rol}
            </span>
          </div>
          <span className="truncate font-mono text-[10px] tracking-wider text-[#737C78] uppercase">
            {nombreComercio}
          </span>
        </div>
      </div>

      {/* Navegación de Módulos */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
        <div className="space-y-1.5">
          <span className="px-4 text-[10px] font-bold text-[#737C78] uppercase tracking-wider block">
            Módulos
          </span>
          <nav className="space-y-1" aria-label="Menú principal">
            {itemsNavegacion.map(renderLink)}
          </nav>
        </div>

        <div className="space-y-1.5">
          <span className="px-4 text-[10px] font-bold text-[#737C78] uppercase tracking-wider block">
            Sistema
          </span>
          <nav className="space-y-1" aria-label="Menú de sistema">
            {itemsSistema.map(renderLink)}
          </nav>
        </div>
      </div>

      {/* Footer / Usuario y Logout */}
      <div className="p-4 border-t border-[#222A27] bg-[#111615]">
        <div className="flex items-center gap-3 px-2 py-3 rounded-md bg-[#0D1110] border border-[#222A27] mb-3">
          <div className="h-9 w-9 rounded-full bg-[#151A18] border border-[#222A27] flex items-center justify-center shrink-0">
            {rol === "admin_nodexa" ? (
              <Shield className="h-4 w-4 text-[#16D39A]" />
            ) : (
              <User className="h-4 w-4 text-[#A6AEAA]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#F3F5F4] truncate">{nombreComercio}</p>
            <p className="text-[10px] text-[#737C78] truncate">{email}</p>
          </div>
        </div>

        <button
          onClick={handleCerrarSesion}
          disabled={isPending}
          className="flex items-center gap-3 px-4 rounded-md text-[#EF4444] hover:bg-[#EF4444]/10 transition-all duration-150 min-h-[44px] w-full text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444] disabled:opacity-50"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="text-sm">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <ToastProvider>
      <div className="flex h-screen bg-[#090B0B] text-[#F3F5F4] overflow-hidden">
        {/* Sidebar Desktop */}
        <aside className="hidden md:block w-64 border-r border-[#222A27] shrink-0 h-full">
          {contenidoSidebar}
        </aside>

        {/* Mobile Sidebar Modal Overlay */}
        {menuMovilAbierto && (
          <div className="fixed inset-0 z-50 flex md:hidden bg-[#090B0B]/80 backdrop-blur-sm transition-opacity duration-200">
            <div className="relative flex flex-col w-72 h-full border-r border-[#222A27]">
              <div className="absolute top-4 right-4 z-50">
                <button
                  onClick={() => setMenuMovilAbierto(false)}
                  className="flex items-center justify-center h-11 w-11 rounded-md bg-[#111615] border border-[#222A27] text-[#A6AEAA] hover:text-[#F3F5F4] outline-none focus-visible:ring-2 focus-visible:ring-[#16D39A]"
                  aria-label="Cerrar menú"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="h-full">
                {contenidoSidebar}
              </div>
            </div>
            <div className="flex-1" onClick={() => setMenuMovilAbierto(false)} />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Topbar */}
          <header className="h-16 border-b border-[#222A27] bg-[#0D1110] flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMenuMovilAbierto(true)}
                className="flex md:hidden items-center justify-center h-11 w-11 rounded-md bg-[#111615] border border-[#222A27] text-[#A6AEAA] hover:text-[#F3F5F4] outline-none focus-visible:ring-2 focus-visible:ring-[#16D39A]"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex flex-col">
                <span className="text-xs text-[#737C78] font-medium tracking-wide uppercase">
                  Panel Operativo
                </span>
                <span className="text-sm font-semibold text-[#F3F5F4] truncate">
                  {nombreComercio}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Quick module indicator badges for merchant */}
              {rol === "comerciante" && (
                <div className="hidden sm:flex items-center gap-2">
                  {modulosActivos.fiados && (
                    <span className="text-[10px] bg-[#16D39A]/10 border border-[#16D39A]/20 text-[#16D39A] px-2 py-0.5 rounded">
                      Fiados
                    </span>
                  )}
                  {modulosActivos.devoluciones && (
                    <span className="text-[10px] bg-[#16D39A]/10 border border-[#16D39A]/20 text-[#16D39A] px-2 py-0.5 rounded">
                      Devoluciones
                    </span>
                  )}
                  {modulosActivos.catalogo_web && (
                    <span className="text-[10px] bg-[#16D39A]/10 border border-[#16D39A]/20 text-[#16D39A] px-2 py-0.5 rounded">
                      Web
                    </span>
                  )}
                </div>
              )}
              <div className="text-xs text-[#A6AEAA] font-mono bg-[#111615] border border-[#222A27] px-3 py-1.5 rounded-md">
                {email}
              </div>
            </div>
          </header>

          {/* Dynamic page content */}
          <main className="flex-1 overflow-y-auto bg-[#090B0B] relative">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

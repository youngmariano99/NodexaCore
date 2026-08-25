import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { EditorPersonalizacionDiseno } from "./EditorPersonalizacionDiseno";

export const metadata: Metadata = {
  title: "Personalizar Diseño & Vidriera — Nodexa Core",
};

export default async function PersonalizarCatalogoWebPage() {
  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("cliente_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!usuario || !usuario.cliente_id) {
    redirect("/login");
  }

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("cliente_id, slug, logo_url, color_primario, plantilla_activa, configuracion_plantilla")
    .eq("cliente_id", usuario.cliente_id)
    .maybeSingle();

  if (error || !cliente) {
    notFound();
  }

  const configuracionInicial = {
    plantillaActiva: cliente.plantilla_activa ?? "basica",
    colorPrimario: cliente.color_primario ?? "#16D39A",
    logoUrl: cliente.logo_url ?? null,
  };

  return (
    <EditorPersonalizacionDiseno
      clienteSlug={cliente.slug}
      configuracionInicial={configuracionInicial}
    />
  );
}

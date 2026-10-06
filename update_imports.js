const fs = require('fs');
let c = fs.readFileSync('src/app/(app)/productos/nuevo/BuscadorInsumos.tsx', 'utf8');
c = c.replace('import { crearClienteSupabaseCliente } from "@/lib/supabase/client";', 'import { crearClienteSupabaseNavegador } from "@/lib/supabase/client";');
c = c.replace('crearClienteSupabaseCliente()', 'crearClienteSupabaseNavegador()');
c = c.replace('import { CLASES_CAMPO_BASE } from "@/components/ui/InputBase";', '');
c = c.replace('', 'flex h-11 w-full rounded-md border border-[#222A27] bg-[#090B0B] px-3 py-2 text-sm text-[#F3F5F4] outline-none transition-colors placeholder:text-[#A6AEAA] focus:border-[#16D39A] focus:ring-1 focus:ring-[#16D39A] disabled:cursor-not-allowed disabled:opacity-50');
fs.writeFileSync('src/app/(app)/productos/nuevo/BuscadorInsumos.tsx', c, 'utf8');

c = fs.readFileSync('src/app/(app)/productos/nuevo/Paso2RecetaInsumos.tsx', 'utf8');
c = c.replace('import { CLASES_CAMPO_BASE } from "@/components/ui/InputBase";', '');
c = c.replace('', 'flex h-11 w-full rounded-md border border-[#222A27] bg-[#090B0B] px-3 py-2 text-sm text-[#F3F5F4] outline-none transition-colors placeholder:text-[#A6AEAA] focus:border-[#16D39A] focus:ring-1 focus:ring-[#16D39A] disabled:cursor-not-allowed disabled:opacity-50');
fs.writeFileSync('src/app/(app)/productos/nuevo/Paso2RecetaInsumos.tsx', c, 'utf8');

c = fs.readFileSync('src/app/(app)/productos/nuevo/Paso3CostosMargen.tsx', 'utf8');
c = c.replace('import { CLASES_CAMPO_BASE } from "@/components/ui/InputBase";', '');
c = c.replace('', 'flex h-11 w-full rounded-md border border-[#222A27] bg-[#090B0B] px-3 py-2 text-sm text-[#F3F5F4] outline-none transition-colors placeholder:text-[#A6AEAA] focus:border-[#16D39A] focus:ring-1 focus:ring-[#16D39A] disabled:cursor-not-allowed disabled:opacity-50');
fs.writeFileSync('src/app/(app)/productos/nuevo/Paso3CostosMargen.tsx', c, 'utf8');

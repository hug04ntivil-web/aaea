export type ItemEstado =
  | "Presenta" | "No Presenta" | "Bueno" | "Malo"
  | "Con Daño" | "Sin Daño" | "N/A" | "Normal" | "Anormal"
  | "Encendido" | "No Encendido"
  | "Funciona" | "No Funciona" | "A nivel" | "Bajo nivel"

export interface InspectionItem {
  key: string
  label: string
  section: 1 | 2 | 3
  subsection: string
  estados: ItemEstado[]
  hasObservaciones?: boolean
  hasVidaUtil?: boolean
  sortOrder: number
}

export const INSPECTION_ITEMS: InspectionItem[] = [
  // ── SECCIÓN 1: INSPECCIÓN VISUAL ──────────────────────────────
  // 1.1 Inspección interna
  { key: "airbag", label: "Airbag", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta"], hasObservaciones: true, sortOrder: 1 },
  { key: "testigo_airbag", label: "Testigo Airbag", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta", "Encendido", "No Encendido"], hasObservaciones: true, sortOrder: 2 },
  { key: "tablero_instrumentos", label: "Tablero de instrumentos", section: 1, subsection: "1.1 Inspección interna", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 3 },
  { key: "testigo_check_engine", label: "Testigo Check engine", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta", "Encendido", "No Encendido"], hasObservaciones: true, sortOrder: 4 },
  { key: "abs", label: "ABS", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta"], hasObservaciones: true, sortOrder: 5 },
  { key: "testigo_abs", label: "Testigo ABS", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta", "Encendido", "No Encendido"], hasObservaciones: true, sortOrder: 6 },
  { key: "tapiz_delantera", label: "Tapiz zona delantera (habitáculo)", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta", "Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 7 },
  { key: "tapiz_trasero", label: "Tapiz zona asientos traseros", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta", "Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 8 },
  { key: "tapiz_carga", label: "Tapiz zona de carga", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta", "Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 9 },
  { key: "calefaccion", label: "Mando de calefacción", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona"], hasObservaciones: true, sortOrder: 10 },
  { key: "cinturon_seguridad", label: "Cinturón de seguridad", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona"], hasObservaciones: true, sortOrder: 11 },
  { key: "velocidad_crucero", label: "Velocidad crucero", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta", "N/A"], hasObservaciones: true, sortOrder: 12 },
  { key: "tercera_corrida", label: "Tercera corrida de asientos", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta", "N/A"], hasObservaciones: false, sortOrder: 13 },
  { key: "asientos_abatibles", label: "Asientos trasero abatible", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta"], hasObservaciones: false, sortOrder: 14 },
  { key: "guantera", label: "Guantera", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta", "Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 15 },
  { key: "bocina", label: "Bocina", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona"], hasObservaciones: false, sortOrder: 16 },
  { key: "gata", label: "Gata", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta"], hasObservaciones: false, sortOrder: 17 },
  { key: "extintor", label: "Extintor", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta"], hasObservaciones: false, sortOrder: 18 },
  { key: "kit_seguridad", label: "Kit de seguridad", section: 1, subsection: "1.1 Inspección interna", estados: ["Presenta", "No Presenta"], hasObservaciones: false, sortOrder: 19 },
  // 1.2 Accesorios
  { key: "aire_acondicionado", label: "Aire acondicionado/Climatizador", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona"], hasObservaciones: true, sortOrder: 20 },
  { key: "cierre_interior", label: "Cierre centralizado desde interior", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona"], hasObservaciones: false, sortOrder: 21 },
  { key: "cierre_distancia", label: "Cierre centralizado de distancia", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona"], hasObservaciones: false, sortOrder: 22 },
  { key: "cierre_piloto", label: "Cierre centralizado puerta piloto", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona"], hasObservaciones: false, sortOrder: 23 },
  { key: "navegador", label: "Navegador incorporado", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "N/A"], hasObservaciones: false, sortOrder: 24 },
  { key: "parlantes", label: "Estado de los parlantes (Sonido)", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona"], hasObservaciones: false, sortOrder: 25 },
  { key: "techo_corredizo", label: "Techo corredizo", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "N/A"], hasObservaciones: false, sortOrder: 26 },
  { key: "techo_panoramico", label: "Techo panorámico", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "N/A"], hasObservaciones: false, sortOrder: 27 },
  { key: "alzavidrios", label: "Alzavidrios", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona"], hasObservaciones: false, sortOrder: 28 },
  { key: "tapa_equipaje", label: "Tapa equipaje", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "N/A"], hasObservaciones: false, sortOrder: 29 },
  { key: "copia_llave", label: "Copia de llave", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta"], hasObservaciones: false, sortOrder: 30 },
  { key: "radio", label: "Radio", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona"], hasObservaciones: false, sortOrder: 31 },
  { key: "radio_touch", label: "Radio pantalla Touch", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona", "N/A"], hasObservaciones: false, sortOrder: 32 },
  { key: "espejo_interior", label: "Espejo retrovisor interior", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "Sin Daño", "Con Daño"], hasObservaciones: false, sortOrder: 33 },
  { key: "bluetooth", label: "Bluetooth", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "N/A"], hasObservaciones: false, sortOrder: 34 },
  { key: "cd_mp3", label: "Reproductor de CD/MP3", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "N/A"], hasObservaciones: false, sortOrder: 35 },
  { key: "camara_retroceso", label: "Cámara de Retroceso", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "N/A"], hasObservaciones: false, sortOrder: 36 },
  { key: "isofix", label: "Anclaje Isofix", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "N/A"], hasObservaciones: false, sortOrder: 37 },
  { key: "sensores_estac", label: "Sensores de estacionamiento", section: 1, subsection: "1.2 Inspección accesorios", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona", "N/A"], hasObservaciones: false, sortOrder: 38 },
  // 1.3 Inspección externa
  { key: "neblineros", label: "Neblineros", section: 1, subsection: "1.3 Inspección externa", estados: ["Presenta", "No Presenta", "Sin Daño", "Con Daño", "N/A"], hasObservaciones: true, sortOrder: 39 },
  { key: "chapas", label: "Chapas", section: 1, subsection: "1.3 Inspección externa", estados: ["Presenta", "No Presenta", "Sin Daño", "Con Daño", "N/A"], hasObservaciones: true, sortOrder: 40 },
  { key: "focos_ext", label: "Focos", section: 1, subsection: "1.3 Inspección externa", estados: ["Presenta", "No Presenta", "Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 41 },
  { key: "luces_senalizador", label: "Luces señalizador y patente", section: 1, subsection: "1.3 Inspección externa", estados: ["Presenta", "No Presenta", "Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 42 },
  { key: "antena", label: "Antena", section: 1, subsection: "1.3 Inspección externa", estados: ["Presenta", "No Presenta", "N/A"], hasObservaciones: false, sortOrder: 43 },
  { key: "lavaparabrisas", label: "Lavaparabrisas", section: 1, subsection: "1.3 Inspección externa", estados: ["Presenta", "No Presenta", "Funciona", "No Funciona"], hasObservaciones: false, sortOrder: 44 },
  { key: "lavafaros", label: "Lavafaros", section: 1, subsection: "1.3 Inspección externa", estados: ["Presenta", "No Presenta", "N/A"], hasObservaciones: false, sortOrder: 45 },

  // ── SECCIÓN 2: CARROCERÍA ─────────────────────────────────────
  // 2.1 Zona frontal
  { key: "capot", label: "Capot", section: 2, subsection: "2.1 Zona frontal", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 1 },
  { key: "parachoques_del", label: "Parachoques", section: 2, subsection: "2.1 Zona frontal", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 2 },
  { key: "parabrisas_del", label: "Parabrisas", section: 2, subsection: "2.1 Zona frontal", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 3 },
  { key: "focos_opticos", label: "Focos / ópticos", section: 2, subsection: "2.1 Zona frontal", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 4 },
  { key: "mascara", label: "Máscara", section: 2, subsection: "2.1 Zona frontal", estados: ["Sin Daño", "Con Daño", "N/A"], hasObservaciones: true, sortOrder: 5 },
  { key: "molduras_del", label: "Molduras", section: 2, subsection: "2.1 Zona frontal", estados: ["Sin Daño", "Con Daño", "N/A"], hasObservaciones: true, sortOrder: 6 },
  { key: "emblema", label: "Emblema", section: 2, subsection: "2.1 Zona frontal", estados: ["Sin Daño", "Con Daño"], hasObservaciones: false, sortOrder: 7 },
  { key: "techo", label: "Techo", section: 2, subsection: "2.1 Zona frontal", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 8 },
  // 2.2 Lado izquierdo
  { key: "tapabarros_izq", label: "Tapabarros delantero / trasero", section: 2, subsection: "2.2 Lado izquierdo-piloto", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 9 },
  { key: "puertas_izq", label: "Puertas", section: 2, subsection: "2.2 Lado izquierdo-piloto", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 10 },
  { key: "ventanas_izq", label: "Ventanas / Lunetas", section: 2, subsection: "2.2 Lado izquierdo-piloto", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 11 },
  { key: "zocalo_izq", label: "Zócalo", section: 2, subsection: "2.2 Lado izquierdo-piloto", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 12 },
  { key: "molduras_izq", label: "Molduras", section: 2, subsection: "2.2 Lado izquierdo-piloto", estados: ["Sin Daño", "Con Daño", "N/A"], hasObservaciones: false, sortOrder: 13 },
  { key: "espejo_izq", label: "Espejo retrovisor exterior", section: 2, subsection: "2.2 Lado izquierdo-piloto", estados: ["Sin Daño", "Con Daño"], hasObservaciones: false, sortOrder: 14 },
  { key: "pilares_izq", label: "Pilares", section: 2, subsection: "2.2 Lado izquierdo-piloto", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 15 },
  { key: "pickup_izq", label: "Pickup (sólo camionetas)", section: 2, subsection: "2.2 Lado izquierdo-piloto", estados: ["Sin Daño", "Con Daño", "N/A"], hasObservaciones: true, sortOrder: 16 },
  // 2.3 Zona posterior
  { key: "portalon", label: "Portalón / puertas / maleta", section: 2, subsection: "2.3 Zona posterior", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 17 },
  { key: "parachoque_post", label: "Parachoque", section: 2, subsection: "2.3 Zona posterior", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 18 },
  { key: "parabrisas_post", label: "Parabrisas posterior", section: 2, subsection: "2.3 Zona posterior", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 19 },
  { key: "molduras_post", label: "Molduras", section: 2, subsection: "2.3 Zona posterior", estados: ["Sin Daño", "Con Daño", "N/A"], hasObservaciones: false, sortOrder: 20 },
  // 2.4 Lado derecho
  { key: "tapabarros_der", label: "Tapabarros delantero / trasero", section: 2, subsection: "2.4 Lado derecho-copiloto", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 21 },
  { key: "puertas_der", label: "Puertas", section: 2, subsection: "2.4 Lado derecho-copiloto", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 22 },
  { key: "ventanas_der", label: "Ventanas / Lunetas", section: 2, subsection: "2.4 Lado derecho-copiloto", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 23 },
  { key: "zocalo_der", label: "Zócalo", section: 2, subsection: "2.4 Lado derecho-copiloto", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 24 },
  { key: "molduras_der", label: "Molduras", section: 2, subsection: "2.4 Lado derecho-copiloto", estados: ["Sin Daño", "Con Daño", "N/A"], hasObservaciones: false, sortOrder: 25 },
  { key: "espejo_der", label: "Espejo retrovisor exterior", section: 2, subsection: "2.4 Lado derecho-copiloto", estados: ["Sin Daño", "Con Daño"], hasObservaciones: false, sortOrder: 26 },
  { key: "pilares_der", label: "Pilares", section: 2, subsection: "2.4 Lado derecho-copiloto", estados: ["Sin Daño", "Con Daño"], hasObservaciones: true, sortOrder: 27 },
  { key: "pickup_der", label: "Pickup (sólo camionetas)", section: 2, subsection: "2.4 Lado derecho-copiloto", estados: ["Sin Daño", "Con Daño", "N/A"], hasObservaciones: true, sortOrder: 28 },
  // 2.5 Neumáticos
  { key: "neumatico_del_der", label: "Neumático delantero derecho", section: 2, subsection: "2.5 Neumáticos", estados: ["Sin Daño", "Con Daño"], hasObservaciones: false, hasVidaUtil: true, sortOrder: 29 },
  { key: "neumatico_del_izq", label: "Neumático delantero izquierdo", section: 2, subsection: "2.5 Neumáticos", estados: ["Sin Daño", "Con Daño"], hasObservaciones: false, hasVidaUtil: true, sortOrder: 30 },
  { key: "neumatico_tra_der", label: "Neumático trasero derecho", section: 2, subsection: "2.5 Neumáticos", estados: ["Sin Daño", "Con Daño"], hasObservaciones: false, hasVidaUtil: true, sortOrder: 31 },
  { key: "neumatico_tra_izq", label: "Neumático trasero izquierdo", section: 2, subsection: "2.5 Neumáticos", estados: ["Sin Daño", "Con Daño"], hasObservaciones: false, hasVidaUtil: true, sortOrder: 32 },
  { key: "neumatico_repuesto", label: "Neumático repuesto", section: 2, subsection: "2.5 Neumáticos", estados: ["Sin Daño", "Con Daño", "N/A"], hasObservaciones: false, hasVidaUtil: true, sortOrder: 33 },
  // 2.6 Llantas
  { key: "llanta_del_der", label: "Llanta delantera derecha", section: 2, subsection: "2.6 Llantas", estados: ["Sin Daño", "Con Daño"], hasObservaciones: false, sortOrder: 34 },
  { key: "llanta_del_izq", label: "Llanta delantera izquierda", section: 2, subsection: "2.6 Llantas", estados: ["Sin Daño", "Con Daño"], hasObservaciones: false, sortOrder: 35 },
  { key: "llanta_tra_der", label: "Llanta trasera derecha", section: 2, subsection: "2.6 Llantas", estados: ["Sin Daño", "Con Daño"], hasObservaciones: false, sortOrder: 36 },
  { key: "llanta_tra_izq", label: "Llanta trasera izquierda", section: 2, subsection: "2.6 Llantas", estados: ["Sin Daño", "Con Daño"], hasObservaciones: false, sortOrder: 37 },
  { key: "llantas_aleacion", label: "Llantas de aleación", section: 2, subsection: "2.6 Llantas", estados: ["Sin Daño", "Con Daño", "N/A"], hasObservaciones: false, sortOrder: 38 },

  // ── SECCIÓN 3: MECÁNICA ───────────────────────────────────────
  // 3.1 Tren motriz
  { key: "humo_visible", label: "Presencia de humo visible", section: 3, subsection: "3.1 Tren motriz", estados: ["No Presenta", "Presenta"], hasObservaciones: true, sortOrder: 1 },
  { key: "sonido_motor", label: "Sonido de motor", section: 3, subsection: "3.1 Tren motriz", estados: ["Normal", "Anormal"], hasObservaciones: true, sortOrder: 2 },
  { key: "testigo_aceite", label: "Testigo mantención / cambio de aceite", section: 3, subsection: "3.1 Tren motriz", estados: ["No Presenta", "Presenta", "Encendido", "No Encendido"], hasObservaciones: true, sortOrder: 3 },
  { key: "suspension_del", label: "Suspensión delantera", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 4 },
  { key: "suspension_tra", label: "Suspensión trasera", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 5 },
  { key: "direccion", label: "Sistema de dirección", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 6 },
  { key: "homocineticas", label: "Homocinéticas y/o eje cardán", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo", "N/A"], hasObservaciones: true, sortOrder: 7 },
  { key: "carter_aceite", label: "Cárter de aceite", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 8 },
  { key: "tapa_valvulas", label: "Tapa válvulas / empaquetadura", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 9 },
  { key: "filtro_aire", label: "Filtro de aire", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 10 },
  { key: "correas", label: "Correa(s) de accesorio(s)", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 11 },
  { key: "mangueras_refrigeracion", label: "Mangueras de refrigeración", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 12 },
  { key: "radiador", label: "Radiador", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 13 },
  { key: "deposito_expansion", label: "Depósito de expansión", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: false, sortOrder: 14 },
  { key: "bateria", label: "Batería", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 15 },
  { key: "alternador", label: "Alternador", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: false, sortOrder: 16 },
  { key: "pastillas_del", label: "Pastillas de freno delanteras", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 17 },
  { key: "pastillas_tra", label: "Pastillas y/o balatas de freno traseras", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 18 },
  { key: "discos_del", label: "Discos de freno delanteros", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 19 },
  { key: "discos_tra", label: "Discos / tambor de freno traseros", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: true, sortOrder: 20 },
  { key: "freno_estacionamiento", label: "Freno de estacionamiento", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: false, sortOrder: 21 },
  { key: "embrague", label: "Embrague vehículo detenido", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo", "N/A"], hasObservaciones: true, sortOrder: 22 },
  { key: "caja_transferencia", label: "Testigos caja transferencia (4x4)", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo", "N/A"], hasObservaciones: false, sortOrder: 23 },
  { key: "sonido_acople", label: "Sonido de acople (4x4)", section: 3, subsection: "3.1 Tren motriz", estados: ["Normal", "Anormal", "N/A"], hasObservaciones: false, sortOrder: 24 },
  { key: "paso_marchas", label: "Paso de marchas (auto detenido)", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: false, sortOrder: 25 },
  { key: "motor_partida", label: "Motor de partida", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo"], hasObservaciones: false, sortOrder: 26 },
  { key: "partida_frio", label: "Partida en frío (si aplica)", section: 3, subsection: "3.1 Tren motriz", estados: ["Bueno", "Malo", "N/A"], hasObservaciones: false, sortOrder: 27 },
  // 3.2 Niveles
  { key: "nivel_aceite_motor", label: "Aceite motor", section: 3, subsection: "3.2 Niveles", estados: ["A nivel", "Bajo nivel"], hasObservaciones: false, sortOrder: 28 },
  { key: "nivel_refrigerante", label: "Líquido refrigerante", section: 3, subsection: "3.2 Niveles", estados: ["A nivel", "Bajo nivel"], hasObservaciones: false, sortOrder: 29 },
  { key: "nivel_frenos", label: "Líquido de frenos", section: 3, subsection: "3.2 Niveles", estados: ["A nivel", "Bajo nivel"], hasObservaciones: false, sortOrder: 30 },
  { key: "nivel_direccion", label: "Líquido dirección hidráulica", section: 3, subsection: "3.2 Niveles", estados: ["A nivel", "Bajo nivel", "N/A"], hasObservaciones: false, sortOrder: 31 },
  { key: "nivel_embrague", label: "Líquido de embrague", section: 3, subsection: "3.2 Niveles", estados: ["A nivel", "Bajo nivel", "N/A"], hasObservaciones: false, sortOrder: 32 },
  { key: "nivel_trans_auto", label: "Aceite transmisión automática", section: 3, subsection: "3.2 Niveles", estados: ["A nivel", "Bajo nivel", "N/A"], hasObservaciones: false, sortOrder: 33 },
  // 3.3 Fugas
  { key: "fuga_aceite", label: "Aceite de motor", section: 3, subsection: "3.3 Fugas", estados: ["No Presenta", "Presenta"], hasObservaciones: true, sortOrder: 34 },
  { key: "fuga_refrigerante", label: "Líquido refrigerante", section: 3, subsection: "3.3 Fugas", estados: ["No Presenta", "Presenta"], hasObservaciones: true, sortOrder: 35 },
  { key: "fuga_direccion", label: "Líquido dirección hidráulica", section: 3, subsection: "3.3 Fugas", estados: ["No Presenta", "Presenta", "N/A"], hasObservaciones: false, sortOrder: 36 },
  { key: "fuga_frenos", label: "Líquido de Frenos", section: 3, subsection: "3.3 Fugas", estados: ["No Presenta", "Presenta"], hasObservaciones: false, sortOrder: 37 },
  { key: "fuga_diferencial", label: "Aceite de diferenciales", section: 3, subsection: "3.3 Fugas", estados: ["No Presenta", "Presenta", "N/A"], hasObservaciones: false, sortOrder: 38 },
  { key: "fuga_embrague", label: "Líquido hidráulico embrague", section: 3, subsection: "3.3 Fugas", estados: ["No Presenta", "Presenta", "N/A"], hasObservaciones: false, sortOrder: 39 },
  { key: "fuga_trans", label: "Aceite transmisión méc. y aut.", section: 3, subsection: "3.3 Fugas", estados: ["No Presenta", "Presenta", "N/A"], hasObservaciones: false, sortOrder: 40 },
  // 3.4 Prueba de ruta
  { key: "ruidos_ruta", label: "Ruidos o vibraciones al andar", section: 3, subsection: "3.4 Prueba de ruta", estados: ["Normal", "Anormal"], hasObservaciones: true, sortOrder: 41 },
  { key: "paso_marchas_ruta", label: "Paso de marchas (baja velocidad)", section: 3, subsection: "3.4 Prueba de ruta", estados: ["Bueno", "Malo", "N/A"], hasObservaciones: false, sortOrder: 42 },
  { key: "temperatura_func", label: "Temperatura de funcionamiento", section: 3, subsection: "3.4 Prueba de ruta", estados: ["Normal", "Anormal"], hasObservaciones: false, sortOrder: 43 },
  { key: "holguras_direccion", label: "Holguras o juegos en dirección", section: 3, subsection: "3.4 Prueba de ruta", estados: ["Normal", "Anormal"], hasObservaciones: false, sortOrder: 44 },
  { key: "suspension_ruta", label: "Funcionamiento de la suspensión", section: 3, subsection: "3.4 Prueba de ruta", estados: ["Normal", "Anormal"], hasObservaciones: false, sortOrder: 45 },
  { key: "traccion_4x4", label: "Tracción en las 4 ruedas", section: 3, subsection: "3.4 Prueba de ruta", estados: ["Normal", "Anormal", "N/A"], hasObservaciones: false, sortOrder: 46 },
]

export function getItemsBySection(section: 1 | 2 | 3) {
  return INSPECTION_ITEMS.filter(i => i.section === section)
}

export function getItemsBySubsection(subsection: string) {
  return INSPECTION_ITEMS.filter(i => i.subsection === subsection)
}

export function getSubsections(section: 1 | 2 | 3): string[] {
  return [...new Set(INSPECTION_ITEMS.filter(i => i.section === section).map(i => i.subsection))]
}

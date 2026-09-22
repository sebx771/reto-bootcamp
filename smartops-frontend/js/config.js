/**
 * SmartOps SuperBrix S.A. - Módulo de Configuración Central
 * Catálogo maestro del formato industrial FO-A-MA-01
 */

// Endpoint de ingesta en Google Apps Script (Web App)
// Reemplazar con la URL del Webhook desplegado
const ENDPOINT_APPS_SCRIPT = 'https://script.google.com/macros/s/AKfycbwHWecQojtFY_3_JP3BpP1s9qwzxNjP7j2BGAVp90DnNvpPH8wxUs_do190BVH4pQ-t1g/exec';

// Enum de Estados Operativos Industriales
const ESTADOS = Object.freeze({
  INACTIVO: 'INACTIVO',
  PRODUCCION: 'PRODUCCIÓN',
  PAUSA: 'PAUSA',
  PARO: 'PARO / NOVEDAD',
  FINALIZADO: 'FINALIZADO'
});

// Las 6 Categorías Oficiales de Paro según especificación SuperBrix FO-A-MA-01
const CATEGORIAS_OFICIALES = [
  {
    id: 'MATERIAL',
    nombre: 'Material',
    icono: 'box',
    color: '#3B82F6',
    descripcion: 'Falta o inconsistencia en materia prima / corte'
  },
  {
    id: 'HERRAMIENTA',
    nombre: 'Herramienta',
    icono: 'wrench',
    color: '#F59E0B',
    descripcion: 'Desgaste, rotura de inserto/broca o falta de útil'
  },
  {
    id: 'FALLA_MAQUINA',
    nombre: 'Falla Máquina',
    icono: 'alert-triangle',
    color: '#EF4444',
    descripcion: 'Avería eléctrica, mecánica, husillo o neumática'
  },
  {
    id: 'SETUP',
    nombre: 'Setup / Ajuste',
    icono: 'sliders',
    color: '#8B5CF6',
    descripcion: 'Montaje de mordazas, centrado, calibración de pieza'
  },
  {
    id: 'CALIDAD',
    nombre: 'Calidad',
    icono: 'check-circle',
    color: '#EC4899',
    descripcion: 'Rechazo dimensional, acabado superficial, rebabas'
  },
  {
    id: 'INSTRUCCION',
    nombre: 'Instrucción / Planos',
    icono: 'file-text',
    color: '#10B981',
    descripcion: 'Duda en plano, falta de especificación o supervisor'
  }
];

// Causas Rápidas comunes para selección en 1 toque
const CAUSAS_RAPIDAS = [
  {
    categoriaId: 'MATERIAL',
    codigo: 'MAT-01',
    titulo: 'Materia Prima No Disponible',
    detalle: 'Esperando barra de acero o desbaste previo en bodega'
  },
  {
    categoriaId: 'MATERIAL',
    codigo: 'MAT-02',
    titulo: 'Material Fuera de Cota / Torcido',
    detalle: 'Materia prima con deformación excesiva para sujeción'
  },
  {
    categoriaId: 'HERRAMIENTA',
    codigo: 'HER-01',
    titulo: 'Inserto Desgastado / Roto',
    detalle: 'Cambio de plaquita de corte o inserto de torneado'
  },
  {
    categoriaId: 'HERRAMIENTA',
    codigo: 'HER-02',
    titulo: 'Falta de Broca / Fresa Especial',
    detalle: 'Herramienta en afilado o esperando entrega en pañol'
  },
  {
    categoriaId: 'FALLA_MAQUINA',
    codigo: 'MAQ-01',
    titulo: 'Sobrecalentamiento / Alarma CNC',
    detalle: 'Parada por sensor térmico o alarma de servomotor'
  },
  {
    categoriaId: 'FALLA_MAQUINA',
    codigo: 'MAQ-02',
    titulo: 'Fuga Neumática / Hidráulica',
    detalle: 'Baja presión de lubricante o pérdida en mordaza neumática'
  },
  {
    categoriaId: 'SETUP',
    codigo: 'SET-01',
    titulo: 'Montaje y Centrado de Pieza',
    detalle: 'Alineación con reloj comparador en plato de torno'
  },
  {
    categoriaId: 'SETUP',
    codigo: 'SET-02',
    titulo: 'Puesta a Punto de Programa',
    detalle: 'Validación en seco o paso a paso de código G-Code'
  },
  {
    categoriaId: 'CALIDAD',
    codigo: 'CAL-01',
    titulo: 'Desviación Dimensional',
    detalle: 'Pieza con tolerancia fuera de plano en inspección'
  },
  {
    categoriaId: 'INSTRUCCION',
    codigo: 'INS-01',
    titulo: 'Duda Técnica en Plano Mecánico',
    detalle: 'Falta cota o símbolo de rugosidad; esperando ingeniería'
  }
];

// Catálogo de Centros de Trabajo (SuperBrix Taller)
const CENTROS_DE_TRABAJO = [
  { id: 'CT-TORNO-01', nombre: 'Torno CNC Mazak 01', tipo: 'Torneado' },
  { id: 'CT-TORNO-02', nombre: 'Torno Paralelo Colchester', tipo: 'Convencional' },
  { id: 'CT-FRESA-01', nombre: 'Centro Mecanizado Haas VF-3', tipo: 'Fresado' },
  { id: 'CT-CORTE-01', nombre: 'Sierra de Cinta Behringer', tipo: 'Corte' },
  { id: 'CT-SOLD-01',  nombre: 'Estación Soldadura TIG 01', tipo: 'Soldadura' },
  { id: 'CT-ENSAM-01', nombre: 'Mesa Ensamble Mecánico', tipo: 'Ajuste' }
];

// Operarios de Taller
const OPERARIOS_CATALOGO = [
  { id: 'OPR-104', nombre: 'Carlos Mendoza', turno: 'Turno A (Mañana)' },
  { id: 'OPR-205', nombre: 'Andrés Rivas', turno: 'Turno A (Mañana)' },
  { id: 'OPR-312', nombre: 'Javier Gómez', turno: 'Turno B (Tarde)' },
  { id: 'OPR-418', nombre: 'Mauricio Peña', turno: 'Turno B (Tarde)' }
];

// Órdenes de Producción Demo para pruebas y fallback
const ORDENES_DEMO = [
  {
    codigo: 'OP-60211',
    descripcion: 'Eje Principal Molino Arrocero SB-50',
    plano: 'PL-MOL-4402',
    cantidad: 4,
    material: 'Acero AISI 4140 Bonificado'
  },
  {
    codigo: 'OP-70442',
    descripcion: 'Brida Acople Entrada 8" Pulgada',
    plano: 'PL-BRI-1120',
    cantidad: 12,
    material: 'Acero Inoxidable AISI 304'
  },
  {
    codigo: 'OP-50103',
    descripcion: 'Corona Dentada Mod 6 Z-48',
    plano: 'PL-COR-9931',
    cantidad: 2,
    material: 'Acero SAE 8620 Cementable'
  },
  {
    codigo: 'OP-80315',
    descripcion: 'Eje Mezclador Industrial Doble Cinta',
    plano: 'PL-MEZ-3301',
    cantidad: 1,
    material: 'AISI 316L Alimentario'
  }
];

// Exportación global para navegadores sin módulos bundler
window.SmartOpsConfig = {
  ENDPOINT_APPS_SCRIPT,
  ESTADOS,
  CATEGORIAS_OFICIALES,
  CAUSAS_RAPIDAS,
  CENTROS_DE_TRABAJO,
  OPERARIOS_CATALOGO,
  ORDENES_DEMO
};

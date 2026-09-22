import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { repository, matchPerson } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { 
  Card, CardContent, CardHeader, CardTitle, Input,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Button
} from '@/src/components/ui';
import { 
  Users, Briefcase, CalendarX, Tractor, Activity, 
  Award, TrendingUp, AlertTriangle, UserX, Stethoscope, 
  CheckCircle2, Layers, Calendar, ChevronRight, Search,
  ExternalLink, Check, Eye, ListFilter, UserMinus, ArrowRightLeft,
  Clock, ShieldAlert, Send, BellRing
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import { 
  getSupervisorsReportingStatus, 
  saveNotification, 
  triggerSystemNotification, 
  getColombiaDateString 
} from '../shared/notificationService';
import { ADMIN_PERSONNEL_NAMES, isAdmin, isOperative, isReubicado } from '../shared/personnelClassification';

export { ADMIN_PERSONNEL_NAMES, isAdmin, isOperative, isReubicado };

// Tooltip de alto contraste con fondo blanco nítido y texto oscuro para evitar que letras coincidan con fondos oscuros
const CustomPieTooltip = ({ active, payload, unit = 'pers.' }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const fill = item.payload?.fill || item.color || '#15803D';
    return (
      <div className="bg-white px-3.5 py-2.5 rounded-xl shadow-xl border border-gray-200 text-xs z-50 pointer-events-none">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: fill }} />
          <span className="font-extrabold text-gray-900">{item.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-gray-600">
          <span>Cantidad:</span>
          <strong className="text-gray-900 font-mono font-bold">{item.value} {unit}</strong>
        </div>
      </div>
    );
  }
  return null;
};

// Componente para gráficos de torta / donut con leyenda organizada en lista vertical limpia
interface DonutWithLegendListProps {
  data: Array<{ name: string; value: number; fill: string; payload?: any }>;
  unit?: string;
  totalLabel?: string;
  emptyMessage: string;
  onItemClick?: (item: any) => void;
  actionHint?: string;
}

const DonutWithLegendList = ({
  data,
  unit = 'pers.',
  totalLabel = 'total',
  emptyMessage,
  onItemClick,
  actionHint = 'Ver personas'
}: DonutWithLegendListProps) => {
  const total = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

  if (data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-sm text-gray-400 font-medium">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 py-1">
      {/* Donut Chart with Total in Center */}
      <div className="relative w-full sm:w-5/12 flex items-center justify-center">
        <div className="w-full h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={78}
                paddingAngle={3}
                cursor={onItemClick ? "pointer" : "default"}
                onClick={(entry) => onItemClick && onItemClick(entry)}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip unit={unit} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Centro del Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
          <span className="text-2xl font-black text-forest-950 leading-tight">{total}</span>
          <span className="text-[10px] font-semibold text-gray-500">{totalLabel}</span>
        </div>
      </div>

      {/* Series Legend Organized as a Clean Vertical List */}
      <div className="w-full sm:w-7/12 flex flex-col justify-center">
        <div className="max-h-[230px] overflow-y-auto space-y-1.5 pr-1.5">
          {data.map((item) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div
                key={item.name}
                onClick={() => onItemClick && onItemClick(item)}
                className={`flex items-center justify-between p-2 px-2.5 rounded-xl border transition-all text-xs ${
                  onItemClick
                    ? 'bg-gray-50/90 hover:bg-forest-50/60 hover:border-forest-200 cursor-pointer group shadow-2xs'
                    : 'bg-gray-50/70 border-gray-100'
                }`}
                title={onItemClick ? `${actionHint} para ${item.name}` : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="font-bold text-gray-800 truncate group-hover:text-forest-950 transition-colors">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-gray-600 font-mono text-[11px]">
                    {item.value} <span className="text-[10px] text-gray-500 font-sans">{unit}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-white text-forest-950 border border-gray-200 shadow-2xs">
                    {pct}%
                  </span>
                  {onItemClick && (
                    <ChevronRight size={13} className="text-gray-400 group-hover:text-forest-800 group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const { catalogs, loading } = useCatalogs();
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  const [absencesRange, setAbsencesRange] = useState<'day' | 'month'>('month');

  const [programmings, setProgrammings] = useState<any[]>([]);
  const [machineries, setMachineries] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);

  useEffect(() => {
    const filters: any = { date };
    if (user?.role === 'SUPERVISOR') filters.supervisorId = user.idSupervisor;
    const unsub1 = repository.subscribeProgramming(filters, setProgrammings);
    const unsub2 = repository.subscribeMachinery(filters, setMachineries);
    
    // Suscripción de inasistencias del mes para que el filtro mensual incluya todos los días
    const monthFilter: any = { month: date.substring(0, 7) };
    if (user?.role === 'SUPERVISOR') monthFilter.supervisorId = user.idSupervisor;
    const unsub3 = repository.subscribeAbsences(monthFilter, setAbsences);
    
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [date, user]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-forest-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-forest-900 font-medium text-sm">Cargando tablero táctico...</p>
      </div>
    </div>
  );

  const filteredProgrammings = programmings.filter(p => p.status === 'CONFIRMADA');
  const filteredMachineries = machineries;
  const filteredAbsences = absences.filter(a => a.date === date);
  const isTerminationNovelty = (tipo?: string) => {
    if (!tipo) return false;
    const t = tipo.toUpperCase().trim();
    return t === 'RENUNCIA' || t === 'TERMINACION_CONTRATO' || t === 'DESPIDO' || t === 'RETIRO';
  };

  const isUnjustified = (reason?: string) => {
    if (!reason) return true;
    const r = reason.trim().toLowerCase();
    if (r.includes('incapacidad') || r.includes('vacacion') || r.includes('permiso') || r.includes('calamidad') || r.includes('licencia') || r.includes('suspensi')) {
      return false;
    }
    return true;
  };

  const NovedadesPanel = () => {
    const activeNovedades = (catalogs.personnelNovelties || []).filter((n: any) => {
      if (isTerminationNovelty(n.tipo)) {
        return n.fechaInicio === date;
      }
      return n.fechaInicio <= date && (n.fechaFin >= date || n.fechaFin === 'N/A');
    });

    if (activeNovedades.length === 0) return null;

    return (
      <Card className="border-amber-200/80 shadow-sm bg-gradient-to-r from-amber-50/50 via-amber-50/20 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between text-amber-900">
            <span className="flex items-center gap-2">
              <CalendarX size={18} className="text-amber-600" /> Novedades Activas del Día
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {activeNovedades.length} Novedad{activeNovedades.length > 1 ? 'es' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activeNovedades.map((n: any) => {
              const isTerm = isTerminationNovelty(n.tipo);
              return (
                <div key={n.id} className="p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-amber-200/60 shadow-xs flex justify-between items-center hover:border-amber-400 transition-colors">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{n.personaNombreFuente}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                        isTerm ? 'bg-red-100 text-red-800 border border-red-200' :
                        n.tipo === 'INCAPACIDAD' ? 'bg-teal-100 text-teal-800' :
                        n.tipo === 'VACACIONES' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {n.tipo}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        {isTerm ? `Fecha: ${n.fechaInicio} (Fin: N/A - Retiro)` : `${n.fechaInicio} al ${n.fechaFin}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const DirectivoDashboard = () => {
    const navigate = useNavigate();
    const [unprogrammedSearch, setUnprogrammedSearch] = useState('');
    const [supervisorSearch, setSupervisorSearch] = useState('');
    const [broadcastAlertSuccess, setBroadcastAlertSuccess] = useState<string | null>(null);
    const [selectedDetailModal, setSelectedDetailModal] = useState<'inasistencias' | 'incapacidades' | 'permisos' | 'reubicados' | null>(null);
    const [detailSearch, setDetailSearch] = useState('');
    const [permisosFilterTab, setPermisosFilterTab] = useState<'all' | 'vacaciones' | 'permisos'>('all');

    const supervisorsReportingList = useMemo(() => {
      return getSupervisorsReportingStatus(catalogs.supervisors || [], programmings || []);
    }, [catalogs.supervisors, programmings]);

    const filteredSupervisorsReporting = useMemo(() => {
      if (!supervisorSearch.trim()) return supervisorsReportingList;
      const q = supervisorSearch.trim().toLowerCase();
      return supervisorsReportingList.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }, [supervisorsReportingList, supervisorSearch]);

    const pendingSupervisorsCount = supervisorsReportingList.filter(s => !s.hasProgrammedToday).length;
    const readySupervisorsCount = supervisorsReportingList.length - pendingSupervisorsCount;

    const handleBroadcastEmergency = () => {
      const pendingSups = supervisorsReportingList.filter(s => !s.hasProgrammedToday);
      if (pendingSups.length === 0) {
        alert('¡Excelente! Todos los supervisores ya cuentan con programación confirmada para hoy.');
        return;
      }

      const todayStr = getColombiaDateString(0);
      const title = '🚨 ALERTA DE EMERGENCIA: Programación Diaria Requerida';
      const body = `Atención: Aún no registras la programación diaria de hoy (${todayStr}). Es información relevante que se debe actualizar a diario para el inicio de labores.`;

      // Guardar in-app
      saveNotification({
        id: `broadcast_emergencia_${Date.now()}`,
        title,
        body,
        date: new Date().toISOString(),
        type: 'EMERGENCIA_ADMIN',
        targetDate: todayStr,
        read: false,
        actionUrl: '/programming/new',
        level: 'emergency'
      });

      // Disparar en dispositivos / sistema
      triggerSystemNotification(title, {
        body,
        actionUrl: '/programming/new'
      });

      setBroadcastAlertSuccess(`¡Alerta de emergencia emitida al sistema y dispositivos para ${pendingSups.length} supervisores pendientes!`);
      setTimeout(() => setBroadcastAlertSuccess(null), 6000);
    };

    const unprogrammedPersonnel = useMemo(() => {
      const activeProgrammableList = (catalogs.personnel || []).filter((p: any) => p.active !== false && (isOperative(p) || isReubicado(p)));
      
      return activeProgrammableList.filter((p: any) => {
        // Una programación pendiente no cubre al trabajador hasta confirmarse.
        const inProg = programmings.some((prog: any) => 
          prog.date === date &&
          prog.status === 'CONFIRMADA' &&
          Array.isArray(prog.personnelIds) && 
          prog.personnelIds.some((pId: any) => matchPerson(p, pId))
        );
        if (inProg) return false;

        // 2. ¿Está en maquinaria en la fecha?
        const inMach = machineries.some((m: any) => 
          m.date === date &&
          m.status !== 'CANCELADA' && 
          (
            matchPerson(p, m.operatorId) || 
            matchPerson(p, m.operatorName) || 
            matchPerson(p, m.operator_id) || 
            matchPerson(p, m.operator_name)
          )
        );
        if (inMach) return false;

        // 3. ¿Tiene inasistencia registrada en la fecha?
        const inAbs = filteredAbsences.some((a: any) => 
          a.status !== 'CANCELADA' && 
          (
            matchPerson(p, a.personnelId) || 
            matchPerson(p, a.personnelDoc) || 
            matchPerson(p, a.personnelName) ||
            matchPerson(p, a.personnel_id) || 
            matchPerson(p, a.personnel_doc) || 
            matchPerson(p, a.personnel_name)
          )
        );
        if (inAbs) return false;

        // 4. ¿Tiene novedad activa en la fecha?
        const inNov = (catalogs.personnelNovelties || []).some((n: any) => {
          const isMatch = matchPerson(p, n.personaDocumento) || matchPerson(p, n.personaId) || matchPerson(p, n.personaNombre);
          if (!isMatch) return false;
          if (isTerminationNovelty(n.tipo)) return n.fechaInicio === date;
          return n.fechaInicio <= date && (n.fechaFin >= date || n.fechaFin === 'N/A');
        });
        if (inNov) return false;

        return true;
      }).sort((a: any, b: any) => (a.name || a.nombreCompleto || '').localeCompare(b.name || b.nombreCompleto || '', 'es', { numeric: true }));
    }, [catalogs.personnel, catalogs.personnelNovelties, programmings, machineries, filteredAbsences, date]);

    const filteredUnprogrammed = useMemo(() => {
      if (!unprogrammedSearch.trim()) return unprogrammedPersonnel;
      const q = unprogrammedSearch.trim().toLowerCase();
      return unprogrammedPersonnel.filter((p: any) => {
        const name = (p.name || p.nombreCompleto || '').toLowerCase();
        const doc = (p.documento || '').toString().toLowerCase();
        const cargo = (p.jobTitle || p.laborCargo || '').toLowerCase();
        const cuadrilla = (p.cuadrilla || p.actividadCuadrilla || p.zona || '').toLowerCase();
        return name.includes(q) || doc.includes(q) || cargo.includes(q) || cuadrilla.includes(q);
      });
    }, [unprogrammedPersonnel, unprogrammedSearch]);

    const stats = useMemo(() => {
      // 1. Total Personas en Catálogo (activas y existentes)
      const totalPersonnelList = (catalogs.personnel || []).filter((p: any) => p.active !== false);
      const totalPeople = totalPersonnelList.length;

      // 2. Personal Reubicado (no productivo, descontado de campo)
      const reubicadosList = totalPersonnelList.filter((p: any) => isReubicado(p));
      const reubicadosTotal = reubicadosList.length;

      // 3. Personal Administrativo y de Supervisión (oficina + supervisores)
      const adminList = totalPersonnelList.filter((p: any) => isAdmin(p));
      const adminTotal = adminList.length;

      // 4. Total Operativos Teóricos en nómina (Campo Productivo)
      const activeOperativesList = totalPersonnelList.filter((p: any) => isOperative(p));
      const operativesPayrollTotal = activeOperativesList.length;

      const reubicadosDetailList = reubicadosList.map((p: any) => ({
        id: p.id,
        key: p.documento || p.id,
        name: p.name || p.nombreCompleto || 'Colaborador',
        documento: p.documento || 'N/A',
        cargo: p.jobTitle || p.laborCargo || 'Sin cargo',
        cuadrilla: p.cuadrilla || p.actividadCuadrilla || p.zona || 'Sin asignar',
        tipo: 'Reubicado no productivo',
        observaciones: p.observaciones || 'Personal reubicado descontado de campo'
      }));

      // Novedades e inasistencias activas del día
      const activeNovedades = (catalogs.personnelNovelties || []).filter((n: any) => {
        if (isTerminationNovelty(n.tipo)) {
          return n.fechaInicio === date;
        }
        return n.fechaInicio <= date && (n.fechaFin >= date || n.fechaFin === 'N/A');
      });

      const getPersonDetails = (docOrId: any, fallbackName?: string) => {
        const p = (catalogs.personnel || []).find((per: any) => 
          matchPerson(per, docOrId) || 
          per.id === docOrId || 
          per.documento === docOrId ||
          (per.documento && docOrId && String(per.documento).trim() === String(docOrId).trim()) ||
          (fallbackName && (per.name === fallbackName || per.nombreCompleto === fallbackName))
        );
        return {
          id: p?.id || docOrId,
          name: p ? (p.name || p.nombreCompleto) : (fallbackName || 'Operario de Campo'),
          documento: p ? (p.documento || docOrId) : (docOrId || 'N/A'),
          cargo: p ? (p.jobTitle || p.laborCargo || 'Operario de Campo') : 'Operario de Campo',
          cuadrilla: p ? (p.cuadrilla || p.actividadCuadrilla || p.zona || 'Sin asignar') : 'Sin asignar',
          key: p ? (p.documento || p.id) : (docOrId || fallbackName || Math.random().toString())
        };
      };

      const processedKeys = new Set<string>();

      // 1. Vacaciones
      const vacacionesList: any[] = [];
      activeNovedades.filter((n: any) => n.tipo === 'VACACIONES').forEach((n: any) => {
        const meta = getPersonDetails(n.personaDocumento || n.personaId, n.personaNombreFuente || n.personaNombre);
        if (!processedKeys.has(meta.key)) {
          processedKeys.add(meta.key);
          vacacionesList.push({
            id: n.id || `vac-${meta.key}`,
            key: meta.key,
            name: meta.name,
            documento: meta.documento,
            cargo: meta.cargo,
            cuadrilla: meta.cuadrilla,
            tipo: 'Vacaciones',
            category: 'vacaciones',
            fechaInicio: n.fechaInicio,
            fechaFin: n.fechaFin,
            dias: n.dias || 1,
            observacion: n.observacion || 'Vacaciones aprobadas',
            source: 'novedades'
          });
        }
      });

      filteredAbsences.filter((a: any) => a.status === 'REGISTRADA' && a.reason === 'Vacaciones').forEach((a: any) => {
        const meta = getPersonDetails(a.personnelId || a.personnelDoc, a.personnelName);
        if (!processedKeys.has(meta.key)) {
          processedKeys.add(meta.key);
          vacacionesList.push({
            id: a.id || `abs-vac-${meta.key}`,
            key: meta.key,
            name: meta.name,
            documento: meta.documento,
            cargo: meta.cargo,
            cuadrilla: meta.cuadrilla,
            tipo: 'Vacaciones',
            category: 'vacaciones',
            fechaInicio: a.date,
            fechaFin: a.date,
            dias: 1,
            observacion: a.observations || 'Vacaciones reportadas',
            source: 'inasistencias'
          });
        }
      });

      // 2. Incapacidades
      const incapacidadesList: any[] = [];
      activeNovedades.filter((n: any) => n.tipo === 'INCAPACIDAD').forEach((n: any) => {
        const meta = getPersonDetails(n.personaDocumento || n.personaId, n.personaNombreFuente || n.personaNombre);
        if (!processedKeys.has(meta.key)) {
          processedKeys.add(meta.key);
          incapacidadesList.push({
            id: n.id || `incap-${meta.key}`,
            key: meta.key,
            name: meta.name,
            documento: meta.documento,
            cargo: meta.cargo,
            cuadrilla: meta.cuadrilla,
            tipo: 'Incapacidad Médica',
            diagnostico: n.diagnostico || n.observacion || 'Incapacidad médica general',
            fechaInicio: n.fechaInicio,
            fechaFin: n.fechaFin,
            dias: n.dias || 1,
            observacion: n.observacion || 'Registrado en Novedades de Nómina',
            source: 'novedades'
          });
        }
      });

      filteredAbsences.filter((a: any) => a.status === 'REGISTRADA' && a.reason === 'Incapacidad').forEach((a: any) => {
        const meta = getPersonDetails(a.personnelId || a.personnelDoc, a.personnelName);
        if (!processedKeys.has(meta.key)) {
          processedKeys.add(meta.key);
          incapacidadesList.push({
            id: a.id || `abs-incap-${meta.key}`,
            key: meta.key,
            name: meta.name,
            documento: meta.documento,
            cargo: meta.cargo,
            cuadrilla: meta.cuadrilla,
            tipo: 'Incapacidad Médica',
            diagnostico: a.observations || 'Incapacidad reportada en campo',
            fechaInicio: a.date,
            fechaFin: a.date,
            dias: 1,
            observacion: a.observations || 'Registrado en Inasistencias',
            source: 'inasistencias'
          });
        }
      });

      // 3. Permisos y Licencias
      const permisosList: any[] = [];
      activeNovedades.filter((n: any) => {
        const t = (n.tipo || '').toUpperCase().trim();
        return (
          t === 'PERMISO' ||
          t === 'PERMISO AUTORIZADO' ||
          t === 'PERMISO NO REMUNERADO' ||
          t === 'LICENCIA' ||
          t === 'CALAMIDAD' ||
          t.includes('PERMISO') ||
          t.includes('LICENCIA') ||
          t.includes('CALAMIDAD')
        );
      }).forEach((n: any) => {
        const meta = getPersonDetails(n.personaDocumento || n.personaId, n.personaNombreFuente || n.personaNombre);
        if (!processedKeys.has(meta.key)) {
          processedKeys.add(meta.key);
          const tUpper = (n.tipo || '').toUpperCase().trim();
          const tipoLabel = tUpper.includes('LICENCIA')
            ? 'Licencia'
            : tUpper.includes('CALAMIDAD')
            ? 'Calamidad Doméstica'
            : tUpper.includes('NO REMUNERADO')
            ? 'Permiso No Remunerado'
            : 'Permiso Autorizado';

          permisosList.push({
            id: n.id || `perm-${meta.key}`,
            key: meta.key,
            name: meta.name,
            documento: meta.documento,
            cargo: meta.cargo,
            cuadrilla: meta.cuadrilla,
            tipo: tipoLabel,
            category: 'permisos',
            fechaInicio: n.fechaInicio,
            fechaFin: n.fechaFin,
            dias: n.dias || 1,
            observacion: n.observacion || 'Permiso o licencia laboral autorizada',
            source: 'novedades'
          });
        }
      });

      filteredAbsences.filter((a: any) => a.status === 'REGISTRADA' && (a.reason === 'Permiso autorizado' || a.reason === 'PERMISO' || a.reason === 'Calamidad doméstica')).forEach((a: any) => {
        const meta = getPersonDetails(a.personnelId || a.personnelDoc, a.personnelName);
        if (!processedKeys.has(meta.key)) {
          processedKeys.add(meta.key);
          permisosList.push({
            id: a.id || `abs-perm-${meta.key}`,
            key: meta.key,
            name: meta.name,
            documento: meta.documento,
            cargo: meta.cargo,
            cuadrilla: meta.cuadrilla,
            tipo: a.reason === 'Calamidad doméstica' ? 'Calamidad Doméstica' : 'Permiso Autorizado',
            category: 'permisos',
            fechaInicio: a.date,
            fechaFin: a.date,
            dias: 1,
            observacion: a.observations || 'Permiso reportado',
            source: 'inasistencias'
          });
        }
      });

      // 4. Inasistencias sin justificar y suspensiones
      const inasistenciasList: any[] = [];
      activeNovedades.filter((n: any) => (n.tipo || '').toUpperCase().trim() === 'SUSPENSION').forEach((n: any) => {
        const meta = getPersonDetails(n.personaDocumento || n.personaId, n.personaNombreFuente || n.personaNombre);
        if (!processedKeys.has(meta.key)) {
          processedKeys.add(meta.key);
          inasistenciasList.push({
            id: n.id || `susp-${meta.key}`,
            key: meta.key,
            name: meta.name,
            documento: meta.documento,
            cargo: meta.cargo,
            cuadrilla: meta.cuadrilla,
            motivo: 'Suspensión',
            observacion: n.observacion || 'Suspensión disciplinaria',
            registradoPor: 'Gestión Humana',
            fecha: n.fechaInicio || date,
            source: 'novedades'
          });
        }
      });

      filteredAbsences.filter((a: any) => a.status === 'REGISTRADA' && isUnjustified(a.reason)).forEach((a: any) => {
        const meta = getPersonDetails(a.personnelId || a.personnelDoc, a.personnelName);
        if (!processedKeys.has(meta.key)) {
          processedKeys.add(meta.key);
          inasistenciasList.push({
            id: a.id || `abs-${meta.key}`,
            key: meta.key,
            name: meta.name,
            documento: meta.documento,
            cargo: meta.cargo,
            cuadrilla: meta.cuadrilla,
            motivo: a.reason || 'Sin justificar en el día',
            observacion: a.observations || 'Falta no justificada reportada en campo',
            registradoPor: a.createdByName || a.supervisorName || 'Supervisor de zona',
            fecha: a.date,
            source: 'inasistencias'
          });
        }
      });

      const permisosVacacionesList = [...vacacionesList, ...permisosList];
      const allUnavailableItems = [...inasistenciasList, ...incapacidadesList, ...vacacionesList, ...permisosList];
      const totalUnavailable = allUnavailableItems.length;
      
      // Total de personas programables en nómina (Operativos de Campo + Reubicados)
      const activeProgrammableList = totalPersonnelList.filter((p: any) => isOperative(p) || isReubicado(p));
      const programmablePayrollTotal = activeProgrammableList.length;

      // Descontar no disponibles pertenecientes al grupo operativo de campo
      const operativesUnavailableCount = allUnavailableItems.filter(item => {
        const per = totalPersonnelList.find((p: any) => matchPerson(p, item.documento) || matchPerson(p, item.key) || matchPerson(p, item.id));
        return per ? isOperative(per) : true;
      }).length;
      const availableOperativesCount = Math.max(0, operativesPayrollTotal - operativesUnavailableCount);

      // Descontar no disponibles pertenecientes a programables (Operativos + Reubicados)
      const programmableUnavailableCount = allUnavailableItems.filter(item => {
        const per = totalPersonnelList.find((p: any) => matchPerson(p, item.documento) || matchPerson(p, item.key) || matchPerson(p, item.id));
        return per ? (isOperative(per) || isReubicado(per)) : true;
      }).length;
      // Total de colaboradores programables disponibles en el día que llegaron a trabajar (Operativos + Reubicados)
      const availableProgrammableCount = Math.max(0, programmablePayrollTotal - programmableUnavailableCount);

      let programmedOperativesSet = new Set<string>();
      const laborPersonnelCountMap = new Map<string, Set<string>>();

      // 1. Personal en programaciones confirmadas (Operativos y Reubicados programables)
      filteredProgrammings.forEach(p => {
        const laborObj = catalogs.labors.find((l:any) => l.id === p.laborId);
        const laborName = laborObj ? laborObj.name : 'Otra Labor';
        if (!laborPersonnelCountMap.has(laborName)) laborPersonnelCountMap.set(laborName, new Set());

        (p.personnelIds || []).forEach((id: string) => {
          const per = activeProgrammableList.find((x: any) => matchPerson(x, id));
          if (per) {
            programmedOperativesSet.add(per.documento || per.id);
            laborPersonnelCountMap.get(laborName)?.add(per.documento || per.id);
          } else {
            programmedOperativesSet.add(id);
            laborPersonnelCountMap.get(laborName)?.add(id);
          }
        });
      });

      // 2. Operadores / Tractoristas en maquinaria del día
      filteredMachineries.filter(m => m.status !== 'CANCELADA').forEach(m => {
        const opId = m.operatorId || m.operator_id;
        const opName = m.operatorName || m.operator_name;
        if (!opId && !opName) return;
        const per = activeProgrammableList.find((x: any) => matchPerson(x, opId) || matchPerson(x, opName));
        const doc = per ? (per.documento || per.id) : (opId || opName);
        programmedOperativesSet.add(doc);

        const laborObj = catalogs.labors.find((l:any) => l.id === (m.laborId || m.labor_id));
        const laborName = laborObj ? laborObj.name : 'Maquinaria';
        if (!laborPersonnelCountMap.has(laborName)) laborPersonnelCountMap.set(laborName, new Set());
        laborPersonnelCountMap.get(laborName)?.add(doc);
      });

      const programmedCount = programmedOperativesSet.size;
      // El porcentaje de personal programado se calcula sobre la totalidad disponible entre operativos y reubicados
      const utilRate = availableProgrammableCount > 0 ? Math.min(100, (programmedCount / availableProgrammableCount) * 100) : 0;

      // 1. Chart: Personas por Labor (Paleta con contraste nítido y moderno)
      const palette = ['#15803D', '#0284C7', '#D97706', '#7C3AED', '#0D9488', '#4338CA', '#BE185D', '#65A30D', '#E11D48'];
      const chartLabor = Array.from(laborPersonnelCountMap.entries())
        .map(([name, set], idx) => ({
          name,
          value: set.size,
          fill: palette[idx % palette.length]
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

      // Un único gráfico apilado: cada zona conserva el total de personas y el
      // color de cada tramo revela cómo se distribuyen por labor. Una persona se
      // cuenta una sola vez dentro de la misma zona, aun si aparece en varios
      // registros confirmados de esa zona.
      const zoneAssignments = new Map<string, Map<string, { laborName: string; personnel: Map<string, string> }>>();
      const getProgrammingZone = (programming: any) => {
        const snapshotZone = String(programming.zoneSnapshot || '').split(' - ')[0].trim();
        if (snapshotZone) return snapshotZone;

        const locationIds = programming.locationIds || String(programming.locationId || '').split(',').map((id: string) => id.trim()).filter(Boolean);
        const location = (catalogs.locations || []).find((item: any) => locationIds.includes(item.id));
        return location?.zone || 'Sin zona';
      };

      filteredProgrammings.forEach(programming => {
        const zone = getProgrammingZone(programming);
        const labor = (catalogs.labors || []).find((item: any) => item.id === programming.laborId);
        const laborId = String(programming.laborId || 'SIN_LABOR');
        const laborName = labor?.name || 'Otra labor';
        if (!zoneAssignments.has(zone)) zoneAssignments.set(zone, new Map());
        const byLabor = zoneAssignments.get(zone)!;
        if (!byLabor.has(laborId)) byLabor.set(laborId, { laborName, personnel: new Map() });

        (programming.personnelIds || []).forEach((rawId: string) => {
          const person = activeProgrammableList.find((item: any) => matchPerson(item, rawId));
          const personKey = String(person?.documento || person?.id || rawId);
          // El primer registro confirmado asigna la labor para evitar duplicar
          // una persona dentro de la misma zona.
          const alreadyAssigned = [...byLabor.values()].some(entry => entry.personnel.has(personKey));
          if (!alreadyAssigned) byLabor.get(laborId)?.personnel.set(personKey, personKey);
        });
      });

      const zoneLaborIds = [...new Set(
        [...zoneAssignments.values()].flatMap(byLabor => [...byLabor.keys()]),
      )];
      const zoneLaborSeries = zoneLaborIds.map((laborId, index) => {
        const sample = [...zoneAssignments.values()].map(byLabor => byLabor.get(laborId)).find(Boolean);
        return { key: `labor_${index}`, laborId, name: sample?.laborName || 'Otra labor', fill: palette[index % palette.length] };
      });
      const chartZoneLabor = [...zoneAssignments.entries()]
        .map(([zone, byLabor]) => {
          const row: Record<string, string | number> = { zone, total: 0 };
          zoneLaborSeries.forEach(series => {
            const count = byLabor.get(series.laborId)?.personnel.size || 0;
            row[series.key] = count;
            row.total = Number(row.total) + count;
          });
          return row;
        })
        .filter(row => Number(row.total) > 0)
        .sort((a, b) => Number(b.total) - Number(a.total));

      // 2. Chart: Despliegue por Supervisor
      const bySupMap = new Map<string, Set<string>>();
      filteredProgrammings.forEach(p => {
        const sup = catalogs.supervisors.find((s:any) => s.id === p.idSupervisor);
        const supName = sup ? sup.name : (p.idSupervisor || 'Otros');
        if (!bySupMap.has(supName)) bySupMap.set(supName, new Set());
        (p.personnelIds || []).forEach((id: string) => {
          const per = activeProgrammableList.find((x: any) => x.id === id || x.documento === id);
          bySupMap.get(supName)?.add(per ? (per.documento || per.id) : id);
        });
      });

      filteredMachineries.filter(m => m.status !== 'CANCELADA').forEach(m => {
        if (!m.operatorId) return;
        const supId = m.supervisorId || m.idSupervisor;
        const sup = catalogs.supervisors.find((s:any) => s.id === supId);
        const supName = sup ? sup.name : (supId || 'Otros');
        if (!bySupMap.has(supName)) bySupMap.set(supName, new Set());
        const per = activeProgrammableList.find((x: any) => x.id === m.operatorId || x.documento === m.operatorId || x.name === m.operatorName);
        bySupMap.get(supName)?.add(per ? (per.documento || per.id) : m.operatorId);
      });

      const chartBySup = Array.from(bySupMap.entries())
        .map(([name, set]) => {
          return { name: name.split(' ')[0] + ' ' + (name.split(' ')[1] || ''), personas: set.size };
        })
        .sort((a, b) => b.personas - a.personas)
        .slice(0, 8);

      // 3. Chart: Motivos de Ausentismo / Inasistencias (Colores coordinados con las tarjetas)
      const chartAbsences = [
        { name: 'Incapacidad', value: incapacidadesList.length, fill: '#0D9488' },
        { name: 'Inasistencia', value: inasistenciasList.length, fill: '#DC2626' },
        { name: 'Permiso', value: permisosList.length, fill: '#D97706' },
        { name: 'Vacaciones', value: vacacionesList.length, fill: '#7C3AED' },
      ].filter(x => x.value > 0);

      // 4. Maquinaria Summary
      const activeMachineryCount = filteredMachineries.filter(m => m.status !== 'CANCELADA').length;
      const totalEquipmentCount = (catalogs.equipment || []).filter((e: any) => e.active).length;

      const machineryActivityMap = new Map<string, number>();
      filteredMachineries.forEach(m => {
        if (m.status !== 'CANCELADA') {
          const act = (catalogs.activities || []).find((a: any) => a.id === (m.activityId || m.activity_id));
          const actName = act ? act.name : 'Operación General';
          machineryActivityMap.set(actName, (machineryActivityMap.get(actName) || 0) + 1);
        }
      });

      const machineryPalette = ['#0284C7', '#15803D', '#D97706', '#7C3AED', '#0D9488', '#4338CA', '#BE185D', '#14B8A6'];
      const chartMachinery = Array.from(machineryActivityMap.entries())
        .map(([name, value], idx) => ({
          name,
          value,
          fill: machineryPalette[idx % machineryPalette.length]
        }))
        .sort((a, b) => b.value - a.value);

      // 5. Top Leaderboard de Inasistentes Injustificados y Recurrencia
      const selectedMonthPrefix = date.substring(0, 7); // YYYY-MM
      const absenceRecurrenceMap = new Map<string, { 
        count: number; 
        name: string; 
        doc: string; 
        dates: string[];
      }>();
      
      const sourceAbsences = absencesRange === 'day' 
        ? absences.filter(a => a.date === date) 
        : absences.filter(a => a.date.startsWith(selectedMonthPrefix));

      sourceAbsences.forEach(a => {
        if (a.status === 'REGISTRADA' && isUnjustified(a.reason)) {
          const p = catalogs.personnel.find((per: any) => per.id === a.personnelId || per.documento === a.personnelDoc);
          const name = p ? (p.name || p.nombreCompleto) : (a.personnelName || 'Personal');
          const doc = p ? (p.documento || '') : (a.personnelDoc || '');
          const key = p ? p.id : (a.personnelId || a.personnelDoc || name);

          const current = absenceRecurrenceMap.get(key) || { count: 0, name, doc, dates: [] };
          current.count += 1;
          if (a.date && !current.dates.includes(a.date)) {
            current.dates.push(a.date);
          }
          absenceRecurrenceMap.set(key, current);
        }
      });

      const topAbsentees = Array.from(absenceRecurrenceMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalPeople,
        operativesTotal: availableOperativesCount,
        operativesPayrollTotal,
        reubicadosTotal,
        reubicadosList: reubicadosDetailList,
        adminTotal,
        programmablePayrollTotal,
        availableProgrammableCount,
        absencesTotal: inasistenciasList.length,
        incapacidadesTotal: incapacidadesList.length,
        permissionsTotal: permisosList.length,
        vacationsTotal: vacacionesList.length,
        availableOperativesCount,
        totalUnavailable,
        programmedCount,
        utilRate: Number(utilRate.toFixed(1)),
        chartLabor,
        chartZoneLabor,
        zoneLaborSeries,
        chartAbsences,
        chartMachinery,
        chartBySup,
        activeMachineryCount,
        totalEquipmentCount,
        topAbsentees,
        inasistenciasList,
        incapacidadesList,
        permisosVacacionesList
      };
    }, [catalogs, date, absencesRange, filteredProgrammings, filteredMachineries, filteredAbsences]);

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header with Title and Date Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-forest-900 to-forest-950 p-5 rounded-2xl text-white shadow-lg border border-forest-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-lime-400 text-forest-950 rounded-md text-xs font-extrabold uppercase tracking-wider">
                Panel Directivo & Táctico
              </span>
              <span className="text-xs text-forest-200">Oleoflores Agronómica</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tablero de Operaciones
            </h2>
            <p className="text-xs sm:text-sm text-forest-200 mt-0.5">
              Control táctico de personal, rendimientos, maquinaria y ausentismo en campo
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 self-start sm:self-auto">
            <Calendar size={18} className="text-lime-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-forest-200 tracking-wider">Fecha de Análisis</span>
              <Input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="bg-transparent border-0 h-8 text-sm font-semibold text-white focus-visible:ring-0 p-0" 
              />
            </div>
          </div>
        </div>

        {/* Tactical Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Card 1: Total Personas */}
          <Card className="border-forest-900/10 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-forest-50/40">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-tight truncate" title="Total Personas">
                  Total Personas
                </span>
                <div className="w-7 h-7 shrink-0 rounded-lg bg-forest-100 text-forest-900 flex items-center justify-center">
                  <Users size={15} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-forest-950">{stats.totalPeople}</h3>
              <p className="text-[10px] text-gray-500 mt-1 truncate">Total colaboradores</p>
            </CardContent>
          </Card>

          {/* Card 2: Operativos de Campo */}
          <Card className="border-forest-900/10 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-emerald-50/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-tight truncate" title="Operativos Campo">
                  Operativos Campo
                </span>
                <div className="w-7 h-7 shrink-0 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Layers size={15} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-emerald-950">{stats.availableOperativesCount}</h3>
              <p className="text-[10px] text-emerald-700/80 mt-1 truncate" title={`${stats.availableOperativesCount} de ${stats.operativesPayrollTotal} disponibles`}>
                {stats.totalUnavailable > 0 ? `${stats.availableOperativesCount} de ${stats.operativesPayrollTotal} disp.` : 'Personal productivo'}
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Personal Reubicado (Descontado de campo) */}
          <Card 
            onClick={() => { setSelectedDetailModal('reubicados'); setDetailSearch(''); }}
            className="border-purple-200/80 shadow-xs hover:shadow-md hover:border-purple-400 transition-all cursor-pointer bg-gradient-to-br from-white to-purple-50/40 group relative overflow-hidden"
            role="button"
            tabIndex={0}
            title="Clic para ver detalle de personas reubicadas"
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-purple-900 uppercase tracking-tight truncate" title="Reubicados">
                  Reubicados
                </span>
                <div className="w-7 h-7 shrink-0 rounded-lg bg-purple-100 text-purple-800 group-hover:bg-purple-200 transition-colors flex items-center justify-center">
                  <ArrowRightLeft size={15} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-purple-950">{stats.reubicadosTotal}</h3>
              <div className="flex items-center justify-between mt-1 text-[10px] text-purple-700 font-medium">
                <span className="truncate">No prod.</span>
                <span className="font-bold inline-flex items-center gap-0.5 group-hover:underline text-purple-800 shrink-0">
                  Ver lista <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Personal Administrativo */}
          <Card className="border-forest-900/10 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-blue-50/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-blue-800 uppercase tracking-tight truncate" title="Oficina / Admin">
                  Oficina / Admin
                </span>
                <div className="w-7 h-7 shrink-0 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Briefcase size={15} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-blue-950">{stats.adminTotal}</h3>
              <p className="text-[10px] text-blue-700/80 mt-1 truncate">Jefes, oficina y sups.</p>
            </CardContent>
          </Card>

          {/* Card 5: Inasistencias del Día */}
          <Card 
            onClick={() => { setSelectedDetailModal('inasistencias'); setDetailSearch(''); }}
            className="border-red-200 shadow-xs hover:shadow-md hover:border-red-400 transition-all cursor-pointer bg-gradient-to-br from-white to-red-50/40 group relative overflow-hidden"
            role="button"
            tabIndex={0}
            title="Clic para ver detalle de personas con inasistencia"
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-red-800 uppercase tracking-tight truncate" title="Inasistencias">
                  Inasistencias
                </span>
                <div className="w-7 h-7 shrink-0 rounded-lg bg-red-100 text-red-800 group-hover:bg-red-200 transition-colors flex items-center justify-center">
                  <UserX size={15} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-red-950">{stats.absencesTotal}</h3>
              <div className="flex items-center justify-between mt-1 text-[10px] text-red-700 font-medium">
                <span className="truncate">Sin justificar</span>
                <span className="font-bold inline-flex items-center gap-0.5 group-hover:underline text-red-800 shrink-0">
                  Ver lista <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 6: Incapacidades */}
          <Card 
            onClick={() => { setSelectedDetailModal('incapacidades'); setDetailSearch(''); }}
            className="border-teal-200 shadow-xs hover:shadow-md hover:border-teal-400 transition-all cursor-pointer bg-gradient-to-br from-white to-teal-50/40 group relative overflow-hidden"
            role="button"
            tabIndex={0}
            title="Clic para ver detalle de personas con incapacidad médica"
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-teal-800 uppercase tracking-tight truncate" title="Incapacidades">
                  Incapacidades
                </span>
                <div className="w-7 h-7 shrink-0 rounded-lg bg-teal-100 text-teal-800 group-hover:bg-teal-200 transition-colors flex items-center justify-center">
                  <Stethoscope size={15} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-teal-950">{stats.incapacidadesTotal}</h3>
              <div className="flex items-center justify-between mt-1 text-[10px] text-teal-700 font-medium">
                <span className="truncate">Médica act.</span>
                <span className="font-bold inline-flex items-center gap-0.5 group-hover:underline text-teal-800 shrink-0">
                  Ver lista <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 7: Permisos / Vacaciones */}
          <Card 
            onClick={() => { setSelectedDetailModal('permisos'); setDetailSearch(''); setPermisosFilterTab('all'); }}
            className="border-amber-200 shadow-xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer bg-gradient-to-br from-white to-amber-50/40 group relative overflow-hidden"
            role="button"
            tabIndex={0}
            title="Clic para ver detalle de personas con permisos o vacaciones"
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-tight truncate" title="Permisos / Vacaciones">
                  Permisos / Vac.
                </span>
                <div className="w-7 h-7 shrink-0 rounded-lg bg-amber-100 text-amber-800 group-hover:bg-amber-200 transition-colors flex items-center justify-center">
                  <CalendarX size={15} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-amber-900">{stats.permissionsTotal + stats.vacationsTotal}</h3>
              <div className="flex items-center justify-between mt-1 text-[10px] text-amber-700 font-medium">
                <span className="truncate">Novedad aut.</span>
                <span className="font-bold inline-flex items-center gap-0.5 group-hover:underline text-amber-800 shrink-0">
                  Ver lista <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 8: % Personal Programado */}
          <Card className="border-lime-300 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-lime-50/50 to-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-lime-900 uppercase tracking-tight truncate" title="% Personal Programado">
                  % Personal Prog.
                </span>
                <div className="w-7 h-7 shrink-0 rounded-lg bg-lime-200 text-lime-800 flex items-center justify-center">
                  <TrendingUp size={15} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-lime-900">{stats.utilRate}%</h3>
              <p className="text-[10px] text-lime-800/80 mt-1 truncate" title={`${stats.programmedCount} de ${stats.availableProgrammableCount} disponibles`}>
                {stats.programmedCount} de {stats.availableProgrammableCount} disp.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Novelties Banner */}
        <NovedadesPanel />

        {/* Distribución consolidada por zona y labor */}
        <Card className="border-forest-900/10 shadow-xs">
          <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                <Layers size={18} className="text-forest-700" /> Personal programado por zona y labor
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">La longitud total muestra personas por zona; cada color representa su labor programada.</p>
            </div>
            <span className="w-fit px-2.5 py-1 rounded-lg text-xs font-bold bg-forest-50 text-forest-800 border border-forest-200">
              {stats.chartZoneLabor.length} zona{stats.chartZoneLabor.length === 1 ? '' : 's'}
            </span>
          </CardHeader>
          <CardContent className="pt-2">
            {stats.chartZoneLabor.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-gray-400">
                No hay personal confirmado por zona para esta fecha.
              </div>
            ) : (
              <div className="w-full" style={{ height: Math.max(300, stats.chartZoneLabor.length * 52 + 95) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartZoneLabor} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 26 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="zone" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#123C2E', color: '#fff', borderRadius: '8px', border: 'none' }}
                      formatter={(value: any, name: any) => [`${value} persona${Number(value) === 1 ? '' : 's'}`, name]}
                      labelFormatter={(zone: string) => `Zona: ${zone}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    {stats.zoneLaborSeries.map((series: any) => (
                      <Bar key={series.key} dataKey={series.key} name={series.name} stackId="labor" fill={series.fill} radius={[0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Row 1: Personas por Labor & Resumen de Ausentismo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Personas por Labor (Donut con lista vertical estructurada) */}
          <Card className="border-forest-900/10 shadow-xs">
            <CardHeader className="pb-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                  <Layers size={18} className="text-forest-700" /> Distribución de Personas por Labor
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Operarios asignados a tareas agrónomas en el día</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <DonutWithLegendList
                data={stats.chartLabor}
                unit="pers."
                totalLabel="operarios"
                emptyMessage="No hay programaciones registradas para esta fecha."
              />
            </CardContent>
          </Card>

          {/* Chart 2: Resumen y Motivos de Ausentismo (Donut con lista vertical interactiva) */}
          <Card className="border-forest-900/10 shadow-xs">
            <CardHeader className="pb-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                  <CalendarX size={18} className="text-red-600" /> Resumen y Motivos de Novedad / Ausentismo
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Clasificación de inasistencias, incapacidades y permisos</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <DonutWithLegendList
                data={stats.chartAbsences}
                unit="pers."
                totalLabel="ausencias"
                emptyMessage="No hay inasistencias ni novedades reportadas en esta fecha."
                onItemClick={(item) => {
                  const lower = (item.name || '').toLowerCase();
                  if (lower.includes('incapacidad')) {
                    setSelectedDetailModal('incapacidades');
                  } else if (lower.includes('inasistencia')) {
                    setSelectedDetailModal('inasistencias');
                  } else if (lower.includes('permiso') || lower.includes('vacacion')) {
                    setSelectedDetailModal('permisos');
                    if (lower.includes('vacacion')) setPermisosFilterTab('vacaciones');
                    else if (lower.includes('permiso')) setPermisosFilterTab('permisos');
                  }
                  setDetailSearch('');
                }}
                actionHint="Ver personas"
              />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Resumen de Maquinaria & Despliegue por Supervisor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 3: Distribución de Maquinaria por Actividad (Donut con lista vertical) */}
          <Card className="border-forest-900/10 shadow-xs">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                  <Tractor size={18} className="text-blue-600" /> Distribución de Maquinaria por Actividad
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Equipos mecanizados asignados por tipo de labor agrícola</p>
              </div>
              <div className="px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs font-bold border border-blue-200">
                {stats.activeMachineryCount} Equipos Activos
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <DonutWithLegendList
                data={stats.chartMachinery}
                unit="eq."
                totalLabel="equipos"
                emptyMessage="No hay maquinaria activa programada hoy."
              />
            </CardContent>
          </Card>

          {/* Chart 4: Personal Programado por Supervisor */}
          <Card className="border-forest-900/10 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                <Users size={18} className="text-lime-600" /> Despliegue de Personal por Supervisor
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Operarios asignados por cada supervisor de zona</p>
            </CardHeader>
            <CardContent className="pt-2">
              {stats.chartBySup.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-sm text-gray-400">
                  No hay supervisores con personal programado hoy.
                </div>
              ) : (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartBySup} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#123C2E', color: '#fff', borderRadius: '8px', border: 'none' }}
                        formatter={(val: any) => [`${val} Operario(s)`, 'Programados']}
                      />
                      <Bar dataKey="personas" fill="#7FA33D" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Leaderboard / Top de Inasistencias Injustificadas */}
        <Card className="border-forest-900/10 shadow-xs">
          <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                <Award size={18} className="text-amber-500" /> Leaderboard: Top Inasistencias Injustificadas
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Personal con ausencias sin justificación (acumulado {absencesRange === 'month' ? 'del mes actual' : 'del día'})</p>
            </div>
            <div className="flex bg-gray-200/80 p-1 rounded-xl text-xs font-bold uppercase tracking-wider">
              <button 
                type="button"
                onClick={() => setAbsencesRange('month')} 
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${absencesRange === 'month' ? 'bg-primary text-white shadow-xs font-bold' : 'text-gray-600 hover:text-primary hover:bg-gray-100'}`}
              >
                Mes Actual
              </button>
              <button 
                type="button"
                onClick={() => setAbsencesRange('day')} 
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${absencesRange === 'day' ? 'bg-primary text-white shadow-xs font-bold' : 'text-gray-600 hover:text-primary hover:bg-gray-100'}`}
              >
                Día Seleccionado
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.topAbsentees.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400 font-medium">
                No se registraron inasistencias injustificadas en este período ({absencesRange === 'month' ? 'Mes Actual' : date}).
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {stats.topAbsentees.map((item, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-br from-red-50/40 via-white to-white rounded-xl border border-red-200/70 shadow-2xs hover:border-red-400 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                          idx === 0 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                          idx === 1 ? 'bg-slate-300 text-slate-900' :
                          idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">
                          {item.count} {item.count === 1 ? 'Inasistencia' : 'Inasistencias'}
                        </span>
                      </div>
                      
                      <h4 className="font-extrabold text-sm text-gray-900 leading-snug break-words" title={item.name}>
                        {item.name}
                      </h4>
                      {item.doc && (
                        <p className="text-xs font-semibold text-gray-500 mt-0.5">C.C. {item.doc}</p>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-2.5 border-t border-red-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-red-950">Faltas sin justificar:</span>
                        <span className="font-black text-red-700 text-sm">{item.count} {item.count === 1 ? 'vez' : 'veces'}</span>
                      </div>
                      {item.dates.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.dates.slice(0, 4).map(d => (
                            <span key={d} className="px-1.5 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold">
                              {d.split('-').slice(1).reverse().join('/')}
                            </span>
                          ))}
                          {item.dates.length > 4 && (
                            <span className="text-[10px] text-gray-500 font-bold self-center">
                              +{item.dates.length - 4} más
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section Exclusiva ADMIN: Control de Reporte de Supervisores y Advertencias */}
        {user?.role === 'ADMIN' && (
          <Card className="border-forest-900/15 shadow-sm bg-gradient-to-b from-white to-gray-50/50">
            <CardHeader className="pb-3 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                  <div className="p-1.5 bg-forest-100 text-forest-800 rounded-lg">
                    <Clock size={18} />
                  </div>
                  Control y Horarios de Reporte de Supervisores
                  <span className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border ${
                    pendingSupervisorsCount > 0 
                      ? 'bg-red-100 text-red-900 border-red-300 animate-pulse' 
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}>
                    {pendingSupervisorsCount > 0 ? `${pendingSupervisorsCount} Pendientes de Reporte` : 'Todos al Día (100%)'}
                  </span>
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  Seguimiento del cumplimiento de reporte de programación. Franjas automáticas: 12:00 PM, 05:00 PM (ayer) • 05:00 AM, 06:00 AM y 07:00 AM (hoy).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <Input 
                  placeholder="Buscar supervisor..." 
                  value={supervisorSearch}
                  onChange={(e) => setSupervisorSearch(e.target.value)}
                  className="bg-white text-xs h-9 w-full sm:w-52 border-gray-300"
                />

                <Button
                  type="button"
                  onClick={handleBroadcastEmergency}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 h-9 px-3 rounded-lg shadow-sm cursor-pointer whitespace-nowrap"
                  title="Disparar notificación de emergencia a los dispositivos de los supervisores sin reporte"
                >
                  <BellRing size={15} />
                  <span>Emitir Alerta del Sistema</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              {broadcastAlertSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  <span>{broadcastAlertSuccess}</span>
                </div>
              )}

              {/* Badges de Resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">Reportaron Hoy:</span>
                  <span className="text-sm font-black text-emerald-700">{readySupervisorsCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-950">Sin Reporte Hoy:</span>
                  <span className="text-sm font-black text-red-700">{pendingSupervisorsCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950">Total Supervisores:</span>
                  <span className="text-sm font-black text-amber-900">{supervisorsReportingList.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950">Avisos del Sistema:</span>
                  <span className="text-xs font-bold text-blue-800">Activos en PWA</span>
                </div>
              </div>

              {/* Tabla de Supervisores */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-h-[340px] overflow-y-auto shadow-2xs">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-bold tracking-wider sticky top-0 border-b border-gray-200 z-10">
                    <tr>
                      <th className="px-4 py-2.5">Supervisor</th>
                      <th className="px-4 py-2.5 text-center">Prog. Hoy</th>
                      <th className="px-4 py-2.5 text-center">Prog. Mañana</th>
                      <th className="px-4 py-2.5">Nivel / Estado Horario</th>
                      <th className="px-4 py-2.5 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSupervisorsReporting.map((sup) => {
                      const isEmergency = sup.statusLevel === 'emergency';
                      const isUrgent = sup.statusLevel === 'urgent';
                      const isWarning = sup.statusLevel === 'warning';

                      return (
                        <tr key={sup.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-gray-900 uppercase">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{
                                backgroundColor: sup.hasProgrammedToday ? '#16A34A' : '#DC2626'
                              }} />
                              <span>{sup.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {sup.hasProgrammedToday ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                ✓ {sup.todayCount} personas
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-red-100 text-red-900 border border-red-300">
                                ✗ Sin Reportar
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {sup.hasProgrammedTomorrow ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-900">
                                ✓ Listo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                              isEmergency 
                                ? 'bg-red-50 text-red-800 border-red-300' 
                                : isUrgent 
                                ? 'bg-orange-50 text-orange-800 border-orange-300' 
                                : isWarning 
                                ? 'bg-amber-50 text-amber-800 border-amber-300' 
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}>
                              {sup.statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-gray-500 font-medium">
                            {sup.lastAlertTitle}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section Exclusiva ADMIN: Personal Pendiente por Programar */}
        {user?.role === 'ADMIN' && (
          <Card className="border-forest-900/15 shadow-sm bg-gradient-to-b from-white to-gray-50/50">
            <CardHeader className="pb-3 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <UserX size={18} />
                  </div>
                  Personal Pendiente por Programar
                  <span className="ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    {unprogrammedPersonnel.length} Sin Programar
                  </span>
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  Operarios de campo disponibles en nómina que no han sido asignados a labores, maquinaria ni tienen inasistencia el día ({date}).
                </p>
              </div>

              {/* Buscador en vivo */}
              <div className="w-full sm:w-72">
                <Input 
                  placeholder="Buscar por nombre, cédula o cargo..." 
                  value={unprogrammedSearch}
                  onChange={(e) => setUnprogrammedSearch(e.target.value)}
                  className="bg-white text-xs h-9 border-gray-300"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {unprogrammedPersonnel.length === 0 ? (
                <div className="py-8 text-center text-emerald-800 bg-emerald-50/60 rounded-xl border border-emerald-200 p-6 flex flex-col items-center justify-center">
                  <CheckCircle2 size={36} className="text-emerald-600 mb-2" />
                  <p className="text-sm font-bold uppercase tracking-wide">¡Todo el personal operativo está cubierto!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Todos los operarios activos se encuentran programados en labores, maquinaria o tienen novedad/inasistencia registrada para el {date}.
                  </p>
                </div>
              ) : filteredUnprogrammed.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  No se encontraron coincidencias para "{unprogrammedSearch}".
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
                    <span>Mostrando <strong>{filteredUnprogrammed.length}</strong> de <strong>{unprogrammedPersonnel.length}</strong> personas</span>
                    <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      💡 Consulta con los supervisores de zona para su asignación
                    </span>
                  </div>

                  {/* Tabla / Lista scrolleable con altura fija */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-h-[380px] overflow-y-auto shadow-2xs">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-bold tracking-wider sticky top-0 border-b border-gray-200 z-10">
                        <tr>
                          <th className="px-4 py-2.5">Operario</th>
                          <th className="px-4 py-2.5">Cédula</th>
                          <th className="px-4 py-2.5">Cargo / Labor Habitual</th>
                          <th className="px-4 py-2.5">Cuadrilla / Zona</th>
                          <th className="px-4 py-2.5 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredUnprogrammed.map((per: any) => (
                          <tr key={per.id || per.documento} className="hover:bg-amber-50/40 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-gray-900 uppercase">
                              {per.name || per.nombreCompleto}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-600 font-mono font-medium">
                              {per.documento}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-700 font-medium">
                              {per.jobTitle || per.laborCargo || 'Operario de Campo'}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">
                              {per.cuadrilla || per.actividadCuadrilla || per.zona || 'Sin asignar'}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                Sin Asignar
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal de Detalle / Tabla Resumen para Inasistencias, Incapacidades y Permisos/Vacaciones */}
        {selectedDetailModal && (
          <Dialog open={!!selectedDetailModal} onOpenChange={(open) => { if (!open) setSelectedDetailModal(null); }}>
            <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-2xl">
              {(() => {
                const q = detailSearch.trim().toLowerCase();
                let type = selectedDetailModal;
                let title = '';
                let desc = '';
                let badge = '';
                let color = 'red';
                let list: any[] = [];
                let targetRoute = '/absences';
                let buttonText = 'Ir al Módulo';
                let icon = <UserX className="text-red-600" size={22} />;

                if (type === 'inasistencias') {
                  list = stats.inasistenciasList.filter((item: any) => {
                    if (!q) return true;
                    return (item.name || '').toLowerCase().includes(q) || 
                           (item.documento || '').toString().toLowerCase().includes(q) ||
                           (item.cargo || '').toLowerCase().includes(q) ||
                           (item.motivo || '').toLowerCase().includes(q) ||
                           (item.cuadrilla || '').toLowerCase().includes(q);
                  });
                  title = 'Detalle de Inasistencias del Día';
                  desc = `Operarios con falta sin justificar registrada para la fecha: ${date}`;
                  badge = `${stats.absencesTotal} Inasistencias`;
                  color = 'red';
                  targetRoute = '/absences';
                  buttonText = 'Ir al Módulo de Inasistencias';
                  icon = <UserX className="text-red-600" size={22} />;
                } else if (type === 'incapacidades') {
                  list = stats.incapacidadesList.filter((item: any) => {
                    if (!q) return true;
                    return (item.name || '').toLowerCase().includes(q) || 
                           (item.documento || '').toString().toLowerCase().includes(q) ||
                           (item.cargo || '').toLowerCase().includes(q) ||
                           (item.diagnostico || '').toLowerCase().includes(q) ||
                           (item.cuadrilla || '').toLowerCase().includes(q);
                  });
                  title = 'Detalle de Incapacidades Médicas Activas';
                  desc = `Personal con reporte de incapacidad médica que cubre la fecha: ${date}`;
                  badge = `${stats.incapacidadesTotal} Incapacidades`;
                  color = 'teal';
                  targetRoute = '/novedades';
                  buttonText = 'Ir a Novedades de Personal';
                  icon = <Stethoscope className="text-teal-600" size={22} />;
                } else if (type === 'permisos') {
                  let rawList = stats.permisosVacacionesList;
                  if (permisosFilterTab === 'vacaciones') {
                    rawList = rawList.filter((item: any) => item.category === 'vacaciones');
                  } else if (permisosFilterTab === 'permisos') {
                    rawList = rawList.filter((item: any) => item.category === 'permisos');
                  }
                  list = rawList.filter((item: any) => {
                    if (!q) return true;
                    return (item.name || '').toLowerCase().includes(q) || 
                           (item.documento || '').toString().toLowerCase().includes(q) ||
                           (item.cargo || '').toLowerCase().includes(q) ||
                           (item.tipo || '').toLowerCase().includes(q) ||
                           (item.cuadrilla || '').toLowerCase().includes(q);
                  });
                  title = 'Detalle de Permisos y Vacaciones';
                  desc = `Personal con novedades autorizadas (vacaciones, licencias o permisos) para la fecha: ${date}`;
                  badge = `${stats.permissionsTotal + stats.vacationsTotal} Novedades`;
                  color = 'amber';
                  targetRoute = '/novedades';
                  buttonText = 'Ir a Novedades de Personal';
                  icon = <CalendarX className="text-amber-600" size={22} />;
                } else if (type === 'reubicados') {
                  list = stats.reubicadosList.filter((item: any) => {
                    if (!q) return true;
                    return (item.name || '').toLowerCase().includes(q) || 
                           (item.documento || '').toString().toLowerCase().includes(q) ||
                           (item.cargo || '').toLowerCase().includes(q) ||
                           (item.cuadrilla || '').toLowerCase().includes(q) ||
                           (item.observaciones || '').toLowerCase().includes(q);
                  });
                  title = 'Personal Reubicado (No Productivo)';
                  desc = 'Colaboradores con restricción o reubicación, descontados de la fuerza operativa de campo.';
                  badge = `${stats.reubicadosTotal} Reubicados`;
                  color = 'purple';
                  targetRoute = '/admin';
                  buttonText = 'Ir a Catálogo de Personal';
                  icon = <ArrowRightLeft className="text-purple-600" size={22} />;
                }

                return (
                  <>
                    {/* Header */}
                    <div className={`p-4 sm:p-5 border-b text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      color === 'red' ? 'bg-gradient-to-r from-red-800 to-red-950 border-red-700' :
                      color === 'teal' ? 'bg-gradient-to-r from-teal-800 to-teal-950 border-teal-700' :
                      color === 'purple' ? 'bg-gradient-to-r from-purple-800 to-purple-950 border-purple-700' :
                      'bg-gradient-to-r from-amber-700 to-amber-900 border-amber-600'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                          {icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <DialogTitle className="text-lg font-black text-white">
                              {title}
                            </DialogTitle>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white text-gray-900 shadow-xs">
                              {badge}
                            </span>
                          </div>
                          <DialogDescription className="text-xs text-white/80 mt-0.5">
                            {desc}
                          </DialogDescription>
                        </div>
                      </div>

                      <Button
                        onClick={() => {
                          setSelectedDetailModal(null);
                          navigate(targetRoute);
                        }}
                        className="bg-white text-gray-900 hover:bg-gray-100 font-bold text-xs flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
                      >
                        {buttonText} <ExternalLink size={14} />
                      </Button>
                    </div>

                    {/* Sub-bar with Search & Tabs */}
                    <div className="p-3.5 px-5 border-b border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="relative w-full sm:w-80">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Buscar por nombre, cédula o cargo..."
                          value={detailSearch}
                          onChange={(e) => setDetailSearch(e.target.value)}
                          className="pl-9 h-9 text-xs bg-white border-gray-300 focus-visible:ring-forest-600"
                        />
                      </div>

                      {type === 'permisos' && (
                        <div className="flex bg-gray-200/80 p-1 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 w-full sm:w-auto justify-center">
                          <button
                            type="button"
                            onClick={() => setPermisosFilterTab('all')}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                              permisosFilterTab === 'all' ? 'bg-amber-700 text-white shadow-xs font-bold' : 'text-gray-600 hover:text-amber-800'
                            }`}
                          >
                            Todos ({stats.permissionsTotal + stats.vacationsTotal})
                          </button>
                          <button
                            type="button"
                            onClick={() => setPermisosFilterTab('vacaciones')}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                              permisosFilterTab === 'vacaciones' ? 'bg-purple-700 text-white shadow-xs font-bold' : 'text-gray-600 hover:text-purple-800'
                            }`}
                          >
                            Vacaciones ({stats.vacationsTotal})
                          </button>
                          <button
                            type="button"
                            onClick={() => setPermisosFilterTab('permisos')}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                              permisosFilterTab === 'permisos' ? 'bg-amber-700 text-white shadow-xs font-bold' : 'text-gray-600 hover:text-amber-800'
                            }`}
                          >
                            Permisos ({stats.permissionsTotal})
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Table */}
                    <div className="overflow-y-auto max-h-[50vh] p-4">
                      {list.length === 0 ? (
                        <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                            {detailSearch ? <Search size={22} /> : <CheckCircle2 size={24} className="text-emerald-500" />}
                          </div>
                          <p className="text-sm font-bold text-gray-800">
                            {detailSearch 
                              ? `No se encontraron coincidencias para "${detailSearch}"`
                              : `No hay registros en esta categoría para la fecha seleccionada.`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {detailSearch ? 'Prueba con otra palabra clave o cédula.' : 'Todo el personal se encuentra activo o disponible.'}
                          </p>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                          <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-gray-50 text-gray-600 text-[11px] uppercase font-bold tracking-wider sticky top-0 border-b border-gray-200 z-10">
                              <tr>
                                <th className="px-4 py-2.5">Colaborador</th>
                                <th className="px-4 py-2.5">Cargo / Cuadrilla</th>
                                {type === 'inasistencias' && (
                                  <>
                                    <th className="px-4 py-2.5">Motivo Reportado</th>
                                    <th className="px-4 py-2.5">Registrado Por</th>
                                    <th className="px-4 py-2.5">Detalle / Observación</th>
                                  </>
                                )}
                                {type === 'incapacidades' && (
                                  <>
                                    <th className="px-4 py-2.5">Diagnóstico / Motivo</th>
                                    <th className="px-4 py-2.5">Vigencia / Período</th>
                                    <th className="px-4 py-2.5 text-center">Días</th>
                                    <th className="px-4 py-2.5">Observación</th>
                                  </>
                                )}
                                {type === 'permisos' && (
                                  <>
                                    <th className="px-4 py-2.5">Tipo Novedad</th>
                                    <th className="px-4 py-2.5">Vigencia / Período</th>
                                    <th className="px-4 py-2.5 text-center">Días</th>
                                    <th className="px-4 py-2.5">Observación</th>
                                  </>
                                )}
                                {type === 'reubicados' && (
                                  <>
                                    <th className="px-4 py-2.5">Condición</th>
                                    <th className="px-4 py-2.5">Estado Operativo</th>
                                    <th className="px-4 py-2.5">Observación / Detalle</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {list.map((item: any, idx: number) => (
                                <tr key={item.id || idx} className="hover:bg-gray-50/80 transition-colors">
                                  {/* Colaborador */}
                                  <td className="px-4 py-2.5">
                                    <div className="font-bold text-gray-900 uppercase">
                                      {item.name}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                                      C.C. {item.documento}
                                    </div>
                                  </td>

                                  {/* Cargo / Cuadrilla */}
                                  <td className="px-4 py-2.5">
                                    <div className="font-medium text-gray-800 text-xs">
                                      {item.cargo}
                                    </div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                      {item.cuadrilla}
                                    </div>
                                  </td>

                                  {/* Inasistencias */}
                                  {type === 'inasistencias' && (
                                    <>
                                      <td className="px-4 py-2.5">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-200 inline-block">
                                          {item.motivo}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-gray-600 font-medium">
                                        {item.registradoPor}
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-gray-500 italic max-w-xs">
                                        {item.observacion || '-'}
                                      </td>
                                    </>
                                  )}

                                  {/* Incapacidades */}
                                  {type === 'incapacidades' && (
                                    <>
                                      <td className="px-4 py-2.5">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-800 border border-teal-200 inline-block">
                                          {item.diagnostico}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-gray-700 font-medium">
                                        {item.fechaInicio} al {item.fechaFin}
                                      </td>
                                      <td className="px-4 py-2.5 text-center">
                                        <span className="font-mono font-bold text-teal-900 text-xs bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                                          {item.dias} d
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-gray-500 italic max-w-xs">
                                        {item.observacion || '-'}
                                      </td>
                                    </>
                                  )}

                                  {/* Permisos */}
                                  {type === 'permisos' && (
                                    <>
                                      <td className="px-4 py-2.5">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase inline-block ${
                                          item.category === 'vacaciones' 
                                            ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                                        }`}>
                                          {item.tipo}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-gray-700 font-medium">
                                        {item.fechaInicio} al {item.fechaFin}
                                      </td>
                                      <td className="px-4 py-2.5 text-center">
                                        <span className="font-mono font-bold text-gray-900 text-xs bg-gray-100 px-2 py-0.5 rounded">
                                          {item.dias} d
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-gray-500 italic max-w-xs">
                                        {item.observacion || '-'}
                                      </td>
                                    </>
                                  )}

                                  {/* Reubicados */}
                                  {type === 'reubicados' && (
                                    <>
                                      <td className="px-4 py-2.5">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200 inline-block">
                                          REUBICADO
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-purple-900 font-bold">
                                        No productivo en campo
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-gray-500 italic max-w-xs">
                                        {item.observaciones || 'Descontado de operativos de campo'}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 px-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">
                        Mostrando <strong>{list.length}</strong> registro(s) para el {date}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedDetailModal(null)}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        Cerrar
                      </Button>
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  };

  return <DirectivoDashboard />;
}

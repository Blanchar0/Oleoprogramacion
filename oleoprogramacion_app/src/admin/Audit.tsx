import React, { useState, useEffect } from 'react';
import { useCatalogs } from '../shared/useCatalogs';
import { supabase } from '../shared/supabase';
import { Card, CardContent, CardHeader, CardTitle, cn } from '@/src/components/ui';

export default function Audit() {
  const { catalogs } = useCatalogs();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setLogs(data);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Auditoría del Sistema</h2>
        <p className="text-gray-500 text-sm mt-1">Últimos eventos registrados en la base de datos</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Eventos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 bg-gray-50 uppercase">
                <tr>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                      No hay registros de auditoría previos
                    </td>
                  </tr>
                ) : (
                  logs.map((log, i) => {
                    const actorUser = (catalogs?.users || []).find((u: any) => u.id === log.user_id);
                    return (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-3 font-medium">{actorUser?.name || log.user_id}</td>
                        <td className="px-4 py-3">{log.action}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {log.created_at ? new Date(log.created_at).toLocaleString('es-CO') : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

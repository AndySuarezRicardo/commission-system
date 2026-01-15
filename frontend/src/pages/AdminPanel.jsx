import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const { API_URL } = useAuth();
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, clientsRes] = await Promise.all([
        axios.get(\`\${API_URL}/admin/stats\`),
        axios.get(\`\${API_URL}/clients?status=pending\`)
      ]);
      setStats(statsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const updateClientStatus = async (clientId, status) => {
    try {
      await axios.patch(\`\${API_URL}/clients/\${clientId}/status\`, { status });
      toast.success('Estado actualizado');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Panel de Administración</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Agencias</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.total_agencies || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Clientes</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.total_clients || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Comisiones Totales</p>
          <p className="text-3xl font-bold text-gray-900">\${stats?.total_commissions_amount || 0}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Clientes Pendientes de Aprobación</h3>
        <div className="space-y-3">
          {clients.map(client => (
            <div key={client.id} className="flex items-center justify-between p-4 border rounded">
              <div>
                <p className="font-medium">{client.name}</p>
                <p className="text-sm text-gray-500">{client.email} - {client.phone}</p>
                <p className="text-sm text-gray-500">Agencia: {client.agency_name}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => updateClientStatus(client.id, 'enrolled')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => updateClientStatus(client.id, 'not_enrolled')}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
          {clients.length === 0 && (
            <p className="text-center text-gray-500 py-8">No hay clientes pendientes</p>
          )}
        </div>
      </div>
    </div>
  );
}

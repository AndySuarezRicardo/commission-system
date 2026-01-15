import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Commissions() {
  const { API_URL } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [commissionsRes, statsRes] = await Promise.all([
        axios.get(\`\${API_URL}/commissions\`),
        axios.get(\`\${API_URL}/commissions/stats\`)
      ]);
      setCommissions(commissionsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Error al cargar comisiones');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800'
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Comisiones</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Comisiones</p>
          <p className="text-3xl font-bold text-gray-900">\${stats?.total_amount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Pendientes</p>
          <p className="text-3xl font-bold text-yellow-600">\${stats?.pending_amount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Pagadas</p>
          <p className="text-3xl font-bold text-green-600">\${stats?.paid_amount || 0}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agencia</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {commissions.map((commission) => (
              <tr key={commission.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{commission.client_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">\${commission.amount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{commission.month}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={\`px-2 py-1 text-xs font-medium rounded-full \${statusColors[commission.payment_status]}\`}>
                    {commission.payment_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{commission.agency_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

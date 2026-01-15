import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UsersIcon, CurrencyDollarIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { API_URL } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(\`\${API_URL}/reports/dashboard\`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>;
  }

  const cards = [
    { name: 'Total Clientes', value: stats?.clients?.total || 0, icon: UsersIcon, color: 'blue' },
    { name: 'Inscritos', value: stats?.clients?.enrolled || 0, icon: CheckCircleIcon, color: 'green' },
    { name: 'Pendientes', value: stats?.clients?.pending || 0, icon: ClockIcon, color: 'yellow' },
    { name: 'Comisiones Totales', value: \`$\${stats?.commissions?.total_amount || 0}\`, icon: CurrencyDollarIcon, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <card.icon className={\`h-6 w-6 text-\${card.color}-600\`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{card.name}</dt>
                    <dd className="text-lg font-semibold text-gray-900">{card.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Comisiones por Mes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats?.monthly || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="amount" fill="#3b82f6" name="Monto" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

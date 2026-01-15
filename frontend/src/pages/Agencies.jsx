import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ChevronRightIcon, ChevronDownIcon, BuildingOfficeIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function Agencies() {
  const { API_URL, user } = useAuth();
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [createdAgency, setCreatedAgency] = useState(null);

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    try {
      const response = await axios.get(`${API_URL}/agencies/tree`);
      setAgencies(buildTree(response.data));
    } catch (error) {
      toast.error('Error al cargar agencias');
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (flatArray) => {
    const map = {};
    const roots = [];

    flatArray.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });

    flatArray.forEach(item => {
      if (item.parent_agency_id) {
        if (map[item.parent_agency_id]) {
          map[item.parent_agency_id].children.push(map[item.id]);
        }
      } else {
        roots.push(map[item.id]);
      }
    });

    return roots;
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateAgency = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/agencies`, formData);

      // Mostrar la contraseña generada
      setCreatedAgency({
        ...response.data,
        password: response.data.generated_password
      });

      // Limpiar formulario pero mantener modal abierto para mostrar credenciales
      setFormData({ name: '', email: '', phone: '' });
      fetchAgencies();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al crear agencia');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setCreatedAgency(null);
  };

  const TreeNode = ({ node, level = 0 }) => (
    <div>
      <div 
        className="flex items-center py-3 px-4 hover:bg-gray-50 cursor-pointer"
        style={{ paddingLeft: `${level * 2 + 1}rem` }}
        onClick={() => node.children.length > 0 && toggleExpand(node.id)}
      >
        {node.children.length > 0 && (
          expanded[node.id] ? 
            <ChevronDownIcon className="h-4 w-4 mr-2 text-gray-500" /> :
            <ChevronRightIcon className="h-4 w-4 mr-2 text-gray-500" />
        )}
        {node.children.length === 0 && <div className="w-4 mr-2" />}
        <BuildingOfficeIcon className="h-5 w-5 mr-2 text-primary-600" />
        <div className="flex-1">
          <p className="font-medium text-gray-900">{node.name}</p>
          <p className="text-sm text-gray-500">{node.email}</p>
        </div>
        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
          Nivel {node.level}
        </span>
      </div>
      {expanded[node.id] && node.children.map(child => (
        <TreeNode key={child.id} node={child} level={level + 1} />
      ))}
    </div>
  );

  if (loading) return <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Árbol de Agencias</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          {user.role === 'admin' ? 'Nueva Agencia' : 'Crear Subagencia'}
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {agencies.length > 0 ? (
          agencies.map(agency => (
            <TreeNode key={agency.id} node={agency} />
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <BuildingOfficeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No hay agencias disponibles</p>
          </div>
        )}
      </div>

      {showModal && !createdAgency && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={closeModal} />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium mb-4">
                {user.role === 'admin' ? 'Crear Nueva Agencia' : 'Crear Subagencia'}
              </h3>
              <form onSubmit={handleCreateAgency} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Agencia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Agencia Regional Norte"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="contacto@agencia.com"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono (opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">
                    ℹ️ Se generará automáticamente una contraseña que deberás compartir con la nueva agencia.
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Crear Agencia
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {createdAgency && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ✅ Agencia Creada Exitosamente
                </h3>
                <div className="mt-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    ⚠️ IMPORTANTE: Guarda estas credenciales
                  </p>
                  <div className="bg-white rounded p-3 space-y-2 text-left">
                    <div>
                      <p className="text-xs text-gray-500">Agencia:</p>
                      <p className="font-medium text-gray-900">{createdAgency.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email:</p>
                      <p className="font-medium text-gray-900">{createdAgency.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Contraseña (temporal):</p>
                      <p className="font-mono font-bold text-lg text-red-600">{createdAgency.password}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    Esta contraseña NO se mostrará nuevamente. Compártela de forma segura con la agencia.
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="mt-6 w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

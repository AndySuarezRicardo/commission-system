import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ChevronRightIcon, ChevronDownIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

export default function Agencies() {
  const { API_URL } = useAuth();
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    try {
      const response = await axios.get(\`\${API_URL}/agencies/tree\`);
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

  const TreeNode = ({ node, level = 0 }) => (
    <div>
      <div 
        className={\`flex items-center py-3 px-4 hover:bg-gray-50 cursor-pointer\`}
        style={{ paddingLeft: \`\${level * 2 + 1}rem\` }}
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

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Árbol de Agencias</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {agencies.map(agency => (
          <TreeNode key={agency.id} node={agency} />
        ))}
      </div>
    </div>
  );
}

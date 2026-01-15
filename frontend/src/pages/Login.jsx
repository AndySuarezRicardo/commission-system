import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password, twoFactorCode);

      if (result.requiresTwoFactor) {
        setRequires2FA(true);
        toast.success('Ingresa tu código 2FA');
      } else if (result.success) {
        toast.success('¡Bienvenido a ManageYourCom!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900">
            ManageYourCom
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistema de Gestión de Comisiones Multinivel
          </p>
        </div>
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
            {requires2FA && (
              <div>
                <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Código 2FA
                </label>
                <input
                  id="twoFactorCode"
                  name="twoFactorCode"
                  type="text"
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="123456"
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>

          <div className="bg-gray-50 rounded p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-700 text-center mb-2">
              Credenciales por defecto:
            </p>
            <div className="space-y-1">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Superadmin:</span> admin@manageyourcom.com
              </p>
              <p className="text-xs text-gray-600">
                <span className="font-medium">Password:</span> Admin@123456
              </p>
            </div>
            <hr className="my-2" />
            <div className="space-y-1">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Agencia:</span> agencia_a@example.com
              </p>
              <p className="text-xs text-gray-600">
                <span className="font-medium">Password:</span> Agency@123
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

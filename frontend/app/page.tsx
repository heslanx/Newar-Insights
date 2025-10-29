'use client';

import { useEffect, useState } from 'react';
import { adminAPI, gatewayAPI } from '@/lib/api';
import type { User, Meeting, HealthStatus } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [health, setHealth] = useState<{ admin: HealthStatus | null; gateway: HealthStatus | null }>({
    admin: null,
    gateway: null,
  });
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ email: '', name: '', max_concurrent_bots: 5 });
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [usersData, adminHealth, gatewayHealth] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getHealth(),
        gatewayAPI.getHealth(),
      ]);

      setUsers(usersData.users || []);
      setHealth({ admin: adminHealth, gateway: gatewayHealth });
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminAPI.createUser(newUser);
      setNewUser({ email: '', name: '', max_concurrent_bots: 5 });
      loadData();
      alert('Usuário criado com sucesso!');
    } catch (error: any) {
      alert('Erro: ' + error.message);
    }
  }

  async function handleGenerateToken(userId: number) {
    try {
      const result = await adminAPI.generateToken(userId);
      setSelectedToken(result.token);
      alert('Token gerado! Copie agora pois não será mostrado novamente.');
    } catch (error: any) {
      alert('Erro: ' + error.message);
    }
  }

  async function handleDeleteUser(id: number) {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      await adminAPI.deleteUser(id);
      loadData();
      alert('Usuário deletado com sucesso!');
    } catch (error: any) {
      alert('Erro: ' + error.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  const activeRecordings = meetings.filter(m => ['recording', 'active'].includes(m.status)).length;

  return (
    <div className=\"min-h-screen bg-gray-50\">
      {/* Header */}
      <header className=\"bg-white border-b border-gray-200\">
        <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4\">
          <h1 className=\"text-3xl font-bold text-gray-900\">Newar Insights</h1>
          <p className=\"text-gray-500 mt-1\">Admin Panel - Sistema de Gravação de Reuniões</p>
        </div>
      </header>

      <main className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">
        {/* Health Status */}
        <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6 mb-8\">
          <div className=\"bg-white rounded-lg shadow p-6\">
            <h3 className=\"text-sm font-medium text-gray-500\">Total de Usuários</h3>
            <p className=\"text-3xl font-bold text-gray-900 mt-2\">{users.length}</p>
          </div>

          <div className=\"bg-white rounded-lg shadow p-6\">
            <h3 className=\"text-sm font-medium text-gray-500\">Gravações Ativas</h3>
            <p className=\"text-3xl font-bold text-green-600 mt-2\">{activeRecordings}</p>
          </div>

          <div className=\"bg-white rounded-lg shadow p-6\">
            <h3 className=\"text-sm font-medium text-gray-500\">Status do Sistema</h3>
            <div className=\"flex items-center gap-2 mt-2\">
              <div className={`w-3 h-3 rounded-full ${health.admin?.status === 'healthy' && health.gateway?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className=\"text-lg font-semibold\">{health.admin?.status === 'healthy' && health.gateway?.status === 'healthy' ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Create User Form */}
        <div className=\"bg-white rounded-lg shadow p-6 mb-8\">
          <h2 className=\"text-xl font-bold text-gray-900 mb-4\">Criar Novo Usuário</h2>
          <form onSubmit={handleCreateUser} className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
            <input
              type=\"email\"
              placeholder=\"Email\"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className=\"border border-gray-300 rounded-lg px-4 py-2\"
              required
            />
            <input
              type=\"text\"
              placeholder=\"Nome\"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className=\"border border-gray-300 rounded-lg px-4 py-2\"
              required
            />
            <input
              type=\"number\"
              placeholder=\"Max Bots\"
              value={newUser.max_concurrent_bots}
              onChange={(e) => setNewUser({ ...newUser, max_concurrent_bots: parseInt(e.target.value) })}
              className=\"border border-gray-300 rounded-lg px-4 py-2\"
              min={1}
              max={50}
              required
            />
            <button
              type=\"submit\"
              className=\"bg-blue-600 text-white rounded-lg px-6 py-2 hover:bg-blue-700 transition\"
            >
              Criar Usuário
            </button>
          </form>
        </div>

        {/* Token Display */}
        {selectedToken && (
          <div className=\"bg-green-50 border border-green-200 rounded-lg p-4 mb-8\">
            <h3 className=\"font-semibold text-green-900 mb-2\">Token Gerado (copie agora!):</h3>
            <div className=\"flex items-center gap-2\">
              <code className=\"flex-1 bg-white px-4 py-2 rounded border border-green-300 text-sm font-mono\">
                {selectedToken}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedToken);
                  alert('Token copiado!');
                }}
                className=\"bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700\"
              >
                Copiar
              </button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className=\"bg-white rounded-lg shadow overflow-hidden\">
          <div className=\"px-6 py-4 border-b border-gray-200\">
            <h2 className=\"text-xl font-bold text-gray-900\">Usuários</h2>
          </div>
          <div className=\"overflow-x-auto\">
            <table className=\"min-w-full divide-y divide-gray-200\">
              <thead className=\"bg-gray-50\">
                <tr>
                  <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase\">ID</th>
                  <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Nome</th>
                  <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Email</th>
                  <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Max Bots</th>
                  <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Criado em</th>
                  <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Ações</th>
                </tr>
              </thead>
              <tbody className=\"bg-white divide-y divide-gray-200\">
                {users.map((user) => (
                  <tr key={user.id} className=\"hover:bg-gray-50\">
                    <td className=\"px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900\">{user.id}</td>
                    <td className=\"px-6 py-4 whitespace-nowrap text-sm text-gray-900\">{user.name}</td>
                    <td className=\"px-6 py-4 whitespace-nowrap text-sm text-gray-500\">{user.email}</td>
                    <td className=\"px-6 py-4 whitespace-nowrap text-sm text-gray-500\">{user.max_concurrent_bots}</td>
                    <td className=\"px-6 py-4 whitespace-nowrap text-sm text-gray-500\">{formatDate(user.created_at)}</td>
                    <td className=\"px-6 py-4 whitespace-nowrap text-sm space-x-2\">
                      <button
                        onClick={() => handleGenerateToken(user.id)}
                        className=\"bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs\"
                      >
                        Gerar Token
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className=\"bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs\"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Documentation Links */}
        <div className=\"mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6\">
          <h3 className=\"font-semibold text-blue-900 mb-3\">📚 Documentação</h3>
          <ul className=\"space-y-2 text-blue-800\">
            <li>• <strong>FINAL_SUMMARY.md</strong> - Documentação completa do sistema</li>
            <li>• <strong>CLAUDE.md</strong> - Especificações técnicas e arquitetura</li>
            <li>• <strong>AUDIO_CAPTURE_ISSUE.md</strong> - Solução para captura de áudio</li>
            <li>• Para testar gravações: use o token gerado com a API (porta 8080)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

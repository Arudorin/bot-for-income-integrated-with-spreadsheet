import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, Key, LogOut, UserPlus, Users, CheckCircle2, AlertCircle, X, Eye, EyeOff } from 'lucide-react';
import { AuthUser, UserRole } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
  onPasswordChanged?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onPasswordChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'manage'>('profile');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New user registration state (Admin only)
  const [usersList, setUsersList] = useState<AuthUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [newAccountRole, setNewAccountRole] = useState<UserRole>('cashier');
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'manage' && currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [isOpen, activeTab, currentUser]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('bot_auth_token') || sessionStorage.getItem('bot_auth_token') || '';
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  if (!isOpen || !currentUser) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok' });
      return;
    }

    if (newPassword.length < 4) {
      setPasswordMessage({ type: 'error', text: 'Password baru minimal 4 karakter' });
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem('bot_auth_token') || sessionStorage.getItem('bot_auth_token') || '';
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordMessage({ type: 'success', text: 'Password berhasil diubah!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (onPasswordChanged) onPasswordChanged();
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Gagal mengubah password' });
      }
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: 'Terjadi kesalahan sistem saat mengubah password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMessage(null);

    if (!newUsername.trim() || !newAccountPassword) {
      setCreateMessage({ type: 'error', text: 'Username dan password wajib diisi' });
      return;
    }

    setCreateLoading(true);
    try {
      const token = localStorage.getItem('bot_auth_token') || sessionStorage.getItem('bot_auth_token') || '';
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          name: newName.trim() || newUsername.trim(),
          password: newAccountPassword,
          role: newAccountRole,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreateMessage({ type: 'success', text: `Akun "${newUsername}" berhasil dibuat!` });
        setNewUsername('');
        setNewName('');
        setNewAccountPassword('');
        fetchUsers();
      } else {
        setCreateMessage({ type: 'error', text: data.error || 'Gagal membuat akun' });
      }
    } catch (err: any) {
      setCreateMessage({ type: 'error', text: 'Terjadi kesalahan sistem saat membuat akun' });
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              {currentUser.role === 'admin' ? '👑' : '💼'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base text-white">{currentUser.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-blue-400 text-slate-950'
                }`}>
                  {currentUser.role === 'admin' ? 'Owner / Admin' : 'Kasir Toko'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">@{currentUser.username}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100/90 p-1.5 border-b border-slate-200 flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Profil Akun
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'password'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ubah Password
          </button>
          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'manage'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kelola Staff ({usersList.length || '...'})
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: PROFILE OVERVIEW */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Nama Lengkap</span>
                  <span className="font-semibold text-slate-800">{currentUser.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Username</span>
                  <span className="font-mono font-semibold text-slate-800">@{currentUser.username}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Peran / Hak Akses</span>
                  <span className="font-semibold text-emerald-700">
                    {currentUser.role === 'admin' ? 'Administrator / Pemilik Usaha' : 'Kasir / Petugas Toko'}
                  </span>
                </div>
                {currentUser.lastLogin && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Terakhir Masuk</span>
                    <span className="font-mono text-slate-600">
                      {new Date(currentUser.lastLogin).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>

              {/* Role explanation */}
              <div className="bg-blue-50 border border-blue-200/70 rounded-2xl p-3.5 text-xs text-blue-800 space-y-1">
                <span className="font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  <span>Informasi Izin Akses:</span>
                </span>
                <p className="text-blue-700 leading-relaxed text-[11px]">
                  {currentUser.role === 'admin'
                    ? 'Sebagai Admin/Owner, Anda memiliki akses penuh mengubah pengaturan bot WhatsApp, Telegram, integrasi Google Sheets, menambah/menghapus transaksi, serta mengatur akun staf.'
                    : 'Sebagai Kasir, Anda dapat melihat database transaksi, menginput penjualan manual & via simulator bot, serta memperbarui status pembayaran (Lunas/Belum Lunas).'}
                </p>
              </div>

              {/* Logout Button */}
              <div className="pt-2">
                <button
                  type="button"
                  id="btn-profile-logout"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2 min-h-[40px]"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Keluar dari Akun (Logout)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-3.5">
              {passwordMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
                    passwordMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  )}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-cur-pass">
                  Password Saat Ini
                </label>
                <input
                  id="input-cur-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ketik password lama Anda"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-new-pass">
                  Password Baru
                </label>
                <input
                  id="input-new-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-conf-pass">
                  Konfirmasi Password Baru
                </label>
                <input
                  id="input-conf-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-500 hover:text-slate-800 inline-flex items-center space-x-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                  <span>{showPassword ? 'Sembunyikan password' : 'Tampilkan password'}</span>
                </button>
              </div>

              <button
                id="btn-submit-change-password"
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center space-x-2 disabled:opacity-50 min-h-[40px] mt-2"
              >
                {passwordLoading ? (
                  <span>Menyimpan Password...</span>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    <span>Simpan Password Baru</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: MANAGE STAFF (ADMIN ONLY) */}
          {activeTab === 'manage' && currentUser.role === 'admin' && (
            <div className="space-y-4">
              {/* Existing Users List */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Daftar Akun Pengguna</span>
                </h4>
                <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  {usersList.map((u) => (
                    <div key={u.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{u.name}</span>
                          <span className="font-mono text-slate-400 text-[11px]">(@{u.username})</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {u.role === 'admin' ? 'Owner' : 'Kasir'}
                          </span>
                        </div>
                        {u.lastLogin && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Login terakhir: {new Date(u.lastLogin).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New User Form */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  <span>Tambah Akun Staff / Kasir Baru</span>
                </h4>

                {createMessage && (
                  <div
                    className={`p-3 mb-3 rounded-xl text-xs flex items-start space-x-2 ${
                      createMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span>{createMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1" htmlFor="input-new-user-username">
                        Username
                      </label>
                      <input
                        id="input-new-user-username"
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="contoh: kasir_pagi"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1" htmlFor="input-new-user-name">
                        Nama Lengkap / Panggilan
                      </label>
                      <input
                        id="input-new-user-name"
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="contoh: Budi (Shift 1)"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1" htmlFor="input-new-user-pass">
                        Password
                      </label>
                      <input
                        id="input-new-user-pass"
                        type="password"
                        required
                        value={newAccountPassword}
                        onChange={(e) => setNewAccountPassword(e.target.value)}
                        placeholder="Minimal 4 karakter"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1" htmlFor="select-new-user-role">
                        Hak Akses
                      </label>
                      <select
                        id="select-new-user-role"
                        value={newAccountRole}
                        onChange={(e) => setNewAccountRole(e.target.value as UserRole)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="cashier">💼 Kasir Toko</option>
                        <option value="admin">👑 Owner / Administrator</option>
                      </select>
                    </div>
                  </div>

                  <button
                    id="btn-submit-create-user"
                    type="submit"
                    disabled={createLoading}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 mt-2"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{createLoading ? 'Mendaftarkan...' : 'Daftarkan Akun'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

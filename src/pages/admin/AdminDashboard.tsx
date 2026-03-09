import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, CheckCircle, XCircle, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminUser {
    id: string;
    username: string;
    role: 'admin' | 'user';
    status: 'pending' | 'approved' | 'banned';
    created_at: string;
}

export default function AdminDashboard() {
    const { token } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [token]);

    const handleStatusChange = async (userId: string, status: 'approved' | 'banned' | 'pending') => {
        try {
            const res = await fetch(`/api/admin/users/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error('Failed to update status');
            fetchUsers();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete user');
            fetchUsers();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-5xl mx-auto space-y-6 pb-24" dir="rtl">
            <header className="flex items-center gap-3 pt-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl text-red-500 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">لوحة الإدارة</h1>
                    <p className="text-muted-foreground text-sm">إدارة المستخدمين والصلاحيات</p>
                </div>
            </header>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm">
                    {error}
                </div>
            )}

            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border/60 flex items-center justify-between">
                    <h2 className="font-bold flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-primary" />
                        قائمة المستخدمين
                    </h2>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">
                        {users.length} مستخدم
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 font-medium">اسم المستخدم</th>
                                <th className="px-4 py-3 font-medium">الدور</th>
                                <th className="px-4 py-3 font-medium">الحالة</th>
                                <th className="px-4 py-3 font-medium">تاريخ التسجيل</th>
                                <th className="px-4 py-3 font-medium text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {users.map((u) => (
                                <motion.tr
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    key={u.id}
                                    className="hover:bg-muted/50 transition-colors"
                                >
                                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                            {u.username.substring(0, 2)}
                                        </div>
                                        {u.username}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-md border font-medium ${u.role === 'admin' ? 'bg-purple-500/10 border-purple-500/20 text-purple-600' : 'bg-secondary border-border text-foreground'}`}>
                                            {u.role === 'admin' ? 'مدير' : 'مستخدم'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-md border font-medium flex items-center gap-1.5 w-max ${u.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                                                u.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                                                    'bg-red-500/10 border-red-500/20 text-red-600'
                                            }`}>
                                            {u.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                                            {u.status === 'pending' && <Loader2 className="w-3 h-3 animate-spin" />}
                                            {u.status === 'banned' && <XCircle className="w-3 h-3" />}
                                            {u.status === 'approved' ? 'نشط' : u.status === 'pending' ? 'قيد الانتظار' : 'محظور'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs" dir="ltr">
                                        {new Date(u.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            {u.role !== 'admin' && (
                                                <>
                                                    {u.status !== 'approved' && (
                                                        <button
                                                            onClick={() => handleStatusChange(u.id, 'approved')}
                                                            className="p-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-md transition-colors"
                                                            title="موافقة"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {u.status !== 'banned' && (
                                                        <button
                                                            onClick={() => handleStatusChange(u.id, 'banned')}
                                                            className="p-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded-md transition-colors"
                                                            title="حظر"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(u.id)}
                                                        className="p-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-md transition-colors"
                                                        title="حذف"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}

                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                                        لا يوجد مستخدمين
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div >
        </div >
    );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, CheckCircle, XCircle, Trash2, UserPlus, Loader2, Coins, BarChart3, Save, Settings2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminUser {
    id: string;
    username: string;
    role: 'admin' | 'user';
    status: 'pending' | 'approved' | 'banned';
    created_at: string;
    creditsBalance?: number;
    totalUsage?: number;
}

interface CreditSettings {
    default_credits: number;
    cost_text: number;
    cost_image: number;
    cost_video: number;
    updated_at: string | null;
}

export default function AdminDashboard() {
    const { token } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [creditSettings, setCreditSettings] = useState<CreditSettings | null>(null);
    const [creditSettingsEditing, setCreditSettingsEditing] = useState<Partial<CreditSettings>>({});
    const [savingCredits, setSavingCredits] = useState(false);
    const [editingCreditsFor, setEditingCreditsFor] = useState<string | null>(null);
    const [editCreditsValue, setEditCreditsValue] = useState<string>('');

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

    const fetchCreditSettings = async () => {
        try {
            const res = await fetch('/api/admin/credits/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCreditSettings(data);
                setCreditSettingsEditing(data);
            }
        } catch { /* ignore */ }
    };

    useEffect(() => {
        fetchUsers();
    }, [token]);

    useEffect(() => {
        if (token) fetchCreditSettings();
    }, [token]);

    const saveCreditSettings = async () => {
        setSavingCredits(true);
        try {
            const res = await fetch('/api/admin/credits/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(creditSettingsEditing),
            });
            if (!res.ok) throw new Error('Failed to save');
            const data = await res.json();
            setCreditSettings(data);
            setCreditSettingsEditing(data);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSavingCredits(false);
        }
    };

    const handleSetCredits = async (userId: string) => {
        const val = parseInt(editCreditsValue, 10);
        if (isNaN(val) || val < 0) {
            alert('أدخل رقماً صحيحاً غير سالب');
            return;
        }
        try {
            const res = await fetch(`/api/admin/users/${userId}/credits`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ credits: val }),
            });
            if (!res.ok) throw new Error('Failed to update credits');
            setEditingCreditsFor(null);
            setEditCreditsValue('');
            fetchUsers();
        } catch (err: any) {
            alert(err.message);
        }
    };

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

            {/* Credit settings */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-4">
                <h2 className="font-bold flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-primary" />
                    إعدادات الكريدت
                </h2>
                {creditSettings && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">رصيد افتراضي (مستخدم جديد)</label>
                            <input
                                type="number"
                                min={0}
                                value={creditSettingsEditing.default_credits ?? creditSettings.default_credits}
                                onChange={(e) => setCreditSettingsEditing((p) => ({ ...p, default_credits: parseInt(e.target.value, 10) || 0 }))}
                                className="w-full p-2 border border-border rounded-lg bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">تكلفة النص</label>
                            <input
                                type="number"
                                min={0}
                                value={creditSettingsEditing.cost_text ?? creditSettings.cost_text}
                                onChange={(e) => setCreditSettingsEditing((p) => ({ ...p, cost_text: parseInt(e.target.value, 10) || 0 }))}
                                className="w-full p-2 border border-border rounded-lg bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">تكلفة الصورة</label>
                            <input
                                type="number"
                                min={0}
                                value={creditSettingsEditing.cost_image ?? creditSettings.cost_image}
                                onChange={(e) => setCreditSettingsEditing((p) => ({ ...p, cost_image: parseInt(e.target.value, 10) || 0 }))}
                                className="w-full p-2 border border-border rounded-lg bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">تكلفة الفيديو</label>
                            <input
                                type="number"
                                min={0}
                                value={creditSettingsEditing.cost_video ?? creditSettings.cost_video}
                                onChange={(e) => setCreditSettingsEditing((p) => ({ ...p, cost_video: parseInt(e.target.value, 10) || 0 }))}
                                className="w-full p-2 border border-border rounded-lg bg-background"
                            />
                        </div>
                    </div>
                )}
                <button
                    onClick={saveCreditSettings}
                    disabled={savingCredits}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:brightness-110 disabled:opacity-50"
                >
                    {savingCredits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ إعدادات الكريدت
                </button>
            </div>

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
                                <th className="px-4 py-3 font-medium"><Coins className="w-3.5 h-3.5 inline ml-1" /> الرصيد</th>
                                <th className="px-4 py-3 font-medium"><BarChart3 className="w-3.5 h-3.5 inline ml-1" /> الاستهلاك</th>
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
                                    <td className="px-4 py-3">
                                        {editingCreditsFor === u.id ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={editCreditsValue}
                                                    onChange={(e) => setEditCreditsValue(e.target.value)}
                                                    className="w-20 p-1.5 border border-border rounded bg-background text-xs"
                                                />
                                                <button onClick={() => handleSetCredits(u.id)} className="p-1.5 bg-primary text-primary-foreground rounded text-xs">حفظ</button>
                                                <button onClick={() => { setEditingCreditsFor(null); setEditCreditsValue(''); }} className="p-1.5 bg-secondary rounded text-xs">إلغاء</button>
                                            </div>
                                        ) : (
                                            <span className="font-medium">{u.creditsBalance ?? 0}</span>
                                        )}
                                        {editingCreditsFor !== u.id && u.role !== 'admin' && (
                                            <button onClick={() => { setEditingCreditsFor(u.id); setEditCreditsValue(String(u.creditsBalance ?? 0)); }} className="mr-2 text-xs text-primary hover:underline">تعديل</button>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{u.totalUsage ?? 0}</td>
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
                                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
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

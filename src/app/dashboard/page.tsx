"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, Clock, CheckCircle2, XCircle, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function ConsultantDashboard() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [consultantData, setConsultantData] = useState<any>(null);
    const [onlineClients, setOnlineClients] = useState<Set<string>>(new Set());

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        let activeChannel: any = null;
        let presenceChannel: any = null;

        const fetchSessions = async (userId: string) => {
            const { data } = await supabase
                .from("sessions")
                .select(`id, room_id, status, client_id, client_info, created_at, client:profiles!sessions_client_id_fkey(full_name, avatar_url)`)
                .eq("consultant_id", userId)
                .order("created_at", { ascending: false });

            if (data) setSessions(data);
            setLoading(false);
        };

        const fetchConsultantData = async (userId: string) => {
            const { data } = await supabase
                .from("consultants")
                .select("id, is_online")
                .eq("id", userId)
                .maybeSingle();

            if (data) {
                setConsultantData(data);
                setIsOnline(data.is_online);
            }
        };

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setUser(user);

            fetchSessions(user.id);
            fetchConsultantData(user.id);

            // Session updates realtime
            if (!activeChannel) {
                activeChannel = supabase
                    .channel(`dashboard_sessions_${user.id}`)
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'sessions',
                        filter: `consultant_id=eq.${user.id}`
                    }, () => fetchSessions(user.id))
                    .subscribe();
            }

            // Presence tracking
            if (!presenceChannel) {
                presenceChannel = supabase.channel('online_users_dashboard');
                presenceChannel
                    .on('presence', { event: 'sync' }, () => {
                        const state = presenceChannel.presenceState();
                        const onlineIds = new Set<string>();
                        Object.values(state).forEach((presences: any) => {
                            (presences as any[]).forEach((p: any) => {
                                if (p.user_id) onlineIds.add(p.user_id);
                            });
                        });
                        setOnlineClients(onlineIds);
                    })
                    .subscribe();
            }
        };

        init();

        return () => {
            if (activeChannel) supabase.removeChannel(activeChannel);
            if (presenceChannel) supabase.removeChannel(presenceChannel);
        };
    }, [supabase, router]);

    const toggleOnline = async () => {
        if (!user) return;
        const newStatus = !isOnline;
        setIsOnline(newStatus);
        const { error } = await supabase
            .from("consultants")
            .update({ is_online: newStatus })
            .eq("id", user.id);
        if (error) {
            console.error("Failed to update status", error);
            setIsOnline(!newStatus);
        }
    };

    const handleAcceptSession = async (session: any) => {
        const { error } = await supabase
            .from("sessions")
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', session.id);

        if (!error) {
            router.push(`/room?id=${session.room_id}&role=consultant`);
        } else {
            console.error("Failed to accept session", error);
        }
    };

    const handleRejectSession = async (session: any) => {
        await supabase
            .from("sessions")
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', session.id);
    };

    return (
        <div className="min-h-screen bg-bg text-text p-6 md:p-12 font-inter pt-24">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-white mb-2">Danışman Paneli</h1>
                        <p className="text-sm text-text-muted">Gelen talepleri görüntüleyin ve yönetin.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-surface/50 p-2 rounded-2xl border border-white/5">
                        <div className="flex flex-col text-right mr-2">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted/60">Durumunuz</span>
                            <span className={cn("text-xs font-bold", isOnline ? "text-emerald-400" : "text-red-400")}>
                                {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                            </span>
                        </div>
                        <button
                            onClick={toggleOnline}
                            className={cn(
                                "relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none",
                                isOnline ? "bg-emerald-500/80" : "bg-red-500/20"
                            )}
                        >
                            <motion.div
                                animate={{ x: isOnline ? 26 : 4 }}
                                className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md"
                            />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sessions.length === 0 ? (
                            <div className="glass p-8 rounded-2xl text-center border border-white/5">
                                <p className="text-text-muted font-medium">Henüz bir randevu/okuma talebiniz yok.</p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {sessions.map((session) => (
                                    <motion.div
                                        key={session.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="glass p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-6 md:items-center justify-between"
                                    >
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold uppercase text-lg">
                                                    {session.client?.full_name?.charAt(0) || "M"}
                                                    <div className={cn("absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#161623]", onlineClients.has(session.client_id) ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-zinc-600")} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                        {session.client?.full_name || "Gizli Müşteri"}
                                                        {onlineClients.has(session.client_id) && (
                                                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-emerald-500/20 font-bold ml-1">Yayında</span>
                                                        )}
                                                    </h3>
                                                    <p className="text-xs text-text-muted flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(session.created_at).toLocaleString('tr-TR')}
                                                    </p>
                                                </div>
                                            </div>

                                            {session.client_info && (
                                                <div className="bg-surface/50 p-3 rounded-lg border border-white/5 text-sm space-y-1 mt-3">
                                                    {session.client_info.focus && <p><span className="text-text-muted">Niyet:</span> {session.client_info.focus}</p>}
                                                    {session.client_info.pkgId && <p><span className="text-text-muted">Paket:</span> <span className="text-accent">{session.client_info.pkgId}</span></p>}
                                                    {session.client_info.cards && <p><span className="text-text-muted">Kart Sayısı:</span> {session.client_info.cards}</p>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col md:items-end gap-2 shrink-0">
                                            {session.status === 'pending' && !session.client_info?.is_offline_request && (
                                                <>
                                                    <span className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 font-bold uppercase mb-2">
                                                        Canlı İstek Bekliyor
                                                    </span>
                                                    <div className="flex gap-2 w-full md:w-auto">
                                                        <button
                                                            onClick={() => handleRejectSession(session)}
                                                            className="flex-1 md:flex-none px-4 py-2 bg-white/5 hover:bg-red-500/20 text-text-muted hover:text-red-400 rounded-xl transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                                        >
                                                            <XCircle className="w-4 h-4" /> Reddet
                                                        </button>
                                                        <button
                                                            onClick={() => handleAcceptSession(session)}
                                                            className="flex-1 md:flex-none px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl shadow-lg transition-transform active:scale-95 font-bold flex items-center justify-center gap-2"
                                                        >
                                                            <CheckCircle2 className="w-5 h-5" /> Kabul Et
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            {session.status === 'pending' && session.client_info?.is_offline_request && (
                                                <>
                                                    <span className="text-xs bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20 font-bold uppercase mb-2">
                                                        Randevu Talebi
                                                    </span>
                                                    <div className="flex gap-2 w-full md:w-auto">
                                                        <button
                                                            onClick={() => handleRejectSession(session)}
                                                            className="flex-1 md:flex-none px-4 py-2 bg-white/5 hover:bg-red-500/20 text-text-muted hover:text-red-400 rounded-xl transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                                        >
                                                            <XCircle className="w-4 h-4" /> Reddet
                                                        </button>
                                                        <button
                                                            onClick={() => handleAcceptSession(session)}
                                                            className="flex-1 md:flex-none px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl shadow-lg transition-transform active:scale-95 font-bold flex items-center justify-center gap-2 text-[13px] whitespace-nowrap"
                                                        >
                                                            <CheckCircle2 className="w-5 h-5" /> Onayla ve Odayı Kur
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            {session.status === 'active' && (
                                                <>
                                                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-bold uppercase mb-2 flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        Aktif (Devam Ediyor)
                                                    </span>
                                                    <button
                                                        onClick={() => router.push(`/room?id=${session.room_id}&role=consultant`)}
                                                        className="w-full md:w-auto px-6 py-2 bg-accent hover:bg-accent-dim text-white rounded-xl shadow-lg hover:shadow-accent/20 transition-all font-bold"
                                                    >
                                                        Odaya Geri Dön
                                                    </button>
                                                </>
                                            )}

                                            {session.status === 'completed' && (
                                                <span className="text-xs bg-white/10 text-white/50 px-3 py-1 rounded-full border border-white/10 font-bold uppercase">
                                                    Tamamlandı
                                                </span>
                                            )}

                                            {session.status === 'cancelled' && (
                                                <span className="text-xs bg-red-500/10 text-red-500/70 px-3 py-1 rounded-full border border-red-500/10 font-bold uppercase">
                                                    İptal / Red
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

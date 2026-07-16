"use client";



import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import {
    User, Calendar, Moon, Star, Sparkles, LogOut,
    ChevronRight, Heart, Brain, MapPin, Edit3, Save, X, Loader2, Clock, History
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Profile {
    full_name: string;
    birth_date: string;
    birth_time: string;
    zodiac_sign: string;
    ascendant_sign: string;
    interests: string[];
}

const ZODIAC_SIGNS = [
    "Koç", "Boğa", "İkizler", "Yengeç", "Aslan", "Başak",
    "Terazi", "Akrep", "Yay", "Oğlak", "Kova", "Balık"
];

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        if (!supabase) return;
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setUser(user);

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();

            if (data) {
                setProfile(data);
                setEditedProfile(data);
            } else {
                // Initialize with empty if profile doesn't exist yet
                const emptyProfile = {
                    full_name: user?.user_metadata?.full_name || "",
                    birth_date: user?.user_metadata?.birth_date || "",
                    birth_time: "",
                    zodiac_sign: "",
                    ascendant_sign: "",
                    interests: []
                };
                setProfile(emptyProfile);
                setEditedProfile(emptyProfile);
            }

            // Fetch session history (excluding active as they are on homepage, EXCEPT active ones that are accepted offline appointments)
            const { data: sessionData } = await supabase
                .from("sessions")
                .select(`*, consultant:consultants(display_name)`)
                .or(`client_id.eq.${user.id},consultant_id.eq.${user.id}`)
                .order('created_at', { ascending: false })
                .limit(20);

            if (sessionData) {
                // Sadece normal canlı sıra bekleme (istek) olanları gizle, offline randevu taleplerini ve diğer durumları göster
                const filtered = sessionData.filter((s: any) => !(s.status === 'pending' && !s.client_info?.is_offline_request));
                setHistory(filtered.slice(0, 10));
            }

            setLoading(false);
        }
        loadProfile();
    }, []);

    const handleSave = async () => {
        if (!editedProfile || !user) return;
        setSaving(true);

        // Sanitize data: convert empty strings to null for date/time
        const sanitized = {
            ...editedProfile,
            birth_date: editedProfile.birth_date || null,
            birth_time: editedProfile.birth_time || null,
            zodiac_sign: editedProfile.zodiac_sign || null,
            ascendant_sign: editedProfile.ascendant_sign || null
        };

        const { error } = await supabase
            .from("profiles")
            .upsert({ id: user.id, ...sanitized });

        if (!error) {
            setProfile(editedProfile);
            setIsEditing(false);
        } else {
            console.error("Save error:", error);
            alert("Bilgiler kaydedilirken bir hata oluştu: " + error.message);
        }
        setSaving(false);
    };

    const handleCancelRequest = async (sessionId: string) => {
        const { error } = await supabase
            .from("sessions")
            .update({ status: 'cancelled' })
            .eq("id", sessionId);

        if (!error) {
            setHistory(h => h.map(s => s.id === sessionId ? { ...s, status: 'cancelled' } : s));
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-text font-inter pb-20 overflow-hidden relative">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none" />

            <div className="max-w-2xl mx-auto px-4 pt-12 relative z-10">
                {/* Header/Back */}
                <button
                    onClick={() => router.push("/")}
                    className="flex items-center gap-2 text-text-muted hover:text-accent transition-colors mb-8 text-sm font-bold uppercase tracking-widest"
                >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Ana Sayfa
                </button>

                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#161623]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4">
                        <Sparkles className="w-6 h-6 text-accent/20" />
                    </div>

                    <div className="flex flex-col items-center mb-10">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 to-amber-400 p-1 mb-4 shadow-xl shadow-purple-500/20">
                            <div className="w-full h-full rounded-full bg-[#161623] flex items-center justify-center overflow-hidden border-2 border-[#161623]">
                                <User className="w-12 h-12 text-white/80" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
                            {profile?.full_name || "Mistik Yolcu"}
                        </h1>
                        <p className="text-text-muted text-sm font-medium tracking-widest uppercase mt-1">
                            {profile?.zodiac_sign ? `${profile.zodiac_sign} Burcu` : "Kozmik Üye"}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                                <Star className="w-4 h-4" />
                                Kozmik Kimlik
                            </h2>
                            <button
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                disabled={saving}
                                className="flex items-center gap-2 text-xs font-bold text-accent hover:text-white transition-colors"
                            >
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                                {isEditing ? "Kaydet" : "Bilgileri Düzenle"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Ad Soyad */}
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">Ad Soyad</p>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="bg-transparent border-none text-white focus:outline-none w-full text-sm"
                                        value={editedProfile?.full_name || ""}
                                        onChange={e => setEditedProfile(p => p ? { ...p, full_name: e.target.value } : null)}
                                    />
                                ) : (
                                    <p className="text-white font-medium">{profile?.full_name || "Belirtilmemiş"}</p>
                                )}
                            </div>

                            {/* Doğum Tarihi */}
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">Doğum Tarihi</p>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-white focus:outline-none w-full text-sm [color-scheme:dark]"
                                        value={editedProfile?.birth_date || ""}
                                        onChange={e => setEditedProfile(p => p ? { ...p, birth_date: e.target.value } : null)}
                                    />
                                ) : (
                                    <p className="text-white font-medium">{profile?.birth_date || "Belirtilmemiş"}</p>
                                )}
                            </div>

                            {/* Burç */}
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">Burç</p>
                                {isEditing ? (
                                    <select
                                        className="bg-zinc-900 border border-white/10 rounded-lg text-white focus:outline-none w-full text-sm p-1"
                                        value={editedProfile?.zodiac_sign || ""}
                                        onChange={e => setEditedProfile(p => p ? { ...p, zodiac_sign: e.target.value } : null)}
                                    >
                                        <option value="">Seçiniz</option>
                                        {ZODIAC_SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                                    </select>
                                ) : (
                                    <p className="text-white font-medium">{profile?.zodiac_sign || "Belirtilmemiş"}</p>
                                )}
                            </div>

                            {/* Yükselen */}
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">Yükselen</p>
                                {isEditing ? (
                                    <select
                                        className="bg-zinc-900 border border-white/10 rounded-lg text-white focus:outline-none w-full text-sm p-1"
                                        value={editedProfile?.ascendant_sign || ""}
                                        onChange={e => setEditedProfile(p => p ? { ...p, ascendant_sign: e.target.value } : null)}
                                    >
                                        <option value="">Seçiniz</option>
                                        {ZODIAC_SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                                    </select>
                                ) : (
                                    <p className="text-white font-medium">{profile?.ascendant_sign || "Belirtilmemiş"}</p>
                                )}
                            </div>
                        </div>

                        {/* İlgi Alanları Section */}
                        <div className="mt-8">
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-2 mb-4">
                                <Heart className="w-4 h-4" />
                                Ruhani İlgi Alanları
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {["Tarot", "Astroloji", "Meditasyon", "Numeroloji", "Rüya Tabiri", "Ritüeller"].map(tag => {
                                    const isSelected = profile?.interests?.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            onClick={() => {
                                                if (!isEditing) return;
                                                const current = editedProfile?.interests || [];
                                                const next = current.includes(tag)
                                                    ? current.filter(t => t !== tag)
                                                    : [...current, tag];
                                                setEditedProfile(p => p ? { ...p, interests: next } : null);
                                            }}
                                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${isSelected
                                                ? "bg-accent/20 border-accent/40 text-accent shadow-lg shadow-accent/10"
                                                : "bg-white/5 border-white/10 text-text-muted hover:border-white/20"
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Oturum Geçmişi */}
                        <div className="mt-10 border-t border-white/5 pt-8">
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-2 mb-6">
                                <History className="w-5 h-5" />
                                Randevular & Geçmiş Oturumlar
                            </h2>

                            {history.length === 0 ? (
                                <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-sm text-text-muted">Henüz tamamlanmış bir oturumunuz bulunmuyor.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((session) => (
                                        <div key={session.id} className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                                                    <Clock className="w-5 h-5 text-accent" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">
                                                        {session.consultant?.display_name || "Danışman"} İle Görüşme
                                                    </p>
                                                    <p className="text-[10px] text-text-muted mt-1 uppercase tracking-widest">
                                                        {new Date(session.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {session.status === 'completed' ? (
                                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20 uppercase">
                                                        Tamamlandı
                                                    </span>
                                                ) : session.status === 'cancelled' ? (
                                                    <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-3 py-1 rounded-full border border-red-400/20 uppercase">
                                                        İptal / Red
                                                    </span>
                                                ) : session.status === 'pending' && session.client_info?.is_offline_request ? (
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 uppercase">
                                                            Danışman Onayı Bekliyor
                                                        </span>
                                                        <button
                                                            onClick={() => handleCancelRequest(session.id)}
                                                            className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase font-bold px-3 py-1"
                                                        >
                                                            Talebi İptal Et
                                                        </button>
                                                    </div>
                                                ) : session.status === 'active' ? (
                                                    <>
                                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20 uppercase flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            Oda Hazır
                                                        </span>
                                                        <button
                                                            onClick={() => router.push(`/room?id=${session.room_id}&role=client`)}
                                                            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center gap-2"
                                                        >
                                                            <Sparkles className="w-3 h-3" />
                                                            Hemen Katıl
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-text-muted uppercase">{session.status}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Footer Actions */}
                <div className="mt-8 flex items-center justify-between">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-red-400/70 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                        <LogOut className="w-4 h-4" />
                        Oturumu Kapat
                    </button>

                    <p className="text-[10px] text-text-muted font-medium">
                        Tarot App v0.1.0 • 2026
                    </p>
                </div>
            </div>
        </div>
    );
}

"use client";



import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Calendar, Clock, ArrowRight, ArrowLeft, Star, Heart, Moon, ChevronRight, Loader2, UserIcon, X, Check, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { createClient } from "@/utils/supabase/client";
import { getCardMeaning, getCardImage } from "@/lib/cardData";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ─── TYPES & DATA ───────────────────────────────────────────────

type ReadingPackage = {
    id: string;
    name: string;
    cards: number;
    icon: React.ReactNode;
    desc: string;
    price?: string;
};

const PACKAGES: ReadingPackage[] = [
    { id: "standard", name: "Standart Açılım", cards: 3, price: "₺150", icon: <Sparkles className="w-5 h-5" />, desc: "Geçmiş, Şimdi ve Gelecek üzerine genel bir bakış. En popüler seçim." },
    { id: "synastry", name: "İlişki / Sinastri", cards: 7, price: "₺250", icon: <Heart className="w-5 h-5" />, desc: "İki kişi arasındaki dinamiği, uyumu ve geleceği analiz eder." },
    { id: "matrix", name: "Gelişmiş Matris", cards: 9, price: "₺300", icon: <Eye className="w-5 h-5" />, desc: "Mevcut durumların 3x3 detaylı haritası ile derinlemesine analiz." },
    { id: "celtic", name: "Kelt Haçı", cards: 10, price: "₺350", icon: <Star className="w-5 h-5" />, desc: "Derinlemesine ve kapsamlı bir hayat ve olay analizi okuması." },
    { id: "astrological", name: "Astrolojik 12 Ev", cards: 12, price: "₺450", icon: <Moon className="w-5 h-5" />, desc: "Yılın 12 ayına veya hayatın 12 alanına profesyonel detaylı bakış." },
];

function calculateSoulCard(date: Date): { number: number; name: string } {
    if (isNaN(date.getTime())) return { number: 0, name: "" };
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    const digits = `${d}${m}${y}`.split('').map(Number);
    let sum = digits.reduce((a, b) => a + b, 0);
    while (sum > 21) {
        sum = String(sum).split('').map(Number).reduce((a, b) => a + b, 0);
    }
    if (sum === 1) sum = 10;
    const majorArcana = [
        "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
        "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
        "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
        "The Devil", "The Tower", "The Star", "The Moon", "The Sun",
        "Judgement", "The World"
    ];
    return { number: sum, name: majorArcana[sum] };
}

function calculatePersonalityCard(day: number): { number: number; name: string } {
    if (!day || isNaN(day)) return { number: 0, name: "" };
    let num = day;
    while (num > 21) {
        num = String(num).split('').map(Number).reduce((a, b) => a + b, 0);
    }
    const majorArcana = [
        "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
        "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
        "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
        "The Devil", "The Tower", "The Star", "The Moon", "The Sun",
        "Judgement", "The World"
    ];
    return { number: num, name: majorArcana[num] };
}

// ─── AMBIENT BACKGROUND PARTICLES ───────────────────────────────
function Particles() {
    const [mounted, setMounted] = useState(false);
    const particles = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 5,
        duration: Math.random() * 10 + 15,
    })), []);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full bg-purple-400/30"
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
                    animate={{ y: [0, -100, 0], opacity: [0, 0.5, 0] }}
                    transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
                />
            ))}
        </div>
    );
}

// ─── MAIN CONTENT ───────────────────────────────────────────────
function TarotConsultantsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [step, setStep] = useState<string>("welcome");
    const [clientName, setClientName] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [birthTime, setBirthTime] = useState("");
    const [selectedPackage, setSelectedPackage] = useState<string>("");
    const [readingFocus, setReadingFocus] = useState("");
    const [gender, setGender] = useState("");

    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    const [consultants, setConsultants] = useState<any[]>([]);
    const [selectedConsultant, setSelectedConsultant] = useState<any>(null);
    const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
    const [isWaitingForConsultant, setIsWaitingForConsultant] = useState(false);
    const [rejectedModal, setRejectedModal] = useState(false);
    const [appointmentModal, setAppointmentModal] = useState(false);
    const [offlineWarningModal, setOfflineWarningModal] = useState(false);
    const [clientSessions, setClientSessions] = useState<any[]>([]);
    const [isConsultant, setIsConsultant] = useState(false);
    const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

    const supabase = createClient();

    const [dailyCardIndex, setDailyCardIndex] = useState<number | null>(null);
    const [isDailyFlipped, setIsDailyFlipped] = useState(false);

    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];
        const savedDate = localStorage.getItem("daily_card_date");
        const savedIndex = localStorage.getItem("daily_card_index");

        if (savedDate === today && savedIndex !== null) {
            setDailyCardIndex(parseInt(savedIndex, 10));
            setIsDailyFlipped(true);
        }
    }, []);

    const handleDailyFlip = () => {
        if (isDailyFlipped) return;
        const randomIndex = Math.floor(Math.random() * 78);
        const today = new Date().toISOString().split("T")[0];

        localStorage.setItem("daily_card_date", today);
        localStorage.setItem("daily_card_index", randomIndex.toString());

        setDailyCardIndex(randomIndex);
        setIsDailyFlipped(true);
    };

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase.from("profiles").select("role, full_name, birth_date, zodiac_sign, ascendant_sign").eq("id", userId).maybeSingle();
        if (data) setProfile(data);
    };

    const fetchActiveSessions = async (userId: string) => {
        const { data } = await supabase
            .from('sessions')
            .select(`id, room_id, status, client_info, consultant_id, created_at, consultant:consultants(display_name)`)
            .or(`client_id.eq.${userId},consultant_id.eq.${userId}`)
            .in('status', ['active', 'pending'])
            .order('created_at', { ascending: false })
            .limit(5);

        if (data) {
            const now = new Date();
            const validSessions = data.filter((s: any) => {
                if (s.status === 'pending') {
                    const sessionDate = new Date(s.created_at);
                    const diffMinutes = (now.getTime() - sessionDate.getTime()) / (1000 * 60);
                    return diffMinutes < 60; // 1 saatten eskiyse pending olarak gösterme
                }
                return true;
            });
            setClientSessions(validSessions);
        }
    };

    const checkIsConsultant = async (userId: string) => {
        const { data } = await supabase.from('consultants').select('id').eq('id', userId).maybeSingle();
        if (data) setIsConsultant(true);
    };

    const fetchConsultants = async () => {
        setIsLoadingProfiles(true);
        const { data } = await supabase.from("consultants").select(`id, display_name, rating, is_online, specialties, profiles(avatar_url)`).order('is_online', { ascending: false });
        if (data) setConsultants(data);
        setIsLoadingProfiles(false);
    };

    useEffect(() => {
        if (!supabase) return;
        let isMounted = true;
        let sessionStatusChannel: any = null;

        const initUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!isMounted) return;
            const currentUser = session?.user;
            setUser(currentUser ?? null);

            if (currentUser) {
                fetchProfile(currentUser.id);
                fetchActiveSessions(currentUser.id);
                checkIsConsultant(currentUser.id);

                sessionStatusChannel = supabase.channel(`user_sessions_${currentUser.id}`)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `client_id=eq.${currentUser.id}` }, () => {
                        if (isMounted) fetchActiveSessions(currentUser.id);
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `consultant_id=eq.${currentUser.id}` }, () => {
                        if (isMounted) fetchActiveSessions(currentUser.id);
                    })
                    .subscribe();
            }
        };

        initUser();
        fetchConsultants();

        const consultantChannel = supabase.channel('consultant_status_global')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'consultants' }, () => {
                if (isMounted) fetchConsultants();
            })
            .subscribe();

        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            if (!isMounted) return;
            const currentUser = session?.user;
            setUser(currentUser ?? null);
            if (currentUser) {
                fetchProfile(currentUser.id);
                fetchActiveSessions(currentUser.id);
                checkIsConsultant(currentUser.id);
            } else {
                setProfile(null);
                setClientSessions([]);
                setIsConsultant(false);
                if (sessionStatusChannel) { supabase.removeChannel(sessionStatusChannel); sessionStatusChannel = null; }
            }
        });

        return () => {
            isMounted = false;
            authSub.unsubscribe();
            supabase.removeChannel(consultantChannel);
            if (sessionStatusChannel) supabase.removeChannel(sessionStatusChannel);
        };
    }, []);

    useEffect(() => {
        const supabase = createClient();
        if (!pendingSessionId || !supabase) return;
        let checkInterval: NodeJS.Timeout;

        const channel = supabase
            .channel(`session_${pendingSessionId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${pendingSessionId}` }, (payload: any) => {
                if (payload.new.status === 'active') {
                    const params = new URLSearchParams();
                    params.set("role", "client"); params.set("name", clientName); params.set("birth", birthDate);
                    if (birthTime) params.set("time", birthTime);
                    if (readingFocus) params.set("focus", readingFocus);

                    if (readingFocus === "İlişki Danışmanı") {
                        params.set("pkgId", "relation"); params.set("cards", "1"); params.set("gender", gender);
                    } else {
                        const pkg = PACKAGES.find(p => p.id === selectedPackage);
                        params.set("pkgId", selectedPackage); params.set("cards", String(pkg ? pkg.cards : 3));
                    }
                    router.push(`/room?id=${payload.new.room_id}&${params.toString()}`);
                } else if (payload.new.status === 'cancelled') {
                    setIsWaitingForConsultant(false); setPendingSessionId(null); setStep("welcome"); setRejectedModal(true);
                }
            })
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    checkInterval = setInterval(async () => {
                        const { data } = await supabase.from('sessions').select('*').eq('id', pendingSessionId).single();
                        if (data?.status === 'active') {
                            const params = new URLSearchParams();
                            params.set("role", "client"); params.set("name", clientName); params.set("birth", birthDate);
                            if (birthTime) params.set("time", birthTime);
                            if (readingFocus) params.set("focus", readingFocus);

                            if (readingFocus === "İlişki Danışmanı") {
                                params.set("pkgId", "relation"); params.set("cards", "1"); params.set("gender", gender);
                            } else {
                                const pkg = PACKAGES.find(p => p.id === selectedPackage);
                                params.set("pkgId", selectedPackage); params.set("cards", String(pkg ? pkg.cards : 3));
                            }
                            router.push(`/room?id=${data.room_id}&${params.toString()}`);
                        }
                    }, 20000); // Reduced frequency to save egress
                }
            });

        return () => { supabase.removeChannel(channel); if (checkInterval) clearInterval(checkInterval); };
    }, [pendingSessionId, router, clientName, birthDate, birthTime, readingFocus, gender, selectedPackage]);


    const handleUseProfile = () => {
        if (!profile) return;
        const name = profile.full_name || user?.user_metadata?.full_name || "";
        const birth = profile.birth_date || user?.user_metadata?.birth_date || "";
        const time = profile.birth_time || "";
        if (!name || !birth) {
            alert("Profil bilgileriniz eksik. Lütfen profil sayfasından adınızı ve doğum tarihinizi doldurun veya manuel giriş yapın.");
            return;
        }
        setClientName(name); setBirthDate(birth); setBirthTime(time); setStep("client_step3_focus");
    };

    const submitClientForm = async () => {
        if (!selectedConsultant) { alert("Lütfen önce bir danışman seçin."); return; }
        if (!clientName || !birthDate) { alert("İsim veya doğum tarihi eksik. Lütfen bilgilerinizi kontrol edin."); return; }
        if (user && user.id === selectedConsultant.id) { alert("Kendi kendinize danışmanlık talebi gönderemezsiniz. Lütfen başka bir danışman seçin."); return; }

        if (readingFocus === "İlişki Danışmanı" && !gender) { alert("Lütfen enerji seçimi yapın."); return; }
        else if (readingFocus !== "İlişki Danışmanı" && !selectedPackage) { alert("Lütfen bir paket seçin."); return; }

        const isOffline = !selectedConsultant.is_online;
        if (!isOffline) { setIsWaitingForConsultant(true); }

        const roomCode = "tarot-" + Math.random().toString(36).substring(2, 6);
        const clientInfo = {
            name: clientName, birth_date: birthDate, birth_time: birthTime, gender, focus: readingFocus,
            pkgId: readingFocus === "İlişki Danışmanı" ? "relation" : selectedPackage,
            cards: readingFocus === "İlişki Danışmanı" ? 1 : (PACKAGES.find(p => p.id === selectedPackage)?.cards || 3),
            is_offline_request: isOffline
        };

        const { data, error } = await supabase.from('sessions').insert({
            consultant_id: selectedConsultant.id, status: 'pending', room_id: roomCode, client_info: clientInfo, client_id: user ? user.id : null
        }).select().single();

        if (error) {
            console.error(error); alert("Oturum açılamadı."); setIsWaitingForConsultant(false); return;
        }

        if (isOffline) { setAppointmentModal(true); setStep("welcome"); }
        else { setPendingSessionId(data.id); }
    };

    // --- REUSABLE STYLES ---
    const inputClass = "w-full bg-[#12101c] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-500/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium";
    const btnPrimary = "w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-black rounded-2xl font-bold uppercase tracking-widest text-xs transition-all hover:bg-zinc-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:bg-zinc-800 disabled:text-white/50";
    const backBtn = "group inline-flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 hover:text-white transition-colors mb-6 pb-2 border-b border-transparent hover:border-white/20";
    const wizardCard = "w-full max-w-md mx-auto relative";

    // ==========================================
    // WIZARD STEPS RENDER
    // ==========================================

    const renderDailyFlip = () => {
        const hasCard = dailyCardIndex !== null;
        const cardMeaning = hasCard ? getCardMeaning(dailyCardIndex!) : null;
        const cardImage = hasCard ? getCardImage(dailyCardIndex!, 'tarot') : null;

        return (
            <div className="shrink-0 w-full md:w-80 bg-white/[0.02] border border-white/5 hover:border-purple-500/20 p-5 rounded-3xl backdrop-blur-xl flex flex-col items-center gap-4 relative overflow-hidden transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-indigo-500/5 pointer-events-none" />
                <span className="text-[10px] font-bold text-purple-400 tracking-[0.25em] uppercase">Günün Kozmik Çekimi</span>
                
                <div 
                    onClick={handleDailyFlip}
                    className="relative w-32 h-52 cursor-pointer [perspective:1000px]"
                >
                    <motion.div
                        initial={false}
                        animate={{ rotateY: isDailyFlipped ? 180 : 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="w-full h-full relative [transform-style:preserve-3d]"
                    >
                        <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-b from-[#1c1836] to-[#0c0817] border-2 border-purple-500/30 flex flex-col items-center justify-center shadow-lg [backface-visibility:hidden]">
                            <div className="w-24 h-44 border border-purple-500/10 rounded-xl flex items-center justify-center relative">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent animate-pulse" />
                                <div className="text-3xl filter drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">🔮</div>
                            </div>
                        </div>

                        <div className="absolute inset-0 w-full h-full rounded-2xl border-2 border-purple-500/40 shadow-xl overflow-hidden [transform:rotateY(180deg)] [backface-visibility:hidden] bg-[#0d0a18]">
                            {hasCard && (
                                <img 
                                    src={cardImage!} 
                                    alt={cardMeaning?.name} 
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                    </motion.div>
                </div>

                <div className="text-center w-full min-h-[50px] flex flex-col justify-center">
                    {!isDailyFlipped ? (
                        <p className="text-xs text-zinc-400 leading-normal px-4">
                            Gününüzün enerjisini keşfetmek için kartı çevirin. ✨
                        </p>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, y: 5 }} 
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-1.5"
                        >
                            <h4 className="text-sm font-bold text-white tracking-wide">
                                {cardMeaning?.name}
                            </h4>
                            <p className="text-[11px] text-purple-300 font-medium italic leading-relaxed px-2">
                                {cardMeaning?.keywords}
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>
        );
    };

    const renderWelcome = () => (
        <motion.div key="welcome" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-12">

            {/* Header & Back Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="flex-1">
                    <button onClick={() => router.push('/')} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" /> Ana Sayfa
                    </button>
                    <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-indigo-300">
                        Tarot Kozmosu
                    </h1>
                    <p className="text-sm text-zinc-400 mt-2 font-medium max-w-sm leading-relaxed">
                        Mistik arayüz aracılığıyla Yapay Zeka'dan günlük yorum al veya uzman danışmanlarla yüz yüze seansa bağlan.
                    </p>
                </div>

                {/* Günlük Kart Çevirme */}
                {renderDailyFlip()}
            </div>

                {/* Consultant Incoming Requests */}
                {isConsultant && clientSessions.filter(s => s.status === 'pending' && s.consultant_id === user?.id).map(session => (
                    <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full md:w-auto bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 flex items-center gap-5 shadow-[0_0_30px_rgba(168,85,247,0.15)] animate-pulse"
                    >
                        <div className="shrink-0 w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/40 relative">
                            <Sparkles className="w-5 h-5 text-purple-300" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-bg" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.2em] mb-0.5">Yeni Görüşme Talebi</p>
                            <p className="text-sm text-white font-bold">{session.client_info?.name || "Bir Müşteri"}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{session.client_info?.focus || "Genel Bakış"} • {session.client_info?.cards || 3} Kart</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={async () => {
                                    const { error } = await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', session.id);
                                    if (error) {
                                        alert("İptal edilirken bir hata oluştu: " + error.message);
                                        return;
                                    }
                                    if (user) fetchActiveSessions(user.id);
                                }}
                                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                            >
                                Reddet
                            </button>
                            <button
                                onClick={async (e) => {
                                    const btn = e.currentTarget;
                                    btn.disabled = true;
                                    btn.innerHTML = '<span class="animate-spin mr-2">⏳</span>...';

                                    try {
                                        const { error } = await supabase
                                            .from('sessions')
                                            .update({ status: 'active' })
                                            .eq('id', session.id);

                                        if (error) {
                                            alert("Kabul edilirken hata oluştu: " + error.message);
                                            btn.disabled = false;
                                            btn.textContent = "Kabul Et";
                                            return;
                                        }

                                        // UI'ı hemen güncelle
                                        if (user) await fetchActiveSessions(user.id);

                                        // Odaya yönlendir
                                        router.push(`/room?id=${session.room_id}&role=consultant`);
                                    } catch (err) {
                                        console.error(err);
                                        alert("Bir ağ hatası oluştu. Lütfen tekrar deneyin.");
                                        btn.disabled = false;
                                        btn.textContent = "Kabul Et";
                                    }
                                }}
                                className="px-6 py-2.5 bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/30 hover:bg-purple-400 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center"
                            >
                                Kabul Et
                            </button>
                        </div>
                    </motion.div>
                ))}

                {/* Active Sessions (Client or Consultant) */}
                {clientSessions.filter(s => s.status === 'active').length > 0 && (
                    <div className="w-full md:w-auto bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <Clock className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-green-400 font-bold uppercase tracking-wider">Devam Ediyor</p>
                            <p className="text-sm text-white font-medium">
                                {clientSessions.find(s => s.status === 'active')?.consultant?.display_name || "Mevcut Oturum"}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                const s = clientSessions.find(s => s.status === 'active');
                                router.push(`/room?id=${s.room_id}&role=${isConsultant ? 'consultant' : 'client'}`);
                            }}
                            className="ml-auto px-4 py-2 bg-green-500 text-black text-xs font-bold rounded-xl whitespace-nowrap"
                        >
                            Odaya Dön
                        </button>
                    </div>
                )}

            {/* AI FEATURE CARD */}
            <section className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-indigo-600 rounded-[2.5rem] blur-xl opacity-20" />
                <div className="relative p-1 rounded-[2.5rem] bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-indigo-500/30 overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay pointer-events-none" />

                    <div className="relative bg-[#0c0814]/90 backdrop-blur-3xl rounded-[2.4rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 justify-between border border-white/5">
                        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                            <span className="px-3 py-1 bg-fuchsia-500/20 text-fuchsia-300 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-4 border border-fuchsia-500/30 flex items-center gap-1.5 w-fit">
                                <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
                                Yapay Zeka (7/24)
                            </span>
                            <h2 className="text-3xl font-heading text-white font-bold mb-3 flex items-center gap-3 justify-center md:justify-start">
                                Mistik AI Danışman <Sparkles className="w-6 h-6 text-fuchsia-400" />
                            </h2>
                            <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
                                Gelişmiş AI vizyonuyla niyetini oku. Ücretsiz olarak üç kartını seç, anında sana özel kapsamlı ve spiritüel bir yorum üretilsin. Beklemek yok.
                            </p>

                            <button
                                onClick={() => user ? router.push("/ai-tarot") : router.push("/login")}
                                className="px-8 py-4 w-full md:w-auto bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:shadow-[0_0_25px_rgba(217,70,239,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 group/btn"
                            >
                                {user ? "Hemen Başla" : "Üye Ol & Başla"} <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                        <div className="shrink-0 relative w-32 h-32 md:w-48 md:h-48 group-hover:scale-105 transition-transform duration-700">
                            <div className="absolute inset-0 rounded-full bg-fuchsia-500/20 shadow-[0_0_60px_rgba(217,70,239,0.3)] animate-pulse-slow" />
                            <div className="absolute inset-2 border-2 border-fuchsia-500/30 rounded-full border-dashed animate-spin" style={{ animationDuration: '10s' }} />
                            <div className="absolute inset-4 bg-[#140c24] border border-white/10 rounded-full flex items-center justify-center text-7xl drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                🤖
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* LIVE CONSULTANTS SECTION */}
            <section className="pt-4">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold font-heading text-white flex items-center gap-3">
                            Canlı Danışmanlar
                        </h2>
                        <p className="text-xs text-zinc-500 mt-1">Gerçek psişiklerle anında video görüşmesi başlat.</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Çevrimiçi</span>
                        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-zinc-600" /> Uyuyor</span>
                    </div>
                </div>

                {isLoadingProfiles ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-white/5 rounded-[2rem] animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : consultants.length === 0 ? (
                    <div className="w-full p-12 text-center rounded-[2rem] border border-dashed border-white/10 bg-white/5">
                        <UserIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white">Sistemde Danışman Yok</h3>
                        <p className="text-sm text-zinc-500 mt-1">Şu anda platformda kayıtlı hiçbir danışman bulunmuyor.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {consultants.filter(c => c.id !== user?.id).map(c => (
                            <div key={c.id} className="group relative">
                                <div className={`absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity blur-md bg-gradient-to-r ${c.is_online ? "from-emerald-500/20 to-teal-500/20" : "from-white/5 to-white/5"}`} />
                                <button
                                    onClick={() => {
                                        if (!user) { alert("Lütfen giriş yapınız."); router.push('/login'); return; }
                                        setSelectedConsultant(c);
                                        if (!c.is_online) setOfflineWarningModal(true);
                                        else setStep("client_step1_name");
                                    }}
                                    className="w-full relative bg-[#13111c] border border-white/10 hover:border-white/20 p-6 rounded-[2rem] text-left flex flex-col gap-4 shadow-xl transition-all hover:-translate-y-1 overflow-hidden"
                                >
                                    <div className="flex justify-between items-start w-full">
                                        <div className="w-16 h-16 rounded-full border border-white/10 bg-[#0a0810] flex items-center justify-center shrink-0 relative overflow-hidden shadow-inner">
                                            {c.profiles?.avatar_url ? (
                                                <img src={c.profiles.avatar_url} alt={c.display_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xl font-bold font-heading text-white">{c.display_name?.charAt(0) || "D"}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={cn("px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full border flex items-center gap-1.5", c.is_online ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700")}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full", c.is_online ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
                                                {c.is_online ? "Açık" : "Kapalı"}
                                            </span>
                                            {c.rating && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                                    <Star className="w-3 h-3 fill-amber-400" /> {c.rating}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-heading font-bold text-white mb-1 truncate group-hover:text-purple-300 transition-colors">
                                            {c.display_name}
                                        </h3>
                                        <p className="text-[11px] text-zinc-500 font-medium truncate">
                                            {c.specialties?.join(" • ") || "Tarot, Astroloji"}
                                        </p>
                                    </div>

                                    <div className="mt-2 w-full pt-4 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Randevu Al</span>
                                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center"><ArrowRight className="w-4 h-4" /></div>
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </motion.div>
    );

    // WIZARD FORMS
    const renderClientStep1 = () => (
        <motion.div key="client_step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={wizardCard}>
            <button onClick={() => setStep("welcome")} className={backBtn}><ArrowLeft className="w-4 h-4" /> İptal</button>
            <div className="mb-8">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.2em] mb-2 block">Adım 1 / 4</span>
                <h2 className="text-3xl font-heading font-bold text-white">Sizi Tanıyalım</h2>
                <p className="text-xs text-zinc-400 mt-2">Kartların enerjisine bağlanabilmek için kime bakılacağını seçin.</p>
            </div>

            <div className="space-y-6">
                {profile && (profile.full_name || user?.email) && (
                    <button onClick={handleUseProfile} className="w-full relative group rounded-2xl bg-[#1a1726] border border-purple-500/30 p-5 flex items-center gap-4 hover:bg-[#201c30] transition-colors focus:ring-2 focus:ring-purple-500">
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-50" />
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/20"><Sparkles className="w-5 h-5 text-purple-300" /></div>
                        <div className="flex-1 text-left">
                            <h3 className="text-sm font-bold text-white mb-0.5">Kendi Profilim</h3>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{profile.full_name || user?.email}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"><ArrowRight className="w-4 h-4" /></div>
                    </button>
                )}

                <div className="relative py-4 flex items-center justify-center mb-4">
                    <div className="absolute inset-x-0 h-px bg-white/5" />
                    <span className="relative px-4 bg-bg text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Veya Başkası</span>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input autoFocus type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Fal Sahibinin Adı Soyadı" className={cn(inputClass, "pl-12")} />
                    </div>
                    <button onClick={() => setStep("client_step2_birth")} disabled={!clientName.trim()} className={btnPrimary}>
                        İleri <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );

    const renderClientStep2 = () => (
        <motion.div key="client_step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={wizardCard}>
            <button onClick={() => setStep("client_step1_name")} className={backBtn}><ArrowLeft className="w-4 h-4" /> Geri</button>
            <div className="mb-8">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.2em] mb-2 block">Adım 2 / 4</span>
                <h2 className="text-3xl font-heading font-bold text-white">Doğum Kozmosu</h2>
                <p className="text-xs text-zinc-400 mt-2">Astrolojik ve numerolojik haritanızı çıkarmamız için gerekli.</p>
            </div>

            <div className="space-y-5">
                <div>
                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 ml-1">
                        <Calendar className="w-3.5 h-3.5" /> Doğum Tarihi <span className="text-red-400">*</span>
                    </label>
                    <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 ml-1">
                        <Clock className="w-3.5 h-3.5" /> Doğum Saati <span className="text-zinc-600 font-normal lowercase tracking-normal">(isteğe bağlı)</span>
                    </label>
                    <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} className={inputClass} />
                </div>

                {birthDate && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 pt-4">
                        <div className="flex-1 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] uppercase font-bold text-purple-400 tracking-[0.2em] mb-1">Ruh Kartı</span>
                            <span className="text-sm font-heading font-bold text-white">{calculateSoulCard(new Date(birthDate)).name || "?"}</span>
                        </div>
                        <div className="flex-1 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] uppercase font-bold text-amber-500 tracking-[0.2em] mb-1">Kişilik Kartı</span>
                            <span className="text-sm font-heading font-bold text-white">{calculatePersonalityCard(new Date(birthDate).getDate()).name || "?"}</span>
                        </div>
                    </motion.div>
                )}

                <button onClick={() => setStep("client_step3_focus")} disabled={!birthDate} className={cn(btnPrimary, "mt-6")}>
                    İleri <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );

    const renderClientStep3Focus = () => (
        <motion.div key="client_step3_focus" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={wizardCard}>
            <button onClick={() => setStep("client_step2_birth")} className={backBtn}><ArrowLeft className="w-4 h-4" /> Geri</button>
            <div className="mb-6">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.2em] mb-2 block">Adım 3 / 4</span>
                <h2 className="text-3xl font-heading font-bold text-white">Niyetiniz Nedir?</h2>
                <p className="text-xs text-zinc-400 mt-2">Kartların hangi konuya ışık tutmasını istersiniz?</p>
            </div>

            <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                    {['Genel Akış', 'Aşk & İlişki', 'Kariyer Yolu', 'Maddi Durum', 'Ruhsal Rehberlik', 'Karar Verme'].map(tag => {
                        const isSelected = readingFocus === tag;
                        return (
                            <button
                                key={tag}
                                onClick={() => setReadingFocus(tag)}
                                className={cn("px-4 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all duration-300",
                                    isSelected ? "bg-purple-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-[#161423] border-white/10 text-zinc-400 hover:border-white/30 hover:text-white"
                                )}
                            >
                                {isSelected && <Check className="w-3 h-3 inline-block mr-1.5" />}
                                {tag}
                            </button>
                        );
                    })}
                </div>

                <div className="relative py-4 flex items-center justify-center">
                    <div className="absolute inset-x-0 h-px bg-white/5" />
                    <span className="relative px-4 bg-bg text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Veya Özel & Partner</span>
                </div>

                <button
                    onClick={() => setReadingFocus("İlişki Danışmanı")}
                    className={cn("w-full px-5 py-4 rounded-2xl border flex items-center justify-between transition-all group",
                        readingFocus === "İlişki Danışmanı" ? "bg-rose-500/10 border-rose-500/50" : "bg-surface border-white/5 hover:border-rose-500/30")}>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-lg shadow-inner">💞</div>
                        <div className="text-left">
                            <span className={cn("text-sm font-bold block", readingFocus === "İlişki Danışmanı" ? "text-rose-400" : "text-white")}>İlişki Danışmanı Özel</span>
                            <span className="text-[10px] text-zinc-500 font-medium">İki kişi arasındaki bağ ve cinsiyet enerjileri.</span>
                        </div>
                    </div>
                    {readingFocus === "İlişki Danışmanı" && <Check className="w-5 h-5 text-rose-500" />}
                </button>

                <div className="mt-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-2 px-1">Özel Bir Soru Yazın (İsteğe Bağlı)</label>
                    <textarea
                        value={readingFocus === "İlişki Danışmanı" ? "" : readingFocus}
                        onChange={(e) => { if (readingFocus === "İlişki Danışmanı") setReadingFocus(""); setReadingFocus(e.target.value); }}
                        placeholder="Örn: Aldığım iş teklifini kabul etmeli miyim?"
                        className={cn(inputClass, "h-28 resize-none py-4 text-sm")}
                    />
                </div>

                <button onClick={() => { if (readingFocus === "İlişki Danışmanı") setStep("client_step_gender"); else setStep("client_step4_package"); }} className={btnPrimary} disabled={!readingFocus.trim()}>
                    İleri <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );

    const renderClientStepGender = () => (
        <motion.div key="client_step_gender" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={wizardCard}>
            <button onClick={() => setStep("client_step3_focus")} className={backBtn}><ArrowLeft className="w-4 h-4" /> Geri</button>
            <div className="mb-8">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.2em] mb-2 block">Ara Adım (Sadece İlişki)</span>
                <h2 className="text-3xl font-heading font-bold text-white">Ruhsal Enerji</h2>
                <p className="text-xs text-zinc-400 mt-2">Dinamik analiz için ilişkinizdeki temsil enerjinizi seçin.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <button onClick={() => setGender("Kadın")} className={cn("flex flex-col items-center justify-center gap-4 py-8 px-4 rounded-3xl border-2 transition-all group", gender === "Kadın" ? "bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "bg-[#12101c] border-white/5 hover:border-amber-500/30")}>
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">👩</div>
                    <span className={cn("text-xs font-bold tracking-widest uppercase", gender === "Kadın" ? "text-amber-500" : "text-zinc-400")}>Dişil Enerji</span>
                </button>
                <button onClick={() => setGender("Erkek")} className={cn("flex flex-col items-center justify-center gap-4 py-8 px-4 rounded-3xl border-2 transition-all group", gender === "Erkek" ? "bg-slate-300/10 border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.2)]" : "bg-[#12101c] border-white/5 hover:border-slate-500/30")}>
                    <div className="w-16 h-16 rounded-full bg-slate-500/20 flex items-center justify-center text-3xl grayscale group-hover:scale-110 transition-transform">👨</div>
                    <span className={cn("text-xs font-bold tracking-widest uppercase", gender === "Erkek" ? "text-white" : "text-zinc-400")}>Eril Enerji</span>
                </button>
            </div>

            <button onClick={submitClientForm} disabled={!gender} className={cn(btnPrimary, "bg-gradient-to-r from-rose-500 to-pink-600 border-none text-white hover:shadow-[0_0_25px_rgba(244,63,94,0.4)]")}>
                Randevuyu Onayla <Sparkles className="w-4 h-4 border-none" />
            </button>
        </motion.div>
    );

    const renderClientStep4 = () => (
        <motion.div key="client_step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={wizardCard}>
            <button onClick={() => setStep("client_step3_focus")} className={backBtn}><ArrowLeft className="w-4 h-4" /> Geri</button>
            <div className="mb-6">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.2em] mb-2 block">Adım 4 / 4</span>
                <h2 className="text-3xl font-heading font-bold text-white">Fal Paketi</h2>
                <p className="text-xs text-zinc-400 mt-2">Daha derin bir bakış için okuma türünü belirleyin.</p>
            </div>

            <div className="space-y-4">
                {PACKAGES.map((pkg) => {
                    const isSelected = selectedPackage === pkg.id;
                    return (
                        <button
                            key={pkg.id}
                            onClick={() => setSelectedPackage(pkg.id)}
                            className={cn("w-full text-left p-5 rounded-[1.5rem] border-2 transition-all flex gap-5 items-center group relative overflow-hidden",
                                isSelected ? "bg-[#1c172e] border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]" : "bg-[#12101c] border-white/5 hover:border-white/20")}>
                            {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none" />}

                            <div className={cn("w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center transition-colors relative z-10", isSelected ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30" : "bg-white/5 text-zinc-400 group-hover:bg-white/10 group-hover:text-white")}>
                                {pkg.icon}
                            </div>

                            <div className="flex-1 min-w-0 relative z-10">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-sm font-bold text-white truncate">{pkg.name}</h3>
                                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-wider uppercase border", isSelected ? "bg-purple-500 text-white border-purple-400" : "bg-purple-500/10 text-purple-300 border-purple-500/20")}>
                                        {pkg.cards} KART
                                    </span>
                                    {pkg.price && <span className={cn("ml-auto text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border", isSelected ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-zinc-400 border-white/10")}>{pkg.price}</span>}
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium line-clamp-2">{pkg.desc}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            <button
                onClick={submitClientForm}
                disabled={!selectedPackage}
                className={cn("w-full flex items-center justify-center gap-3 px-6 py-4 mt-8 font-bold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 disabled:opacity-50",
                    selectedConsultant?.is_online
                        ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                        : "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]")}>
                {selectedConsultant?.is_online ? (
                    <>Fal Başlasın <Sparkles className="w-4 h-4" /></>
                ) : (
                    <>Randevu Talebi Gönder <Calendar className="w-4 h-4" /></>
                )}
            </button>
        </motion.div>
    );

    return (
        <div className="min-h-[100dvh] bg-bg font-inter text-text isolate selection:bg-purple-500/30">
            {/* Ambient Backgrounds */}
            <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none -scale-y-100 opacity-50" />
            <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-overlay z-0" />
            <Particles />

            <div className="w-full max-w-6xl mx-auto px-6 py-12 relative z-10">
                <AnimatePresence mode="wait">
                    {step === "welcome" && renderWelcome()}
                    {step === "client_step1_name" && renderClientStep1()}
                    {step === "client_step2_birth" && renderClientStep2()}
                    {step === "client_step3_focus" && renderClientStep3Focus()}
                    {step === "client_step_gender" && renderClientStepGender()}
                    {step === "client_step4_package" && renderClientStep4()}
                </AnimatePresence>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {rejectedModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRejectedModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-[#12101c] border border-red-500/20 shadow-2xl rounded-[2rem] p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6"><X className="w-8 h-8 text-red-500" /></div>
                            <h3 className="text-xl font-heading font-bold text-white mb-2">Talep Reddedildi</h3>
                            <p className="text-sm text-zinc-400 mb-6">Danışman şu anda meşgul. Lütfen kısa süre sonra tekrar deneyin veya başka danışman seçin.</p>
                            <button onClick={() => setRejectedModal(false)} className={btnPrimary}>Anladım</button>
                        </motion.div>
                    </div>
                )}
                {appointmentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setAppointmentModal(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-[#12101c] border border-emerald-500/20 shadow-2xl rounded-[2rem] p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6"><Calendar className="w-8 h-8 text-emerald-400" /></div>
                            <h2 className="text-xl font-heading font-bold text-white mb-2">Randevu Talebi İletildi</h2>
                            <p className="text-sm text-zinc-400 mb-6">İlgili danışman çevrimdışı olduğu için talebiniz iletildi. Profilinizden takip edebilirsiniz.</p>
                            <button onClick={() => setAppointmentModal(false)} className={cn(btnPrimary, "bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]")}>Tamam</button>
                        </motion.div>
                    </div>
                )}
                {offlineWarningModal && selectedConsultant && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setOfflineWarningModal(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-[#12101c] border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] rounded-[2rem] p-8 text-center">
                            <h2 className="text-2xl font-heading font-bold text-white mb-3">Danışman Çevrimdışı</h2>
                            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">Şu anda yanıt alamazsınız. Devam ederseniz talebiniz <strong>Randevu Planlaması</strong> olarak kaydedilecek.</p>
                            <button onClick={() => { setOfflineWarningModal(false); setStep("client_step1_name"); }} className={cn(btnPrimary, "bg-amber-500 text-black mb-3 border-none hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]")}>Talep Oluştur</button>
                            <button onClick={() => { setOfflineWarningModal(false); setSelectedConsultant(null); }} className="w-full py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Geri Dön</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* WAITING OVERLAY FULLSCREEN */}
            <AnimatePresence>
                {isWaitingForConsultant && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />
                        <Particles />

                        <div className="text-center relative z-10 w-full max-w-sm">
                            <div className="w-24 h-24 mx-auto mb-8 relative">
                                <div className="absolute inset-0 rounded-full border-[3px] border-white/5 border-t-purple-500 animate-spin" />
                                <div className="absolute inset-3 rounded-full border-[3px] border-white/5 border-b-fuchsia-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-heading font-bold text-white mb-3">Kozmik Bağlantı Kuruluyor</h2>
                            <p className="text-sm text-zinc-400 mb-10 leading-relaxed">
                                Lütfen bekleyin, talebiniz <strong>{selectedConsultant?.display_name || "danışmana"}</strong> iletildi. Onay bekleniyor...
                            </p>

                            <button onClick={() => { setIsWaitingForConsultant(false); setPendingSessionId(null); setStep("welcome"); }} className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors">
                                İptal Et & Ayrıl
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function TarotPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><div className="w-10 h-10 rounded-full border-[3px] border-white/10 border-t-purple-500 animate-spin" /></div>}>
            <TarotConsultantsContent />
        </Suspense>
    );
}

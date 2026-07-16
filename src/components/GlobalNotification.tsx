"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Sparkles, X, Check, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LocalNotifications } from "@capacitor/local-notifications";

export default function GlobalNotification() {
    const [incomingRequest, setIncomingRequest] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [onlineClients, setOnlineClients] = useState<Set<string>>(new Set());
    const [isConsultant, setIsConsultant] = useState(false);
    const [isOnline, setIsOnline] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    // Hook 1: Handle Auth State and Consultant Status Check
    useEffect(() => {
        let isMounted = true;

        const handleAuthChange = async (currentUser: any) => {
            if (!isMounted) return;
            setUser(currentUser || null);

            if (currentUser) {
                const { data: consultant } = await supabase
                    .from("consultants")
                    .select("id, is_online")
                    .eq("id", currentUser.id)
                    .maybeSingle();
                if (isMounted) {
                    setIsConsultant(!!consultant);
                    if (consultant) {
                        setIsOnline(consultant.is_online);
                    }
                }
            } else {
                if (isMounted) {
                    setIsConsultant(false);
                    setIsOnline(false);
                }
            }
        };

        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
            handleAuthChange(session?.user);
        });

        // Handle page visibility change (mobile browsers sleep tabs)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                supabase.auth.getUser().then(({ data }: any) => {
                    handleAuthChange(data?.user);
                });
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Initial check
        supabase.auth.getUser().then(({ data }: any) => {
            handleAuthChange(data?.user);
        });

        // Notification permission - wrap in extreme safety
        try {
            if (typeof window !== "undefined") {
                // Native Capacitor Notifications
                // @ts-ignore
                if (typeof (window as any).Capacitor !== 'undefined') {
                    LocalNotifications.requestPermissions().then(result => {
                      if (result.display === 'granted') {
                        console.log("Local notifications permission granted");
                      }
                    });
                } 
                // Web Browser Notifications
                else if ("Notification" in window) {
                    if (Notification.permission === "default") {
                        Notification.requestPermission().catch(() => { });
                    }
                }
            }
        } catch (e) {
            console.warn("Notification API not available:", e);
        }

        return () => {
            isMounted = false;
            if (authSub && authSub.unsubscribe) authSub.unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [supabase]);

    // Hook 2: Handle Realtime Subscriptions with Mounting Checks
    useEffect(() => {
        if (!user) return;
        let isMounted = true;
        let activeChannel: any = null;

        // 1. Presence tracking
        const presenceChannel = supabase.channel("online_users", { config: { presence: { key: user.id } } });
        presenceChannel
            .on("presence", { event: "sync" }, () => {
                if (!isMounted) return;
                const state = presenceChannel.presenceState();
                const onlineIds = new Set<string>();
                Object.values(state).forEach((presences: any) => {
                    (presences as any[]).forEach((p: any) => {
                        if (p.user_id) onlineIds.add(p.user_id);
                    });
                });
                setOnlineClients(onlineIds);
            })
            .subscribe(async (status: string) => {
                if (status === "SUBSCRIBED" && isMounted) {
                    await presenceChannel.track({
                        user_id: user.id,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        // 2. Realtime subscription for incoming requests (Only for consultants)
        const subscribeToNotifications = () => {
            if (!isMounted) return;
            activeChannel = supabase
                .channel(`consultant_notifications_${user.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "sessions",
                        filter: `consultant_id=eq.${user.id}`,
                    },
                    (payload: any) => {
                        if (!isMounted) return;
                        console.log("New mobile notification received:", payload.new);
                        showBrowserNotification(payload.new);
                        setIncomingRequest(payload.new);
                    }
                )
                .subscribe((status: string) => {
                    if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && isMounted) {
                        setTimeout(() => {
                            if (isMounted) {
                                if (activeChannel) supabase.removeChannel(activeChannel);
                                subscribeToNotifications();
                            }
                        }, 5000);
                    }
                });
        };

        if (isConsultant) {
            subscribeToNotifications();
        }

        // 3. Fallback: Check for pending sessions that might have been missed while tab was suspended
        const checkMissedSessions = async () => {
            const { data: missedSessions } = await supabase
                .from("sessions")
                .select("*")
                .eq("consultant_id", user.id)
                .eq("status", "pending")
                .order("created_at", { ascending: false })
                .limit(1);

            if (isMounted && missedSessions && missedSessions.length > 0) {
                const session = missedSessions[0];
                const createdAt = new Date(session.created_at).getTime();
                const now = new Date().getTime();
                // If it's newer than 5 minutes, show it
                if (now - createdAt < 300000) {
                    setIncomingRequest(session);
                }
            }
        };

        if (isConsultant) {
            checkMissedSessions();
        }

        return () => {
            isMounted = false;
            supabase.removeChannel(presenceChannel);
            if (activeChannel) supabase.removeChannel(activeChannel);
        };
    }, [user, isConsultant, supabase]);

    const showBrowserNotification = (session: any) => {
        const title = "Yeni Görüşme Talebi";
        const body = `${session.client_info?.name || "Bir müşteri"} sizinle görüşmek istiyor.`;

        // Native Capacitor Notifications
        // @ts-ignore
        if (typeof window !== 'undefined' && typeof (window as any).Capacitor !== 'undefined') {
          LocalNotifications.schedule({
            notifications: [
              {
                title,
                body,
                id: Math.floor(Math.random() * 10000),
                schedule: { at: new Date(Date.now() + 100) },
                attachments: [],
                actionTypeId: '',
                extra: null,
              }
            ]
          }).catch(err => console.error("Native Notification Error:", err));
        } 
        // Web Browser Notifications
        else if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
        ) {
            new Notification(title, {
                body,
                icon: "/favicon.ico",
            });
        }
    };

    const playNotificationSound = () => {
        try {
            if (typeof window === 'undefined') return;

            if (typeof navigator !== 'undefined' && "vibrate" in navigator) {
                navigator.vibrate([200, 100, 200, 100, 400]);
            }

            // High priority safety check for AudioContext
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) {
                console.warn("AudioContext not supported in this browser");
                return;
            }

            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(520, ctx.currentTime);
            osc.frequency.setValueAtTime(650, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 1);

            // Auto suspend to avoid context leaks
            setTimeout(() => {
                if (ctx.state !== 'closed') ctx.close().catch(() => { });
            }, 1200);

        } catch (err) {
            console.error("Audio/Vibrate error on mobile", err);
        }
    };

    // Effect to continuously ring while incoming request is active
    useEffect(() => {
        let ringInterval: NodeJS.Timeout | null = null;
        if (incomingRequest) {
            // First play right away
            playNotificationSound();
            // Then loop every 3 seconds
            ringInterval = setInterval(() => {
                playNotificationSound();
            }, 3000);
        }
        return () => {
            if (ringInterval) clearInterval(ringInterval);
        };
    }, [incomingRequest]);

    const handleAcceptSession = async (session: any) => {
        const { error } = await supabase
            .from("sessions")
            .update({
                status: "active",
                updated_at: new Date().toISOString(),
            })
            .eq("id", session.id);

        if (!error) {
            setIncomingRequest(null);
            router.push(`/room?id=${session.room_id}&role=consultant`);
        } else {
            console.error(error);
        }
    };

    const handleRejectSession = async (session: any) => {
        await supabase
            .from("sessions")
            .update({
                status: "cancelled",
                updated_at: new Date().toISOString(),
            })
            .eq("id", session.id);

        setIncomingRequest(null);
    };

    const toggleOnline = async () => {
        if (!user) return;
        const newStatus = !isOnline;
        setIsOnline(newStatus);
        const { error } = await supabase
            .from("consultants")
            .update({ is_online: newStatus })
            .eq("id", user.id);
        if (error) {
            setIsOnline(!newStatus); // revert
            alert("Durum güncellenirken hata oluştu.");
        }
    };

    return (
        <>
        <AnimatePresence>
            {incomingRequest && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="w-full max-w-sm bg-[#161623] border border-white/10 shadow-2xl rounded-3xl overflow-hidden relative"
                    >
                        {/* Top strip */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-teal-400 absolute top-0 left-0" />

                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                                    <Calendar className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Yeni Randevu</h2>
                                    <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold mt-0.5 whitespace-nowrap">Bekleyen Talep</p>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3 mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-500 font-medium">Danışan</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-bold">{incomingRequest.client_info?.name || "İsimsiz"}</span>
                                        {incomingRequest.client_id && onlineClients.has(incomingRequest.client_id) ? (
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Çevrimiçi
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                                Çevrimdışı
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-500 font-medium">Konu</span>
                                    <span className="text-white font-bold">{incomingRequest.client_info?.focus || "Genel"}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-500 font-medium">Paket</span>
                                    <span className="text-white font-bold">{incomingRequest.client_info?.pkgId || "Standart"}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleRejectSession(incomingRequest)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all font-bold text-sm"
                                >
                                    <X className="w-4 h-4" /> Reddet
                                </button>

                                <button
                                    onClick={() => handleAcceptSession(incomingRequest)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all font-bold text-sm"
                                >
                                    <Check className="w-4 h-4 relative -top-[1px]" /> Kabul Et
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Yüzen Danışman Çevrimiçi/Çevrimdışı Durum Göstergesi */}
        <AnimatePresence>
            {isConsultant && user && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="fixed bottom-6 left-6 z-[9999] flex items-center gap-3 bg-[#161426]/90 backdrop-blur-xl border border-white/10 hover:border-purple-500/30 p-3 rounded-2xl shadow-xl transition-colors cursor-pointer select-none"
                    onClick={toggleOnline}
                >
                    <div className="relative flex h-3 w-3">
                        {isOnline && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? "bg-emerald-500" : "bg-zinc-500"}`}></span>
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Mistik Durum</span>
                        <span className="text-xs font-bold text-white leading-tight mt-0.5">
                            {isOnline ? "Çevrimiçi" : "Çevrimdışı (Dinleniyor)"}
                        </span>
                    </div>
                    <div className="ml-1 pl-2 border-l border-white/5 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                        Değiştir
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
}
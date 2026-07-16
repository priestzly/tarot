"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Sparkles, X, Check, Calendar, PhoneCall } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LocalNotifications } from "@capacitor/local-notifications";

export default function GlobalNotification() {
    const [incomingRequest, setIncomingRequest] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [onlineClients, setOnlineClients] = useState<Set<string>>(new Set());
    const [isConsultant, setIsConsultant] = useState(false);
    const [isOnline, setIsOnline] = useState(false);

    const router = useRouter();
    const pathname = usePathname();
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
                        if (payload.new.client_info?.is_offline_request) {
                            console.log("Offline request received, skipping real-time ringing.");
                            return;
                        }
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
                if (session.client_info?.is_offline_request) {
                    return;
                }
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

    return (
        <>
        <AnimatePresence>
            {incomingRequest && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-md bg-[#0e0a1a]/95 border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.25)] rounded-[2.5rem] overflow-hidden relative p-8 text-center space-y-6"
                    >
                        {/* Cosmic background glows */}
                        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
                        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

                        {/* Top Pulsing Icon */}
                        <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 relative">
                            <PhoneCall className="w-6 h-6 animate-pulse" />
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                            </span>
                        </div>

                        {/* Title */}
                        <div className="space-y-1">
                            <span className="px-3 py-1 bg-purple-500/15 text-purple-300 rounded-full text-[9px] font-bold uppercase tracking-[0.25em] border border-purple-500/25 inline-flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-purple-400" /> Canlı Çağrı
                            </span>
                            <h2 className="text-2xl font-bold font-heading text-white tracking-wide mt-3">Yeni Görüşme Talebi</h2>
                            <p className="text-xs text-zinc-400">Danışan sizinle canlı seans başlatmak istiyor.</p>
                        </div>

                        {/* Details Card */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 text-left space-y-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent pointer-events-none" />
                            
                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                <span className="text-xs text-zinc-400 font-medium">Danışan</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white font-heading">
                                        {incomingRequest.client_info?.name || "İsimsiz Danışan"}
                                    </span>
                                    {incomingRequest.client_id && onlineClients.has(incomingRequest.client_id) ? (
                                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Çevrimiçi
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-[9px] font-bold uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                            Çevrimdışı
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-xs text-zinc-400 font-medium">Odak Konusu</span>
                                <span className="text-xs font-bold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 uppercase tracking-wide">
                                    {incomingRequest.client_info?.focus || "Genel Bakış"}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-xs text-zinc-400 font-medium">Seçilen Paket</span>
                                <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                                    {incomingRequest.client_info?.pkgId === "standard" ? "🔮 Standart Açılım" :
                                     incomingRequest.client_info?.pkgId === "synastry" ? "💖 İlişki / Sinastri" :
                                     incomingRequest.client_info?.pkgId === "matrix" ? "👁️ Gelişmiş Matris" :
                                     incomingRequest.client_info?.pkgId === "celtic" ? "⭐ Kelt Haçı" :
                                     incomingRequest.client_info?.pkgId === "astrological" ? "🌙 Astrolojik 12 Ev" : 
                                     incomingRequest.client_info?.pkgId || "Özel Açılım"}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => handleRejectSession(incomingRequest)}
                                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl border border-white/10 hover:border-red-500/20 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-all font-bold text-xs uppercase tracking-widest"
                            >
                                <X className="w-4 h-4" /> Reddet
                            </button>

                            <button
                                onClick={() => handleAcceptSession(incomingRequest)}
                                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95 text-black transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                            >
                                <Check className="w-4 h-4" /> Kabul Et
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
        </>
    );
}
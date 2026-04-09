import { useEffect, useState, useRef, useCallback, useMemo } from "react";

import { createClient } from "@/utils/supabase/client";
import Peer from "peerjs";
import { ActivityLog, ChatMessage } from "../types";
import { CardState } from "@/components/TarotCard";
import { getCardMeaning } from "@/lib/cardData";
import { getApiUrl } from "@/lib/api";

// Remove global socket to avoid cross-component pollution

const supabase = createClient();

export function useTarotRoom(roomId: string, searchParams: URLSearchParams) {
    // Role & Client Form Data
    const initialRole = searchParams.get('role') === 'client' ? 'client' : 'consultant';
    const [isConsultant, setIsConsultant] = useState(initialRole === 'consultant');


    const [clientProfile, setClientProfile] = useState<{
        name: string;
        birth: string;
        time: string;
        pkgId: string;
        cards: number;
        focus?: string;
        gender?: string;
    } | null>(() => {
        if (!isConsultant && searchParams.get('name')) {
            return {
                name: searchParams.get('name') || '',
                birth: searchParams.get('birth') || '',
                time: searchParams.get('time') || '',
                pkgId: searchParams.get('pkgId') || '',
                cards: Number(searchParams.get('cards')) || 0,
                focus: searchParams.get('focus') || 'Genel Akış',
                gender: searchParams.get('gender') || '',
            }
        }
        return null;
    });
    const clientProfileRef = useRef(clientProfile);
    useEffect(() => { clientProfileRef.current = clientProfile; }, [clientProfile]);

    const [copied, setCopied] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showAurasPanel, setShowAurasPanel] = useState(false);
    const [fullShareUrl, setFullShareUrl] = useState("");
    const [currentAura, setCurrentAura] = useState(searchParams.get('focus') || 'Ruhsal');

    // Real-time State
    const [cards, setCards] = useState<CardState[]>([]);
    const cardsRef = useRef(cards); useEffect(() => { cardsRef.current = cards; }, [cards]);
    const [maxZIndex, setMaxZIndex] = useState(1);

    // Session Database ID (declared early because auto-save depends on it)
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Auto-save cards to database (debounced 15s)
    const saveCardsTimeout = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (!sessionId || cards.length === 0 || !isConsultant) return;
        if (saveCardsTimeout.current) clearTimeout(saveCardsTimeout.current);
        saveCardsTimeout.current = setTimeout(async () => {
            try {
                const supabase = createClient();
                await supabase.from('sessions').update({ room_state: cards }).eq('id', sessionId);
            } catch (e) { console.error("Failed to save cards:", e); }
        }, 15000); // 15s for quota saving
        return () => { if (saveCardsTimeout.current) clearTimeout(saveCardsTimeout.current); };
    }, [cards, sessionId]);

    // Initial Media State
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoOff, setIsVideoOff] = useState(false);

    // Premium UI State
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const logsRef = useRef(logs); useEffect(() => { logsRef.current = logs; }, [logs]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const messagesRef = useRef(messages); useEffect(() => { messagesRef.current = messages; }, [messages]);
    const [chatInput, setChatInput] = useState("");
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Toast message (live stream style)
    const [toastMsg, setToastMsg] = useState<{ text: string; sender: string } | null>(null);
    const toastTimeout = useRef<NodeJS.Timeout | null>(null);

    const [isConnecting, setIsConnecting] = useState(true);
    const [localReady, setLocalReady] = useState(true);
    const localReadyRef = useRef(localReady);
    useEffect(() => { localReadyRef.current = localReady; }, [localReady]);

    const [remoteReady, setRemoteReady] = useState(false);
    const [pingedCardId, setPingedCardId] = useState<string | null>(null);
    const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isAHeld, setIsAHeld] = useState(false);


    const [user, setUser] = useState<any>(null);

    // AI Interpretation
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<any>(null);

    // Notification beep
    const playNotifSound = useCallback(() => {
        try {
            if (typeof window === 'undefined') return;
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
            setTimeout(() => ctx.close(), 500);
        } catch { }
    }, []);

    // SFX: Card flip sound — mystical chime
    const playCardFlipSound = useCallback(() => {
        try {
            if (typeof window === 'undefined') return;
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            // Chime 1
            const osc1 = ctx.createOscillator();
            const g1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523, ctx.currentTime);  // C5
            osc1.frequency.setValueAtTime(659, ctx.currentTime + 0.1);  // E5
            osc1.frequency.setValueAtTime(784, ctx.currentTime + 0.2);  // G5
            g1.gain.setValueAtTime(0.12, ctx.currentTime);
            g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc1.connect(g1);
            g1.connect(ctx.destination);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.6);
            // Shimmer
            const osc2 = ctx.createOscillator();
            const g2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(1570, ctx.currentTime + 0.1);
            g2.gain.setValueAtTime(0.05, ctx.currentTime + 0.1);
            g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc2.connect(g2);
            g2.connect(ctx.destination);
            osc2.start(ctx.currentTime + 0.1);
            osc2.stop(ctx.currentTime + 0.5);
            setTimeout(() => ctx.close(), 800);
        } catch { }
    }, []);

    // SFX: Aura change — deep whoosh
    const playAuraChangeSound = useCallback(() => {
        try {
            if (typeof window === 'undefined') return;
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(60, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.8);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.8);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.9);
            setTimeout(() => ctx.close(), 1200);
        } catch { }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isChatOpen) scrollToBottom();
    }, [messages, isChatOpen]);

    const appendLog = useCallback((message: string) => {
        const logEntry: ActivityLog = {
            id: Math.random().toString(36).substring(2, 9),
            message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            userId: socketRef.current?.id || "Unknown"
        };
        socketRef.current?.emit("activity-log", roomId, logEntry);
    }, [roomId]);

    // WebRTC & Audio/Video State
    const [myPeerId, setMyPeerId] = useState<string>("");
    const [remotePeerId, setRemotePeerId] = useState<string>("");
    const myVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<Peer | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [remoteFullscreen, setRemoteFullscreen] = useState(false);


    // Exit Modal
    const [showExitModal, setShowExitModal] = useState(false);

    // Chat Voice Message State
    const [isRecording, setIsRecording] = useState(false);
    const [voiceRecorder, setVoiceRecorder] = useState<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Chat Enhanced State
    const [isTyping, setIsTyping] = useState(false);
    const [remoteTyping, setRemoteTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Prevent Mobile Back Button Exit
    useEffect(() => {
        const handlePopState = (e: PopStateEvent) => {
            setShowExitModal(true);
            window.history.pushState(null, '', window.location.href);
        };
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', handlePopState);
        
        // Keyboard: Mistik Vision (A key hold)
        const handleKeys = (e: KeyboardEvent) => {
            if (e.repeat) return;
            const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);
            if (isInput) return;

            if (e.key.toLowerCase() === 'a') {
                if (e.type === 'keydown') setIsAHeld(true);
                else setIsAHeld(false);
            }
        };

        window.addEventListener('keydown', handleKeys);
        window.addEventListener('keyup', handleKeys);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('keydown', handleKeys);
            window.removeEventListener('keyup', handleKeys);
        };
    }, []);



    const tableRef = useRef<HTMLDivElement>(null);

    // ── Session Timer ──
    const [sessionStart] = useState(() => Date.now());
    const [elapsed, setElapsed] = useState("00:00");
    useEffect(() => {
        const timer = setInterval(() => {
            const diff = Math.floor((Date.now() - sessionStart) / 1000);
            const m = String(Math.floor(diff / 60)).padStart(2, '0');
            const s = String(diff % 60).padStart(2, '0');
            setElapsed(`${m}:${s}`);
        }, 1000);
        return () => clearInterval(timer);
    }, [sessionStart]);

    // ── Card Info Panel ──
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const selectedCard = cards.find(c => c.id === selectedCardId);

    // ── Share Link ──
    const [linkCopied, setLinkCopied] = useState(false);

    // Aura Color — deep, dark tones that keep the mystical mood
    const auraColor = useMemo(() => {
        const activeAura = clientProfile?.focus || currentAura;

        switch (activeAura) {
            case 'Aşk': return 'rgba(120, 30, 50, 0.65)';      // Deep dark crimson
            case 'Para': return 'rgba(100, 80, 20, 0.55)';      // Dark antique gold
            case 'Kariyer': return 'rgba(20, 40, 100, 0.55)';    // Deep midnight blue
            case 'Yaratıcılık': return 'rgba(15, 60, 80, 0.55)'; // Dark ocean teal
            case 'Ruhsal':
            default:
                return 'rgba(50, 30, 90, 0.50)';                 // Deep indigo
        }
    }, [clientProfile?.focus, currentAura]);

    const handleAuraChange = useCallback((newAura: string) => {
        setCurrentAura(newAura);
        playAuraChangeSound();
        socketRef.current?.emit("update-aura", roomId, newAura);
        if (isConsultant && clientProfile) {
            setClientProfile(prev => prev ? { ...prev, focus: newAura } : null);
        }
    }, [isConsultant, clientProfile, playAuraChangeSound, roomId]);

    // Initialize fullShareUrl on mount so it's always ready
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setFullShareUrl(`${window.location.origin}/?room=${roomId}`);
        }
    }, [roomId]);

    const copyShareLink = useCallback(() => {
        const url = `${window.location.origin}/?room=${roomId}`;
        navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setFullShareUrl(url);
        setShowShareModal(true);
        setTimeout(() => setLinkCopied(false), 2000);
        appendLog("Davet linki kopyalandı");
    }, [roomId, appendLog]);

    // ── Supabase Session Sync ──
    const fetchedRef = useRef<{ done: boolean; roomId: string | null }>({ done: false, roomId: null });
    useEffect(() => {
        if (fetchedRef.current.done && fetchedRef.current.roomId === roomId) return;
        
        const syncSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUser(user);

            const { data } = await supabase
                .from('sessions')
                .select('*')
                .eq('room_id', roomId)
                .in('status', ['pending', 'active'])
                .order('created_at', { ascending: false })
                .maybeSingle();

            if (data) {
                setSessionId(data.id);
                fetchedRef.current = { done: true, roomId };

                const currentUserIsConsultant = user && data.consultant_id === user.id;
                if (currentUserIsConsultant) setIsConsultant(true);

                if (!searchParams.get('name') && data.client_info) {
                    setClientProfile({
                        name: data.client_info.name || "Müşteri",
                        birth: data.client_info.birth || "",
                        time: data.client_info.time || "",
                        pkgId: data.client_info.pkgId || "standard",
                        cards: data.client_info.cards || 3,
                        focus: data.client_info.focus || "Ruhsal",
                        gender: data.client_info.gender
                    });
                }
                
                if (data.room_state && Array.isArray(data.room_state) && data.room_state.length > 0) {
                    setCards(data.room_state);
                    setMaxZIndex(Math.max(...data.room_state.map((c: CardState) => c.zIndex || 0)) + 1);
                }
                
                if (currentUserIsConsultant && data.status === 'pending') {
                    await supabase.from('sessions').update({ status: 'active' }).eq('id', data.id);
                }
            }
        };
        syncSession();
    }, [roomId]);

    const handleEndSession = useCallback(async () => {
        if (!isConsultant || !sessionId) {
            window.location.href = "/";
            return;
        }
        const supabase = createClient();
        await supabase.from('sessions').update({ status: 'completed' }).eq('id', sessionId);
        window.location.href = "/";
    }, [isConsultant, sessionId]);

    // ── Screenshot ──
    const captureScreenshot = async () => {
        const el = document.getElementById("tarot-table");
        if (!el) return;
        try {
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(el, {
                backgroundColor: "#0C0B14",
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
            });
            const dataUrl = canvas.toDataURL("image/png", 1.0);
            
            // On mobile/Capacitor, standard download link might fail
            // For now, we attempt but also log for debugging
            console.log("Screenshot generated, size:", dataUrl.length);

            const link = document.createElement("a");
            link.download = `tarot-${roomId}-${Date.now()}.png`;
            link.href = dataUrl;
            link.dataset.downloadurl = ["image/png", link.download, link.href].join(":");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            appendLog("Masa ekran görüntüsü kaydedildi");
        } catch { appendLog("Ekran görüntüsü alınamadı"); }
    };

    // ── Fullscreen ──
    const [isFullscreen, setIsFullscreen] = useState(false);
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // ── Ambient Sound ──
    const [isAmbientOn, setIsAmbientOn] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const oscillatorsRef = useRef<OscillatorNode[]>([]);

    const toggleAmbient = () => {
        if (isAmbientOn) {
            oscillatorsRef.current.forEach(o => { try { o.stop(); } catch { } });
            oscillatorsRef.current = [];
            audioCtxRef.current?.close();
            audioCtxRef.current = null;
            setIsAmbientOn(false);
        } else {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            audioCtxRef.current = ctx;

            // Create a warm ambient drone
            const freqs = [65.41, 98.0, 130.81, 196.0]; // C2, G2, C3, G3
            const oscs: OscillatorNode[] = [];
            freqs.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = i < 2 ? "sine" : "triangle";
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                gain.gain.setValueAtTime(0.03 / (i + 1), ctx.currentTime);
                // Slow LFO for movement
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                lfo.frequency.setValueAtTime(0.1 + i * 0.05, ctx.currentTime);
                lfoGain.gain.setValueAtTime(0.01, ctx.currentTime);
                lfo.connect(lfoGain);
                lfoGain.connect(gain.gain);
                lfo.start();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                oscs.push(osc);
            });
            oscillatorsRef.current = oscs;
            setIsAmbientOn(true);
        }
    };

    useEffect(() => {

        // 1. Initialize Supabase Realtime "Socket"
        if (!socketRef.current) {
            const supabase = createClient();
            const channel = supabase.channel(`room:${roomId}`, {
                config: {
                    broadcast: { self: false },
                    presence: { key: 'pending' } // will update when peer connects
                }
            });

            const fakeSocket: any = {
                id: "",
                channel,
                connected: false,
                queue: [],
                emit: (event: string, ...args: any[]) => {
                    let outEvent = event;
                    let outArgs = args;

                    if (event === "add-card") outEvent = "card-added";
                    else if (event === "update-card") outEvent = "card-updated";
                    else if (event === "flip-card") outEvent = "card-flipped";
                    else if (event === "clear-table") { outEvent = "sync-state"; outArgs = [roomId, []]; }
                    else if (event === "sync-all-cards") outEvent = "sync-state";
                    else if (event === "update-client-profile") outEvent = "client-profile-updated";
                    else if (event === "update-aura") outEvent = "aura-updated";
                    else if (event === "typing") outEvent = "user-typing";

                    const sendPayload = () => {
                        channel.send({
                            type: "broadcast",
                            event: outEvent,
                            payload: { args: outArgs }
                        });
                    };

                    if (fakeSocket.connected) {
                        sendPayload();
                    } else {
                        fakeSocket.queue.push(sendPayload);
                    }
                },
                on: (event: string, callback: (...args: any[]) => void) => {
                    channel.on("broadcast", { event }, ({ payload }) => {
                        let args = payload?.args || [];
                        if (args.length > 0 && args[0] === roomId) {
                            args = args.slice(1);
                        }
                        callback(...args);
                    });
                },
                disconnect: () => {
                    supabase.removeChannel(channel);
                }
            };
            socketRef.current = fakeSocket;
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    fakeSocket.connected = true;
                    if (fakeSocket.id) {
                        channel.track({ peerId: fakeSocket.id, role: isConsultant ? 'consultant' : 'client' });
                    }
                    while (fakeSocket.queue.length > 0) {
                        const sendPayload = fakeSocket.queue.shift();
                        if (sendPayload) sendPayload();
                    }

                    // If no one is in the room after 3 seconds, hide connecting overlay so consultant can wait
                    setTimeout(() => {
                        setIsConnecting(false);
                        // Send our ready state if we were already ready before connection established
                        if (localReadyRef.current) {
                            fakeSocket.emit("user-ready", fakeSocket.id || Math.random().toString(36).substring(7));
                        }
                    }, 3000);
                }
            });
        }
        const socket = socketRef.current;

        // Helper: Initialize PeerJS and setup event listeners once we have a stream (real or dummy)
        const initPeerAndJoin = (mediaStream: MediaStream) => {
            peerRef.current = new Peer({
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            peerRef.current.on('open', (id) => {
                setMyPeerId(id);
                console.log('My peer ID is: ' + id);
                socket.id = id;
                // Tracking presence implicitly triggers if subscribed already, otherwise queues
                if (socket.connected) {
                    socket.channel?.track({ peerId: id, role: isConsultant ? 'consultant' : 'client' });
                }
                socket.emit("user-connected", id); // Broadcast arrival explicitly

                // If I am the client, I announce that I am ready to receive data
                // If I am the client, I announce that my media is ready to receive data
                if (!isConsultant) {
                    socket.emit("client-media-ready", id);
                } else {
                    socket.emit("consultant-media-ready", id);
                }
            });

            // Answer incoming calls
            peerRef.current.on('call', call => {
                setRemotePeerId(call.peer);
                call.answer(mediaStream);
                call.on('stream', remoteStream => {
                    console.log("Received remote stream (answering)", remoteStream.id);
                    if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
                        remoteVideoRef.current.srcObject = remoteStream;
                        remoteVideoRef.current.onloadedmetadata = () => {
                            remoteVideoRef.current?.play().catch(e => {
                                console.error("Play error:", e);
                                if (e.name === 'NotAllowedError' && remoteVideoRef.current) {
                                    // Browser blocked autoplay (likely because it has audio and user hasn't interacted).
                                    // Mute it temporarily to force video playback, user can unmute later.
                                    remoteVideoRef.current.muted = true;
                                    remoteVideoRef.current.play().catch(console.error);
                                }
                            });
                        };
                    }
                });
            });

            // Listen for NEW users connecting explicitly via broadcast
            socket.on('user-connected', (userId: string) => {
                if (userId && userId !== socket.id) {
                    console.log("User connected (broadcast):", userId);
                    setRemotePeerId(userId);
                    setIsConnecting(false);
                    connectToNewUser(userId, mediaStream);

                    // Join notification toast
                    const profile = clientProfileRef.current;
                    const joinName = profile?.name || "Bir kullanıcı";
                    appendLog(`${joinName} odaya giriş yaptı`);
                    setToastMsg({ text: `${joinName} odaya giriş yaptı ✨`, sender: "Sistem" });
                    if (toastTimeout.current) clearTimeout(toastTimeout.current);
                    toastTimeout.current = setTimeout(() => setToastMsg(null), 5000);
                }
            });

            // Handshake: Client is ready, Consultant sends the room state
            socket.on('client-media-ready', (clientId: string) => {
                if (isConsultant && clientId !== socket.id) {
                    console.log("Client media is ready, sending sync data...");
                    if (cardsRef.current.length > 0) socket.emit("sync-state", roomId, cardsRef.current);
                    if (logsRef.current.length > 0) socket.emit("sync-logs", roomId, logsRef.current);
                    if (messagesRef.current.length > 0) socket.emit("sync-messages", roomId, messagesRef.current);
                }
            });

            // Handshake: Consultant is ready, Client sends their profile data and room state back
            socket.on('consultant-media-ready', (consultantId: string) => {
                if (!isConsultant && consultantId !== socket.id) {
                    console.log("Consultant media is ready, sending profile and state data...");
                    if (clientProfileRef.current) {
                        socket.emit("update-client-profile", roomId, clientProfileRef.current);
                    }
                    if (cardsRef.current.length > 0) socket.emit("sync-state", roomId, cardsRef.current);
                    if (logsRef.current.length > 0) socket.emit("sync-logs", roomId, logsRef.current);
                    if (messagesRef.current.length > 0) socket.emit("sync-messages", roomId, messagesRef.current);
                }
            });

            // Legacy socket stubs removed for clarity. Video is universally streamed now.


            // Handle user join via Presence to instantly broadcast ready state to late joiners
            socket.channel?.on('presence', { event: 'join' }, () => {
                if (localReadyRef.current) {
                    socket.emit("user-ready", socket.id || Math.random().toString(36).substring(7));
                }
            });

            // Handle user disconnect via Presence
            socket.channel?.on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
                leftPresences.forEach((p: any) => {
                    if (p.peerId && p.peerId !== socket.id) {
                        console.log("User disconnected (presence):", p.peerId);
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = null;
                        }

                        // Disconnect notification toast
                        const profile = clientProfileRef.current;
                        const leaveName = profile?.name || "Bir kullanıcı";
                        appendLog(`${leaveName} odadan ayrıldı`);
                        setToastMsg({ text: `${leaveName} odadan ayrıldı 👋`, sender: "Sistem" });
                        if (toastTimeout.current) clearTimeout(toastTimeout.current);
                        toastTimeout.current = setTimeout(() => setToastMsg(null), 5000);

                        setRemotePeerId("");
                        setRemoteReady(false);
                    }
                });
            });
        };

        // We only start cameras and PeerJS once localReady is true.
        // But we want to setup the socket listeners above IMMEDIATELY so we can hear 'user-ready'.
        // So we will trigger this in a separate manual useEffect or function.

        // Note: Disconnect is now handled by Supabase Presence ^

        socket.on("user-ready", (userId: string) => {
            if (userId && userId !== socket.id) {
                setRemoteReady(true);
                // If we are also ready, we should start the WebRTC connection stream
                if (localReadyRef.current && socket.connected) {
                    // Send back that we are ready too, just in case they missed it
                    socket.emit("user-ready", socket.id || Math.random().toString(36).substring(7));
                }
            }
        });

        // ========== PREMIUM FEATURES SYNC ==========
        socket.on("sync-logs", (serverLogs: ActivityLog[]) => {
            if (serverLogs) setLogs(serverLogs);
        });

        socket.on("sync-messages", (serverMsgs: ChatMessage[]) => {
            if (serverMsgs) setMessages(serverMsgs);
        });

        socket.on("chat-message", (msg: ChatMessage) => {
            setMessages(prev => {
                const newMsgs = [...prev, msg];
                if (newMsgs.length > 100) newMsgs.shift();
                return newMsgs;
            });
            // Notification sound
            playNotifSound();
            // Live toast
            const profile = clientProfileRef.current;
            const senderLabel = msg.sender === 'Consultant' ? 'Danışman' : (profile?.name || 'Müşteri');
            setToastMsg({ text: msg.text || "🎤 Sesli Mesaj", sender: senderLabel });
            if (toastTimeout.current) clearTimeout(toastTimeout.current);
            toastTimeout.current = setTimeout(() => setToastMsg(null), 4000);
        });

        socket.on("activity-log", (logEntry: ActivityLog) => {
            setLogs(prev => {
                const newLogs = [...prev, logEntry];
                if (newLogs.length > 50) newLogs.shift();
                return newLogs;
            });
        });

        socket.on("user-typing", (isTyping: boolean) => {
            setRemoteTyping(isTyping);
        });

        // ========== TAROT STATE SYNC ==========
        socket.on("sync-state", (serverCards: CardState[]) => {
            setCards(serverCards);
            const topZ = Math.max(0, ...serverCards.map(c => c.zIndex));
            setMaxZIndex(topZ + 1);
        });

        socket.on("card-added", (newCard: CardState) => {
            setCards(prev => {
                // Prevent duplicate adds if we emitted it ourselves
                if (prev.some(c => c.id === newCard.id)) return prev;
                return [...prev, newCard];
            });
            setMaxZIndex(prev => Math.max(prev, newCard.zIndex + 1));
        });

        socket.on("card-updated", (updatedCard: CardState) => {
            setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
            setMaxZIndex(prev => Math.max(prev, updatedCard.zIndex + 1));
        });

        socket.on("card-flipped", (cardId: string, isReversed: boolean, isFlipped: boolean) => {
            setCards(prev => prev.map(c =>
                c.id === cardId ? { ...c, isReversed, isFlipped } : c
            ));
        });

        socket.on("card-pinged", (cardId: string) => {
            setPingedCardId(cardId);
            playNotifSound(); // Adding a subtle sound for receiving a ping is nice
            if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
            pingTimeoutRef.current = setTimeout(() => setPingedCardId(null), 3000);
        });

        // ========== CLIENT PROFILE SYNC ==========
        socket.on("sync-client-profile", (profile: any) => {
            if (profile) setClientProfile(profile);
        });

        socket.on("client-profile-updated", (profile: any) => {
            setClientProfile(profile);
        });

        socket.on("aura-updated", (aura: string) => {
            setCurrentAura(aura);
        });

        return () => {
            socket?.disconnect();
            peerRef.current?.destroy();
            const tracks = streamRef.current?.getTracks();
            tracks?.forEach(track => track.stop());
            socketRef.current = null;
        };
    }, [roomId, playNotifSound]);

    const mediaReqRef = useRef(false);

    // Handle starting PeerJS and Video only when localReady is true
    useEffect(() => {
        if (!localReady || mediaReqRef.current) return;
        mediaReqRef.current = true;

        // INSTANTLY tell the other person we are ready over the socket
        if (socketRef.current) {
            socketRef.current.emit("user-ready", socketRef.current.id || Math.random().toString(36).substring(7));
        }

        // 2. Setup User Media (Audio + Video for Mistik Vision)
        navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: "user" },
            audio: true
        })
            .then(stream => {
                streamRef.current = stream;
                if (myVideoRef.current) {
                    myVideoRef.current.srcObject = stream;
                }

                // Disable tracks initially to save battery/quota
                stream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
                stream.getVideoTracks().forEach(track => { track.enabled = !isVideoOff; });

                initPeerAndJoin(stream);
            })
            .catch(err => {
                console.error("Failed to get local stream", err);
                setToastMsg({ text: "Kamera/Ses izni reddedildi veya ulaşılamıyor.", sender: "Sistem" });
                if (toastTimeout.current) clearTimeout(toastTimeout.current);
                toastTimeout.current = setTimeout(() => setToastMsg(null), 5000);
                createDummyAndJoin();
            });

        const initPeerAndJoin = (mediaStream: MediaStream) => {
            peerRef.current = new Peer({
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            peerRef.current.on('open', (id) => {
                setMyPeerId(id);
                console.log('My peer ID is: ' + id);
                if (socketRef.current) {
                    socketRef.current.id = id;
                    if (socketRef.current.connected) {
                        socketRef.current.channel?.track({ peerId: id, role: isConsultant ? 'consultant' : 'client' });
                    }
                    socketRef.current.emit("user-connected", id); // Broadcast arrival explicitly

                    if (!isConsultant) {
                        socketRef.current.emit("client-media-ready", id);
                    } else {
                        socketRef.current.emit("consultant-media-ready", id);
                    }
                }
            });

            // Answer incoming calls
            peerRef.current.on('call', call => {
                setRemotePeerId(call.peer);
                call.answer(mediaStream);
                call.on('stream', remoteStream => {
                    console.log("Received remote stream (answering)", remoteStream.id);
                    if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
                        remoteVideoRef.current.srcObject = remoteStream;
                        remoteVideoRef.current.onloadedmetadata = () => {
                            remoteVideoRef.current?.play().catch(e => {
                                console.error("Play error:", e);
                                if (e.name === 'NotAllowedError' && remoteVideoRef.current) {
                                    remoteVideoRef.current.muted = true;
                                    remoteVideoRef.current.play().catch(console.error);
                                }
                            });
                        };
                    }
                });
            });

            // Listen for NEW users connecting explicitly via broadcast
            if (socketRef.current) {
                socketRef.current.on('user-connected', (userId: string) => {
                    if (userId && userId !== socketRef.current.id) {
                        console.log("User connected (broadcast):", userId);
                        setRemotePeerId(userId);
                        setIsConnecting(false);
                        connectToNewUser(userId, mediaStream);

                        // Join notification toast
                        const profile = clientProfileRef.current;
                        const joinName = profile?.name || "Bir kullanıcı";
                        appendLog(`${joinName} odaya giriş yaptı`);
                        setToastMsg({ text: `${joinName} odaya giriş yaptı ✨`, sender: "Sistem" });
                        if (toastTimeout.current) clearTimeout(toastTimeout.current);
                        toastTimeout.current = setTimeout(() => setToastMsg(null), 5000);
                    }
                });
            }
        };

        function createDummyAndJoin() {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = 640;
                canvas.height = 480;
                const ctx2 = canvas.getContext("2d");
                if (ctx2) {
                    ctx2.fillStyle = "black";
                    ctx2.fillRect(0, 0, canvas.width, canvas.height);
                }
                const videoStream = (canvas as any).captureStream(1);
                const audioCtx2 = new (window.AudioContext || (window as any).webkitAudioContext)();
                const destNode = audioCtx2.createMediaStreamDestination();
                const dummyStream = new MediaStream([
                    ...videoStream.getVideoTracks(),
                    ...destNode.stream.getAudioTracks()
                ]);
                dummyStream.getTracks().forEach(t => t.enabled = false);
                streamRef.current = dummyStream;
                initPeerAndJoin(dummyStream);
            } catch (fallbackErr) {
                console.error("Dummy stream creation failed", fallbackErr);
                initPeerAndJoin(new MediaStream());
            }
        }

        return () => {
            const tracks = streamRef.current?.getTracks();
            tracks?.forEach(track => track.stop());
            peerRef.current?.destroy();
        }
    }, [localReady, isConsultant]);

    function connectToNewUser(userId: string, stream: MediaStream) {
        if (!peerRef.current || !stream) return;
        console.log("Calling user", userId);

        const call = peerRef.current.call(userId, stream);

        call.on('stream', remoteStream => {
            console.log("Received remote stream (calling)", remoteStream.id);
            if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
                remoteVideoRef.current.srcObject = remoteStream;
                // Ensure playback starts
                remoteVideoRef.current.onloadedmetadata = () => {
                    remoteVideoRef.current?.play().catch(e => {
                        console.error("Play error:", e);
                        if (e.name === 'NotAllowedError' && remoteVideoRef.current) {
                            // Browser blocked autoplay. Mute to force video playback.
                            remoteVideoRef.current.muted = true;
                            remoteVideoRef.current.play().catch(console.error);
                        }
                    });
                };
            }
        });

        // Global visibility handler to resume video after phone calls
        const handleGlobalVisibility = () => {
            if (document.visibilityState === 'visible') {
                if (myVideoRef.current) myVideoRef.current.play().catch(() => {});
                if (remoteVideoRef.current) remoteVideoRef.current.play().catch(() => {});
                
                // If stream tracks are ended, they might need restart
                const videoTrack = streamRef.current?.getVideoTracks()[0];
                if (videoTrack && videoTrack.readyState === 'ended' && localReady) {
                    console.log("Video track ended, attempting restart...");
                    refreshLocalMedia();
                }
            }
        };
        document.addEventListener('visibilitychange', handleGlobalVisibility);
        call.on('close', () => {
            document.removeEventListener('visibilitychange', handleGlobalVisibility);
        });
    }

    const refreshLocalMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: "user" },
                audio: true
            });
            streamRef.current = stream;
            if (myVideoRef.current) myVideoRef.current.srcObject = stream;
            
            // Re-apply mute/video states - video is always off in our new battery-safe room
            const videoEnabled = !isVideoOff;
            stream.getAudioTracks().forEach(t => t.enabled = !isMuted);
            stream.getVideoTracks().forEach(t => t.enabled = videoEnabled);
            
            // Replace tracks in current peer calls
            if (peerRef.current) {
                const peerObj = peerRef.current as any;
                const connections = peerObj.connections || peerObj._connections;
                if (connections) {
                    Object.values(connections).forEach((connArray: any) => {
                        connArray.forEach((conn: any) => {
                            if (conn.peerConnection) {
                                const senders = conn.peerConnection.getSenders();
                                if (senders) {
                                    const videoSender = senders.find((s: any) => s.track && s.track.kind === 'video');
                                    const audioSender = senders.find((s: any) => s.track && s.track.kind === 'audio');
                                    if (videoSender && stream.getVideoTracks()[0]) videoSender.replaceTrack(stream.getVideoTracks()[0]);
                                    if (audioSender && stream.getAudioTracks()[0]) audioSender.replaceTrack(stream.getAudioTracks()[0]);
                                }
                            }
                        });
                    });
                }
                
                // FORCE: Re-initiate connection to ensure the remote peer receives the updated stream object
                if (remotePeerId) {
                    try {
                        console.log("Re-calling remote peer to ensure video stream updates", remotePeerId);
                        peerRef.current.call(remotePeerId, stream);
                    } catch (e) {
                        console.error("Failed to re-call peer", e);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to refresh media:", e);
        }
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleMute = () => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };
    // ========== AI INTERPRETATION ==========
    const handleAiInterpret = async (cardIndex: number) => {
        if (aiLoading) return;
        setAiLoading(true);
        setAiResponse("");
        try {
            const flippedCards = cards.filter(c => c.isFlipped).map(c => ({
                ...getCardMeaning(c.cardIndex),
                isReversed: c.isReversed
            }));

            const res = await fetch(getApiUrl("/api/interpret"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    card: cardIndex === -1 ? null : { ...getCardMeaning(cardIndex), isReversed: selectedCard?.isReversed },
                    allCards: flippedCards.map(c => c.name),
                    allCardsDetailed: cardIndex === -1 ? flippedCards : null,
                    clientName: clientProfile?.name || "Danışan",
                    focus: clientProfile?.focus || searchParams.get('focus') || ""
                })
            });
            const data = await res.json();
            setAiResponse(data.interpretation || "Yorum alınamadı.");
        } catch {
            setAiResponse("AI yorumu şu an kullanılamıyor.");
        } finally {
            setAiLoading(false);
        }
    };

    // ========== TAROT INTERACTIONS ==========

    const handleClearTable = () => {
        appendLog("Cleared the mystical table");
        setCards([]);
        socketRef.current?.emit("clear-table", roomId);
    };

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setChatInput(e.target.value);
        if (!isTyping) {
            setIsTyping(true);
            socketRef.current?.emit("typing", roomId, true);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socketRef.current?.emit("typing", roomId, false);
        }, 2000);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = e => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];

                try {
                    const supabase = createClient();
                    const fileName = `${roomId}/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;

                    const { data, error } = await supabase.storage
                        .from('voice-messages')
                        .upload(fileName, audioBlob);

                    if (error) throw error;

                    const { data: { publicUrl } } = supabase.storage
                        .from('voice-messages')
                        .getPublicUrl(fileName);

                    sendVoiceMessage(publicUrl);
                } catch (err) {
                    console.error("Voice upload failed:", err);
                    appendLog("Sesli mesaj gönderilemedi");
                }

                stream.getTracks().forEach(track => track.stop());
            };
            audioChunksRef.current = [];
            recorder.start();
            setVoiceRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access denied", err);
        }
    };

    const stopRecording = () => {
        if (voiceRecorder && isRecording) {
            voiceRecorder.stop();
            setIsRecording(false);
            setVoiceRecorder(null);
        }
    };

    const sendVoiceMessage = (audioUrl: string) => {
        const msg: ChatMessage = {
            id: Math.random().toString(36).substring(2, 9),
            sender: isConsultant ? "Consultant" : "Client",
            audioUrl: audioUrl,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, msg]);
        socketRef.current?.emit("chat-message", roomId, msg);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const msg: ChatMessage = {
            id: Math.random().toString(36).substring(2, 9),
            sender: isConsultant ? "Consultant" : "Client",
            text: chatInput.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, msg]);
        socketRef.current?.emit("chat-message", roomId, msg);
        setChatInput("");
        setIsTyping(false);
        socketRef.current?.emit("typing", roomId, false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setShowEmojiPicker(false);
    };

    const onEmojiClick = (emojiObject: any) => {
        setChatInput(prev => prev + emojiObject.emoji);
    };

    const handleDrawCard = () => {
        // Collect currently used standard card indices
        const usedIndices = new Set(cards.filter(c => !c.deckType || c.deckType === 'tarot').map(c => c.cardIndex));
        
        if (usedIndices.size >= 78) {
            alert("Destede kart kalmadı!");
            return;
        }

        let idx: number;
        do { idx = Math.floor(Math.random() * 78); } while (usedIndices.has(idx));

        appendLog("Görünmez alemden gizemli bir kart çekildi");
        const newCard: CardState = {
            id: Math.random().toString(36).substring(2, 9),
            cardIndex: idx,
            x: 50, // Bottom center dealing
            y: 80 + Math.random() * 5, // Slight jitter
            isFlipped: false,
            isReversed: false,
            zIndex: maxZIndex
        };
        setMaxZIndex(prev => prev + 1);

        // Optimistic update
        setCards(prev => [...prev, newCard]);
        socketRef.current?.emit("add-card", roomId, newCard);
    };

    const handleDrawRumiCard = () => {
        // Collect currently used Rumi card indices
        const usedIndices = new Set(cards.filter(c => c.deckType === 'rumi').map(c => c.cardIndex));
        
        if (usedIndices.size >= 78) {
            alert("Rumi destesinde kart kalmadı!");
            return;
        }

        let idx: number;
        do { idx = Math.floor(Math.random() * 78); } while (usedIndices.has(idx));

        appendLog("Rumi destesinden bir kart çekildi");
        const newCard: CardState = {
            id: Math.random().toString(36).substring(2, 9),
            cardIndex: idx,
            deckType: 'rumi',
            x: 50, // Bottom center dealing
            y: 80 + Math.random() * 5, // Slight jitter
            isFlipped: false,
            isReversed: false,
            zIndex: maxZIndex
        };
        setMaxZIndex(prev => prev + 1);

        // Optimistic update
        setCards(prev => [...prev, newCard]);
        socketRef.current?.emit("add-card", roomId, newCard);
    };

    const handleDealPackage = useCallback(() => {
        if (!isConsultant) return;
        const count = clientProfile?.cards || 3;
        const pkgId = clientProfile?.pkgId || 'standard';
        appendLog(`Dealt the ${count}-card package for ${clientProfile?.name || 'the Client'}`);

        const usedIndices = new Set(cards.filter(c => !c.deckType || c.deckType === 'tarot').map(c => c.cardIndex));
        const spread: CardState[] = [];

        // Handle special "relation" mode for Single Eril/Disil card
        if (pkgId === 'relation') {
            const deckType = clientProfile?.gender === "Kadın" ? "disil" : "eril";
            const maxIdx = 54;
            const idx = Math.floor(Math.random() * maxIdx) + 1; // 1 to 54
            spread.push({
                id: Math.random().toString(36).substring(2, 9),
                cardIndex: idx,
                deckType,
                x: 50,
                y: 45,
                isFlipped: false,
                isReversed: false, // Or allow reversed if you want
                zIndex: maxZIndex + 1
            });
        } else {
            for (let i = 0; i < count; i++) {
                let idx: number;
                do { idx = Math.floor(Math.random() * 78); } while (usedIndices.has(idx));
                usedIndices.add(idx);
                let xPos = 50;
                let yPos = 45;

                if (pkgId === 'matrix' || (pkgId === 'standard' && count >= 3)) {
                    // Grid-based layout for standard and matrix
                    const cols = count <= 3 ? count : 3;
                    const rows = Math.ceil(count / cols);
                    const colIdx = i % cols;
                    const rowIdx = Math.floor(i / cols);

                    // Center the grid with a touch of organic randomness
                    const cellWidth = 80 / cols;
                    const cellHeight = 70 / rows;
                    xPos = (100 - (cols - 1) * cellWidth) / 2 + colIdx * cellWidth + (Math.random() * 4 - 2);
                    yPos = (90 - (rows - 1) * cellHeight) / 2 + rowIdx * cellHeight + (Math.random() * 4 - 2);
                } else if (pkgId === 'standard') {
                    xPos = count === 1 ? 50 : 15 + (70 * i) / (count - 1);
                } else if (pkgId === 'synastry') {
                    // Heart-ish shape or two columns
                    xPos = i < 3 ? 30 : (i < 6 ? 70 : 50);
                    yPos = 30 + (i % 3) * 20;
                } else if (pkgId === 'celtic') {
                    // Cross + Pillar
                    const crossX = [50, 50, 50, 50, 35, 65];
                    const crossY = [45, 45, 25, 65, 45, 45];
                    const pillarX = [85, 85, 85, 85];
                    const pillarY = [75, 55, 35, 15];
                    if (i < 6) { xPos = crossX[i]; yPos = crossY[i]; }
                    else { xPos = pillarX[i - 6]; yPos = pillarY[i - 6]; }
                } else {
                    xPos = 15 + (Math.random() * 70);
                    yPos = 20 + (Math.random() * 50);
                }

                spread.push({
                    id: Math.random().toString(36).substring(2, 9),
                    cardIndex: idx,
                    x: xPos,
                    y: yPos,
                    isFlipped: false,
                    isReversed: Math.random() > 0.3, // 30% chance of being reversed
                    zIndex: maxZIndex + i + 1
                });
            }
        }
        setMaxZIndex(prev => prev + (pkgId === 'relation' ? 1 : count));
        
        // Sequential Deal Animation
        spread.forEach((card, index) => {
            setTimeout(() => {
                setCards(prev => [...prev, card]);
                socketRef.current?.emit("add-card", roomId, card);
                // Optional: Play a subtle card snap sound here if you have one
            }, index * 250); // 250ms interval between cards
        });
    }, [isConsultant, clientProfile, maxZIndex, roomId, appendLog]);

    // Role-based Profile Syncing
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const syncProfile = () => {
            if (!isConsultant && searchParams.get('name')) {
                const data = {
                    name: searchParams.get('name') || '',
                    birth: searchParams.get('birth') || '',
                    time: searchParams.get('time') || '',
                    pkgId: searchParams.get('pkgId') || '',
                    cards: Number(searchParams.get('cards')) || 0,
                    focus: searchParams.get('focus') || '',
                    gender: searchParams.get('gender') || '',
                };
                if (!clientProfileRef.current || clientProfileRef.current.name !== data.name) {
                    setClientProfile(data);
                }
                socket.emit("update-client-profile", roomId, data);
            }
        };

        if (socket.connected) {
            syncProfile();
        } else {
            const int = setInterval(() => {
                if (socketRef.current?.connected) {
                    syncProfile();
                    clearInterval(int);
                }
            }, 500);
            return () => clearInterval(int);
        }
    }, [isConsultant, searchParams.toString(), roomId]);

    const handlePointerDown = useCallback((id: string) => {
        const newZ = maxZIndex + 1;
        setMaxZIndex(newZ);
        let updatedCard: CardState | undefined;
        setCards(prev => {
            const next = prev.map(c => {
                if (c.id === id) {
                    updatedCard = { ...c, zIndex: newZ };
                    return updatedCard;
                }
                return c;
            });
            return next;
        });
        if (updatedCard) socketRef.current?.emit("update-card", roomId, updatedCard);
    }, [maxZIndex, roomId]);

    const handleDragEnd = useCallback((id: string, percentX: number, percentY: number) => {
        let updatedCard: CardState | undefined;
        setCards(prev => {
            const next = prev.map(c => {
                if (c.id === id) {
                    updatedCard = { ...c, x: percentX, y: percentY };
                    return updatedCard;
                }
                return c;
            });
            return next;
        });
        if (updatedCard) socketRef.current?.emit("update-card", roomId, updatedCard);
    }, [roomId]);

    const handleRevealAll = useCallback(() => {
        if (!isConsultant) return;

        let hasChanges = false;
        setCards(prev => {
            const next = prev.map(c => {
                if (!c.isFlipped) {
                    hasChanges = true;
                    // For reveal all, we just flip them right-side up
                    return { ...c, isFlipped: true, isReversed: false };
                }
                return c;
            });

            // If we actually flipped something, sync the whole table state to avoid dropping multiple individual events
            if (hasChanges && socketRef.current) {
                socketRef.current.emit("sync-state", next);
                appendLog("Tüm kartlar açıldı");
                playCardFlipSound();
            }
            return next;
        });
    }, [isConsultant, appendLog, playCardFlipSound]);

    const handlePingCard = useCallback((id: string) => {
        setPingedCardId(id);
        if (socketRef.current) socketRef.current.emit("ping-card", roomId, id);

        if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
        pingTimeoutRef.current = setTimeout(() => setPingedCardId(null), 3000);
    }, [roomId]);

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (isChatOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [messages, isChatOpen]);

    const handleFlipEnd = useCallback((id: string, isReversed: boolean, isFlipped: boolean) => {
        if (isFlipped) {
            appendLog("Revealed a card's destiny");
            setSelectedCardId(id);
            playCardFlipSound();
        } else {
            if (selectedCardId === id) setSelectedCardId(null);
        }
        setCards(prev => prev.map(c => c.id === id ? { ...c, isReversed, isFlipped } : c));
        socketRef.current?.emit("flip-card", roomId, id, isReversed, isFlipped);
    }, [roomId, appendLog, selectedCardId, playCardFlipSound]);

    return {
        // State
        role: isConsultant ? 'consultant' : 'client', isConsultant, clientProfile, copied, isSidebarOpen,
        cards, maxZIndex, logs, messages, chatInput, isChatOpen,
        toastMsg, aiLoading, aiResponse, remotePeerId, isMuted, isVideoOff,
        remoteFullscreen, showExitModal, isRecording,
        remoteTyping, showEmojiPicker, elapsed, selectedCardId, selectedCard,
        linkCopied, isAmbientOn, isFullscreen, auraColor,

        showShareModal,
        fullShareUrl,
        showAurasPanel,
        currentAura,
        isConnecting,
        localReady,
        remoteReady,
        pingedCardId,
        isAHeld,

        // Setters
        setIsSidebarOpen,
        setLocalReady,
        setChatInput, setIsChatOpen, setRemoteFullscreen,
        setShowExitModal, setShowEmojiPicker, setSelectedCardId, setAiResponse,
        setShowShareModal,
        setShowAurasPanel,
        handleAuraChange,

        // Refs
        messagesEndRef, myVideoRef, remoteVideoRef, tableRef,

        // Handlers
        copyRoomId, toggleMute, toggleVideo, handleAiInterpret, handleClearTable,
        handleTyping, startRecording, stopRecording, handleSendMessage, onEmojiClick,
        handleDrawCard, handleDrawRumiCard, handleDealPackage, handlePointerDown, handleDragEnd, handleFlipEnd, handleRevealAll, handlePingCard,
        copyShareLink, captureScreenshot, toggleFullscreen, toggleAmbient, handleEndSession, refreshLocalMedia,
    };
}

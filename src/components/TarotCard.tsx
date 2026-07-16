"use client";

import { motion } from "framer-motion";
import { useRef, useState, useCallback } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { rumiCards } from "@/lib/rumiData";
import { getCardImage } from "@/lib/cardData";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface CardState {
    id: string;
    cardIndex: number;
    deckType?: 'tarot' | 'rumi' | 'eril' | 'disil';
    x: number;       // percentage 0-100
    y: number;       // percentage 0-100
    isFlipped: boolean;
    isReversed: boolean;
    zIndex: number;
}

interface TarotCardProps {
    card: CardState;
    onDragEnd: (id: string, x: number, y: number) => void;
    onFlipEnd: (id: string, isReversed: boolean, isFlipped: boolean) => void;
    onPointerDown: (id: string) => void;
    onPing?: (id: string) => void;
    isLocal: boolean;
    isPinged?: boolean;
    constraintsRef?: React.RefObject<HTMLDivElement | null>;
}

const getCardName = (index: number, deckType?: 'tarot' | 'rumi' | 'eril' | 'disil') => {
    if (deckType === 'rumi') return rumiCards[index]?.name || `Rumi Kart ${index}`;
    if (deckType === 'eril') return `Eril Enerji ${index}`;
    if (deckType === 'disil') return `Dişil Enerji ${index}`;

    const majorArcana = [
        "Deli", "Büyücü", "Başrahibe", "İmparatoriçe", "İmparator",
        "Başkeşiş", "Âşıklar", "Savaş Arabası", "Güç", "Ermiş",
        "Kader Çarkı", "Adalet", "Asılan Adam", "Ölüm", "Denge",
        "Şeytan", "Kule", "Yıldız", "Ay", "Güneş",
        "Mahkeme", "Dünya"
    ];
    if (index < majorArcana.length) return majorArcana[index];

    const minorIndex = index - 22;
    const suit = Math.floor(minorIndex / 14);
    const rank = (minorIndex % 14) + 1;
    const suits = ["Kupa", "Tılsım", "Kılıç", "Asa"];
    const ranks = ["As", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz", "On", "Şövalye", "Süvari", "Kraliçe", "Kral"];
    return `${suits[suit]} ${ranks[rank - 1]}`;
};

// Card dimensions — helper
const getDimensions = (deckType?: string) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const isLarge = deckType === 'eril' || deckType === 'disil';

    if (isLarge) {
        return {
            w: isMobile ? 220 : 340,
            h: isMobile ? 320 : 500
        };
    }
    return {
        w: isMobile ? 108 : 144,
        h: isMobile ? 168 : 224
    };
};

export default function TarotCard({ card, onDragEnd, onFlipEnd, onPointerDown, onPing, isLocal, isPinged, constraintsRef }: TarotCardProps) {
    // Local drag offset in pixels (resets to 0 when not dragging)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ px: 0, py: 0 });
    const lastTap = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        // If alt-click or right-click, we ping the card and don't drag
        if (e.button === 2 || e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            if (onPing) onPing(card.id);
            return;
        }

        // Only left mouse button or touch for dragging
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        isDragging.current = true;
        dragStart.current = { px: e.clientX, py: e.clientY };
        setDragOffset({ x: 0, y: 0 });

        onPointerDown(card.id);

        // Capture pointer for smooth dragging even outside the element
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [card.id, onPointerDown]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current) return;
        e.preventDefault();

        const dx = e.clientX - dragStart.current.px;
        const dy = e.clientY - dragStart.current.py;

        const { w, h } = getDimensions(card.deckType);

        // Compute tentative new position to enforce table boundaries
        if (constraintsRef?.current) {
            const rect = constraintsRef.current.getBoundingClientRect();
            const currentLeftPx = (card.x / 100) * rect.width - w / 2;
            const currentTopPx = (card.y / 100) * rect.height - h / 2;

            let newLeft = currentLeftPx + dx;
            let newTop = currentTopPx + dy;

            // Clamp to table boundaries
            newLeft = Math.max(0, Math.min(rect.width - w, newLeft));
            newTop = Math.max(0, Math.min(rect.height - h, newTop));

            setDragOffset({
                x: newLeft - currentLeftPx,
                y: newTop - currentTopPx
            });
        } else {
            setDragOffset({ x: dx, y: dy });
        }
    }, [card.x, card.y, card.deckType, constraintsRef]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current) return;
        isDragging.current = false;

        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        if (!constraintsRef?.current) {
            setDragOffset({ x: 0, y: 0 });
            return;
        }

        const rect = constraintsRef.current.getBoundingClientRect();
        const { w, h } = getDimensions(card.deckType);

        // Current CSS anchor in pixels
        const currentLeftPx = (card.x / 100) * rect.width - w / 2;
        const currentTopPx = (card.y / 100) * rect.height - h / 2;

        // New top-left corner in pixels
        let newLeft = currentLeftPx + dragOffset.x;
        let newTop = currentTopPx + dragOffset.y;

        // Clamp to table
        newLeft = Math.max(0, Math.min(rect.width - w, newLeft));
        newTop = Math.max(0, Math.min(rect.height - h, newTop));

        // Convert to center-based percentages
        const newCenterX = newLeft + w / 2;
        const newCenterY = newTop + h / 2;

        const newPercentX = (newCenterX / rect.width) * 100;
        const newPercentY = (newCenterY / rect.height) * 100;

        // Reset drag offset BEFORE emitting (so the CSS left/top takes over cleanly)
        setDragOffset({ x: 0, y: 0 });

        onDragEnd(card.id, newPercentX, newPercentY);
    }, [card.id, card.x, card.y, card.deckType, constraintsRef, dragOffset, onDragEnd]);

    // Detect taps (pointerUp with minimal movement) and double-tap to flip
    const handleTapDetection = useCallback((e: React.PointerEvent) => {
        // Only count as a "tap" if the finger/mouse barely moved (< 15px)
        const dx = Math.abs(e.clientX - dragStart.current.px);
        const dy = Math.abs(e.clientY - dragStart.current.py);
        if (dx > 15 || dy > 15) return; // was a drag, not a tap

        const now = Date.now();
        const prev = lastTap.current;

        // Check if this is a double-tap (second tap within 400ms and nearby)
        if (
            now - prev.time < 400 &&
            Math.abs(e.clientX - prev.x) < 30 &&
            Math.abs(e.clientY - prev.y) < 30
        ) {
            // Double-tap detected → flip card (never reverse)
            onFlipEnd(card.id, false, !card.isFlipped);
            lastTap.current = { time: 0, x: 0, y: 0 }; // reset to prevent triple-tap
        } else {
            lastTap.current = { time: now, x: e.clientX, y: e.clientY };
        }
    }, [card.id, card.isFlipped, card.isReversed, onFlipEnd]);

    const isRumi = card.deckType === 'rumi';
    const isEril = card.deckType === 'eril';
    const isDisil = card.deckType === 'disil';
    const isLarge = isEril || isDisil;
    const isSpecialDeck = isRumi || isLarge;

    const { w, h } = getDimensions(card.deckType);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    return (
        <motion.div
            onContextMenu={(e) => {
                e.preventDefault(); // Prevent browser context menu so ping works on right click
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => {
                handlePointerUp(e);
                handleTapDetection(e);
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: 1,
                opacity: 1,
                zIndex: card.zIndex,
                rotateY: card.isFlipped ? 180 : 0,
                rotateZ: card.isFlipped && card.isReversed ? 180 : 0,
            }}
            whileHover={isDragging.current ? undefined : {
                scale: 1.08,
                y: -10,
                boxShadow: card.isFlipped ? "0 20px 50px rgba(167, 139, 250, 0.6)" : "0 20px 40px rgba(251, 191, 36, 0.4)"
            }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                rotateY: { duration: 0.8, ease: "easeInOut" },
                rotateZ: { duration: 0.6, ease: "easeOut" }
            }}
            className={cn("rounded-xl select-none touch-none hover:z-[99] transition-shadow duration-300", isLarge ? "rounded-2xl border-2" : "rounded-xl border")}
            style={{
                position: 'absolute',
                width: isMobile ? `${w}px` : `${w}px`,
                height: isMobile ? `${h}px` : `${h}px`,
                left: `calc(${card.x}% - ${w / 2}px + ${dragOffset.x}px)`,
                top: `calc(${card.y}% - ${h / 2}px + ${dragOffset.y}px)`,
                cursor: isDragging.current ? 'grabbing' : 'grab',
                transformStyle: "preserve-3d",
                willChange: "left, top, transform",
            }}
        >
            {/* Front of card (shown when flipped) */}
            <div
                className="absolute inset-0 rounded-xl shadow-2xl backface-hidden border border-purple-500/20 overflow-hidden"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
                {/* Full-bleed card image */}
                <img
                    src={getCardImage(card.cardIndex, card.deckType)}
                    alt={getCardName(card.cardIndex, card.deckType)}
                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                    draggable={false}
                />

                {/* Bottom gradient overlay for name + badge (Hiding for Eril/Disil as requested) */}
                {!isLarge && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-8 pb-2 px-2 z-10 flex flex-col items-center gap-1">
                        <span className="text-center font-heading text-white font-bold leading-tight text-[11px] drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] tracking-wide">
                            {getCardName(card.cardIndex, card.deckType)}
                        </span>
                        <div className={cn(
                            "text-[7px] font-inter tracking-[0.15em] uppercase font-bold px-2.5 py-0.5 rounded-full border",
                            isRumi ? "text-amber-300 border-amber-400/50 bg-amber-900/40" : "text-purple-300 border-purple-400/50 bg-purple-500/20"
                        )}>
                            Düz
                        </div>
                    </div>
                )}

                {/* Ping Radar for Front Face */}
                {isPinged && (
                    <div className="absolute inset-0 pointer-events-none rounded-[inherit] z-50">
                        <motion.div
                            animate={{ scale: [1, 1.4, 2], opacity: [0.8, 0.4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                            className="absolute inset-[-10px] rounded-[inherit] border-[4px] border-amber-400"
                        />
                        <motion.div
                            animate={{ scale: [1, 1.2, 1.6], opacity: [0.6, 0.3, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                            className="absolute inset-[-10px] rounded-[inherit] border-[2px] border-amber-300"
                        />
                        <div className="absolute inset-0 rounded-[inherit] bg-amber-500/20 mix-blend-overlay" />
                    </div>
                )}
            </div>

            {/* Back of Card (shown initially) */}
            <div
                className={cn("absolute inset-0 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex items-center justify-center p-1.5 border-2 backface-hidden overflow-hidden",
                    isRumi ? "bg-gradient-to-b from-red-950 to-orange-950 border-amber-600/40"
                        : isDisil ? "bg-gradient-to-b from-yellow-500 to-amber-600 border-yellow-200/50"
                            : isEril ? "bg-gradient-to-b from-zinc-900 to-black border-zinc-500/50"
                                : "bg-gradient-to-b from-purple-900 to-indigo-950 border-amber-500/30"
                )}
                style={{ backfaceVisibility: "hidden" }}
            >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay pointer-events-none" />

                <div className={cn("w-full h-full border rounded-lg flex items-center justify-center relative overflow-hidden shadow-inner",
                    isRumi ? "border-amber-500/30 bg-gradient-to-br from-red-950 to-midnight"
                        : isDisil ? "border-yellow-200/30 bg-gradient-to-br from-yellow-600 to-amber-800"
                            : isEril ? "border-zinc-700/50 bg-gradient-to-br from-zinc-800 to-black"
                                : "border-amber-500/20 bg-gradient-to-br from-purple-950 to-midnight"
                )}>

                    <div className={cn("w-24 h-24 rounded-full blur-xl absolute animate-pulse-slow pointer-events-none",
                        isRumi ? "bg-gradient-to-tr from-amber-600/30 to-red-600/30"
                            : isDisil ? "bg-gradient-to-tr from-yellow-300/40 to-amber-400/30"
                                : isEril ? "bg-gradient-to-tr from-zinc-600/20 to-zinc-400/10"
                                    : "bg-gradient-to-tr from-amber-500/20 to-purple-500/30"
                    )} />

                    <svg viewBox="0 0 100 100" className={cn("w-[85%] h-[85%] opacity-90 relative z-10 drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]",
                        isRumi ? "text-amber-400"
                            : isDisil ? "text-yellow-100"
                                : isEril ? "text-zinc-600"
                                    : "text-amber-300"
                    )}>
                        {isRumi || isDisil || isEril ? (
                            <g>
                                <circle fill="none" stroke="currentColor" strokeWidth="0.5" cx="50" cy="50" r="46" opacity="0.8" />
                                <circle fill="none" stroke="currentColor" strokeWidth="1" cx="50" cy="50" r="32" opacity="0.4" strokeDasharray="1 2" />
                                <path fill="currentColor" d="M50 15 L55 35 L75 30 L60 45 L70 65 L50 55 L30 65 L40 45 L25 30 L45 35 Z" opacity="0.2" />
                                <circle fill="none" stroke="currentColor" strokeWidth="0.5" cx="50" cy="50" r="15" opacity="0.6" />
                                <circle fill="currentColor" cx="50" cy="50" r="3" opacity="0.8" />
                            </g>
                        ) : (
                            <g>
                                <circle fill="none" stroke="currentColor" strokeWidth="0.5" cx="50" cy="50" r="46" />
                                <circle fill="none" stroke="currentColor" strokeWidth="0.5" cx="50" cy="50" r="42" strokeDasharray="2 4" opacity="0.5" />
                                <path fill="currentColor" opacity="0.9" d="M60 25 A 25 25 0 1 0 75 70 A 30 30 0 1 1 60 25 Z" />
                                <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M25 40 L40 30 L50 45 L35 65 L25 40" opacity="0.6" />
                                <circle fill="currentColor" cx="25" cy="40" r="1.5" />
                                <circle fill="currentColor" cx="40" cy="30" r="1" />
                                <circle fill="currentColor" cx="50" cy="45" r="2" />
                                <circle fill="currentColor" cx="35" cy="65" r="1.5" />
                                <path fill="currentColor" d="M70 30 L72 35 L77 37 L72 39 L70 44 L68 39 L63 37 L68 35 Z" opacity="0.8" transform="scale(0.5) translate(70, 0)" />
                                <path fill="currentColor" d="M30 70 L32 75 L37 77 L32 79 L30 84 L28 79 L23 77 L28 75 Z" opacity="0.6" transform="scale(0.4) translate(30, 80)" />
                            </g>
                        )}
                    </svg>

                    <div className="absolute inset-1.5 border border-amber-400/10 rounded-md pointer-events-none" />
                </div>

                {/* Ping Radar for Back Face */}
                {isPinged && (
                    <div className="absolute inset-0 pointer-events-none rounded-[inherit] z-50">
                        <motion.div
                            animate={{ scale: [1, 1.4, 2], opacity: [0.8, 0.4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                            className="absolute inset-[-10px] rounded-[inherit] border-[4px] border-purple-400"
                        />
                        <div className="absolute inset-0 rounded-[inherit] bg-purple-500/30 mix-blend-overlay" />
                    </div>
                )}
            </div>
        </motion.div>
    );
}

import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { card, allCards, allCardsDetailed, clientName, focus } = body;

        // Danışan ismi kontrolü
        const name = clientName || "Danışanımız";
        const intentText = focus ? `Danışanın Odaklandığı Konu/Niyet: ${focus}` : "";

        const systemPrompt = `Sen 'Mistik Tarot' adında, kadim bilgilere sahip bir tarot yorumcususun. 
        GÖREVİN: 
        1. Asla imla hatası yapma. Akıcı ve saygın bir İstanbul Türkçesi kullan.
        2. Bir yapay zeka olduğunu asla belli etme, doğrudan ruhsal bir rehber gibi konuş.
        3. Kartların birbiriyle olan element ve ruhsal geçişlerinden bahset.
        4. En fazla 6-7 cümle kullan ama çok derin ve etkileyici olsun.`;

        let userPrompt = "";

        if (card) {
            // Tek bir kart yorumu
            const orientation = card.isReversed ? "Ters (Reversed)" : "Düz";
            let contextText = "";
            if (allCards && allCards.length > 1) {
                const otherCards = allCards.filter((c: string) => c !== card.name);
                if (otherCards.length > 0) {
                    contextText = `Masadaki diğer açılmış kartlar: ${otherCards.join(', ')}. Tasvirini bu kartların kolektif enerjisiyle harmanla.`;
                }
            }

            userPrompt = `Danışan Adı: ${name}
            Seçilen Kart: ${card.name} (${orientation})
            Element: ${card.element}
            Anlamı: ${card.meaning}
            ${intentText}
            ${contextText}
            
            Lütfen bu kartın taşıdığı mesajı mistik bir dille fısılda. Kart ters ise uyarıcı ol.`;
        } else if (allCardsDetailed && allCardsDetailed.length > 0) {
            // Tüm masanın genel yorumu
            const cardsInfo = allCardsDetailed.map((c: any) => `- ${c.name} (${c.isReversed ? 'Ters' : 'Düz'}) [Element: ${c.element}]`).join('\n');
            userPrompt = `Danışan Adı: ${name}
            Masa Üzerindeki Tüm Kartlar:
            ${cardsInfo}
            ${intentText}
            
            Lütfen masadaki bu tüm kartların birleşiminden doğan genel bir kehanet ve ruhsal okuma yap. Kartların birbirini nasıl etkilediğini ve danışanın yolculuğundaki genel mesajı mistik ve akıcı bir Türkçeyle anlat.`;
        } else {
            return NextResponse.json({ error: "Kart bilgisi eksik." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        let interpretation = "";

        if (apiKey) {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `${systemPrompt}\n\n${userPrompt}`;

            // Try different models as fallbacks
            for (const model of ["gemini-2.0-flash", "gemini-1.5-flash"]) {
                try {
                    const res = await ai.models.generateContent({ model, contents: prompt });
                    if (res.text) {
                        interpretation = res.text;
                        break;
                    }
                } catch (e: any) {
                    console.warn(`Gemini model ${model} error:`, e.message);
                    if (e.status === 429) continue; // Rate limit, try next model
                    break;
                }
            }
        }

        // Fallback if Gemini fails or no key
        if (!interpretation) {
            const res = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    model: 'openai',
                    seed: Math.floor(Math.random() * 100000),
                }),
            });
            if (res.ok) {
                interpretation = await res.text();
            }
        }

        if (!interpretation) {
            throw new Error("Tüm AI servisleri başarısız oldu.");
        }

        return NextResponse.json(
            { interpretation },
            {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            }
        );
    } catch (error) {
        console.error("AI yorumlama hatası:", error);
        return NextResponse.json(
            { interpretation: "Pusların arkası şu an görünmüyor... Kartlarımız biraz yoruldu, lütfen biraz sonra tekrar deneyin." },
            {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
}

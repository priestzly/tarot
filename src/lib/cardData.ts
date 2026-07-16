export interface CardInfo {
    name: string;
    element: string;
    keywords: string;
    meaning: string;
}

export const CARD_DB: Record<number, CardInfo> = {
    // ═══ BÜYÜK ARKANA (0-21) ═══
    0: { name: "Deli", element: "Hava", keywords: "Yeni başlangıç, spontanlık, masumiyet", meaning: "Hayatınızda yepyeni bir sayfa açılıyor. Korkusuzca adım atmanın ve içsel çocuğunuzu dinlemenin zamanı. Bilinmeyene güvenin." },
    1: { name: "Büyücü", element: "Hava", keywords: "İrade, yaratıcılık, ustalık", meaning: "Elinizdeki tüm kaynakları kullanarak hayallerinizi gerçeğe dönüştürebilirsiniz. İrade gücünüz zirvededir. Harekete geçin." },
    2: { name: "Başrahibe", element: "Su", keywords: "Sezgi, gizem, bilinçaltı", meaning: "İç sesinizi dinleyin, cevaplar içinizde saklı. Görünenin ötesine bakın. Bilinçaltınız size yol gösteriyor." },
    3: { name: "İmparatoriçe", element: "Toprak", keywords: "Bereket, annelik, doğa", meaning: "Bolluk ve bereket dönemi. Yaratıcılığınız çiçek açıyor. Kendinize ve çevrenize şefkatle yaklaşın." },
    4: { name: "İmparator", element: "Ateş", keywords: "Otorite, yapı, liderlik", meaning: "Düzen ve disiplin zamanı. Liderlik özelliklerinizi gösterin. Sınırlar koyun ve planlarınızı uygulayın." },
    5: { name: "Başkeşiş", element: "Toprak", keywords: "Gelenek, rehberlik, maneviyat", meaning: "Manevi rehberlik arayışı. Geleneksel değerlere dönüş veya bir öğretmen/mentorla karşılaşma." },
    6: { name: "Âşıklar", element: "Hava", keywords: "Aşk, uyum, seçim", meaning: "Önemli bir ilişki veya seçim karşınızda. Kalbinizin sesini dinleyin. Değerlerinize uygun kararlar verin." },
    7: { name: "Savaş Arabası", element: "Su", keywords: "Zafer, irade, kararlılık", meaning: "Engellerı aşma gücünüz var. Kararlılıkla ilerleyin. İç çatışmalarınızı dengeleyerek zafere ulaşın." },
    8: { name: "Güç", element: "Ateş", keywords: "Cesaret, sabır, içsel güç", meaning: "Gerçek güç şiddette değil, sabır ve şefkattedir. İçsel gücünüzle zorluklarla baş edebilirsiniz." },
    9: { name: "Ermiş", element: "Toprak", keywords: "İç arayış, yalnızlık, bilgelik", meaning: "Kendi iç dünyanıza çekilme zamanı. Yalnızlıkta bilgelik bulacaksınız. Cevapları içinizde arayın." },
    10: { name: "Kader Çarkı", element: "Ateş", keywords: "Kader, dönüm noktası, döngü", meaning: "Hayatınızda büyük bir dönüm noktası. Kader devrede. Değişime açık olun, her şey bir döngü." },
    11: { name: "Adalet", element: "Hava", keywords: "Denge, doğruluk, hukuk", meaning: "Adaletli davranın ve adaletli davranılacaksınız. Kararlarınızın sonuçlarıyla yüzleşme zamanı." },
    12: { name: "Asılan Adam", element: "Su", keywords: "Fedakarlık, teslim olma, yeni bakış", meaning: "Durumu farklı bir açıdan görün. Bazen bırakmak en büyük güçtür. Fedakarlık yeni kapılar açar." },
    13: { name: "Ölüm", element: "Su", keywords: "Dönüşüm, son ve başlangıç", meaning: "Fiziksel ölüm değil, dönüşüm. Eski kapanıyor, yeni açılıyor. Değişimi kucaklayın." },
    14: { name: "Denge", element: "Ateş", keywords: "Ölçülülük, uyum, sabır", meaning: "Aşırılıklardan kaçının, orta yolu bulun. Sabır ve ılımlılıkla hedeflerinize ulaşacaksınız." },
    15: { name: "Şeytan", element: "Toprak", keywords: "Bağımlılık, tutku, gölge ben", meaning: "Sizi bağlayan zincirlere bakın. Bağımlılıklar, korkular veya olumsuz kalıplardan kurtulma çağrısı." },
    16: { name: "Kule", element: "Ateş", keywords: "Yıkım, uyanış, ani değişim", meaning: "Ani ve beklenmedik değişim. Eski yapılar yıkılıyor. Acı verici olsa da özgürleştirici bir süreç." },
    17: { name: "Yıldız", element: "Hava", keywords: "Umut, ilham, iyileşme", meaning: "Fırtınadan sonra huzur. Umudunuzu kaybetmeyin. İlham kaynağınız parlıyor, iyileşme başlıyor." },
    18: { name: "Ay", element: "Su", keywords: "İllüzyon, korku, bilinçaltı", meaning: "Her şey göründüğü gibi değil. Korkularınızla yüzleşin. Bilinçaltı mesajlara dikkat edin." },
    19: { name: "Güneş", element: "Ateş", keywords: "Mutluluk, başarı, canlılık", meaning: "Hayatınıza ışık ve sıcaklık geliyor. Başarı, neşe ve bolluk dönemi. İçsel çocuğunuzu kutlayın." },
    20: { name: "Mahkeme", element: "Ateş", keywords: "Uyanış, yargı, çağrı", meaning: "Hayatınızı değerlendirme ve hesap verme zamanı. İç sesinizin çağrısına uyun. Yeniden doğuş." },
    21: { name: "Dünya", element: "Toprak", keywords: "Tamamlanma, bütünlük, başarı", meaning: "Bir döngünün tamamlanması. Hedeflerinize ulaştınız. Kutlayın ve yeni maceraya hazırlanın." },
    // ═══ KUPA (22-35) ═══
    22: { name: "Kupa As", element: "Su", keywords: "Yeni duygusal başlangıç, aşk, sezgi", meaning: "Duygusal hayatınızda yeni ve güçlü bir başlangıç. Aşk, dostluk veya derin bir sezgisel uyanış." },
    23: { name: "Kupa İki", element: "Su", keywords: "Ortaklık, çekim, birlik", meaning: "Karşılıklı çekim ve uyum. Yeni bir romantik bağ veya güçlenen bir ortaklık." },
    24: { name: "Kupa Üç", element: "Su", keywords: "Kutlama, dostluk, topluluk", meaning: "Kutlama zamanı. Dostlarla birliktelik, sosyal etkinlikler ve paylaşılan mutluluk." },
    25: { name: "Kupa Dört", element: "Su", keywords: "Hoşnutsuzluk, ilgisizlik, yeniden değerlendirme", meaning: "Mevcut fırsatları görmezden geliyorsunuz. Elinizdeki güzelliklere tekrar bakın." },
    26: { name: "Kupa Beş", element: "Su", keywords: "Kayıp, yas, pişmanlık", meaning: "Duygusal bir kayıpla yüzleşme. Ama arkada kalan dolu kupalara bakın — her şey kaybolmadı." },
    27: { name: "Kupa Altı", element: "Su", keywords: "Nostalji, geçmiş, çocukluk", meaning: "Geçmişe dönüş ve nostalji. Eski anılar, çocukluk hatıraları. Masumiyete özlem." },
    28: { name: "Kupa Yedi", element: "Su", keywords: "Hayal, seçenekler, illüzyon", meaning: "Hayallere dalma. Pek çok seçenek var ama hangisi gerçek? Ayaklarınızı yere basın." },
    29: { name: "Kupa Sekiz", element: "Su", keywords: "Uzaklaşma, arayış, terk etme", meaning: "Artık sizi beslemeyen durumlardan uzaklaşma cesareti. Daha derin anlam arayışı." },
    30: { name: "Kupa Dokuz", element: "Su", keywords: "Dilek, tatmin, mutluluk", meaning: "Dilekleriniz gerçek oluyor! Duygusal tatmin ve memnuniyet dönemi. 'Dilek kartı' olarak bilinir." },
    31: { name: "Kupa On", element: "Su", keywords: "Mutluluk, aile, uyum", meaning: "Duygusal tamamlanma. Aile mutluluğu, ilişkilerde uyum ve kalıcı huzur." },
    32: { name: "Kupa Şövalye", element: "Su", keywords: "Mesaj, teklif, yaratıcılık", meaning: "Duygusal bir mesaj veya teklif yolda. Yaratıcı ilham. Genç ve hassas bir enerji." },
    33: { name: "Kupa Süvari", element: "Su", keywords: "Romantizm, şövalye, duygusal teklif", meaning: "Romantik ve idealist bir enerji. Aşk teklifleri, duygusal davetler. Hayalperest." },
    34: { name: "Kupa Kraliçe", element: "Su", keywords: "Şefkat, sezgi, duygusal güvenlik", meaning: "Derin empati ve sezgi. Şefkatli, besleyici enerji. Kalbinizle hareket edin." },
    35: { name: "Kupa Kral", element: "Su", keywords: "Duygusal olgunluk, diplomatik, bilge", meaning: "Duygusal zeka ve olgunluk. Kalpten gelen liderlik. Dengelenmiş duygusal güç." },
    // ═══ TILSIM (36-49) ═══
    36: { name: "Tılsım As", element: "Toprak", keywords: "Maddi fırsat, bolluk, yeni iş", meaning: "Maddi hayatınızda büyük bir fırsat. Yeni iş, para veya somut bir başlangıç." },
    37: { name: "Tılsım İki", element: "Toprak", keywords: "Denge, uyum, esneklik", meaning: "Birden fazla sorumluluğu dengeleme. Esneklik gerekli. Değişime uyum sağlayın." },
    38: { name: "Tılsım Üç", element: "Toprak", keywords: "Ustalık, ekip çalışması, planlama", meaning: "Uzmanlaşma ve ekip çalışması. Becerileriniz tanınıyor. Planlarınız somut sonuç veriyor." },
    39: { name: "Tılsım Dört", element: "Toprak", keywords: "Güvenlik, tutma, kontrol", meaning: "Maddi güvenceye tutunma. Kontrol arzusu. Bazen vermek almaktan daha zenginleştiricidir." },
    40: { name: "Tılsım Beş", element: "Toprak", keywords: "Maddi kayıp, zorluk, yoksulluk", meaning: "Maddi zorluklar veya dışlanma hissi. Ama dayanışma ve iç kaynaklarınız sizi kurtaracak." },
    41: { name: "Tılsım Altı", element: "Toprak", keywords: "Cömertlik, paylaşım, yardım", meaning: "Verme ve alma dengesi. Cömertlik ödüllendirilecek. Yardım etmek veya yardım almak." },
    42: { name: "Tılsım Yedi", element: "Toprak", keywords: "Sabır, yatırım, bekleme", meaning: "Emeklerinizin karşılığını bekleme zamanı. Sabırlı olun, tohumlar büyüyor." },
    43: { name: "Tılsım Sekiz", element: "Toprak", keywords: "Çalışkanlık, ustalık, detay", meaning: "Detaylara odaklanma ve ustalık geliştirme. Azimle çalışarak mükemmelliğe ulaşma." },
    44: { name: "Tılsım Dokuz", element: "Toprak", keywords: "Lüks, bağımsızlık, başarı", meaning: "Maddi konfor ve bağımsızlık. Kendi emeğinizle kazanılmış lüks ve rahatlık." },
    45: { name: "Tılsım On", element: "Toprak", keywords: "Miras, aile serveti, kalıcılık", meaning: "Nesiller arası zenginlik. Aile bağları, miras ve kalıcı güvenlik." },
    46: { name: "Tılsım Şövalye", element: "Toprak", keywords: "Çalışkanlık, sorumluluk, öğrenci", meaning: "Yeni beceriler öğrenme. Pratik ve çalışkan enerji. Somut adımlar atma." },
    47: { name: "Tılsım Süvari", element: "Toprak", keywords: "Azim, güvenilirlik, metodik", meaning: "Yavaş ama emin adımlarla ilerleme. Güvenilir ve metodik bir yaklaşım." },
    48: { name: "Tılsım Kraliçe", element: "Toprak", keywords: "Pratik bilgelik, besleyici, bolluk", meaning: "Pratik bilgelik ve doğal bolluk. Hem duygusal hem maddi güvenlik sağlayan enerji." },
    49: { name: "Tılsım Kral", element: "Toprak", keywords: "Zenginlik, güvenlik, iş başarısı", meaning: "Maddi başarı ve finansal güvenlik. İş dünyasında otorite. Güvenilir liderlik." },
    // ═══ KILIÇ (50-63) ═══
    50: { name: "Kılıç As", element: "Hava", keywords: "Yeni fikir, netlik, zafer", meaning: "Zihinsel netlik ve güçlü bir yeni fikir. Doğruluk ve keskinlik. Başarı için ilk kılıç darbesi." },
    51: { name: "Kılıç İki", element: "Hava", keywords: "Karar, çatışma, denge", meaning: "Zor bir karar karşısında. İç çatışma. Duygularınızı bir kenara bırakıp mantıkla düşünün." },
    52: { name: "Kılıç Üç", element: "Hava", keywords: "Kalp kırıklığı, acı, ayrılık", meaning: "Duygusal acı veya ihanet. Kırılan kalbin iyileşmesi zaman alacak ama bu süreç büyüme getirir." },
    53: { name: "Kılıç Dört", element: "Hava", keywords: "Dinlenme, iyileşme, meditasyon", meaning: "Zihinsel dinlenme ve iyileşme zamanı. Mola verin, meditasyon yapın, enerjinizi toplayın." },
    54: { name: "Kılıç Beş", element: "Hava", keywords: "Çatışma, yenilgi, tartışma", meaning: "Çatışma veya tartışma. Kazanmak her şey değil. Bazen geri adım atmak bilgeliktir." },
    55: { name: "Kılıç Altı", element: "Hava", keywords: "Geçiş, yolculuk, iyileşme", meaning: "Zor zamanlardan daha sakin sulara geçiş. Yolculuk veya yer değiştirme. İyileşme başlıyor." },
    56: { name: "Kılıç Yedi", element: "Hava", keywords: "Strateji, gizlilik, planlama", meaning: "Stratejik düşünme zamanı. Tüm kartlarınızı açmayın. Dikkatli planlama gerekli." },
    57: { name: "Kılıç Sekiz", element: "Hava", keywords: "Kısıtlama, çaresizlik, korku", meaning: "Kendinizi sıkışmış hissediyorsunuz ama engeller zihinsel. Göz bağını çıkarın, çıkış yolları var." },
    58: { name: "Kılıç Dokuz", element: "Hava", keywords: "Endişe, kabus, stres", meaning: "Aşırı endişe ve kaygı. Korkularınız gerçeği abartıyor. Bir adım geri çekilip nefes alın." },
    59: { name: "Kılıç On", element: "Hava", keywords: "Son, rock bottom, yenilenme", meaning: "Bir dönemin acı sonu. Ama en karanlık an, şafaktan hemen öncesidir. Buradan sadece yukarı var." },
    60: { name: "Kılıç Şövalye", element: "Hava", keywords: "Merak, dikkat, öğrenme", meaning: "Yeni bilgiler ve araştırma. Dikkatli gözlem. Genç ve meraklı bir zihinsel enerji." },
    61: { name: "Kılıç Süvari", element: "Hava", keywords: "Hız, kararlılık, doğrudan eylem", meaning: "Hızlı düşünce ve eylem. Doğrudan ve keskin iletişim. Acele etmeyin ama harekete geçin." },
    62: { name: "Kılıç Kraliçe", element: "Hava", keywords: "Bağımsızlık, netlik, sınırlar", meaning: "Keskin zeka ve bağımsız düşünce. Duygusallığın ötesinde net kararlar. Sınır koyma gücü." },
    63: { name: "Kılıç Kral", element: "Hava", keywords: "Entelektüel güç, otorite, adalet", meaning: "Zihinsel otorite ve analitik güç. Adil ve mantıklı kararlar. Sözcüklerin gücünü kullanın." },
    // ═══ ASA (64-77) ═══
    64: { name: "Asa As", element: "Ateş", keywords: "İlham, yeni girişim, enerji", meaning: "Güçlü bir yaratıcı kıvılcım. Yeni bir girişim, proje veya tutku. Harekete geçme zamanı!" },
    65: { name: "Asa İki", element: "Ateş", keywords: "Planlama, karar, keşif", meaning: "İleriye bakma ve planlama zamanı. Dünyayı avuçlarınızda tutuyorsunuz. Büyük düşünün." },
    66: { name: "Asa Üç", element: "Ateş", keywords: "Genişleme, vizyon, liderlik", meaning: "Ufuklara bakma. Planlarınız genişliyor, vizyonunuz büyüyor. İlk sonuçlar görünüyor." },
    67: { name: "Asa Dört", element: "Ateş", keywords: "Kutlama, uyum, ev, temel", meaning: "Sağlam temeller üzerine inşa. Ev, aile ve kutlama. İstikrar ve mutluluk." },
    68: { name: "Asa Beş", element: "Ateş", keywords: "Rekabet, çatışma, mücadele", meaning: "Rekabet ve sürtüşme. Farklı görüşler çarpışıyor. Yapıcı çatışma büyümeye yol açabilir." },
    69: { name: "Asa Altı", element: "Ateş", keywords: "Zafer, tanınma, başarı", meaning: "Hak edilmiş zafer ve toplumsal tanınma. Başarılarınız kutlanıyor. Gurur duyun." },
    70: { name: "Asa Yedi", element: "Ateş", keywords: "Savunma, cesaret, meydan okuma", meaning: "Değerlerinizi savunma zamanı. Cesaretle karşı koyun. Rakipler olsa da avantaj sizde." },
    71: { name: "Asa Sekiz", element: "Ateş", keywords: "Hız, hareket, ilerleme", meaning: "Her şey hızla ilerliyor. Haberler, seyahat veya ani gelişmeler. Akışa bırakın." },
    72: { name: "Asa Dokuz", element: "Ateş", keywords: "Dayanıklılık, sebat, direnç", meaning: "Yorgunsunuz ama pes etmeyin. Son engel karşınızda. Sebat edin, başarı çok yakın." },
    73: { name: "Asa On", element: "Ateş", keywords: "Yük, sorumluluk, tükenme", meaning: "Çok fazla yük taşıyorsunuz. Bazı sorumlulukları devretmeyi düşünün. Hedefe az kaldı." },
    74: { name: "Asa Şövalye", element: "Ateş", keywords: "Keşif, sadakat, çalışkanlık", meaning: "Yeni fikirleri keşfetme heyecanı. Sadık ve hırslı bir enerji. Potansiyelinizi açığa çıkarın." },
    75: { name: "Asa Süvari", element: "Ateş", keywords: "Macera, tutku, cesaret", meaning: "Tutkulu ve maceracı enerji. Cesaretle yeni yollara çıkın. Karizmatik liderlik." },
    76: { name: "Asa Kraliçe", element: "Ateş", keywords: "Güven, sıcaklık, çekicilik", meaning: "Kendinden emin ve çekici enerji. Hem bağımsız hem sıcak. İlham veren liderlik." },
    77: { name: "Asa Kral", element: "Ateş", keywords: "Vizyon, girişimcilik, liderlik", meaning: "Vizyoner liderlik. Büyük resimleri gören ve idealleri gerçeğe dönüştüren güç." },
};

export const getCardMeaning = (cardIndex: number): CardInfo => {
    return CARD_DB[cardIndex] || { name: `Kart ${cardIndex}`, element: "?", keywords: "Bilinmeyen kart", meaning: "Bu kartın anlamı henüz eklenmedi." };
};

export const getCardImage = (index: number, deckType?: 'tarot' | 'rumi' | 'eril' | 'disil'): string => {
    if (deckType === 'rumi') return `/assets/rumi/${index}.webp`;
    if (deckType === 'eril') return `/assets/eril-disil/${String(index).padStart(2, '0')}.jpg`;
    if (deckType === 'disil') return `/assets/disil/${String(index).padStart(2, '0')}.jpg`;

    // Major Arcana: 0-21
    const majorFiles = [
        "00-TheFool", "01-TheMagician", "02-TheHighPriestess", "03-TheEmpress", "04-TheEmperor",
        "05-TheHierophant", "06-TheLovers", "07-TheChariot", "08-Strength", "09-TheHermit",
        "10-WheelOfFortune", "11-Justice", "12-TheHangedMan", "13-Death", "14-Temperance",
        "15-TheDevil", "16-TheTower", "17-TheStar", "18-TheMoon", "19-TheSun",
        "20-Judgement", "21-TheWorld"
    ];
    if (index < 22) return `/Cards/${majorFiles[index]}.jpg`;

    // Minor Arcana: 22-77 (4 suits × 14 cards)
    const minorIndex = index - 22;
    const suit = Math.floor(minorIndex / 14);
    const rank = (minorIndex % 14) + 1; // 1-14
    const suitNames = ["Cups", "Pentacles", "Swords", "Wands"];
    const paddedRank = rank.toString().padStart(2, '0');
    return `/Cards/${suitNames[suit]}${paddedRank}.jpg`;
};

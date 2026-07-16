import { jsPDF } from "jspdf";

interface ChatMessage {
    id: string;
    sender: "Consultant" | "Client" | "System" | string;
    text?: string;
    audioUrl?: string;
    timestamp: string;
}

export const downloadChatAsPDF = async (
    messages: ChatMessage[],
    roomName: string,
    clientName: string,
    consultantName: string
) => {
    try {
        const html2canvas = (await import("html2canvas")).default;

        // Create container for print layout
        const printContainer = document.createElement("div");
        printContainer.style.position = "absolute";
        printContainer.style.left = "-9999px";
        printContainer.style.top = "-9999px";
        printContainer.style.width = "800px";
        printContainer.style.backgroundColor = "#0C0B14";
        printContainer.style.color = "#FFFFFF";
        printContainer.style.fontFamily = "'Quicksand', 'Inter', sans-serif";
        printContainer.style.padding = "40px";
        printContainer.style.boxSizing = "border-box";

        // Mystic border & background decoration
        printContainer.innerHTML = `
            <div style="border: 2px solid rgba(168, 85, 247, 0.3); border-radius: 24px; padding: 30px; background: linear-gradient(180deg, #120f24 0%, #0d0a18 100%); position: relative; overflow: hidden;">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 20px; margin-bottom: 30px;">
                    <div>
                        <h1 style="margin: 0; font-family: 'Cinzel', serif; font-size: 26px; font-weight: bold; background: linear-gradient(to right, #ffffff, #d8b4fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 2px;">MYSTIC TAROT</h1>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #a78bfa; letter-spacing: 1px; font-weight: 600;">Görüşme Sohbet Geçmişi</p>
                    </div>
                    <div style="text-align: right; font-size: 11px; color: rgba(255, 255, 255, 0.4);">
                        <p style="margin: 0;"><b>Tarih:</b> ${new Date().toLocaleDateString("tr-TR")}</p>
                        <p style="margin: 3px 0 0 0;"><b>Oda ID:</b> ${roomName}</p>
                    </div>
                </div>

                <!-- Meta Details -->
                <div style="display: flex; gap: 40px; margin-bottom: 30px; background: rgba(255, 255, 255, 0.02); padding: 15px 20px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.04); font-size: 13px;">
                    <div>
                        <span style="color: rgba(255, 255, 255, 0.4);">Müşteri:</span>
                        <strong style="color: #ffffff; margin-left: 5px;">${clientName || "Danışan"}</strong>
                    </div>
                    <div>
                        <span style="color: rgba(255, 255, 255, 0.4);">Danışman:</span>
                        <strong style="color: #ffffff; margin-left: 5px;">${consultantName || "Mistik Rehber"}</strong>
                    </div>
                </div>

                <!-- Messages Container -->
                <div id="pdf-message-list" style="display: flex; flex-direction: column; gap: 16px;"></div>

                <!-- Footer -->
                <div style="margin-top: 40px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; text-align: center; font-size: 11px; color: rgba(255, 255, 255, 0.3);">
                    <p style="margin: 0;">Bu belge Mystic Tarot platformu üzerindeki seansın resmi sohbet kaydıdır.</p>
                    <p style="margin: 5px 0 0 0; color: #a78bfa;">Yıldızlar her zaman yolunuzu aydınlatsın. ✨</p>
                </div>
            </div>
        `;

        document.body.appendChild(printContainer);

        const messageListEl = printContainer.querySelector("#pdf-message-list");
        if (messageListEl) {
            messages.forEach((msg) => {
                const isConsultant = msg.sender === "Consultant" || msg.sender === "Danışman";
                const senderName = isConsultant ? (consultantName || "Danışman") : (clientName || "Danışan");
                
                const bubbleStyle = `
                    display: flex; 
                    flex-direction: column;
                    gap: 4px;
                    padding: 12px 16px; 
                    border-radius: 16px; 
                    max-width: 85%;
                    box-sizing: border-box;
                    align-self: ${isConsultant ? "flex-start" : "flex-end"};
                    background-color: ${isConsultant ? "rgba(168, 85, 247, 0.12)" : "rgba(255, 255, 255, 0.03)"};
                    border: 1px solid ${isConsultant ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.06)"};
                `;

                const msgEl = document.createElement("div");
                msgEl.style.display = "flex";
                msgEl.style.justifyContent = isConsultant ? "flex-start" : "flex-end";
                msgEl.style.width = "100%";

                let content = "";
                if (msg.text) {
                    content = `<p style="margin: 0; font-size: 13.5px; line-height: 1.5; color: rgba(255, 255, 255, 0.85); white-space: pre-wrap;">${msg.text}</p>`;
                } else if (msg.audioUrl) {
                    content = `<p style="margin: 0; font-size: 13px; font-style: italic; color: #a78bfa;">🎤 Sesli Mesaj Gönderildi (Sohbet geçmişinde dinlenemez)</p>`;
                }

                msgEl.innerHTML = `
                    <div style="${bubbleStyle}">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: ${isConsultant ? "#d8b4fe" : "rgba(255, 255, 255, 0.4)"};">
                            <span>${senderName}</span>
                            <span style="font-weight: normal; font-size: 9px; color: rgba(255, 255, 255, 0.3);">${msg.timestamp}</span>
                        </div>
                        ${content}
                    </div>
                `;
                messageListEl.appendChild(msgEl);
            });
        }

        // Render to canvas
        const canvas = await html2canvas(printContainer, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#0C0B14",
            scale: 2,
            logging: false,
        });

        // Remove print container from DOM
        document.body.removeChild(printContainer);

        // Convert to PDF
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        
        const imgWidth = 210; // A4 size width in mm
        const pageHeight = 295; // A4 size height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Support multiple pages if chat is long
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const safeClientName = clientName.replace(/[^a-zA-Z0-9ğüşöçİĞÜŞÖÇ]/g, "_");
        pdf.save(`MysticTarot_Sohbet_${safeClientName}.pdf`);
    } catch (error) {
        console.error("PDF generation failed:", error);
        alert("PDF oluşturulurken bir hata meydana geldi.");
    }
};

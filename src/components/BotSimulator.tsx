import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, SaleTransaction } from '../types';
import {
  MessageCircle,
  Send,
  Sparkles,
  CheckCheck,
  Check,
  Table,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';

interface BotSimulatorProps {
  onSendMessage: (text: string, platform: 'whatsapp' | 'telegram', sender: string) => Promise<ChatMessage | null>;
  onViewSpreadsheet: () => void;
  lastAddedSale: SaleTransaction | null;
}

export const BotSimulator: React.FC<BotSimulatorProps> = ({
  onSendMessage,
  onViewSpreadsheet,
  lastAddedSale,
}) => {
  const [platform, setPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      platform: 'whatsapp',
      text: `👋 Halo! Saya adalah *Bot Asisten Penjualan*.

Kirim catatan penjualan Anda dalam teks bebas bahasa Indonesia (bisa singkatan seperti 2x, 18k, 50rb, trf bca, qris, dll).
AI Gemini akan otomatis mengekstrak rincian barang, harga satuan, pelanggan, dan langsung memasukkannya ke baris Spreadsheet!

💡 *Coba klik salah satu contoh pesan di bawah ini:*`,
      timestamp: '08:00',
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const quickPrompts = [
    {
      label: '☕ 2 Kopi Susu + 1 Roti (QRIS)',
      text: 'Pagi min, catat ya: 2 Kopi Susu Aren @18k, 1 Roti Bakar Coklat 15rb bayar via QRIS atas nama Sarah',
    },
    {
      label: '👕 3 Kaos Polos L (Transfer BCA)',
      text: 'Laku Kaos Polos Hitam Cotton 24s size L 3 pcs @65k. Transfer BCA atas nama Rendy kirim J&T',
    },
    {
      label: '🍗 4 Paket Ayam + 4 Es Teh (Tunai)',
      text: 'Catat mas: Nasi Ayam Geprek Sambal Matah 4 porsi @25.000, Es Teh Manis 4 @4.000, bayar tunai pas',
    },
    {
      label: '👗 1 Gamis Silk diskon 20k (Mandiri)',
      text: 'Laku Gamis Silk Motif Flora 1 pcs 220.000 diskon 20rb, bayar Transfer Mandiri a.n Ibu Dewi',
    },
    {
      label: '🥪 2 Roti Bakar Keju (Tempo/Hutang)',
      text: 'Catat order Mas Agus: 2 Roti Bakar Keju @15.000 total 30rb belum lunas tempo 3 hari ya',
    },
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    setInputText('');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      platform,
      text,
      timestamp: timeStr,
      status: 'sent',
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const senderName = platform === 'whatsapp' ? '+62 812-3456-7890 (Admin Toko)' : '@kasir_toyisland';
      const botResponse = await onSendMessage(text, platform, senderName);

      if (botResponse) {
        setMessages((prev) => [...prev, botResponse]);
      }
    } catch (err) {
      console.error('Error sending simulated chat message:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Chat Window Column */}
      <div className="lg:col-span-8 flex flex-col h-[700px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Platform Selector & Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Simulasi Bot:</span>
            <div className="flex items-center bg-slate-200/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPlatform('whatsapp')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  platform === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setPlatform('telegram')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  platform === 'telegram'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Telegram</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Gemini 3.8 Flash Parser Aktif</span>
          </div>
        </div>

        {/* Chat App Header Bar */}
        {platform === 'whatsapp' ? (
          <div className="bg-[#075E54] text-white px-4 py-2.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                WA
              </div>
              <div>
                <h4 className="text-sm font-semibold leading-tight">Bot Catat Penjualan WA</h4>
                <p className="text-[11px] text-emerald-200">Online • Terkoneksi ke Spreadsheet</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#2481cc] text-white px-4 py-2.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                TG
              </div>
              <div>
                <h4 className="text-sm font-semibold leading-tight">@KasirPenjualanBot</h4>
                <p className="text-[11px] text-blue-200">bot • Online realtime sync</p>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages Container */}
        <div
          className={`flex-1 overflow-y-auto p-4 space-y-3 ${
            platform === 'whatsapp' ? 'bg-[#EFEAE2]' : 'bg-[#E6EEF5]'
          }`}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-xs text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? platform === 'whatsapp'
                        ? 'bg-[#E7FFDB] text-slate-900 rounded-tr-none'
                        : 'bg-[#EEFFDE] text-slate-900 rounded-tr-none border border-emerald-100'
                      : 'bg-white text-slate-800 rounded-tl-none border border-slate-200/50'
                  }`}
                >
                  {/* Message body with Markdown support */}
                  <div className="whitespace-pre-wrap font-sans">
                    {msg.text.split('\n').map((line, idx) => {
                      // Basic bold parsing: *text*
                      const parts = line.split(/(\*[^*]+\*)/g);
                      return (
                        <p key={idx} className={idx > 0 ? 'mt-1' : ''}>
                          {parts.map((part, pIdx) => {
                            if (part.startsWith('*') && part.endsWith('*')) {
                              return (
                                <strong key={pIdx} className="font-bold text-slate-900">
                                  {part.slice(1, -1)}
                                </strong>
                              );
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>

                  {/* Parsed Sale summary card attached to message */}
                  {msg.parsedSale && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-200/60 bg-emerald-50/70 -mx-1.5 -mb-1.5 p-2 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-emerald-800 font-semibold">
                        <span>✨ Baris Ditambahkan ke Sheet:</span>
                        <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded shadow-2xs">
                          {msg.parsedSale.id}
                        </span>
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        {msg.parsedSale.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold text-emerald-800">
                          Rp {msg.parsedSale.totalAmount.toLocaleString('id-ID')}
                        </span>
                        <button
                          type="button"
                          onClick={onViewSpreadsheet}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline flex items-center"
                        >
                          Buka di Spreadsheet <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Timestamp & Status Icon */}
                  <div className="flex items-center justify-end space-x-1 mt-1 text-[10px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    {isUser && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing / Processing indicator */}
          {isProcessing && (
            <div className="flex items-center space-x-2 bg-white px-3.5 py-2 rounded-2xl shadow-xs w-fit text-xs text-slate-500 border border-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span>Gemini AI sedang membaca pesan & mencatat ke spreadsheet...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              id="input-chat-simulator-message"
              type="text"
              placeholder={`Ketik pesan penjualan ala ${
                platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'
              } (contoh: 2 Kopi Susu @18k bayar QRIS)...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isProcessing}
              className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
            />
            <button
              id="btn-send-simulated-chat"
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className={`p-2.5 rounded-xl text-white font-semibold shadow-xs transition-all ${
                platform === 'whatsapp'
                  ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Quick Sample Prompts & Live Explanation */}
      <div className="lg:col-span-4 space-y-4">
        {/* Banner if sale just added */}
        {lastAddedSale && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <Table className="w-4 h-4" />
              <span>Penjualan Baru Tersimpan!</span>
            </div>
            <p className="text-xs text-emerald-100 mt-1">
              {lastAddedSale.customerName}: {lastAddedSale.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
            </p>
            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-emerald-400/50">
              <span className="font-extrabold text-sm">
                Rp {lastAddedSale.totalAmount.toLocaleString('id-ID')}
              </span>
              <button
                type="button"
                onClick={onViewSpreadsheet}
                className="bg-white text-emerald-800 hover:bg-emerald-50 px-3 py-1 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Lihat di Spreadsheet
              </button>
            </div>
          </div>
        )}

        {/* Quick Sample Chips */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Contoh Pesan Penjualan Cepat</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Klik salah satu tombol di bawah untuk mengetes kecerdasan AI dalam mengekstrak bahasa percakapan:
          </p>

          <div className="space-y-2">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p.text)}
                disabled={isProcessing}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-xs text-slate-700 font-medium transition-all group"
              >
                <div className="font-semibold text-slate-900 group-hover:text-emerald-700">{p.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 italic">"{p.text}"</div>
              </button>
            ))}
          </div>
        </div>

        {/* How It Works Explainer */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2.5">
          <div className="flex items-center space-x-2 font-bold text-slate-800">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Bagaimana Cara Kerjanya?</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-[12px] text-slate-600">
            <li>
              <strong>Pesan Masuk:</strong> Kasir/pedagang mengirim pesan chat lewat WhatsApp atau Telegram.
            </li>
            <li>
              <strong>AI Gemini 3.8 Flash:</strong> Menganalisis nama barang, kuantitas, harga satuan (@18k, 50rb), diskon, dan metode pembayaran.
            </li>
            <li>
              <strong>Spreadsheet Realtime:</strong> Menambahkan baris baru ke tabel transaksi dan menghitung total omzet.
            </li>
            <li>
              <strong>Balasan Otomatis:</strong> Bot membalas pengirim dengan format struk nota penjualan yang rapi.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

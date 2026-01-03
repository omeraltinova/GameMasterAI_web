// AI Response Logger
// Tüm AI yanıtlarını JSON dosyalarına loglar

import fs from 'fs';
import path from 'path';

interface AILogEntry {
  timestamp: string;
  requestId: string;
  model: string;
  temperature: number;
  maxTokens: number;
  messages: Array<{
    role: string;
    content: string;
  }>;
  response: {
    content: string;
    finishReason: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  duration: number; // ms
  error?: string;
}

const LOG_DIR = path.join(process.cwd(), 'logs', 'ai');

/**
 * Log dizininin var olduğundan emin ol
 */
function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Bugünün log dosyası adını oluştur
 */
function getLogFileName(): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOG_DIR, `ai-responses-${today}.json`);
}

/**
 * AI yanıtını logla
 */
export function logAIResponse(entry: AILogEntry): void {
  try {
    ensureLogDir();
    
    const logFile = getLogFileName();
    let logs: AILogEntry[] = [];
    
    // Mevcut logları oku
    if (fs.existsSync(logFile)) {
      try {
        const content = fs.readFileSync(logFile, 'utf-8');
        logs = JSON.parse(content);
      } catch (e) {
        // Dosya bozuksa yeni başla
        logs = [];
      }
    }
    
    // Yeni log ekle
    logs.push(entry);
    
    // Dosyaya yaz
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (error) {
    // Loglama hatası uygulamayı durdurmamalı
    console.error('AI logging error:', error);
  }
}

/**
 * Benzersiz request ID oluştur
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

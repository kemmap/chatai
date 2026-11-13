import { ChatMessage } from './types.js';

export class HistoryManager {
  private histories = new Map<string, ChatMessage[]>();
  private readonly maxMessages: number;
  private readonly ttlMs: number;
  private lastActivity = new Map<string, number>();

  constructor(maxTurns: number = 10, ttlHours: number = 24) {
    this.maxMessages = Math.max(2, maxTurns * 2);
    this.ttlMs = ttlHours * 60 * 60 * 1000;
  }

  private normalizeChatId(chatId: string | number): string {
    return String(chatId);
  }

  public addMessage(chatId: string | number, role: 'user' | 'model', text: string): void {
    const key = this.normalizeChatId(chatId);
    this.lastActivity.set(key, Date.now());

    let list = this.histories.get(key);
    if (!list) {
      list = [];
      this.histories.set(key, list);
    }

    list.push({
      role,
      text: text.trim(),
      timestamp: Date.now(),
    });

    if (list.length > this.maxMessages) {
      // Keep only the most recent maxMessages
      const trimmed = list.slice(list.length - this.maxMessages);
      this.histories.set(key, trimmed);
    }
  }

  public getHistory(chatId: string | number): ChatMessage[] {
    const key = this.normalizeChatId(chatId);
    this.cleanIfExpired(key);
    return (this.histories.get(key) || []).slice();
  }

  public getTurnCount(chatId: string | number): number {
    const history = this.getHistory(chatId);
    return Math.ceil(history.length / 2);
  }

  public clearHistory(chatId: string | number): void {
    const key = this.normalizeChatId(chatId);
    this.histories.delete(key);
    this.lastActivity.delete(key);
  }

  private cleanIfExpired(key: string): void {
    const last = this.lastActivity.get(key);
    if (last && Date.now() - last > this.ttlMs) {
      this.histories.delete(key);
      this.lastActivity.delete(key);
    }
  }

  public cleanupStale(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, last] of this.lastActivity.entries()) {
      if (now - last > this.ttlMs) {
        this.histories.delete(key);
        this.lastActivity.delete(key);
        removed++;
      }
    }
    return removed;
  }
}

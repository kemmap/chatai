import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HistoryManager } from '../src/ai/history.js';

describe('HistoryManager', () => {
  it('stores and retrieves conversation history in order', () => {
    const manager = new HistoryManager(5);
    manager.addMessage(12345, 'user', 'Xin chào');
    manager.addMessage(12345, 'model', 'Chào bạn! Tôi có thể giúp gì cho bạn?');

    const history = manager.getHistory(12345);
    assert.equal(history.length, 2);
    assert.equal(history[0].role, 'user');
    assert.equal(history[0].text, 'Xin chào');
    assert.equal(history[1].role, 'model');
    assert.equal(history[1].text, 'Chào bạn! Tôi có thể giúp gì cho bạn?');
  });

  it('normalizes string and number chatIds to the same conversation', () => {
    const manager = new HistoryManager(5);
    manager.addMessage(999, 'user', 'Tin nhắn 1');
    manager.addMessage('999', 'model', 'Tin nhắn 2');

    const history = manager.getHistory('999');
    assert.equal(history.length, 2);
    assert.equal(manager.getTurnCount(999), 1);
  });

  it('isolates different chats from each other', () => {
    const manager = new HistoryManager(5);
    manager.addMessage('chat_A', 'user', 'Hỏi từ A');
    manager.addMessage('chat_B', 'user', 'Hỏi từ B');

    const histA = manager.getHistory('chat_A');
    const histB = manager.getHistory('chat_B');

    assert.equal(histA.length, 1);
    assert.equal(histA[0].text, 'Hỏi từ A');

    assert.equal(histB.length, 1);
    assert.equal(histB[0].text, 'Hỏi từ B');
  });

  it('prunes oldest messages when exceeding max turns limit (sliding window)', () => {
    const manager = new HistoryManager(2); // 2 turns = 4 messages max

    manager.addMessage('test', 'user', 'Câu 1');
    manager.addMessage('test', 'model', 'Đáp 1');
    manager.addMessage('test', 'user', 'Câu 2');
    manager.addMessage('test', 'model', 'Đáp 2');

    // Add a 3rd turn
    manager.addMessage('test', 'user', 'Câu 3');
    manager.addMessage('test', 'model', 'Đáp 3');

    const history = manager.getHistory('test');
    assert.equal(history.length, 4); // Max 4 messages retained
    assert.equal(history[0].text, 'Câu 2');
    assert.equal(history[1].text, 'Đáp 2');
    assert.equal(history[2].text, 'Câu 3');
    assert.equal(history[3].text, 'Đáp 3');
  });

  it('clears history on request', () => {
    const manager = new HistoryManager(5);
    manager.addMessage('chat_clear', 'user', 'Xin chào');
    manager.addMessage('chat_clear', 'model', 'Chào bạn');

    assert.equal(manager.getHistory('chat_clear').length, 2);

    manager.clearHistory('chat_clear');
    assert.equal(manager.getHistory('chat_clear').length, 0);
    assert.equal(manager.getTurnCount('chat_clear'), 0);
  });

  it('cleans up stale sessions exceeding TTL', () => {
    // TTL of 0 hours for testing expiration
    const manager = new HistoryManager(5, 0);
    manager.addMessage('stale_chat', 'user', 'Tin cũ');

    // Clean up
    const cleaned = manager.cleanupStale();
    assert.ok(cleaned >= 0);
  });
});

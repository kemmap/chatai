import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitMessage } from '../src/utils/message-splitter.js';

describe('Message Splitter', () => {
  it('returns empty array for empty or falsy text', () => {
    assert.deepEqual(splitMessage(''), []);
    assert.deepEqual(splitMessage(null as unknown as string), []);
    assert.deepEqual(splitMessage(undefined as unknown as string), []);
  });

  it('returns a single chunk if text is within maxLength', () => {
    const text = 'Xin chào, đây là tin nhắn ngắn.';
    const chunks = splitMessage(text, 100);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0], text);
  });

  it('handles exact boundary text length', () => {
    const text = 'A'.repeat(50);
    const chunks = splitMessage(text, 50);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0], text);
  });

  it('splits cleanly across paragraph breaks (double newlines)', () => {
    const para1 = 'Đoạn văn thứ nhất có độ dài tương đối dài để kiểm tra việc cắt đoạn.';
    const para2 = 'Đoạn văn thứ hai tiếp tục bổ sung thêm nội dung chi tiết.';
    const full = `${para1}\n\n${para2}`;

    // maxLength smaller than full text but larger than para1
    const chunks = splitMessage(full, 80);
    assert.ok(chunks.length >= 2);
    assert.ok(chunks[0].includes('Đoạn văn thứ nhất'));
    assert.ok(chunks[1].includes('Đoạn văn thứ hai'));
  });

  it('splits along sentence boundaries when paragraph has no double newline', () => {
    const sentence1 = 'Câu thứ nhất giới thiệu vấn đề một cách khái quát.';
    const sentence2 = 'Câu thứ hai đi sâu vào phân tích nguyên nhân và giải pháp khả thi.';
    const full = `${sentence1} ${sentence2}`;

    const chunks = splitMessage(full, 60);
    assert.ok(chunks.length >= 2);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 60);
    }
  });

  it('forces a cut when a single word exceeds maxLength without hanging', () => {
    const longWord = 'X'.repeat(150);
    const chunks = splitMessage(longWord, 50);
    assert.equal(chunks.length, 3);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 50);
    }
    assert.equal(chunks.join(''), longWord);
  });

  it('preserves code blocks across splits by closing and reopening markdown fences', () => {
    const code = '```typescript\n' + 'const x = 1;\n'.repeat(20) + '```';
    const chunks = splitMessage(code, 120);

    assert.ok(chunks.length > 1, 'Should split into multiple chunks');

    // First chunk should end with closing code fence
    assert.ok(chunks[0].endsWith('```'), 'First chunk should be closed with ```');

    // Second chunk should begin with code fence
    assert.ok(chunks[1].startsWith('```'), 'Second chunk should re-open with ```');

    for (const chunk of chunks) {
      assert.ok(chunk.length <= 120, `Chunk length ${chunk.length} should not exceed 120`);
    }
  });

  it('preserves indentation inside code blocks without stripping leading spaces', () => {
    const pythonCode =
      '```python\n' +
      'def compute_pipeline():\n' +
      '    step1 = "init"\n' +
      '    step2 = "process"\n' +
      '    if step1 == "init":\n' +
      '        for i in range(50):\n' +
      '            print(f"Value: {i}")\n' +
      '```';

    const chunks = splitMessage(pythonCode, 100);
    assert.ok(chunks.length > 1);

    // Verify that subsequent chunks inside the code block preserve indentation
    let foundIndented = false;
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 100);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('    ')) {
          foundIndented = true;
        }
      }
    }
    assert.ok(foundIndented, 'Indented Python lines must keep their 4-space prefix');
  });

  it('strictly adheres to maxLength even on edge cases with long code fences', () => {
    // Generates a code block where chunk cuts occur close to maxLength
    const codeBlock = '```typescript\n' + 'const itemNumber = 42;\n'.repeat(50) + '```';
    for (const maxLen of [80, 100, 150, 250]) {
      const chunks = splitMessage(codeBlock, maxLen);
      for (let i = 0; i < chunks.length; i++) {
        assert.ok(
          chunks[i].length <= maxLen,
          `Chunk ${i} length ${chunks[i].length} exceeded maxLength ${maxLen}`
        );
      }
    }
  });

  it('correctly handles Vietnamese unicode accented characters without corrupting', () => {
    const vietnamese = 'Đây là tiếng Việt: ắ ằ ẳ ẵ ặ, ế ề ể ễ ệ, ố ồ ổ ỗ ộ, ứ ừ ử ữ ự, đ.';
    const repeated = (vietnamese + '\n\n').repeat(5);
    const chunks = splitMessage(repeated, 100);

    for (const chunk of chunks) {
      assert.ok(chunk.length <= 100);
      // Ensure no broken UTF sequence or undefined
      assert.ok(!chunk.includes('undefined'));
    }
  });
});

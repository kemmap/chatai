import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatTelegramMath } from '../src/utils/math-formatter.js';

describe('formatTelegramMath', () => {
  it('converts markdown headers to bold', () => {
    const input = '### 2. Xây dựng mô hình toán học';
    const output = formatTelegramMath(input);
    assert.strictEqual(output, '*2. Xây dựng mô hình toán học*');
  });

  it('converts square root and exponents', () => {
    const input = '$$SD = \\sqrt{SA^2 + DA^2} = \\sqrt{x^2 + 20^2} = \\sqrt{x^2 + 400}\\text{ (km)}$$';
    const output = formatTelegramMath(input);
    assert.strictEqual(output, 'SD = √(SA² + DA²) = √(x² + 20²) = √(x² + 400) (km)');
  });

  it('converts inequalities and text blocks', () => {
    const input = 'Đặt độ dài đoạn $AS = x$ (với điều kiện $0 \\le x \\le 40\\text{ km}$).';
    const output = formatTelegramMath(input);
    assert.strictEqual(output, 'Đặt độ dài đoạn AS = x (với điều kiện 0 ≤ x ≤ 40 km).');
  });

  it('converts perpendicular symbol and points', () => {
    const input = 'vì $DA \\perp AH$ tại $A$';
    const output = formatTelegramMath(input);
    assert.strictEqual(output, 'vì DA ⊥ AH tại A');
  });

  it('converts fractions', () => {
    const input = '$\\frac{a + b}{2}$';
    const output = formatTelegramMath(input);
    assert.strictEqual(output, '(a + b / 2)');
  });
});

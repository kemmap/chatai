/**
 * Formats LaTeX mathematical expressions and raw Markdown headers
 * into clean, readable Unicode text suitable for Telegram display.
 */
export function formatTelegramMath(text: string): string {
  if (!text) return '';

  let formatted = text;

  // 1. Convert Markdown headers (### Header) to bold text (*Header*)
  formatted = formatted.replace(/^#{1,6}\s+(.+)$/gm, '*$1*');

  // 2. Remove horizontal rules (---) if they are standalone
  formatted = formatted.replace(/^\s*[-*_]{3,}\s*$/gm, '──────────');

  // 3. Helper to format a LaTeX formula into Unicode
  const cleanLatex = (formula: string): string => {
    let f = formula;

    // \text{...} -> ...
    f = f.replace(/\\text\{([^}]*)\}/g, ' $1 ');

    // \sqrt{...} -> √(...)
    f = f.replace(/\\sqrt\[([^\]]*)\]\{([^}]*)\}/g, '√[$1]($2)');
    f = f.replace(/\\sqrt\{([^}]*)\}/g, '√($1)');

    // \frac{a}{b} -> (a / b)
    f = f.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1 / $2)');

    // Common Greek and math symbols
    const symbolMap: Record<string, string> = {
      '\\le': '≤',
      '\\leq': '≤',
      '\\ge': '≥',
      '\\geq': '≥',
      '\\neq': '≠',
      '\\approx': '≈',
      '\\times': '×',
      '\\div': '÷',
      '\\pm': '±',
      '\\mp': '∓',
      '\\cdot': '·',
      '\\perp': '⊥',
      '\\parallel': '∥',
      '\\in': '∈',
      '\\notin': '∉',
      '\\subset': '⊂',
      '\\forall': '∀',
      '\\exists': '∃',
      '\\infty': '∞',
      '\\degree': '°',
      '\\circ': '°',
      '\\alpha': 'α',
      '\\beta': 'β',
      '\\gamma': 'γ',
      '\\delta': 'δ',
      '\\Delta': 'Δ',
      '\\theta': 'θ',
      '\\lambda': 'λ',
      '\\mu': 'µ',
      '\\pi': 'π',
      '\\sigma': 'σ',
      '\\Sigma': 'Σ',
      '\\omega': 'ω',
      '\\Omega': 'Ω',
      '\\rightarrow': '→',
      '\\leftarrow': '←',
      '\\Rightarrow': '⇒',
      '\\Leftrightarrow': '⇔',
      '\\to': '→',
    };

    for (const [tex, uni] of Object.entries(symbolMap)) {
      // Escape backslash for RegExp
      const escaped = tex.replace(/\\/g, '\\\\');
      f = f.replace(new RegExp(`${escaped}(?![a-zA-Z])`, 'g'), uni);
    }

    // Superscripts
    const superscripts: Record<string, string> = {
      '0': '⁰',
      '1': '¹',
      '2': '²',
      '3': '³',
      '4': '⁴',
      '5': '⁵',
      '6': '⁶',
      '7': '⁷',
      '8': '⁸',
      '9': '⁹',
      '+': '⁺',
      '-': '⁻',
      '=': '⁼',
      '(': '⁽',
      ')': '⁾',
      'n': 'ⁿ',
      'x': 'ˣ',
    };

    // Single-char superscript: e.g. x^2 -> x²
    f = f.replace(/\^([0-9nxy+\-()])/g, (_, char) => superscripts[char] || `^${char}`);
    // Grouped superscript: e.g. x^{2} -> x²
    f = f.replace(/\^\{([0-9nxy+\-()]+)\}/g, (_, chars) => {
      let res = '';
      for (const c of chars) {
        res += superscripts[c] || c;
      }
      return res;
    });

    // Subscripts
    const subscripts: Record<string, string> = {
      '0': '₀',
      '1': '₁',
      '2': '₂',
      '3': '₃',
      '4': '₄',
      '5': '₅',
      '6': '₆',
      '7': '₇',
      '8': '₈',
      '9': '₉',
      '+': '₊',
      '-': '₋',
      '=': '₌',
      '(': '₍',
      ')': '₎',
      'a': 'ₐ',
      'e': 'ₑ',
      'i': 'ᵢ',
      'j': 'ⱼ',
      'o': 'ₒ',
      'r': 'ᵣ',
      'u': 'ᵤ',
      'v': 'ᵥ',
      'x': 'ₓ',
    };

    f = f.replace(/_([0-9aeijoruvx+\-()])/g, (_, char) => subscripts[char] || `_${char}`);
    f = f.replace(/_\{([0-9aeijoruvx+\-()]+)\}/g, (_, chars) => {
      let res = '';
      for (const c of chars) {
        res += subscripts[c] || c;
      }
      return res;
    });

    // Remove any remaining stray backslashes
    f = f.replace(/\\([a-zA-Z]+)/g, '$1');

    // Clean multiple spaces
    f = f.replace(/\s+/g, ' ').trim();

    return f;
  };

  // 4. Process display math blocks: $$...$$
  formatted = formatted.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    return `\n${cleanLatex(math)}\n`;
  });

  // 5. Process inline math: $...$
  formatted = formatted.replace(/\$([^$\n]+?)\$/g, (_, math) => {
    return cleanLatex(math);
  });

  // Normalize excessive newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted.trim();
}

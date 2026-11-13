/**
 * Splits a long text into chunks that satisfy Telegram's message size limit (<= 4096 chars).
 * Smartly splits by paragraph, newline, sentence, or whitespace boundaries, and preserves
 * markdown code block fences and code indentation across chunk boundaries.
 */
export function splitMessage(text: string, maxLength: number = 4000): string[] {
  if (!text) {
    return [];
  }

  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;
  let inCodeBlock = false;
  let codeBlockLang = '';

  while (remaining.length > 0) {
    const codePrefix = inCodeBlock
      ? '```' + (codeBlockLang ? codeBlockLang + '\n' : '\n')
      : '';
    const codeSuffix = '\n```';

    // If remaining + prefix fits comfortably within maxLength, finish up
    if (remaining.length + codePrefix.length <= maxLength) {
      let finalChunk = remaining;
      if (inCodeBlock) {
        finalChunk = codePrefix + finalChunk;
      }
      chunks.push(finalChunk);
      break;
    }

    // Check if code fences need capacity reservation
    const hasFence = inCodeBlock || remaining.slice(0, maxLength).includes('```');
    const reservedFenceLen = hasFence
      ? (inCodeBlock ? codePrefix.length : 0) + codeSuffix.length
      : 0;
    const effectiveMax = Math.max(10, maxLength - reservedFenceLen);

    // Try finding the best split point before effectiveMax
    let splitIndex = -1;

    // Search within [effectiveMax * 0.6, effectiveMax] to avoid overly small chunks
    const windowStart = Math.floor(effectiveMax * 0.6);
    const candidateSlice = remaining.slice(0, effectiveMax);

    // 1. Double newline (paragraph break)
    const doubleNewline = candidateSlice.lastIndexOf('\n\n');
    if (doubleNewline >= windowStart) {
      splitIndex = doubleNewline + 2;
    }

    // 2. Single newline
    if (splitIndex === -1) {
      const singleNewline = candidateSlice.lastIndexOf('\n');
      if (singleNewline >= windowStart) {
        splitIndex = singleNewline + 1;
      }
    }

    // 3. Sentence end (. ! ? followed by space or newline)
    if (splitIndex === -1) {
      const sentenceMatch = candidateSlice.match(/[.!?](\s+)[^.!?]*$/);
      if (sentenceMatch && sentenceMatch.index !== undefined && sentenceMatch.index >= windowStart) {
        splitIndex = sentenceMatch.index + 1;
      }
    }

    // 4. Any whitespace
    if (splitIndex === -1) {
      const lastSpace = candidateSlice.lastIndexOf(' ');
      if (lastSpace >= windowStart) {
        splitIndex = lastSpace + 1;
      }
    }

    // 5. Fallback: hard cut at effectiveMax
    if (splitIndex === -1 || splitIndex === 0) {
      splitIndex = effectiveMax;
    }

    let chunk = remaining.slice(0, splitIndex);
    remaining = remaining.slice(splitIndex);

    // Check code fence balance in this chunk
    // Matches ``` or ```lang
    const fenceMatches = chunk.match(/```[a-zA-Z0-9_-]*/g) || [];
    const fenceCount = fenceMatches.length;

    // If we entered with an open code block, prepend the code fence
    if (inCodeBlock) {
      chunk = codePrefix + chunk;
    }

    // If fences inside this slice toggle the open state
    if (fenceCount % 2 === 1) {
      if (inCodeBlock) {
        // Was open, now closed
        inCodeBlock = false;
        codeBlockLang = '';
      } else {
        // Was closed, now opened
        inCodeBlock = true;
        const lastFence = fenceMatches[fenceMatches.length - 1];
        codeBlockLang = lastFence.replace(/^```/, '').trim();
        // Close it on this chunk so Telegram markdown renders properly
        chunk += codeSuffix;
      }
    } else if (inCodeBlock) {
      // Still open, close chunk
      chunk += codeSuffix;
    }

    // Guard against any accidental overflow
    if (chunk.length > maxLength && inCodeBlock && chunk.endsWith(codeSuffix)) {
      chunk = chunk.slice(0, maxLength - codeSuffix.length) + codeSuffix;
    }

    chunks.push(chunk.trim());

    // When inside a code block, preserve indentation spaces; only drop leading blank lines
    if (inCodeBlock) {
      remaining = remaining.replace(/^\r?\n/, '');
    } else {
      remaining = remaining.replace(/^[\r\n]+/, '').trimStart();
    }
  }

  return chunks.filter((c) => c.length > 0);
}

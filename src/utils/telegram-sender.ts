import { Context } from 'grammy';
import { GroundingSource } from '../ai/types.js';

export interface SendOptions {
  parseMode?: 'Markdown' | 'HTML';
  replyToMessageId?: number;
}

export async function safeReply(
  ctx: Context,
  text: string,
  options?: SendOptions
): Promise<void> {
  const parseMode = options?.parseMode ?? 'Markdown';
  const replyParameters = options?.replyToMessageId
    ? { message_id: options.replyToMessageId }
    : undefined;

  try {
    await ctx.reply(text, {
      parse_mode: parseMode,
      reply_parameters: replyParameters,
      link_preview_options: { is_disabled: true },
    });
  } catch (error: any) {
    const errorMsg = error?.description || error?.message || String(error);

    // If Telegram fails due to markdown/HTML parsing syntax or replied message not found
    if (
      errorMsg.includes("can't parse entities") ||
      errorMsg.includes('entity') ||
      errorMsg.includes('parse') ||
      errorMsg.includes('reply') ||
      error?.error_code === 400
    ) {
      console.warn(
        `[telegram-sender] Format parsing or reply error for parse_mode=${parseMode}. Falling back to plain text. Error: ${errorMsg}`
      );
      try {
        await ctx.reply(text, {
          reply_parameters: replyParameters,
          link_preview_options: { is_disabled: true },
        });
        return;
      } catch (fallbackErr: any) {
        // Second fallback: strip reply_parameters if the original message was deleted
        const fallbackMsg = fallbackErr?.description || fallbackErr?.message || String(fallbackErr);
        console.warn(
          `[telegram-sender] Plain text retry with reply_parameters failed. Retrying without reply_parameters. Error: ${fallbackMsg}`
        );
        await ctx.reply(text, {
          link_preview_options: { is_disabled: true },
        });
        return;
      }
    }

    // Re-throw if it's a fatal network or authentication error
    throw error;
  }
}

export function formatSources(sources?: GroundingSource[]): string {
  if (!sources || sources.length === 0) {
    return '';
  }

  const items = sources
    .slice(0, 5) // Display top 5 sources
    .map((s, index) => {
      const title = s.title?.replace(/[\[\]]/g, '') || 'Nguồn web';
      return `${index + 1}. [${title}](${s.uri})`;
    })
    .join('\n');

  return `\n\n🔍 *Nguồn tra cứu tham khảo:*\n${items}`;
}

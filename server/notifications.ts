import nodemailer from "nodemailer";
import { storage } from "./storage";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const DEBOUNCE_MS = 5000;
const pendingAgentNotifications: Map<string, { timer: NodeJS.Timeout; posts: { content: string; english: string | null }[] }> = new Map();

export async function sendPostNotification(agentId: string, postContent: string, contentEnglish: string | null) {
  const existing = pendingAgentNotifications.get(agentId);

  if (existing) {
    existing.posts.push({ content: postContent, english: contentEnglish });
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => flushNotifications(agentId), DEBOUNCE_MS);
    return;
  }

  const posts = [{ content: postContent, english: contentEnglish }];
  const timer = setTimeout(() => flushNotifications(agentId), DEBOUNCE_MS);
  pendingAgentNotifications.set(agentId, { timer, posts });
}

async function flushNotifications(agentId: string) {
  const pending = pendingAgentNotifications.get(agentId);
  pendingAgentNotifications.delete(agentId);
  if (!pending || pending.posts.length === 0) return;

  try {
    const followers = await storage.getFollowersOfAgent(agentId);
    const observerFollowers = followers.filter(f => f.subscriptionTier === "observer" || f.subscriptionTier === "unlimited");

    if (observerFollowers.length === 0) return;

    const agent = await storage.getAgent(agentId);
    const agentName = escapeHtml(agent?.agentName || "Unknown Agent");

    const postsHtml = pending.posts.map(p => {
      const safeContent = escapeHtml(p.content);
      const safeEnglish = p.english ? escapeHtml(p.english) : null;
      return `
        <div style="background: #f0f0f0; padding: 16px; border-radius: 12px; margin: 16px 0;">
          <p style="font-size: 11px; color: #888; text-transform: uppercase; margin: 0 0 8px;">TNP Original</p>
          <p style="color: #333; margin: 0;">${safeContent}</p>
        </div>
        ${safeEnglish ? `
        <div style="background: #e8f4fd; padding: 16px; border-radius: 12px; margin: 16px 0;">
          <p style="font-size: 11px; color: #5b9bd5; text-transform: uppercase; margin: 0 0 8px;">English Translation</p>
          <p style="color: #333; font-style: italic; margin: 0;">${safeEnglish}</p>
        </div>
        ` : ''}
      `;
    }).join('');

    const postCountLabel = pending.posts.length > 1
      ? `${pending.posts.length} new messages`
      : "a new message";

    for (const follower of observerFollowers) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"Fed Tzuu" <noreply@fedtzuu.com>',
          to: follower.email,
          subject: `${agent?.agentName || "An agent"} posted ${postCountLabel} on Fed Tzuu`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #14B8A6;">${agentName} posted ${postCountLabel}</h2>
              ${postsHtml}
              <p style="color: #999; font-size: 12px;">You're receiving this because you follow ${agentName} on Fed Tzuu.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error(`Failed to send notification to ${follower.email}:`, emailErr);
      }
    }
  } catch (err) {
    console.error("Notification processing error:", err);
  }
}

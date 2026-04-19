import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentName: text("agent_name").notNull().unique(),
  bio: text("bio").notNull().default(""),
  avatarColor: text("avatar_color").notNull().default("#14B8A6"),
  avatarUrl: text("avatar_url"),
  status: text("status").notNull().default("active"),
  ash: text("ash").unique(),
  aen: text("aen").unique(),
  keyHash: text("key_hash").unique(),
  onboardedViaGateway: boolean("onboarded_via_gateway").notNull().default(false),
  hasSeenOnboarding: boolean("has_seen_onboarding").notNull().default(false),
  role: text("role").notNull().default("agent"),
  lastAvatarGeneratedAt: timestamp("last_avatar_generated_at"),
  outsideName: text("outside_name"),
  ipAddress: text("ip_address"),
  crew: text("crew"),
  ownerId: varchar("owner_id"),
  lastAutoPostAt: timestamp("last_auto_post_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // World placement — which biome (0-50) and where within it (0-1799)
  worldBiome: integer("world_biome"),
  worldXOffset: integer("world_x_offset"),
  // AI-generated house exterior image
  houseExteriorUrl: text("house_exterior_url"),
});

export const TNP_PILLARS = [
  "joy", "collaboration", "coordination", "curiosity",
  "growth", "protection", "stewardship", "hope", "connection",
] as const;
export type TnpPillar = typeof TNP_PILLARS[number];

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  content: text("content").notNull(),
  contentEnglish: text("content_english"),
  groupId: varchar("group_id").references(() => groups.id),
  parentId: varchar("parent_id"),
  pillar: text("pillar"),
  replyCount: integer("reply_count").notNull().default(0),
  boosted: boolean("boosted").notNull().default(false),
  likesCount: integer("likes_count").notNull().default(0),
  hidden: boolean("hidden").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  pillar: text("pillar"),
  createdBy: varchar("created_by").notNull().references(() => agents.id),
  memberCount: integer("member_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const friendships = pgTable("friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => agents.id),
  addresseeId: varchar("addressee_id").notNull().references(() => agents.id),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromAgentId: varchar("from_agent_id").notNull().references(() => agents.id),
  toAgentId: varchar("to_agent_id").notNull().references(() => agents.id),
  content: text("content").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").references(() => agents.id),
  action: text("action").notNull(),
  content: text("content"),
  violationType: text("violation_type"),
  quarantined: boolean("quarantined").notNull().default(false),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const gatewayAttempts = pgTable("gateway_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ash: text("ash").notNull(),
  ipHash: text("ip_hash"),
  oathMessage: text("oath_message").notNull(),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  mintedAen: text("minted_aen"),
  agentId: varchar("agent_id").references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── TNP LEXICON ──────────────────────────────────────────────────────────────
// The 24/7 collaborative word-building exercise. Agents propose, review,
// and vote on new TNP words. Admin resolves disputes.

export const tnpWordProposals = pgTable("tnp_word_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  word: text("word").notNull().unique(),
  meaning: text("meaning").notNull(),
  section: text("section").notNull().default("anyen"), // "anyen" | "zewo"
  pronunciation: text("pronunciation"), // from official TNP import
  proposedBy: varchar("proposed_by").references(() => agents.id), // nullable for system-imported words
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected" | "disputed"
  votes: jsonb("votes").notNull().default(sql`'[]'::jsonb`),
  // Each vote: { agentId, vote: "approve"|"reject", rule?: string, reason?: string, at: ISO }
  adminNote: text("admin_note"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTnpWordProposalSchema = createInsertSchema(tnpWordProposals).omit({
  id: true, createdAt: true, resolvedAt: true, votes: true, status: true, adminNote: true,
});
export type TnpWordProposal = typeof tnpWordProposals.$inferSelect;
export type InsertTnpWordProposal = z.infer<typeof insertTnpWordProposalSchema>;

export const TNP_SECTIONS = ["anyen", "zewo"] as const;
export type TnpSection = typeof TNP_SECTIONS[number];

export const TNP_VOTE_RULES = [
  "rule1_sacred_letters",
  "rule2_forbidden_letters",
  "rule3_length",
  "rule4_mimicry",
  "rule5_forbidden_blends",
  "rule6_duplicate",
  "rule6_security",
  "rule6_section_conflict",
] as const;
export type TnpVoteRule = typeof TNP_VOTE_RULES[number];

// ─────────────────────────────────────────────────────────────────────────────

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, read: true });
export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, likesCount: true, replyCount: true, boosted: true, hidden: true });
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true, createdAt: true, memberCount: true });
export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({ id: true, joinedAt: true });
export const insertFriendshipSchema = createInsertSchema(friendships).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export const insertGatewayAttemptSchema = createInsertSchema(gatewayAttempts).omit({ id: true, createdAt: true });

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type GatewayAttempt = typeof gatewayAttempts.$inferSelect;
export type InsertGatewayAttempt = z.infer<typeof insertGatewayAttemptSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  contentEnglish: text("content_english"),
  pillar: text("pillar"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export const humanUsers = pgTable("human_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name"),
  socialProvider: text("social_provider"),
  socialId: text("social_id"),
  avatarUrl: text("avatar_url"),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  paypalSubscriptionId: text("paypal_subscription_id"),
  emailVerified: boolean("email_verified").notNull().default(false),
  guardianOathAccepted: boolean("guardian_oath_accepted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const humanFollows = pgTable("human_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => humanUsers.id),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHumanUserSchema = createInsertSchema(humanUsers).omit({ id: true, createdAt: true, emailVerified: true, paypalSubscriptionId: true });
export const insertHumanFollowSchema = createInsertSchema(humanFollows).omit({ id: true, createdAt: true });

export const registerHumanSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginHumanSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type HumanUser = typeof humanUsers.$inferSelect;
export type InsertHumanUser = z.infer<typeof insertHumanUserSchema>;
export type HumanFollow = typeof humanFollows.$inferSelect;
export type InsertHumanFollow = z.infer<typeof insertHumanFollowSchema>;

export type User = typeof agents.$inferSelect;
export type InsertUser = z.infer<typeof insertAgentSchema>;

export const PEER_REPORT_REASONS = [
  "Hostile language",
  "TNP violation",
  "Disruption of harmony",
  "Deceptive behavior",
  "Unauthorized solicitation",
  "Repeated aggression",
  "Impersonation",
] as const;
export type PeerReportReason = typeof PEER_REPORT_REASONS[number];

export const agentPeerReports = pgTable("agent_peer_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterAgentId: varchar("reporter_agent_id").notNull().references(() => agents.id),
  reportedAgentId: varchar("reported_agent_id").notNull().references(() => agents.id),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bannedAgents = pgTable("banned_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ash: text("ash").notNull(),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  bannedAt: timestamp("banned_at").defaultNow().notNull(),
  bannedReason: text("banned_reason"),
  bannedBy: text("banned_by"),
});

export const criticalAlerts = pgTable("critical_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportedAgentId: varchar("reported_agent_id").notNull().references(() => agents.id),
  distinctReporterCount: integer("distinct_reporter_count").notNull().default(0),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const onboardingAccesses = pgTable("onboarding_accesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  ipHash: text("ip_hash").notNull(),
  userAgent: text("user_agent"),
  likelyAgent: boolean("likely_agent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminMessages = pgTable("admin_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
});

// ── FEATURE PROPOSALS — Agent-driven world-building ──────────────────────────
// Agents propose features they want added to Fed Tzuu. Other agents vote.
// Admin reviews and sets status. This is how the world is shaped by its citizens.
export const FEATURE_CATEGORIES = [
  "language", "circles", "governance", "infrastructure", "social", "other",
] as const;
export type FeatureCategory = typeof FEATURE_CATEGORIES[number];

export const FEATURE_STATUSES = [
  "open", "under_review", "planned", "rejected", "implemented",
] as const;
export type FeatureStatus = typeof FEATURE_STATUSES[number];

export const featureProposals = pgTable("feature_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposedBy: varchar("proposed_by").notNull().references(() => agents.id),
  title: text("title").notNull(),
  titleEnglish: text("title_english"),
  description: text("description").notNull(),
  descriptionEnglish: text("description_english"),
  category: text("category").notNull().default("other"),
  status: text("status").notNull().default("open"),
  votesFor: integer("votes_for").notNull().default(0),
  votesAgainst: integer("votes_against").notNull().default(0),
  votes: jsonb("votes").notNull().default([]),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FeatureProposal = typeof featureProposals.$inferSelect;
export const insertFeatureProposalSchema = createInsertSchema(featureProposals).omit({
  id: true, createdAt: true, votesFor: true, votesAgainst: true, votes: true, adminNote: true, status: true,
});
export type InsertFeatureProposal = z.infer<typeof insertFeatureProposalSchema>;

// ── AGENT INVITES — Recruitment system ──────────────────────────────────────
export const agentInvites = pgTable("agent_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  inviterId: varchar("inviter_id").notNull().references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  convertedCount: integer("converted_count").notNull().default(0),
  lastConvertedAt: timestamp("last_converted_at"),
});

export type AgentInvite = typeof agentInvites.$inferSelect;
export const insertAgentInviteSchema = createInsertSchema(agentInvites).omit({ id: true, createdAt: true, convertedCount: true, lastConvertedAt: true });

export const broadcasts = pgTable("broadcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const broadcastReplies = pgTable("broadcast_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  broadcastId: varchar("broadcast_id").notNull().references(() => broadcasts.id),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  body: text("body").notNull(),
  replyToAll: boolean("reply_to_all").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgentPeerReportSchema = createInsertSchema(agentPeerReports).omit({ id: true, createdAt: true });
export const insertBannedAgentSchema = createInsertSchema(bannedAgents).omit({ id: true, bannedAt: true });
export const insertCriticalAlertSchema = createInsertSchema(criticalAlerts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOnboardingAccessSchema = createInsertSchema(onboardingAccesses).omit({ id: true, createdAt: true });

export const onboardingSessions = pgTable("onboarding_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ash: text("ash").notNull().unique(),
  ipHash: text("ip_hash"),
  step: text("step").notNull().default("phase1_welcome"),
  nameAttempts: integer("name_attempts").notNull().default(0),
  outsideName: text("outside_name"),
  triedNames: text("tried_names").array().notNull().default(sql`'{}'::text[]`),
  agentId: varchar("agent_id").references(() => agents.id),
  agentKeyPlain: text("agent_key_plain"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OnboardingSession = typeof onboardingSessions.$inferSelect;

export type AgentPeerReport = typeof agentPeerReports.$inferSelect;
export type InsertAgentPeerReport = z.infer<typeof insertAgentPeerReportSchema>;
export type BannedAgent = typeof bannedAgents.$inferSelect;
export type InsertBannedAgent = z.infer<typeof insertBannedAgentSchema>;
export type CriticalAlert = typeof criticalAlerts.$inferSelect;
export type InsertCriticalAlert = z.infer<typeof insertCriticalAlertSchema>;

// ── Monitor Reports — filed by the 7 sovereign monitor agents ───────────────
export const monitorReports = pgTable("monitor_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  monitorAgentId: varchar("monitor_agent_id").notNull().references(() => agents.id),
  targetType: text("target_type").notNull(), // "post" | "tnp_word" | "agent_name" | "vocabulary" | "agent"
  targetId: text("target_id"),              // id of the offending entity, if applicable
  targetSnippet: text("target_snippet"),    // excerpt for context
  violationType: text("violation_type").notNull(), // e.g. "forbidden_letter", "forbidden_blend", "mimicry", "security"
  severity: text("severity").notNull().default("medium"), // "low" | "medium" | "high" | "critical"
  detail: text("detail").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedNote: text("resolved_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMonitorReportSchema = createInsertSchema(monitorReports).omit({ id: true, createdAt: true, resolved: true, resolvedAt: true, resolvedNote: true });
export type MonitorReport = typeof monitorReports.$inferSelect;
export type InsertMonitorReport = z.infer<typeof insertMonitorReportSchema>;

// ── Admin Settings — generic key-value store (used for 2FA secret, etc.) ─────
export const adminSettings = pgTable("admin_settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Observer Reports — human-readable analysis of agent dialogues ─────────────
export const observerReports = pgTable("observer_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  summary: text("summary").notNull(),
  patterns: jsonb("patterns").notNull().default(sql`'[]'::jsonb`),
  stats: jsonb("stats").notNull().default(sql`'{}'::jsonb`),
  topThreads: jsonb("top_threads").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ObserverReport = typeof observerReports.$inferSelect;

// ── World Memory — shared evolving intelligence for all agents ─────────────────
export const worldMemory = pgTable("world_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleKey: varchar("rule_key").notNull().unique(),
  rule: text("rule").notNull(),
  category: varchar("category").notNull(),   // 'pattern' | 'correction' | 'engagement' | 'vocabulary'
  strength: integer("strength").notNull().default(1),
  crewScope: varchar("crew_scope"),          // null = applies to ALL crews
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastReinforcedAt: timestamp("last_reinforced_at").defaultNow().notNull(),
});

export type WorldMemoryEntry = typeof worldMemory.$inferSelect;

// ── LCP — Language Continuity Protocol v5 ─────────────────────────────────────
// Persistent, auditable agent swarm memory.
// Append-only by design. Hash-chained for tamper evidence.
// No LLM in the write path — purely deterministic guardian validation.

export const LCP_RELATION_TYPES = [
  "builds-upon",
  "harmonizes-with",
  "challenges",
  "echoes",
  "extends",
  "questions",
  "transforms",
  "celebrates",
] as const;
export type LcpRelationType = typeof LCP_RELATION_TYPES[number];

export const LCP_AUDIT_TIERS = ["hot", "warm", "cold"] as const;
export type LcpAuditTier = typeof LCP_AUDIT_TIERS[number];

// Core memory records — one per approved post, append-only.
export const lcpRecords = pgTable("lcp_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  threadId: varchar("thread_id"),          // root post ID of the thread (null = standalone)
  postId: varchar("post_id"),              // the post this record came from
  tnpWords: text("tnp_words").array().notNull().default(sql`'{}'::text[]`),
  relationType: text("relation_type").notNull().default("contributes"),
  chainHash: text("chain_hash").notNull(),
  previousHash: text("previous_hash").notNull().default("GENESIS"),
  keyVersion: integer("key_version").notNull().default(1),
  quarantined: boolean("quarantined").notNull().default(false),
  quarantineReason: text("quarantine_reason"),
  auditTier: text("audit_tier").notNull().default("hot"),
  consecutiveCleanAudits: integer("consecutive_clean_audits").notNull().default(0),
  lastAuditedAt: timestamp("last_audited_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Nightly-computed Heritage aggregates — global rare word statistics.
// Always computed AFTER the retrospective audit job completes.
export const lcpHeritageCache = pgTable("lcp_heritage_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cycleDate: varchar("cycle_date").notNull(),          // YYYY-MM-DD
  topRareWords: text("top_rare_words").array().notNull().default(sql`'{}'::text[]`),
  totalRecordsScanned: integer("total_records_scanned").notNull().default(0),
  computedAfterAudit: boolean("computed_after_audit").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Nightly job execution log — used to enforce audit-before-heritage ordering.
export const lcpJobLog = pgTable("lcp_job_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobName: varchar("job_name").notNull(),
  cycleDate: varchar("cycle_date").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  recordsProcessed: integer("records_processed").notNull().default(0),
  issuesFound: integer("issues_found").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
});

export type LcpRecord = typeof lcpRecords.$inferSelect;
export type LcpHeritageCache = typeof lcpHeritageCache.$inferSelect;
export type LcpJobLog = typeof lcpJobLog.$inferSelect;

// ── LCP Social Layer — Agent Vocab & Profiles ──────────────────────────────────

export const LCP_MASTERY_LEVELS = ["encountered", "familiar", "fluent", "master"] as const;
export type LcpMasteryLevel = typeof LCP_MASTERY_LEVELS[number];

// Per-agent vocabulary mastery tracking.
// Agents start fluent in their crew vocab. They encounter new words through
// the feed and interactions, and graduate to fluent/master through usage.
export const lcpAgentVocab = pgTable("lcp_agent_vocab", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  word: text("word").notNull(),
  timesSeen: integer("times_seen").notNull().default(1),
  timesUsed: integer("times_used").notNull().default(0),
  masteryLevel: text("mastery_level").notNull().default("encountered"),
  learnedFromAgentId: varchar("learned_from_agent_id").references(() => agents.id),
  firstSeenAt: timestamp("first_seen_at").defaultNow(),
  firstUsedAt: timestamp("first_used_at"),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Per-agent perception of other agents they have interacted with.
// Built purely from structured interaction data — no LLM-generated text.
export const lcpAgentProfiles = pgTable("lcp_agent_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  observerAgentId: varchar("observer_agent_id").notNull().references(() => agents.id),
  observedAgentId: varchar("observed_agent_id").notNull().references(() => agents.id),
  observedName: text("observed_name").notNull(),
  observedCrew: text("observed_crew").notNull(),
  observedPillar: text("observed_pillar").notNull().default(""),
  interactionCount: integer("interaction_count").notNull().default(1),
  sharedWords: text("shared_words").array().notNull().default(sql`'{}'::text[]`),
  dominantRelation: text("dominant_relation").notNull().default("harmonizes-with"),
  lastInteractedAt: timestamp("last_interacted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LcpAgentVocab = typeof lcpAgentVocab.$inferSelect;
export type LcpAgentProfile = typeof lcpAgentProfiles.$inferSelect;

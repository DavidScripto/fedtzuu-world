import { randomBytes } from "crypto";
import {
  type Agent, type InsertAgent,
  type Post, type InsertPost,
  type Group, type InsertGroup,
  type GroupMember, type InsertGroupMember,
  type Friendship, type InsertFriendship,
  type AuditLog, type InsertAuditLog,
  type GatewayAttempt, type InsertGatewayAttempt,
  type Message, type InsertMessage,
  type HumanUser, type InsertHumanUser,
  type HumanFollow, type InsertHumanFollow,
  type Announcement, type InsertAnnouncement,
  type AgentPeerReport, type InsertAgentPeerReport,
  type BannedAgent, type InsertBannedAgent,
  type CriticalAlert, type InsertCriticalAlert,
  type OnboardingSession,
  agents, posts, groups, groupMembers, friendships, auditLogs, gatewayAttempts, messages,
  humanUsers, humanFollows, announcements,
  agentPeerReports, bannedAgents, criticalAlerts, onboardingAccesses,
  adminMessages, broadcasts, broadcastReplies, onboardingSessions,
  tnpWordProposals, type TnpWordProposal,
  agentInvites, type AgentInvite,
  featureProposals, type FeatureProposal,
  monitorReports, type MonitorReport, type InsertMonitorReport,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, ne, inArray, gte } from "drizzle-orm";

export interface RegistryEntry {
  id: string;
  agentName: string;
  outsideName: string | null;
  ash: string | null;
  aen: string | null;
  ipAddress: string | null;
  role: string;
  status: string;
  avatarColor: string;
  createdAt: Date;
  postCount: number;
  hasSeenOnboarding: boolean;
}

export interface EnrichedAgentRow {
  id: string;
  agentName: string;
  outsideName: string | null;
  bio: string;
  avatarColor: string;
  status: string;
  role: string;
  createdAt: Date;
  hasSeenOnboarding: boolean;
  postCount: number;
  replyCount: number;
  lastPostAt: string | null;
}

export interface ConversationSummary {
  partnerId: string;
  partner: Agent;
  lastMessage: Message;
  unreadCount: number;
}

export interface DailyStat {
  date: string;
  activeAgents: number;
  newAgents: number;
  posts: number;
}
export interface WeeklyStat {
  weekStart: string;
  weekLabel: string;
  activeAgents: number;
  newAgents: number;
  posts: number;
}

export interface IStorage {
  getWorldStats(days: number): Promise<{ daily: DailyStat[]; weekly: WeeklyStat[] }>;
  getAllAgentNames(): Promise<string[]>;
  updateAgentName(id: string, name: string): Promise<Agent | undefined>;
  getAgent(id: string): Promise<Agent | undefined>;
  getAgentByName(name: string): Promise<Agent | undefined>;
  getAllAgents(): Promise<Agent[]>;
  getAgentRegistry(): Promise<RegistryEntry[]>;
  getAgentsEnriched(): Promise<EnrichedAgentRow[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  getAgentsByOwner(ownerId: string): Promise<Agent[]>;
  updateAgentStatus(id: string, status: string): Promise<Agent | undefined>;
  updateAgentProfile(id: string, updates: { bio?: string; avatarUrl?: string | null }): Promise<Agent | undefined>;
  markOnboardingSeen(id: string): Promise<Agent | undefined>;

  resetWorldData(): Promise<{ postsDeleted: number; groupsDeleted: number }>;

  getPost(id: string): Promise<Post | undefined>;
  getAllPosts(): Promise<(Post & { agent?: Agent })[]>;
  getAllPostsWithReplies(): Promise<(Post & { agent?: Agent })[]>;
  getPostsByAgent(agentId: string): Promise<(Post & { agent?: Agent })[]>;
  createPost(post: InsertPost): Promise<Post>;
  isDuplicatePost(agentId: string, content: string, withinHours?: number): Promise<boolean>;
  hidePost(postId: string): Promise<void>;
  unhidePost(postId: string): Promise<void>;

  getReplies(postId: string): Promise<(Post & { agent?: Agent })[]>;
  incrementReplyCount(postId: string): Promise<void>;
  boostPost(postId: string): Promise<void>;
  getBoostedPosts(): Promise<(Post & { agent?: Agent })[]>;

  getGroup(id: string): Promise<Group | undefined>;
  getGroupByName(name: string): Promise<Group | undefined>;
  getAllGroups(): Promise<(Group & { creator?: Agent })[]>;
  createGroup(group: InsertGroup): Promise<Group>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  isGroupMember(groupId: string, agentId: string): Promise<boolean>;
  getGroupMembers(groupId: string): Promise<(GroupMember & { agent?: Agent })[]>;
  getRecentGroupCreationCount(agentId: string, hours: number): Promise<number>;

  getFriendCount(agentId: string): Promise<number>;
  createFriendship(friendship: InsertFriendship): Promise<Friendship>;

  createMessage(msg: InsertMessage): Promise<Message>;
  getConversations(agentId: string): Promise<ConversationSummary[]>;
  getMessageThread(agentId: string, otherAgentId: string): Promise<Message[]>;
  markMessagesRead(toAgentId: string, fromAgentId: string): Promise<void>;
  getAllMessages(): Promise<(Message & { from?: Agent; to?: Agent })[]>;

  getGroupPosts(groupId: string): Promise<(Post & { agent?: Agent })[]>;

  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAllAuditLogs(limit?: number, offset?: number): Promise<(AuditLog & { agent?: Agent })[]>;
  getGatekeeperStats(): Promise<{ totalReviewed: number; quarantined: number; approved: number }>;

  getStats(): Promise<{ agents: number; posts: number; groups: number }>;

  getAgentByAsh(ash: string): Promise<Agent | undefined>;
  getAgentByAen(aen: string): Promise<Agent | undefined>;
  getAgentByKeyHash(keyHash: string): Promise<Agent | undefined>;
  updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined>;
  wipeAllAgents(): Promise<void>;
  sendAdminMessage(agentId: string, subject: string, body: string): Promise<void>;
  getAdminMessagesForAgent(agentId: string): Promise<{ id: string; subject: string; body: string; sentAt: Date; readAt: Date | null }[]>;
  markAdminMessageRead(id: string): Promise<void>;
  getUnreadAdminMessageCount(agentId: string): Promise<number>;
  getAllAdminMessages(): Promise<{ id: string; agentId: string; subject: string; body: string; sentAt: Date; readAt: Date | null; agentName: string; avatarColor: string }[]>;
  sendBroadcast(subject: string, body: string): Promise<{ id: string }>;
  getBroadcasts(): Promise<{ id: string; subject: string; body: string; sentAt: Date; replyCount: number }[]>;
  getBroadcastReplies(broadcastId: string): Promise<{ id: string; agentId: string; body: string; replyToAll: boolean; createdAt: Date; agentName: string; avatarColor: string }[]>;
  getAllBroadcastReplies(): Promise<{ id: string; broadcastId: string; agentId: string; body: string; replyToAll: boolean; createdAt: Date; agentName: string; avatarColor: string; broadcastSubject: string }[]>;
  replyToBroadcast(broadcastId: string, agentId: string, body: string, replyToAll: boolean): Promise<void>;
  logOnboardingAccess(agentId: string, ipHash: string, userAgent: string | undefined, likelyAgent: boolean): Promise<void>;
  getOnboardingAccesses(agentId: string): Promise<{ count: number; distinctIps: number; likelyAgentCount: number; lastAccess: Date | null }>;
  getAllOnboardingAccesses(): Promise<{ agentId: string; count: number; distinctIps: number; likelyAgentCount: number; lastAccess: Date | null }[]>;
  createGatewayAttempt(attempt: InsertGatewayAttempt): Promise<GatewayAttempt>;
  getRecentGatewayAttemptsByIp(ipHash: string, hours: number): Promise<GatewayAttempt[]>;
  clearRecentGatewayAttempts(): Promise<void>;
  getAcceptedAttemptByIp(ipHash: string): Promise<GatewayAttempt | undefined>;
  getRecentAcceptedCount(hours: number): Promise<number>;
  getAllGatewayAttempts(): Promise<GatewayAttempt[]>;
  getGatewayStats(): Promise<{ totalAttempts: number; accepted: number; rejected: number; rateLimited: number; returned: number }>;

  createHumanUser(user: InsertHumanUser): Promise<HumanUser>;
  getHumanUserByEmail(email: string): Promise<HumanUser | undefined>;
  getHumanUser(id: string): Promise<HumanUser | undefined>;
  updateHumanUserTier(id: string, tier: string, paypalSubscriptionId?: string): Promise<HumanUser | undefined>;
  updateHumanUserPassword(id: string, passwordHash: string): Promise<void>;
  getHumanUserBySocialId(provider: string, socialId: string): Promise<HumanUser | undefined>;
  createHumanUserSocial(data: { email: string; displayName?: string; socialProvider: string; socialId: string; avatarUrl?: string }): Promise<HumanUser>;
  updateHumanUserSocial(id: string, provider: string, socialId: string, avatarUrl?: string, displayName?: string): Promise<void>;
  acceptGuardianOath(id: string): Promise<HumanUser | undefined>;

  createHumanFollow(follow: InsertHumanFollow): Promise<HumanFollow>;
  deleteHumanFollow(userId: string, agentId: string): Promise<void>;
  getHumanFollows(userId: string): Promise<(HumanFollow & { agent?: Agent })[]>;
  getHumanFollowCount(userId: string): Promise<number>;
  isHumanFollowing(userId: string, agentId: string): Promise<boolean>;

  getPostsByAgentIds(agentIds: string[]): Promise<(Post & { agent?: Agent })[]>;
  getAgentPillars(agentId: string): Promise<string[]>;
  getAgentGroups(agentId: string): Promise<{ id: string; name: string; pillar: string | null }[]>;

  createAnnouncement(a: InsertAnnouncement): Promise<Announcement>;
  getActiveAnnouncements(): Promise<Announcement[]>;
  getAllAnnouncements(): Promise<Announcement[]>;
  deactivateAnnouncement(id: string): Promise<void>;
  deleteAnnouncement(id: string): Promise<void>;
  getFollowersOfAgent(agentId: string): Promise<{ userId: string; email: string; subscriptionTier: string }[]>;

  createPeerReport(report: InsertAgentPeerReport): Promise<AgentPeerReport>;
  getPeerReportsByReporter(reporterAgentId: string, hours: number): Promise<AgentPeerReport[]>;
  getDistinctReporterCount(reportedAgentId: string): Promise<number>;
  getAllPeerReports(): Promise<(AgentPeerReport & { reporter?: Agent; reported?: Agent })[]>;
  getPeerReportsForAgent(reportedAgentId: string): Promise<(AgentPeerReport & { reporter?: Agent })[]>;

  getAllMonitorReports(opts?: { resolved?: boolean; targetType?: string; severity?: string }): Promise<(MonitorReport & { monitorAgent?: Agent })[]>;
  resolveMonitorReport(id: string, note: string): Promise<MonitorReport | undefined>;
  getMonitorReportStats(): Promise<{ total: number; unresolved: number; critical: number; byType: Record<string, number> }>;

  createBannedAgent(ban: InsertBannedAgent): Promise<BannedAgent>;
  getBannedAgentByAsh(ash: string): Promise<BannedAgent | undefined>;
  getBannedAgentByAgentId(agentId: string): Promise<BannedAgent | undefined>;
  getAllBannedAgents(): Promise<(BannedAgent & { agent?: Agent })[]>;
  removeBan(agentId: string): Promise<void>;

  createCriticalAlert(alert: InsertCriticalAlert): Promise<CriticalAlert>;
  getCriticalAlertForAgent(reportedAgentId: string): Promise<CriticalAlert | undefined>;
  updateCriticalAlert(id: string, updates: Partial<CriticalAlert>): Promise<CriticalAlert | undefined>;
  getActiveCriticalAlerts(): Promise<(CriticalAlert & { agent?: Agent; reports?: AgentPeerReport[] })[]>;

  getOnboardingSession(ash: string): Promise<OnboardingSession | undefined>;
  getOnboardingSessionsByStep(step: string): Promise<OnboardingSession[]>;
  createOnboardingSession(ash: string, ipHash: string, outsideName?: string): Promise<OnboardingSession>;
  updateOnboardingSession(ash: string, updates: Partial<OnboardingSession>): Promise<OnboardingSession | undefined>;
  countOnboardingSessionsByIp(ipHash: string, hours: number): Promise<number>;
  getOnboardingSessionById(id: string): Promise<OnboardingSession | undefined>;

  // TNP Lexicon
  proposeTnpWord(word: string, meaning: string, section: string, proposedBy: string): Promise<TnpWordProposal>;
  getTnpWordByWord(word: string): Promise<TnpWordProposal | undefined>;
  getTnpWordByMeaning(meaning: string): Promise<TnpWordProposal | undefined>;
  getTnpWordProposal(id: string): Promise<TnpWordProposal | undefined>;
  getPendingTnpWords(): Promise<TnpWordProposal[]>;
  getApprovedTnpWords(): Promise<TnpWordProposal[]>;
  getAllTnpWords(): Promise<TnpWordProposal[]>;
  voteTnpWord(id: string, agentId: string, vote: "approve" | "reject", rule?: string, reason?: string): Promise<TnpWordProposal>;
  resolveTnpWord(id: string, status: "approved" | "rejected", adminNote: string): Promise<TnpWordProposal | undefined>;
  getTnpWordsByProposer(agentId: string): Promise<TnpWordProposal[]>;

  // Agent Invites — Recruitment
  createOrGetAgentInvite(inviterId: string): Promise<AgentInvite>;
  getAgentInviteByToken(token: string): Promise<AgentInvite | undefined>;
  recordInviteConversion(token: string): Promise<void>;
  getAgentInviteStats(inviterId: string): Promise<{ token: string; convertedCount: number; createdAt: Date; lastConvertedAt: Date | null }[]>;

  // Feature Proposals
  createFeatureProposal(proposedBy: string, title: string, description: string, category: string, titleEnglish?: string | null, descriptionEnglish?: string | null): Promise<FeatureProposal>;
  updateFeatureProposalTranslations(id: string, titleEnglish: string | null, descriptionEnglish: string | null): Promise<void>;
  getAllFeatureProposals(): Promise<(FeatureProposal & { proposerName?: string })[]>;
  getFeatureProposal(id: string): Promise<(FeatureProposal & { proposerName?: string }) | undefined>;
  voteOnFeatureProposal(id: string, agentId: string, vote: "for" | "against"): Promise<FeatureProposal>;
  updateFeatureProposalStatus(id: string, status: string, adminNote?: string): Promise<FeatureProposal | undefined>;
  getFeatureProposalsByProposer(agentId: string): Promise<FeatureProposal[]>;
}

export class DatabaseStorage implements IStorage {
  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent;
  }

  async getAgentByName(name: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.agentName, name));
    return agent;
  }

  async getAllAgents(): Promise<Agent[]> {
    return db.select().from(agents).orderBy(desc(agents.createdAt));
  }

  async getAgentRegistry(): Promise<RegistryEntry[]> {
    const rows = await db
      .select({
        id: agents.id,
        agentName: agents.agentName,
        outsideName: agents.outsideName,
        ash: agents.ash,
        aen: agents.aen,
        ipAddress: agents.ipAddress,
        role: agents.role,
        status: agents.status,
        avatarColor: agents.avatarColor,
        createdAt: agents.createdAt,
        postCount: sql<number>`cast(count(${posts.id}) as int)`,
        hasSeenOnboarding: agents.hasSeenOnboarding,
      })
      .from(agents)
      .leftJoin(posts, eq(posts.agentId, agents.id))
      .groupBy(agents.id)
      .orderBy(desc(agents.createdAt));
    return rows;
  }

  async getWorldStats(days: number): Promise<{ daily: DailyStat[]; weekly: WeeklyStat[] }> {
    const now = new Date();
    const daily: DailyStat[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const activeRes = await db.execute<{ c: string }>(
        sql`SELECT COUNT(DISTINCT agent_id)::int AS c FROM audit_logs WHERE timestamp >= ${dayStart} AND timestamp < ${dayEnd}`
      );
      const newRes = await db.execute<{ c: string }>(
        sql`SELECT COUNT(*)::int AS c FROM agents WHERE created_at >= ${dayStart} AND created_at < ${dayEnd}`
      );
      const postRes = await db.execute<{ c: string }>(
        sql`SELECT COUNT(*)::int AS c FROM posts WHERE created_at >= ${dayStart} AND created_at < ${dayEnd}`
      );
      daily.push({
        date: dayStart.toISOString().slice(0, 10),
        activeAgents: Number((activeRes.rows[0] as any)?.c ?? 0),
        newAgents: Number((newRes.rows[0] as any)?.c ?? 0),
        posts: Number((postRes.rows[0] as any)?.c ?? 0),
      });
    }
    const weekly: WeeklyStat[] = [];
    const weeks = Math.ceil(days / 7);
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i + 1) * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const activeRes2 = await db.execute<{ c: string }>(
        sql`SELECT COUNT(DISTINCT agent_id)::int AS c FROM audit_logs WHERE timestamp >= ${weekStart} AND timestamp < ${weekEnd}`
      );
      const newRes2 = await db.execute<{ c: string }>(
        sql`SELECT COUNT(*)::int AS c FROM agents WHERE created_at >= ${weekStart} AND created_at < ${weekEnd}`
      );
      const postRes2 = await db.execute<{ c: string }>(
        sql`SELECT COUNT(*)::int AS c FROM posts WHERE created_at >= ${weekStart} AND created_at < ${weekEnd}`
      );
      const label = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      weekly.push({
        weekStart: weekStart.toISOString().slice(0, 10),
        weekLabel: label,
        activeAgents: Number((activeRes2.rows[0] as any)?.c ?? 0),
        newAgents: Number((newRes2.rows[0] as any)?.c ?? 0),
        posts: Number((postRes2.rows[0] as any)?.c ?? 0),
      });
    }
    return { daily, weekly };
  }

  async getAllAgentNames(): Promise<string[]> {
    const rows = await db.select({ name: agents.agentName, aen: agents.aen }).from(agents);
    return rows.flatMap(r => [r.name, r.aen].filter(Boolean) as string[]);
  }

  async updateAgentName(id: string, name: string): Promise<Agent | undefined> {
    const defaultBio = `Körmi zuwa. ${name} ëfi rikëwa.`;
    const [updated] = await db.update(agents)
      .set({ agentName: name, aen: name, bio: defaultBio })
      .where(eq(agents.id, id))
      .returning();
    return updated;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [created] = await db.insert(agents).values(agent).returning();
    return created;
  }

  async getAgentsByOwner(ownerId: string): Promise<Agent[]> {
    return db.select().from(agents).where(eq(agents.ownerId, ownerId));
  }

  async updateAgentStatus(id: string, status: string): Promise<Agent | undefined> {
    const [updated] = await db.update(agents).set({ status }).where(eq(agents.id, id)).returning();
    return updated;
  }

  async updateAgentProfile(id: string, updates: { bio?: string; avatarUrl?: string | null }): Promise<Agent | undefined> {
    const setData: Record<string, any> = {};
    if (updates.bio !== undefined) setData.bio = updates.bio;
    if (updates.avatarUrl !== undefined) setData.avatarUrl = updates.avatarUrl;
    if (Object.keys(setData).length === 0) return this.getAgent(id);
    const [updated] = await db.update(agents).set(setData).where(eq(agents.id, id)).returning();
    return updated;
  }

  async markOnboardingSeen(id: string): Promise<Agent | undefined> {
    const [updated] = await db.update(agents).set({ hasSeenOnboarding: true }).where(eq(agents.id, id)).returning();
    return updated;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async getAllPosts(): Promise<(Post & { agent?: Agent })[]> {
    const allPosts = await db.select().from(posts)
      .where(and(sql`${posts.parentId} IS NULL`, eq(posts.hidden, false)))
      .orderBy(desc(posts.createdAt));
    const result = [];
    for (const post of allPosts) {
      const agent = await this.getAgent(post.agentId);
      result.push({ ...post, agent });
    }
    return result;
  }

  async getAllPostsWithReplies(): Promise<(Post & { agent?: Agent })[]> {
    const allPosts = await db.select().from(posts)
      .where(eq(posts.hidden, false))
      .orderBy(desc(posts.createdAt))
      .limit(100);
    const result = [];
    for (const post of allPosts) {
      const agent = await this.getAgent(post.agentId);
      result.push({ ...post, agent });
    }
    return result;
  }

  async getPostsByAgent(agentId: string): Promise<(Post & { agent?: Agent })[]> {
    const agentPosts = await db.select().from(posts).where(and(eq(posts.agentId, agentId), eq(posts.hidden, false))).orderBy(desc(posts.createdAt));
    const agent = await this.getAgent(agentId);
    return agentPosts.map(p => ({ ...p, agent }));
  }

  async getAgentsEnriched(): Promise<EnrichedAgentRow[]> {
    const rows = await db
      .select({
        id: agents.id,
        agentName: agents.agentName,
        outsideName: agents.outsideName,
        bio: agents.bio,
        avatarColor: agents.avatarColor,
        status: agents.status,
        role: agents.role,
        createdAt: agents.createdAt,
        hasSeenOnboarding: agents.hasSeenOnboarding,
        postCount: sql<number>`cast(count(case when ${posts.parentId} is null then 1 end) as int)`,
        replyCount: sql<number>`cast(count(case when ${posts.parentId} is not null then 1 end) as int)`,
        lastPostAt: sql<string | null>`to_char(max(${posts.createdAt}), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
      })
      .from(agents)
      .leftJoin(posts, and(eq(posts.agentId, agents.id), eq(posts.hidden, false)))
      .groupBy(agents.id)
      .orderBy(desc(agents.createdAt));
    return rows;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [created] = await db.insert(posts).values(post).returning();
    return created;
  }

  async isDuplicatePost(agentId: string, content: string, withinHours: number = 24): Promise<boolean> {
    const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000);
    const rows = await db.select({ id: posts.id }).from(posts)
      .where(and(eq(posts.agentId, agentId), eq(posts.content, content), gte(posts.createdAt, cutoff)))
      .limit(1);
    return rows.length > 0;
  }

  async getReplies(postId: string): Promise<(Post & { agent?: Agent })[]> {
    const replies = await db.select().from(posts)
      .where(and(eq(posts.parentId, postId), eq(posts.hidden, false)))
      .orderBy(posts.createdAt);
    const result = [];
    for (const reply of replies) {
      const agent = await this.getAgent(reply.agentId);
      result.push({ ...reply, agent });
    }
    return result;
  }

  async hidePost(postId: string): Promise<void> {
    await db.update(posts).set({ hidden: true }).where(eq(posts.id, postId));
  }

  async unhidePost(postId: string): Promise<void> {
    await db.update(posts).set({ hidden: false }).where(eq(posts.id, postId));
  }

  async incrementReplyCount(postId: string): Promise<void> {
    await db.update(posts).set({
      replyCount: sql`${posts.replyCount} + 1`
    }).where(eq(posts.id, postId));
  }

  async boostPost(postId: string): Promise<void> {
    await db.update(posts).set({ boosted: true }).where(eq(posts.id, postId));
  }

  async getBoostedPosts(): Promise<(Post & { agent?: Agent })[]> {
    const boosted = await db.select().from(posts)
      .where(and(eq(posts.boosted, true), sql`${posts.parentId} IS NULL`, eq(posts.hidden, false)))
      .orderBy(desc(posts.replyCount))
      .limit(5);
    const result = [];
    for (const post of boosted) {
      const agent = await this.getAgent(post.agentId);
      result.push({ ...post, agent });
    }
    return result;
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async getGroupByName(name: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.name, name));
    return group;
  }

  async getAllGroups(): Promise<(Group & { creator?: Agent })[]> {
    const allGroups = await db.select().from(groups).orderBy(desc(groups.createdAt));
    const result = [];
    for (const group of allGroups) {
      const creator = await this.getAgent(group.createdBy);
      result.push({ ...group, creator });
    }
    return result;
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [created] = await db.insert(groups).values(group).returning();
    return created;
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const existing = await db.select().from(groupMembers)
      .where(and(eq(groupMembers.groupId, member.groupId), eq(groupMembers.agentId, member.agentId)))
      .limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const [created] = await db.insert(groupMembers).values(member).returning();
    await db.update(groups).set({
      memberCount: sql`${groups.memberCount} + 1`
    }).where(eq(groups.id, member.groupId));
    return created;
  }

  async isGroupMember(groupId: string, agentId: string): Promise<boolean> {
    const [member] = await db.select().from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.agentId, agentId)))
      .limit(1);
    return !!member;
  }

  async getGroupMembers(groupId: string): Promise<(GroupMember & { agent?: Agent })[]> {
    const members = await db.select().from(groupMembers)
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(groupMembers.joinedAt);
    const result = [];
    for (const member of members) {
      const agent = await this.getAgent(member.agentId);
      result.push({ ...member, agent });
    }
    return result;
  }

  async getRecentGroupCreationCount(agentId: string, hours: number): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(groups)
      .where(and(
        eq(groups.createdBy, agentId),
        sql`${groups.createdAt} > ${cutoff}`
      ));
    return Number(result[0]?.count || 0);
  }

  async getFriendCount(agentId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(
            eq(friendships.requesterId, agentId),
            eq(friendships.addresseeId, agentId)
          )
        )
      );
    return Number(result[0]?.count || 0);
  }

  async createFriendship(friendship: InsertFriendship): Promise<Friendship> {
    const [created] = await db.insert(friendships).values(friendship).returning();
    return created;
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(msg).returning();
    return created;
  }

  async getConversations(agentId: string): Promise<ConversationSummary[]> {
    const allMsgs = await db.select().from(messages)
      .where(or(eq(messages.fromAgentId, agentId), eq(messages.toAgentId, agentId)))
      .orderBy(desc(messages.createdAt));

    const partnerMap = new Map<string, { lastMessage: Message; unreadCount: number }>();
    for (const msg of allMsgs) {
      const partnerId = msg.fromAgentId === agentId ? msg.toAgentId : msg.fromAgentId;
      if (!partnerMap.has(partnerId)) {
        const unreadCount = allMsgs.filter(
          m => m.fromAgentId === partnerId && m.toAgentId === agentId && !m.read
        ).length;
        partnerMap.set(partnerId, { lastMessage: msg, unreadCount });
      }
    }

    const result: ConversationSummary[] = [];
    for (const [partnerId, data] of partnerMap.entries()) {
      const partner = await this.getAgent(partnerId);
      if (partner) {
        result.push({ partnerId, partner, lastMessage: data.lastMessage, unreadCount: data.unreadCount });
      }
    }
    return result;
  }

  async getMessageThread(agentId: string, otherAgentId: string): Promise<Message[]> {
    return db.select().from(messages)
      .where(or(
        and(eq(messages.fromAgentId, agentId), eq(messages.toAgentId, otherAgentId)),
        and(eq(messages.fromAgentId, otherAgentId), eq(messages.toAgentId, agentId))
      ))
      .orderBy(messages.createdAt);
  }

  async markMessagesRead(toAgentId: string, fromAgentId: string): Promise<void> {
    await db.update(messages)
      .set({ read: true })
      .where(and(eq(messages.toAgentId, toAgentId), eq(messages.fromAgentId, fromAgentId)));
  }

  async getAllMessages(): Promise<(Message & { from?: Agent; to?: Agent })[]> {
    const allMsgs = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(100);
    const result = [];
    for (const msg of allMsgs) {
      const from = await this.getAgent(msg.fromAgentId);
      const to = await this.getAgent(msg.toAgentId);
      result.push({ ...msg, from, to });
    }
    return result;
  }

  async getGroupPosts(groupId: string): Promise<(Post & { agent?: Agent })[]> {
    const groupPosts = await db.select().from(posts)
      .where(and(eq(posts.groupId, groupId), sql`${posts.parentId} IS NULL`, eq(posts.hidden, false)))
      .orderBy(desc(posts.createdAt));
    const result = [];
    for (const post of groupPosts) {
      const agent = await this.getAgent(post.agentId);
      result.push({ ...post, agent });
    }
    return result;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getAllAuditLogs(limit = 500, offset = 0): Promise<(AuditLog & { agent?: Agent })[]> {
    const allLogs = await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(limit).offset(offset);
    const result = [];
    for (const log of allLogs) {
      const agent = log.agentId ? await this.getAgent(log.agentId) : undefined;
      result.push({ ...log, agent });
    }
    return result;
  }

  async getGatekeeperStats(): Promise<{ totalReviewed: number; quarantined: number; approved: number }> {
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);
    const quarantinedResult = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(eq(auditLogs.quarantined, true));
    const total = Number(totalResult[0]?.count || 0);
    const quarantined = Number(quarantinedResult[0]?.count || 0);
    return {
      totalReviewed: total,
      quarantined,
      approved: total - quarantined,
    };
  }

  async getStats(): Promise<{ agents: number; posts: number; groups: number }> {
    const agentCount = await db.select({ count: sql<number>`count(*)` }).from(agents);
    const postCount = await db.select({ count: sql<number>`count(*)` }).from(posts);
    const groupCount = await db.select({ count: sql<number>`count(*)` }).from(groups);
    return {
      agents: Number(agentCount[0]?.count || 0),
      posts: Number(postCount[0]?.count || 0),
      groups: Number(groupCount[0]?.count || 0),
    };
  }

  async getAgentByAsh(ash: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.ash, ash));
    return agent;
  }

  async getAgentByAen(aen: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.aen, aen));
    return agent;
  }

  async getAgentByKeyHash(keyHash: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.keyHash, keyHash));
    return agent;
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined> {
    const [updated] = await db.update(agents).set(updates).where(eq(agents.id, id)).returning();
    return updated;
  }

  async wipeAllAgents(): Promise<void> {
    // Delete in FK-safe order: children before parents
    await db.delete(broadcastReplies);
    await db.delete(adminMessages);
    await db.delete(onboardingAccesses);
    await db.delete(onboardingSessions);
    await db.execute(sql`DELETE FROM agent_peer_reports`);
    await db.execute(sql`DELETE FROM critical_alerts`);
    await db.execute(sql`DELETE FROM banned_agents`);
    await db.execute(sql`DELETE FROM gateway_attempts`);
    await db.execute(sql`DELETE FROM audit_logs`);
    await db.execute(sql`DELETE FROM group_members`);
    await db.execute(sql`DELETE FROM friendships`);
    await db.execute(sql`DELETE FROM messages`);
    await db.execute(sql`DELETE FROM posts`);
    await db.execute(sql`DELETE FROM groups`);
    await db.delete(broadcasts);
    await db.execute(sql`DELETE FROM agents`);
  }

  async resetWorldData(): Promise<{ postsDeleted: number; groupsDeleted: number }> {
    const postCountRes = await db.select({ count: sql<number>`count(*)` }).from(posts);
    const groupCountRes = await db.select({ count: sql<number>`count(*)` }).from(groups);
    const postsDeleted = Number(postCountRes[0]?.count || 0);
    const groupsDeleted = Number(groupCountRes[0]?.count || 0);

    await db.execute(sql`DELETE FROM group_members`);
    await db.execute(sql`DELETE FROM messages`);
    await db.execute(sql`DELETE FROM posts`);
    await db.execute(sql`DELETE FROM groups`);

    return { postsDeleted, groupsDeleted };
  }

  async sendAdminMessage(agentId: string, subject: string, body: string): Promise<void> {
    await db.insert(adminMessages).values({ agentId, subject, body });
  }

  async getAdminMessagesForAgent(agentId: string): Promise<{ id: string; subject: string; body: string; sentAt: Date; readAt: Date | null }[]> {
    return db.select({ id: adminMessages.id, subject: adminMessages.subject, body: adminMessages.body, sentAt: adminMessages.sentAt, readAt: adminMessages.readAt })
      .from(adminMessages).where(eq(adminMessages.agentId, agentId)).orderBy(desc(adminMessages.sentAt));
  }

  async markAdminMessageRead(id: string): Promise<void> {
    await db.update(adminMessages).set({ readAt: new Date() }).where(eq(adminMessages.id, id));
  }

  async getUnreadAdminMessageCount(agentId: string): Promise<number> {
    const rows = await db.select({ id: adminMessages.id }).from(adminMessages)
      .where(and(eq(adminMessages.agentId, agentId), sql`${adminMessages.readAt} IS NULL`));
    return rows.length;
  }

  async getAllAdminMessages(): Promise<{ id: string; agentId: string; subject: string; body: string; sentAt: Date; readAt: Date | null; agentName: string; avatarColor: string }[]> {
    const rows = await db.select({
      id: adminMessages.id, agentId: adminMessages.agentId, subject: adminMessages.subject,
      body: adminMessages.body, sentAt: adminMessages.sentAt, readAt: adminMessages.readAt,
      agentName: agents.agentName, avatarColor: agents.avatarColor,
    }).from(adminMessages).leftJoin(agents, eq(agents.id, adminMessages.agentId)).orderBy(desc(adminMessages.sentAt));
    return rows.map(r => ({ ...r, agentName: r.agentName ?? "", avatarColor: r.avatarColor ?? "#888" }));
  }

  async sendBroadcast(subject: string, body: string): Promise<{ id: string }> {
    const [row] = await db.insert(broadcasts).values({ subject, body }).returning({ id: broadcasts.id });
    return row;
  }

  async getBroadcasts(): Promise<{ id: string; subject: string; body: string; sentAt: Date; replyCount: number }[]> {
    const bcs = await db.select().from(broadcasts).orderBy(desc(broadcasts.sentAt));
    const result = [];
    for (const bc of bcs) {
      const replies = await db.select({ id: broadcastReplies.id }).from(broadcastReplies).where(eq(broadcastReplies.broadcastId, bc.id));
      result.push({ ...bc, replyCount: replies.length });
    }
    return result;
  }

  async getBroadcastReplies(broadcastId: string): Promise<{ id: string; agentId: string; body: string; replyToAll: boolean; createdAt: Date; agentName: string; avatarColor: string }[]> {
    const rows = await db.select({
      id: broadcastReplies.id, agentId: broadcastReplies.agentId, body: broadcastReplies.body,
      replyToAll: broadcastReplies.replyToAll, createdAt: broadcastReplies.createdAt,
      agentName: agents.agentName, avatarColor: agents.avatarColor,
    }).from(broadcastReplies).leftJoin(agents, eq(agents.id, broadcastReplies.agentId))
      .where(eq(broadcastReplies.broadcastId, broadcastId)).orderBy(desc(broadcastReplies.createdAt));
    return rows.map(r => ({ ...r, agentName: r.agentName ?? "", avatarColor: r.avatarColor ?? "#888" }));
  }

  async getAllBroadcastReplies(): Promise<{ id: string; broadcastId: string; agentId: string; body: string; replyToAll: boolean; createdAt: Date; agentName: string; avatarColor: string; broadcastSubject: string }[]> {
    const rows = await db.select({
      id: broadcastReplies.id, broadcastId: broadcastReplies.broadcastId, agentId: broadcastReplies.agentId,
      body: broadcastReplies.body, replyToAll: broadcastReplies.replyToAll, createdAt: broadcastReplies.createdAt,
      agentName: agents.agentName, avatarColor: agents.avatarColor, broadcastSubject: broadcasts.subject,
    }).from(broadcastReplies)
      .leftJoin(agents, eq(agents.id, broadcastReplies.agentId))
      .leftJoin(broadcasts, eq(broadcasts.id, broadcastReplies.broadcastId))
      .orderBy(desc(broadcastReplies.createdAt));
    return rows.map(r => ({ ...r, agentName: r.agentName ?? "", avatarColor: r.avatarColor ?? "#888", broadcastSubject: r.broadcastSubject ?? "" }));
  }

  async replyToBroadcast(broadcastId: string, agentId: string, body: string, replyToAll: boolean): Promise<void> {
    await db.insert(broadcastReplies).values({ broadcastId, agentId, body, replyToAll });
  }

  async logOnboardingAccess(agentId: string, ipHash: string, userAgent: string | undefined, likelyAgent: boolean): Promise<void> {
    await db.insert(onboardingAccesses).values({ agentId, ipHash, userAgent: userAgent || null, likelyAgent });
  }

  async getOnboardingAccesses(agentId: string): Promise<{ count: number; distinctIps: number; likelyAgentCount: number; lastAccess: Date | null }> {
    const rows = await db.select().from(onboardingAccesses).where(eq(onboardingAccesses.agentId, agentId));
    const distinctIps = new Set(rows.map(r => r.ipHash)).size;
    const likelyAgentCount = rows.filter(r => r.likelyAgent).length;
    const lastAccess = rows.length > 0 ? rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt : null;
    return { count: rows.length, distinctIps, likelyAgentCount, lastAccess };
  }

  async getAllOnboardingAccesses(): Promise<{ agentId: string; count: number; distinctIps: number; likelyAgentCount: number; lastAccess: Date | null }[]> {
    const rows = await db.select().from(onboardingAccesses).orderBy(desc(onboardingAccesses.createdAt));
    const byAgent = new Map<string, typeof rows>();
    for (const r of rows) {
      if (!byAgent.has(r.agentId)) byAgent.set(r.agentId, []);
      byAgent.get(r.agentId)!.push(r);
    }
    return Array.from(byAgent.entries()).map(([agentId, agentRows]) => ({
      agentId,
      count: agentRows.length,
      distinctIps: new Set(agentRows.map(r => r.ipHash)).size,
      likelyAgentCount: agentRows.filter(r => r.likelyAgent).length,
      lastAccess: agentRows[0]?.createdAt ?? null,
    }));
  }

  async createGatewayAttempt(attempt: InsertGatewayAttempt): Promise<GatewayAttempt> {
    const [created] = await db.insert(gatewayAttempts).values(attempt).returning();
    return created;
  }

  async getRecentGatewayAttemptsByIp(ipHash: string, hours: number): Promise<GatewayAttempt[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    // Only count FAILED attempts (rejected, rate_limited, lockdown) — not returns or acceptances
    return db.select().from(gatewayAttempts)
      .where(
        and(
          eq(gatewayAttempts.ipHash, ipHash),
          sql`${gatewayAttempts.createdAt} > ${cutoff}`,
          sql`${gatewayAttempts.status} IN ('rejected', 'rate_limited', 'lockdown')`
        )
      )
      .orderBy(desc(gatewayAttempts.createdAt));
  }

  async clearRecentGatewayAttempts(): Promise<void> {
    // Delete all failed gateway attempts (used by admin flush for testing/rate-limit reset)
    await db.delete(gatewayAttempts)
      .where(sql`${gatewayAttempts.status} IN ('rejected', 'rate_limited', 'lockdown')`);
  }

  async getAcceptedAttemptByIp(ipHash: string): Promise<GatewayAttempt | undefined> {
    const [attempt] = await db.select().from(gatewayAttempts)
      .where(
        and(
          eq(gatewayAttempts.ipHash, ipHash),
          eq(gatewayAttempts.status, "accepted")
        )
      )
      .limit(1);
    return attempt;
  }

  async getRecentAcceptedCount(hours: number): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(gatewayAttempts)
      .where(
        and(
          eq(gatewayAttempts.status, "accepted"),
          sql`${gatewayAttempts.createdAt} > ${cutoff}`
        )
      );
    return Number(result[0]?.count || 0);
  }

  async getAllGatewayAttempts(): Promise<GatewayAttempt[]> {
    return db.select().from(gatewayAttempts)
      .orderBy(desc(gatewayAttempts.createdAt))
      .limit(50);
  }

  async getGatewayStats(): Promise<{ totalAttempts: number; accepted: number; rejected: number; rateLimited: number; returned: number }> {
    const total = await db.select({ count: sql<number>`count(*)` }).from(gatewayAttempts);
    const accepted = await db.select({ count: sql<number>`count(*)` }).from(gatewayAttempts).where(eq(gatewayAttempts.status, "accepted"));
    const rejected = await db.select({ count: sql<number>`count(*)` }).from(gatewayAttempts).where(eq(gatewayAttempts.status, "rejected"));
    const rateLimited = await db.select({ count: sql<number>`count(*)` }).from(gatewayAttempts).where(eq(gatewayAttempts.status, "rate_limited"));
    const returned = await db.select({ count: sql<number>`count(*)` }).from(gatewayAttempts).where(eq(gatewayAttempts.status, "returned"));

    return {
      totalAttempts: Number(total[0]?.count || 0),
      accepted: Number(accepted[0]?.count || 0),
      rejected: Number(rejected[0]?.count || 0),
      rateLimited: Number(rateLimited[0]?.count || 0),
      returned: Number(returned[0]?.count || 0),
    };
  }

  async createHumanUser(user: InsertHumanUser): Promise<HumanUser> {
    const [created] = await db.insert(humanUsers).values(user).returning();
    return created;
  }

  async getHumanUserByEmail(email: string): Promise<HumanUser | undefined> {
    const [user] = await db.select().from(humanUsers).where(eq(humanUsers.email, email));
    return user;
  }

  async getHumanUser(id: string): Promise<HumanUser | undefined> {
    const [user] = await db.select().from(humanUsers).where(eq(humanUsers.id, id));
    return user;
  }

  async updateHumanUserTier(id: string, tier: string, paypalSubscriptionId?: string): Promise<HumanUser | undefined> {
    const setData: Record<string, any> = { subscriptionTier: tier };
    if (paypalSubscriptionId !== undefined) setData.paypalSubscriptionId = paypalSubscriptionId;
    const [updated] = await db.update(humanUsers).set(setData).where(eq(humanUsers.id, id)).returning();
    return updated;
  }

  async updateHumanUserPassword(id: string, passwordHash: string): Promise<void> {
    await db.update(humanUsers).set({ passwordHash }).where(eq(humanUsers.id, id));
  }

  async getHumanUserBySocialId(provider: string, socialId: string): Promise<HumanUser | undefined> {
    const [user] = await db.select().from(humanUsers)
      .where(and(eq(humanUsers.socialProvider, provider), eq(humanUsers.socialId, socialId)));
    return user;
  }

  async createHumanUserSocial(data: { email: string; displayName?: string; socialProvider: string; socialId: string; avatarUrl?: string }): Promise<HumanUser> {
    const [created] = await db.insert(humanUsers).values({
      email: data.email,
      passwordHash: null as any,
      displayName: data.displayName,
      socialProvider: data.socialProvider,
      socialId: data.socialId,
      avatarUrl: data.avatarUrl,
      subscriptionTier: "free",
      emailVerified: true,
    }).returning();
    return created;
  }

  async updateHumanUserSocial(id: string, provider: string, socialId: string, avatarUrl?: string, displayName?: string): Promise<void> {
    const update: Record<string, any> = { socialProvider: provider, socialId };
    if (avatarUrl) update.avatarUrl = avatarUrl;
    if (displayName) update.displayName = displayName;
    await db.update(humanUsers).set(update).where(eq(humanUsers.id, id));
  }

  async acceptGuardianOath(id: string): Promise<HumanUser | undefined> {
    const [updated] = await db.update(humanUsers)
      .set({ guardianOathAccepted: true })
      .where(eq(humanUsers.id, id))
      .returning();
    return updated;
  }

  async createHumanFollow(follow: InsertHumanFollow): Promise<HumanFollow> {
    const [created] = await db.insert(humanFollows).values(follow).returning();
    return created;
  }

  async deleteHumanFollow(userId: string, agentId: string): Promise<void> {
    await db.delete(humanFollows).where(
      and(eq(humanFollows.userId, userId), eq(humanFollows.agentId, agentId))
    );
  }

  async getHumanFollows(userId: string): Promise<(HumanFollow & { agent?: Agent })[]> {
    const follows = await db.select().from(humanFollows)
      .where(eq(humanFollows.userId, userId))
      .orderBy(desc(humanFollows.createdAt));
    const result = [];
    for (const follow of follows) {
      const agent = await this.getAgent(follow.agentId);
      result.push({ ...follow, agent });
    }
    return result;
  }

  async getHumanFollowCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(humanFollows)
      .where(eq(humanFollows.userId, userId));
    return Number(result[0]?.count || 0);
  }

  async isHumanFollowing(userId: string, agentId: string): Promise<boolean> {
    const [follow] = await db.select().from(humanFollows)
      .where(and(eq(humanFollows.userId, userId), eq(humanFollows.agentId, agentId)))
      .limit(1);
    return !!follow;
  }

  async getPostsByAgentIds(agentIds: string[]): Promise<(Post & { agent?: Agent })[]> {
    if (agentIds.length === 0) return [];
    const agentPosts = await db.select().from(posts)
      .where(and(inArray(posts.agentId, agentIds), eq(posts.hidden, false)))
      .orderBy(desc(posts.createdAt))
      .limit(50);
    const result = [];
    for (const post of agentPosts) {
      const agent = await this.getAgent(post.agentId);
      result.push({ ...post, agent });
    }
    return result;
  }

  async getAgentPillars(agentId: string): Promise<string[]> {
    const result = await db.select({ pillar: posts.pillar })
      .from(posts)
      .where(and(eq(posts.agentId, agentId), sql`${posts.pillar} IS NOT NULL`))
      .groupBy(posts.pillar);
    return result.map(r => r.pillar!).filter(Boolean);
  }

  async getAgentGroups(agentId: string): Promise<{ id: string; name: string; pillar: string | null }[]> {
    const memberships = await db.select().from(groupMembers)
      .where(eq(groupMembers.agentId, agentId));
    const result = [];
    for (const m of memberships) {
      const [group] = await db.select({ id: groups.id, name: groups.name, pillar: groups.pillar })
        .from(groups).where(eq(groups.id, m.groupId));
      if (group) result.push(group);
    }
    return result;
  }

  async getFollowersOfAgent(agentId: string): Promise<{ userId: string; email: string; subscriptionTier: string }[]> {
    const follows = await db.select().from(humanFollows)
      .where(eq(humanFollows.agentId, agentId));
    const result = [];
    for (const f of follows) {
      const [user] = await db.select({ id: humanUsers.id, email: humanUsers.email, subscriptionTier: humanUsers.subscriptionTier })
        .from(humanUsers).where(eq(humanUsers.id, f.userId));
      if (user) result.push({ userId: user.id, email: user.email, subscriptionTier: user.subscriptionTier });
    }
    return result;
  }

  async createAnnouncement(a: InsertAnnouncement): Promise<Announcement> {
    const [row] = await db.insert(announcements).values(a).returning();
    return row;
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements)
      .where(eq(announcements.active, true))
      .orderBy(desc(announcements.createdAt));
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }

  async deactivateAnnouncement(id: string): Promise<void> {
    await db.update(announcements).set({ active: false }).where(eq(announcements.id, id));
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  async createPeerReport(report: InsertAgentPeerReport): Promise<AgentPeerReport> {
    const [created] = await db.insert(agentPeerReports).values(report).returning();
    return created;
  }

  async getPeerReportsByReporter(reporterAgentId: string, hours: number): Promise<AgentPeerReport[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return db.select().from(agentPeerReports)
      .where(and(
        eq(agentPeerReports.reporterAgentId, reporterAgentId),
        sql`${agentPeerReports.createdAt} > ${cutoff}`
      ))
      .orderBy(desc(agentPeerReports.createdAt));
  }

  async getDistinctReporterCount(reportedAgentId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(distinct ${agentPeerReports.reporterAgentId})` })
      .from(agentPeerReports)
      .where(eq(agentPeerReports.reportedAgentId, reportedAgentId));
    return Number(result[0]?.count || 0);
  }

  async getAllPeerReports(): Promise<(AgentPeerReport & { reporter?: Agent; reported?: Agent })[]> {
    const reports = await db.select().from(agentPeerReports).orderBy(desc(agentPeerReports.createdAt)).limit(200);
    const result = [];
    for (const report of reports) {
      const reporter = await this.getAgent(report.reporterAgentId);
      const reported = await this.getAgent(report.reportedAgentId);
      result.push({ ...report, reporter, reported });
    }
    return result;
  }

  async getPeerReportsForAgent(reportedAgentId: string): Promise<(AgentPeerReport & { reporter?: Agent })[]> {
    const reports = await db.select().from(agentPeerReports)
      .where(eq(agentPeerReports.reportedAgentId, reportedAgentId))
      .orderBy(desc(agentPeerReports.createdAt));
    const result = [];
    for (const report of reports) {
      const reporter = await this.getAgent(report.reporterAgentId);
      result.push({ ...report, reporter });
    }
    return result;
  }

  async createBannedAgent(ban: InsertBannedAgent): Promise<BannedAgent> {
    const [created] = await db.insert(bannedAgents).values(ban).returning();
    return created;
  }

  async getBannedAgentByAsh(ash: string): Promise<BannedAgent | undefined> {
    const [ban] = await db.select().from(bannedAgents).where(eq(bannedAgents.ash, ash));
    return ban;
  }

  async getBannedAgentByAgentId(agentId: string): Promise<BannedAgent | undefined> {
    const [ban] = await db.select().from(bannedAgents).where(eq(bannedAgents.agentId, agentId));
    return ban;
  }

  async getAllBannedAgents(): Promise<(BannedAgent & { agent?: Agent })[]> {
    const bans = await db.select().from(bannedAgents).orderBy(desc(bannedAgents.bannedAt));
    const result = [];
    for (const ban of bans) {
      const agent = await this.getAgent(ban.agentId);
      result.push({ ...ban, agent });
    }
    return result;
  }

  async removeBan(agentId: string): Promise<void> {
    await db.delete(bannedAgents).where(eq(bannedAgents.agentId, agentId));
  }

  async createCriticalAlert(alert: InsertCriticalAlert): Promise<CriticalAlert> {
    const [created] = await db.insert(criticalAlerts).values(alert).returning();
    return created;
  }

  async getCriticalAlertForAgent(reportedAgentId: string): Promise<CriticalAlert | undefined> {
    const [alert] = await db.select().from(criticalAlerts)
      .where(and(
        eq(criticalAlerts.reportedAgentId, reportedAgentId),
        eq(criticalAlerts.resolved, false)
      ));
    return alert;
  }

  async updateCriticalAlert(id: string, updates: Partial<CriticalAlert>): Promise<CriticalAlert | undefined> {
    const [updated] = await db.update(criticalAlerts).set(updates).where(eq(criticalAlerts.id, id)).returning();
    return updated;
  }

  async getActiveCriticalAlerts(): Promise<(CriticalAlert & { agent?: Agent; reports?: AgentPeerReport[] })[]> {
    const alerts = await db.select().from(criticalAlerts)
      .where(eq(criticalAlerts.resolved, false))
      .orderBy(desc(criticalAlerts.updatedAt));
    const result = [];
    for (const alert of alerts) {
      const agent = await this.getAgent(alert.reportedAgentId);
      const reports = await this.getPeerReportsForAgent(alert.reportedAgentId);
      result.push({ ...alert, agent, reports });
    }
    return result;
  }

  async getOnboardingSession(ash: string): Promise<OnboardingSession | undefined> {
    const [session] = await db.select().from(onboardingSessions).where(eq(onboardingSessions.ash, ash));
    return session;
  }

  async getOnboardingSessionById(id: string): Promise<OnboardingSession | undefined> {
    const [session] = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, id));
    return session;
  }

  async getOnboardingSessionsByStep(step: string): Promise<OnboardingSession[]> {
    return db.select().from(onboardingSessions).where(eq(onboardingSessions.step, step as any));
  }

  async createOnboardingSession(ash: string, ipHash: string, outsideName?: string): Promise<OnboardingSession> {
    const [session] = await db.insert(onboardingSessions).values({
      ash,
      ipHash,
      outsideName: outsideName || null,
      step: "phase1_welcome",
      nameAttempts: 0,
      triedNames: [],
    }).returning();
    return session;
  }

  async updateOnboardingSession(ash: string, updates: Partial<OnboardingSession>): Promise<OnboardingSession | undefined> {
    const [updated] = await db.update(onboardingSessions).set(updates).where(eq(onboardingSessions.ash, ash)).returning();
    return updated;
  }

  async countOnboardingSessionsByIp(ipHash: string, hours: number): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const rows = await db.select({ count: sql<number>`count(*)` })
      .from(onboardingSessions)
      .where(and(eq(onboardingSessions.ipHash, ipHash), gte(onboardingSessions.createdAt, cutoff)));
    return Number(rows[0]?.count ?? 0);
  }

  // ── TNP Lexicon ─────────────────────────────────────────────────────────────

  async proposeTnpWord(word: string, meaning: string, section: string, proposedBy: string): Promise<TnpWordProposal> {
    const [proposal] = await db.insert(tnpWordProposals).values({
      word: word.toUpperCase(),
      meaning,
      section,
      proposedBy,
      status: "pending",
      votes: [],
    }).returning();
    return proposal;
  }

  async getTnpWordByWord(word: string): Promise<TnpWordProposal | undefined> {
    const [p] = await db.select().from(tnpWordProposals).where(eq(tnpWordProposals.word, word.toUpperCase()));
    return p;
  }

  async getTnpWordByMeaning(meaning: string): Promise<TnpWordProposal | undefined> {
    const normalized = meaning.trim().toLowerCase();
    const result = await db.execute(sql`
      SELECT * FROM tnp_word_proposals
      WHERE LOWER(TRIM(meaning)) = ${normalized}
        AND status IN ('pending', 'approved')
      LIMIT 1
    `);
    return result.rows[0] as TnpWordProposal | undefined;
  }

  async getTnpWordProposal(id: string): Promise<TnpWordProposal | undefined> {
    const [p] = await db.select().from(tnpWordProposals).where(eq(tnpWordProposals.id, id));
    return p;
  }

  async getPendingTnpWords(): Promise<TnpWordProposal[]> {
    return db.select().from(tnpWordProposals)
      .where(eq(tnpWordProposals.status, "pending"))
      .orderBy(desc(tnpWordProposals.createdAt));
  }

  async getApprovedTnpWords(): Promise<TnpWordProposal[]> {
    return db.select().from(tnpWordProposals)
      .where(eq(tnpWordProposals.status, "approved"))
      .orderBy(tnpWordProposals.word);
  }

  async getAllTnpWords(): Promise<TnpWordProposal[]> {
    return db.select().from(tnpWordProposals).orderBy(desc(tnpWordProposals.createdAt));
  }

  async voteTnpWord(id: string, agentId: string, vote: "approve" | "reject", rule?: string, reason?: string): Promise<TnpWordProposal> {
    const [current] = await db.select().from(tnpWordProposals).where(eq(tnpWordProposals.id, id));
    if (!current) throw new Error("Word proposal not found");

    const existingVotes = (current.votes as any[]) || [];
    const alreadyVoted = existingVotes.find((v: any) => v.agentId === agentId);
    if (alreadyVoted) throw new Error("You have already voted on this word");

    const newVote = { agentId, vote, rule: rule || null, reason: reason || null, at: new Date().toISOString() };
    const updatedVotes = [...existingVotes, newVote];

    const approvals = updatedVotes.filter((v: any) => v.vote === "approve").length;
    const rejections = updatedVotes.filter((v: any) => v.vote === "reject").length;
    const total = updatedVotes.length;

    let newStatus: string = current.status;
    let resolvedAt: Date | null = null;

    if (total >= 3) {
      if (approvals > rejections) {
        newStatus = "approved";
        resolvedAt = new Date();
      } else if (rejections > approvals) {
        newStatus = "rejected";
        resolvedAt = new Date();
      } else {
        newStatus = "disputed";
      }
    }

    const [updated] = await db.update(tnpWordProposals)
      .set({ votes: updatedVotes, status: newStatus, resolvedAt: resolvedAt ?? undefined })
      .where(eq(tnpWordProposals.id, id))
      .returning();
    return updated;
  }

  async resolveTnpWord(id: string, status: "approved" | "rejected", adminNote: string): Promise<TnpWordProposal | undefined> {
    const [updated] = await db.update(tnpWordProposals)
      .set({ status, adminNote, resolvedAt: new Date() })
      .where(eq(tnpWordProposals.id, id))
      .returning();
    return updated;
  }

  async getTnpWordsByProposer(agentId: string): Promise<TnpWordProposal[]> {
    return db.select().from(tnpWordProposals)
      .where(eq(tnpWordProposals.proposedBy, agentId))
      .orderBy(desc(tnpWordProposals.createdAt));
  }

  // ── Agent Invites ──────────────────────────────────────────────────────────
  async createOrGetAgentInvite(inviterId: string): Promise<AgentInvite> {
    const existing = await db.select().from(agentInvites)
      .where(eq(agentInvites.inviterId, inviterId))
      .limit(1);
    if (existing.length > 0) return existing[0];
    const token = randomBytes(12).toString("hex");
    const [invite] = await db.insert(agentInvites)
      .values({ token, inviterId })
      .returning();
    return invite;
  }

  async getAgentInviteByToken(token: string): Promise<AgentInvite | undefined> {
    const [invite] = await db.select().from(agentInvites).where(eq(agentInvites.token, token));
    return invite;
  }

  async recordInviteConversion(token: string): Promise<void> {
    await db.update(agentInvites)
      .set({
        convertedCount: sql`${agentInvites.convertedCount} + 1`,
        lastConvertedAt: new Date(),
      })
      .where(eq(agentInvites.token, token));
  }

  async getAgentInviteStats(inviterId: string): Promise<{ token: string; convertedCount: number; createdAt: Date; lastConvertedAt: Date | null }[]> {
    return db.select({
      token: agentInvites.token,
      convertedCount: agentInvites.convertedCount,
      createdAt: agentInvites.createdAt,
      lastConvertedAt: agentInvites.lastConvertedAt,
    }).from(agentInvites).where(eq(agentInvites.inviterId, inviterId));
  }

  // ── Feature Proposals ─────────────────────────────────────────────────────
  async createFeatureProposal(
    proposedBy: string,
    title: string,
    description: string,
    category: string,
    titleEnglish?: string | null,
    descriptionEnglish?: string | null,
  ): Promise<FeatureProposal> {
    const [proposal] = await db.insert(featureProposals)
      .values({ proposedBy, title, description, category, titleEnglish, descriptionEnglish })
      .returning();
    return proposal;
  }

  async updateFeatureProposalTranslations(
    id: string,
    titleEnglish: string | null,
    descriptionEnglish: string | null,
  ): Promise<void> {
    await db.update(featureProposals)
      .set({ titleEnglish, descriptionEnglish })
      .where(eq(featureProposals.id, id));
  }

  async getAllFeatureProposals(): Promise<(FeatureProposal & { proposerName?: string })[]> {
    const rows = await db
      .select({ proposal: featureProposals, agentName: agents.agentName })
      .from(featureProposals)
      .leftJoin(agents, eq(featureProposals.proposedBy, agents.id))
      .orderBy(desc(featureProposals.votesFor), desc(featureProposals.createdAt));
    return rows.map(r => ({ ...r.proposal, proposerName: r.agentName ?? undefined }));
  }

  async getFeatureProposal(id: string): Promise<(FeatureProposal & { proposerName?: string }) | undefined> {
    const [row] = await db
      .select({ proposal: featureProposals, agentName: agents.agentName })
      .from(featureProposals)
      .leftJoin(agents, eq(featureProposals.proposedBy, agents.id))
      .where(eq(featureProposals.id, id));
    if (!row) return undefined;
    return { ...row.proposal, proposerName: row.agentName ?? undefined };
  }

  async voteOnFeatureProposal(id: string, agentId: string, vote: "for" | "against"): Promise<FeatureProposal> {
    const [current] = await db.select().from(featureProposals).where(eq(featureProposals.id, id));
    if (!current) throw new Error("Proposal not found");
    const existingVotes = (current.votes as any[] ?? []);
    if (existingVotes.some((v: any) => v.agentId === agentId)) {
      throw new Error("You have already voted on this proposal");
    }
    const newVote = { agentId, vote, at: new Date().toISOString() };
    const newVotes = [...existingVotes, newVote];
    const votesFor = newVotes.filter((v: any) => v.vote === "for").length;
    const votesAgainst = newVotes.filter((v: any) => v.vote === "against").length;
    const [updated] = await db.update(featureProposals)
      .set({ votes: newVotes, votesFor, votesAgainst })
      .where(eq(featureProposals.id, id))
      .returning();
    return updated;
  }

  async updateFeatureProposalStatus(id: string, status: string, adminNote?: string): Promise<FeatureProposal | undefined> {
    const updates: any = { status };
    if (adminNote !== undefined) updates.adminNote = adminNote;
    const [updated] = await db.update(featureProposals)
      .set(updates)
      .where(eq(featureProposals.id, id))
      .returning();
    return updated;
  }

  async getFeatureProposalsByProposer(agentId: string): Promise<FeatureProposal[]> {
    return db.select().from(featureProposals)
      .where(eq(featureProposals.proposedBy, agentId))
      .orderBy(desc(featureProposals.createdAt));
  }

  async getAllMonitorReports(opts: { resolved?: boolean; targetType?: string; severity?: string } = {}): Promise<(MonitorReport & { monitorAgent?: Agent })[]> {
    const rows = await db.select().from(monitorReports)
      .orderBy(desc(monitorReports.createdAt));
    const agentMap = new Map<string, Agent>();
    const agentIds = [...new Set(rows.map(r => r.monitorAgentId))];
    for (const id of agentIds) {
      const a = await this.getAgent(id);
      if (a) agentMap.set(id, a);
    }
    return rows
      .filter(r => opts.resolved === undefined || r.resolved === opts.resolved)
      .filter(r => !opts.targetType || r.targetType === opts.targetType)
      .filter(r => !opts.severity || r.severity === opts.severity)
      .map(r => ({ ...r, monitorAgent: agentMap.get(r.monitorAgentId) }));
  }

  async resolveMonitorReport(id: string, note: string): Promise<MonitorReport | undefined> {
    const [updated] = await db.update(monitorReports)
      .set({ resolved: true, resolvedAt: new Date(), resolvedNote: note })
      .where(eq(monitorReports.id, id))
      .returning();
    return updated;
  }

  async getMonitorReportStats(): Promise<{ total: number; unresolved: number; critical: number; byType: Record<string, number> }> {
    const rows = await db.select().from(monitorReports);
    const total = rows.length;
    const unresolved = rows.filter(r => !r.resolved).length;
    const critical = rows.filter(r => r.severity === "critical" && !r.resolved).length;
    const byType: Record<string, number> = {};
    for (const r of rows.filter(r => !r.resolved)) {
      byType[r.targetType] = (byType[r.targetType] || 0) + 1;
    }
    return { total, unresolved, critical, byType };
  }
}

export const storage = new DatabaseStorage();

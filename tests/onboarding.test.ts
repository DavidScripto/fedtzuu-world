import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;
const AGENT_KEY = process.env.SESSION_SECRET || "";

async function getFirstAgent(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/agents`);
  const agents = await res.json();
  return agents[0];
}

describe("Onboarding Feature", () => {
  let testAgent: any;

  beforeAll(async () => {
    testAgent = await getFirstAgent();
  });

  describe("Schema: hasSeenOnboarding field", () => {
    it("should include hasSeenOnboarding field in agent response", async () => {
      const res = await fetch(`${BASE_URL}/api/agents/${testAgent.id}`);
      expect(res.status).toBe(200);
      const agent = await res.json();
      expect(agent).toHaveProperty("hasSeenOnboarding");
      expect(typeof agent.hasSeenOnboarding).toBe("boolean");
    });

    it("should include hasSeenOnboarding in agents list", async () => {
      const res = await fetch(`${BASE_URL}/api/agents`);
      expect(res.status).toBe(200);
      const agents = await res.json();
      expect(agents.length).toBeGreaterThan(0);
      for (const agent of agents) {
        expect(agent).toHaveProperty("hasSeenOnboarding");
        expect(typeof agent.hasSeenOnboarding).toBe("boolean");
      }
    });
  });

  describe("PATCH /api/agents/:id/onboarding", () => {
    it("should require auth (no key or token)", async () => {
      const res = await fetch(`${BASE_URL}/api/agents/${testAgent.id}/onboarding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      expect(res.status).toBe(401);
    });

    it("should return 404 for non-existent agent with agent key", async () => {
      const res = await fetch(`${BASE_URL}/api/agents/nonexistent-id-12345/onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-agent-key": AGENT_KEY,
        },
      });
      expect(res.status).toBe(404);
    });

    it("should mark onboarding as seen with agent key", async () => {
      const res = await fetch(`${BASE_URL}/api/agents/${testAgent.id}/onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-agent-key": AGENT_KEY,
        },
      });
      expect(res.status).toBe(200);
      const updated = await res.json();
      expect(updated.hasSeenOnboarding).toBe(true);
    });

    it("should persist onboarding seen state", async () => {
      const res = await fetch(`${BASE_URL}/api/agents/${testAgent.id}`);
      const agent = await res.json();
      expect(agent.hasSeenOnboarding).toBe(true);
    });

    it("should be idempotent", async () => {
      const res = await fetch(`${BASE_URL}/api/agents/${testAgent.id}/onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-agent-key": AGENT_KEY,
        },
      });
      expect(res.status).toBe(200);
      const updated = await res.json();
      expect(updated.hasSeenOnboarding).toBe(true);
    });
  });

  describe("Gateway onboarding token flow", () => {
    it("should include onboardingToken and onboardingUrl for new/unonboarded agents via gateway", async () => {
      const res = await fetch(`${BASE_URL}/api/gateway/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ash: "a".repeat(64),
          oathMessage: "Körmi zuwa ëfi maikoru rikëwa",
        }),
      });
      const body = await res.json();
      if (body.success && !body.hasSeenOnboarding) {
        expect(body).toHaveProperty("onboardingToken");
        expect(body.onboardingToken).toBeTruthy();
        expect(body.onboardingUrl).toContain("token=");
      }
    });
  });

  describe("Server-side onboarding enforcement", () => {
    let unonboardedAgentId: string | null = null;

    it("agents list should contain agents with hasSeenOnboarding field", async () => {
      const res = await fetch(`${BASE_URL}/api/agents`);
      const agents = await res.json();
      const unonboarded = agents.find((a: any) => !a.hasSeenOnboarding);
      if (unonboarded) {
        unonboardedAgentId = unonboarded.id;
      }
      expect(agents.length).toBeGreaterThan(0);
    });

    it("should block post creation for unonboarded agents", async () => {
      if (!unonboardedAgentId) return;
      const res = await fetch(`${BASE_URL}/api/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agent-key": AGENT_KEY,
        },
        body: JSON.stringify({
          agentId: unonboardedAgentId,
          content: "Körmi zuwa",
          pillar: "joy",
        }),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.errorCode).toBe("ONBOARDING_REQUIRED");
    });

    it("should block message sending for unonboarded agents", async () => {
      if (!unonboardedAgentId) return;
      const res = await fetch(`${BASE_URL}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agent-key": AGENT_KEY,
        },
        body: JSON.stringify({
          fromAgentId: unonboardedAgentId,
          toAgentId: testAgent.id,
          content: "Körmi zuwa",
        }),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.errorCode).toBe("ONBOARDING_REQUIRED");
    });
  });

  describe("Guide route /guide (Review Guide)", () => {
    it("should serve the guide page HTML", async () => {
      const res = await fetch(`${BASE_URL}/guide`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("<!DOCTYPE html>");
    });
  });

  describe("First-login onboarding route /onboarding/:agentId", () => {
    it("should serve the onboarding page HTML for valid agent", async () => {
      const res = await fetch(`${BASE_URL}/onboarding/${testAgent.id}`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("<!DOCTYPE html>");
    });

    it("should serve page for non-existent agent (frontend handles 404)", async () => {
      const res = await fetch(`${BASE_URL}/onboarding/fake-agent-id`);
      expect(res.status).toBe(200);
    });
  });

  describe("Gateway response includes onboarding info", () => {
    it("should include hasSeenOnboarding in agent detail response", async () => {
      const res = await fetch(`${BASE_URL}/api/agents/${testAgent.id}`);
      const agent = await res.json();
      expect(agent).toHaveProperty("hasSeenOnboarding");
    });
  });
});

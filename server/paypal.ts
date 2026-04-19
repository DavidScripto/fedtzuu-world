import type { Request, Response } from "express";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const paypalSdk = require("@paypal/paypal-server-sdk");

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID } = process.env;

interface PayPalClient {
  clientCredentialsAuthCredentials: { oAuthClientId: string; oAuthClientSecret: string };
}

let subscriptionsController: InstanceType<typeof paypalSdk.SubscriptionsController> | null = null;
let oAuthAuthorizationController: InstanceType<typeof paypalSdk.OAuthAuthorizationController> | null = null;

if (PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET) {
  const client = new paypalSdk.Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: PAYPAL_CLIENT_ID,
      oAuthClientSecret: PAYPAL_CLIENT_SECRET,
    },
    timeout: 0,
    environment:
      process.env.NODE_ENV === "production"
        ? paypalSdk.Environment.Production
        : paypalSdk.Environment.Sandbox,
    logging: {
      logLevel: process.env.NODE_ENV === "production" ? paypalSdk.LogLevel.Warn : paypalSdk.LogLevel.Info,
      logRequest: { logBody: process.env.NODE_ENV !== "production" },
      logResponse: { logHeaders: process.env.NODE_ENV !== "production" },
    },
  });
  subscriptionsController = new paypalSdk.SubscriptionsController(client);
  oAuthAuthorizationController = new paypalSdk.OAuthAuthorizationController(client);
} else {
  console.warn("PayPal credentials not configured. PayPal checkout will be unavailable.");
}

export function isPayPalConfigured(): boolean {
  return !!(subscriptionsController && oAuthAuthorizationController);
}

export async function getClientToken(): Promise<string> {
  if (!oAuthAuthorizationController || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal not configured");
  }
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");

  const { result } = await oAuthAuthorizationController.requestToken(
    { authorization: `Basic ${auth}` },
    { intent: "sdk_init", response_type: "client_token" },
  );

  return result.accessToken;
}

export async function verifyWebhookSignature(req: Request): Promise<boolean> {
  if (!PAYPAL_WEBHOOK_ID || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.warn("PayPal webhook ID not configured, rejecting webhook");
    return false;
  }

  const transmissionId = req.headers["paypal-transmission-id"] as string;
  const transmissionTime = req.headers["paypal-transmission-time"] as string;
  const certUrl = req.headers["paypal-cert-url"] as string;
  const authAlgo = req.headers["paypal-auth-algo"] as string;
  const transmissionSig = req.headers["paypal-transmission-sig"] as string;

  if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig || !authAlgo) {
    return false;
  }

  try {
    const baseUrl = process.env.NODE_ENV === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");

    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenRes.json() as { access_token: string };

    const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: req.body,
      }),
    });
    const verifyData = await verifyRes.json() as { verification_status: string };
    return verifyData.verification_status === "SUCCESS";
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return false;
  }
}

interface SubscriptionResult {
  subscriptionId?: string;
  approvalUrl?: string;
  error?: string;
}

export async function createSubscription(tier: string, userId: string): Promise<SubscriptionResult> {
  if (!subscriptionsController) {
    return { error: "PayPal not configured" };
  }

  const planId = tier === "observer"
    ? process.env.PAYPAL_OBSERVER_PLAN_ID
    : tier === "unlimited"
    ? process.env.PAYPAL_UNLIMITED_PLAN_ID
    : null;

  if (!planId) {
    return { error: `No PayPal plan ID configured for tier: ${tier}` };
  }

  try {
    const { body } = await subscriptionsController.createSubscription({
      body: {
        plan_id: planId,
        custom_id: userId,
        application_context: {
          return_url: `${process.env.APP_URL || "http://localhost:5000"}/pricing?subscription_success=true&tier=${tier}`,
          cancel_url: `${process.env.APP_URL || "http://localhost:5000"}/pricing?subscription_cancelled=true`,
        },
      },
    });

    const subscription = JSON.parse(String(body));
    const approvalLink = subscription.links?.find((l: { rel: string; href: string }) => l.rel === "approve");

    return {
      subscriptionId: subscription.id,
      approvalUrl: approvalLink?.href,
    };
  } catch (error) {
    console.error("Failed to create subscription:", error);
    return { error: "Failed to create PayPal subscription" };
  }
}

interface SubscriptionVerification {
  verified: boolean;
  status: string;
  planId?: string;
  customId?: string;
}

export async function verifySubscription(subscriptionId: string): Promise<SubscriptionVerification> {
  if (!subscriptionsController) {
    return { verified: false, status: "paypal_not_configured" };
  }
  try {
    const { body } = await subscriptionsController.getSubscription({ id: subscriptionId });
    const subscription = JSON.parse(String(body));
    const isActive = subscription.status === "ACTIVE" || subscription.status === "APPROVED";
    return {
      verified: isActive,
      status: subscription.status,
      planId: subscription.plan_id,
      customId: subscription.custom_id,
    };
  } catch (error) {
    console.error("Failed to verify subscription:", error);
    return { verified: false, status: "verification_failed" };
  }
}

export async function loadPaypalDefault(_req: Request, res: Response) {
  if (!oAuthAuthorizationController) {
    return res.status(503).json({ error: "PayPal not configured" });
  }
  const clientToken = await getClientToken();
  res.json({ clientToken });
}

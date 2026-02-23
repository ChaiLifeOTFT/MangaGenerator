import type { Express } from "express";
import type { Request, Response } from "express";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Credit tiers — what users can buy
const CREDIT_PACKAGES = {
  starter: { credits: 10, price_cents: 499, name: 'Starter Pack', description: '10 manga panels' },
  creator: { credits: 50, price_cents: 1999, name: 'Creator Pack', description: '50 manga panels' },
  studio: { credits: 200, price_cents: 6999, name: 'Studio Pack', description: '200 manga panels' },
} as const;

// Cost per generation type
const GENERATION_COSTS = {
  script: 0,        // Free — text generation is cheap
  image: 1,         // 1 credit per panel image
  illustrator: 0,   // Free — prompt refinement
  voice: 2,         // 2 credits per voice clip
} as const;

// In-memory credit ledger (production: move to DB)
const creditBalances = new Map<string, number>();
const FREE_CREDITS = 5; // Free credits for new users

function getCredits(userId: string): number {
  if (!creditBalances.has(userId)) {
    creditBalances.set(userId, FREE_CREDITS);
  }
  return creditBalances.get(userId)!;
}

function deductCredits(userId: string, amount: number): boolean {
  const balance = getCredits(userId);
  if (balance < amount) return false;
  creditBalances.set(userId, balance - amount);
  return true;
}

function addCredits(userId: string, amount: number): number {
  const balance = getCredits(userId);
  creditBalances.set(userId, balance + amount);
  return balance + amount;
}

let stripe: any = null;
if (STRIPE_SECRET_KEY) {
  try {
    const Stripe = require('stripe');
    stripe = new Stripe(STRIPE_SECRET_KEY);
    console.log('[payments] Stripe initialized');
  } catch (e) {
    console.warn('[payments] Stripe module not available');
  }
}

export function registerPaymentRoutes(app: Express) {
  // Credit balance
  app.get("/api/credits/balance", (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || 'anonymous';
    res.json({
      userId,
      credits: getCredits(userId),
      costs: GENERATION_COSTS,
    });
  });

  // Check if user can afford a generation
  app.get("/api/credits/check", (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || 'anonymous';
    const type = (req.query.type as string) || 'image';
    const cost = GENERATION_COSTS[type as keyof typeof GENERATION_COSTS] ?? 1;
    const balance = getCredits(userId);
    res.json({
      canAfford: balance >= cost,
      balance,
      cost,
      type,
    });
  });

  // Deduct credits (called by generation endpoints)
  app.post("/api/credits/deduct", (req: Request, res: Response) => {
    const { userId = 'anonymous', type = 'image', count = 1 } = req.body;
    const cost = (GENERATION_COSTS[type as keyof typeof GENERATION_COSTS] ?? 1) * count;
    const success = deductCredits(userId, cost);
    res.json({
      success,
      remaining: getCredits(userId),
      deducted: success ? cost : 0,
    });
  });

  // List available credit packages
  app.get("/api/payment/tiers", (_req: Request, res: Response) => {
    res.json({
      packages: Object.entries(CREDIT_PACKAGES).map(([id, pkg]) => ({
        id,
        ...pkg,
        price_display: `$${(pkg.price_cents / 100).toFixed(2)}`,
        per_credit: `$${(pkg.price_cents / 100 / pkg.credits).toFixed(2)}`,
      })),
      free_credits: FREE_CREDITS,
      costs: GENERATION_COSTS,
      stripe_available: !!stripe,
    });
  });

  // Create Stripe checkout session
  app.post("/api/payment/checkout", async (req: Request, res: Response) => {
    if (!stripe) {
      return res.status(503).json({
        error: 'Payments not configured',
        message: 'Set STRIPE_SECRET_KEY to enable payments',
      });
    }

    const { packageId, userId = 'anonymous' } = req.body;
    const pkg = CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES];
    if (!pkg) {
      return res.status(400).json({ error: `Unknown package: ${packageId}` });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: pkg.price_cents,
            product_data: {
              name: `MangaForge ${pkg.name}`,
              description: pkg.description,
            },
          },
          quantity: 1,
        }],
        metadata: {
          userId,
          packageId,
          credits: String(pkg.credits),
        },
        success_url: `${req.headers.origin || req.protocol + '://' + req.get('host')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || req.protocol + '://' + req.get('host')}/`,
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      console.error('[payments] Checkout error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // Stripe webhook
  app.post("/api/payment/webhook", async (req: Request, res: Response) => {
    if (!stripe) return res.sendStatus(503);

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        event = req.body;
      }
    } catch (err: any) {
      console.error('[payments] Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId || 'anonymous';
      const credits = parseInt(session.metadata?.credits || '0');

      if (credits > 0) {
        const newBalance = addCredits(userId, credits);
        console.log(`[payments] Added ${credits} credits to ${userId}, new balance: ${newBalance}`);
      }
    }

    res.json({ received: true });
  });

  // Health check for payment system
  app.get("/api/payment/status", (_req: Request, res: Response) => {
    res.json({
      stripe_available: !!stripe,
      packages: Object.keys(CREDIT_PACKAGES).length,
      free_credits: FREE_CREDITS,
    });
  });
}

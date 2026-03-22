/**
 * MangaForge — Health Check Endpoint
 * ====================================
 * Provides a rich, multi-dimensional health report for automatic server
 * status detection by DigiUs, load-balancers, uptime monitors, and devs.
 *
 * Endpoints:
 *   GET /health          — Full deep health report (JSON)
 *   GET /health/live     — Liveness probe  (200 = process alive)
 *   GET /health/ready    — Readiness probe (200 = ready to serve traffic)
 *   GET /health/startup  — Startup probe   (200 = fully initialised)
 */

import type { Express, Request, Response } from "express";
import os from "os";
import fs from "fs";
import path from "path";
import { db, pool } from "../db";

// ─── Types ────────────────────────────────────────────────────────────────────

type CheckStatus = "ok" | "degraded" | "error" | "unknown";

interface SubCheck {
  status: CheckStatus;
  message?: string;
  latencyMs?: number;
  detail?: Record<string, unknown>;
}

interface HealthReport {
  service: string;
  version: string;
  status: "healthy" | "degraded" | "unhealthy";
  port: number;
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  uptimeHuman: string;
  checks: {
    process:  SubCheck;
    memory:   SubCheck;
    disk:     SubCheck;
    database: SubCheck;
    storage:  SubCheck;
    aiEngines: SubCheck;
    gallery:  SubCheck;
  };
  meta: {
    nodeVersion: string;
    platform: string;
    arch: string;
    pid: number;
    hostname: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert seconds to a human-readable duration string. */
function humanUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

/** Safely read disk usage for a given path. */
function diskCheck(checkPath: string): SubCheck {
  try {
    const stats = fs.statfsSync(checkPath);
    const totalBytes  = stats.blocks  * stats.bsize;
    const freeBytes   = stats.bfree   * stats.bsize;
    const usedBytes   = totalBytes - freeBytes;
    const usedPct     = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

    const toMB = (b: number) => Math.round(b / 1024 / 1024);

    let status: CheckStatus = "ok";
    let message: string | undefined;

    if (usedPct >= 95) {
      status  = "error";
      message = `Disk critically full: ${usedPct.toFixed(1)}% used`;
    } else if (usedPct >= 85) {
      status  = "degraded";
      message = `Disk usage high: ${usedPct.toFixed(1)}% used`;
    }

    return {
      status,
      message,
      detail: {
        totalMB:  toMB(totalBytes),
        usedMB:   toMB(usedBytes),
        freeMB:   toMB(freeBytes),
        usedPct:  `${usedPct.toFixed(1)}%`,
        path:     checkPath,
      },
    };
  } catch (err) {
    return {
      status: "unknown",
      message: `Could not read disk stats: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Check memory pressure. */
function memoryCheck(): SubCheck {
  const mem  = process.memoryUsage();
  const free = os.freemem();
  const total = os.totalmem();
  const sysPct = ((total - free) / total) * 100;

  const toMB = (b: number) => Math.round(b / 1024 / 1024);

  let status: CheckStatus = "ok";
  let message: string | undefined;

  if (sysPct >= 95) {
    status  = "error";
    message = `System memory critically low: ${sysPct.toFixed(1)}% used`;
  } else if (sysPct >= 85) {
    status  = "degraded";
    message = `System memory pressure high: ${sysPct.toFixed(1)}% used`;
  }

  return {
    status,
    message,
    detail: {
      process: {
        heapUsedMB:  toMB(mem.heapUsed),
        heapTotalMB: toMB(mem.heapTotal),
        rssMB:       toMB(mem.rss),
        externalMB:  toMB(mem.external),
      },
      system: {
        totalMB:  toMB(total),
        freeMB:   toMB(free),
        usedPct:  `${sysPct.toFixed(1)}%`,
      },
    },
  };
}

/** Ping the database with a lightweight query. */
async function databaseCheck(): Promise<SubCheck> {
  if (!db || !pool) {
    return {
      status: "unknown",
      message: "No DATABASE_URL configured — running with in-memory storage",
      detail: { mode: "in-memory" },
    };
  }

  const t0 = Date.now();
  try {
    // Lightweight connectivity probe
    await pool.query("SELECT 1");
    const latencyMs = Date.now() - t0;

    let status: CheckStatus = "ok";
    let message: string | undefined;
    if (latencyMs > 500) {
      status  = "degraded";
      message = `DB latency high: ${latencyMs}ms`;
    }

    return {
      status,
      message,
      latencyMs,
      detail: { mode: "postgresql" },
    };
  } catch (err) {
    return {
      status: "error",
      message: `DB unreachable: ${err instanceof Error ? err.message : String(err)}`,
      latencyMs: Date.now() - t0,
      detail: { mode: "postgresql" },
    };
  }
}

/** Verify the storage layer is responding. */
async function storageCheck(): Promise<SubCheck> {
  try {
    const { storage } = await import("../storage");
    // A harmless read that exercises the storage interface
    const t0 = Date.now();
    await storage.listMangaProjects();
    const latencyMs = Date.now() - t0;

    return {
      status: "ok",
      latencyMs,
      detail: {
        backend: db ? "DatabaseStorage (PostgreSQL)" : "MemStorage (in-memory)",
      },
    };
  } catch (err) {
    return {
      status: "error",
      message: `Storage layer error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Check which AI engines are configured (key present). */
function aiEnginesCheck(): SubCheck {
  const engines: Record<string, boolean> = {
    openai_primary: !!process.env.OPENAI_API_KEY,
    openai_nin:     !!process.env.OPENAI_API_NIN,
    openai_syth:    !!process.env.OPENAI_API_SYTH,
    huggingface:    !!process.env.HF_API_KEY,
    perplexity:     !!process.env.PERPLEXITY_API_KEY,
    elevenlabs:     !!process.env.ELEVENLABS_API_KEY,
    stripe:         !!process.env.STRIPE_SECRET_KEY,
    mock:           true, // always available as fallback
  };

  const available = Object.values(engines).filter(Boolean).length;
  const total     = Object.keys(engines).length;

  // At least one real engine (not just mock) must be available
  const realEngines = Object.entries(engines)
    .filter(([k, v]) => k !== "mock" && v).length;

  let status: CheckStatus = "ok";
  let message: string | undefined;

  if (realEngines === 0) {
    status  = "degraded";
    message = "No real AI engines configured — mock fallback only";
  }

  return {
    status,
    message,
    detail: {
      configured: engines,
      availableCount: available,
      totalCount: total,
      realEnginesAvailable: realEngines,
    },
  };
}

/** Check the gallery (public assets directory). */
function galleryCheck(): SubCheck {
  const publicDir = path.resolve("client/public");
  try {
    const files = fs.readdirSync(publicDir);
    const cbzFiles = files.filter(f => f.endsWith(".cbz"));
    const pngFiles = files.filter(f => f.endsWith(".png") || f.endsWith(".jpg"));

    return {
      status: "ok",
      detail: {
        publicDir,
        cbzCount:   cbzFiles.length,
        imageCount: pngFiles.length,
        totalFiles: files.length,
        cbzFiles,
      },
    };
  } catch (err) {
    return {
      status: "degraded",
      message: `Gallery directory not accessible: ${err instanceof Error ? err.message : String(err)}`,
      detail: { publicDir },
    };
  }
}

/** Derive the overall service status from all sub-checks. */
function overallStatus(
  checks: HealthReport["checks"]
): HealthReport["status"] {
  const statuses = Object.values(checks).map(c => c.status);
  if (statuses.includes("error"))    return "unhealthy";
  if (statuses.includes("degraded")) return "degraded";
  return "healthy";
}

// ─── Route Registration ────────────────────────────────────────────────────────

export function registerHealthRoutes(app: Express): void {

  // ── Full deep health report ──────────────────────────────────────────────────
  app.get("/health", async (_req: Request, res: Response) => {
    const uptimeSeconds = process.uptime();
    const port          = parseInt(process.env.PORT || "5020", 10);

    // Run all checks (DB is async, rest are sync)
    const [dbCheck, stCheck] = await Promise.all([
      databaseCheck(),
      storageCheck(),
    ]);

    const checks: HealthReport["checks"] = {
      process:   { status: "ok", detail: { pid: process.pid } },
      memory:    memoryCheck(),
      disk:      diskCheck(path.resolve(".")),
      database:  dbCheck,
      storage:   stCheck,
      aiEngines: aiEnginesCheck(),
      gallery:   galleryCheck(),
    };

    const report: HealthReport = {
      service:       "MangaForge",
      version:       "1.0.0",
      status:        overallStatus(checks),
      port,
      environment:   process.env.NODE_ENV || "development",
      timestamp:     new Date().toISOString(),
      uptimeSeconds: Math.floor(uptimeSeconds),
      uptimeHuman:   humanUptime(uptimeSeconds),
      checks,
      meta: {
        nodeVersion: process.version,
        platform:    process.platform,
        arch:        process.arch,
        pid:         process.pid,
        hostname:    os.hostname(),
      },
    };

    // HTTP status mirrors service health
    const httpStatus =
      report.status === "healthy"   ? 200 :
      report.status === "degraded"  ? 200 :   // still serving, just warn
      /* unhealthy */                 503;

    res.status(httpStatus).json(report);
  });

  // ── Liveness probe — is the process alive? ───────────────────────────────────
  // Returns 200 as long as the Node process is running and the event loop is
  // not blocked. Used by systemd / Docker to decide whether to restart.
  app.get("/health/live", (_req: Request, res: Response) => {
    res.status(200).json({
      status:  "alive",
      service: "MangaForge",
      pid:     process.pid,
      uptime:  Math.floor(process.uptime()),
      ts:      new Date().toISOString(),
    });
  });

  // ── Readiness probe — is the service ready to handle requests? ───────────────
  // Returns 200 only when all critical subsystems are up. Used by load-balancers
  // to decide whether to route traffic here.
  app.get("/health/ready", async (_req: Request, res: Response) => {
    const [dbCheck, stCheck] = await Promise.all([
      databaseCheck(),
      storageCheck(),
    ]);

    const ready =
      stCheck.status !== "error" &&
      dbCheck.status !== "error";

    res.status(ready ? 200 : 503).json({
      ready,
      service:  "MangaForge",
      storage:  stCheck.status,
      database: dbCheck.status,
      ts:       new Date().toISOString(),
    });
  });

  // ── Startup probe — has the service finished initialising? ───────────────────
  // Lighter than /health/ready; just confirms the server bootstrapped correctly.
  app.get("/health/startup", (_req: Request, res: Response) => {
    // If we can respond, we've started successfully.
    res.status(200).json({
      started:  true,
      service:  "MangaForge",
      port:     parseInt(process.env.PORT || "5020", 10),
      uptime:   Math.floor(process.uptime()),
      ts:       new Date().toISOString(),
    });
  });

  console.log("[health] Health check routes registered: /health  /health/live  /health/ready  /health/startup");
}

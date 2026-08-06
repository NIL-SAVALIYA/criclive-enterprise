import prisma from "../config/db.js";

/**
 * Controller exposing SRE diagnostics, system metrics, and Prometheus-compatible metrics.
 */
export async function getSystemMetrics(req, res) {
  try {
    const memory = process.memoryUsage();
    const uptime = Math.floor(process.uptime());

    const [activeMatchesCount, totalTournamentsCount, totalPlayersCount] = await Promise.all([
      prisma.match.count({ where: { status: "LIVE" } }),
      prisma.tournament.count(),
      prisma.player.count()
    ]);

    const data = {
      system: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
        uptimeSeconds: uptime,
        pid: process.pid,
        memory: {
          rssMb: Math.round(memory.rss / 1024 / 1024),
          heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
          heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024)
        }
      },
      database: {
        status: "CONNECTED",
        activeMatches: activeMatchesCount,
        totalTournaments: totalTournamentsCount,
        totalPlayers: totalPlayersCount
      },
      sockets: {
        status: "ONLINE"
      }
    };

    return res.status(200).json({
      success: true,
      message: "System diagnostics retrieved successfully.",
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve system metrics.",
      error: error.message
    });
  }
}

/**
 * Exposes Prometheus-compatible text metrics endpoint (/metrics).
 */
export async function getPrometheusMetrics(req, res) {
  const memory = process.memoryUsage();
  const uptime = process.uptime();

  const metricsText = `
# HELP node_uptime_seconds Process uptime in seconds.
# TYPE node_uptime_seconds gauge
node_uptime_seconds ${uptime}

# HELP node_memory_heap_bytes Process heap memory usage in bytes.
# TYPE node_memory_heap_bytes gauge
node_memory_heap_bytes ${memory.heapUsed}

# HELP node_memory_rss_bytes Process RSS memory usage in bytes.
# TYPE node_memory_rss_bytes gauge
node_memory_rss_bytes ${memory.rss}
`.trim();

  res.setHeader("Content-Type", "text/plain; version=0.0.4");
  return res.status(200).send(metricsText);
}

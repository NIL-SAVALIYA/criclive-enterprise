const cacheStore = new Map();

/**
 * Simple in-memory Response Caching Middleware
 * @param {number} durationInSeconds - Cache duration in seconds
 */
export function cacheMiddleware(durationInSeconds = 30) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cachedResponse = cacheStore.get(key);

    if (cachedResponse && Date.now() < cachedResponse.expiry) {
      return res.status(200).json(cachedResponse.body);
    }

    // Override res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        cacheStore.set(key, {
          body,
          expiry: Date.now() + durationInSeconds * 1000
        });
      }
      return originalJson(body);
    };

    next();
  };
}

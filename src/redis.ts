import Redis from "ioredis";
import { config } from "./config";

function normalizeRedisUrl(raw: string): string {
	const trimmed = raw.trim();
	if (trimmed.startsWith("redis-cli")) {
		const match = trimmed.match(/(rediss?:\/\/\S+)/i);
		if (match?.[1]) {
			return match[1];
		}
	}
	return trimmed;
}

const url = config.redisUrl ? normalizeRedisUrl(config.redisUrl) : "";

export const redis = url
	? new Redis(url, {
			maxRetriesPerRequest: 1,
			lazyConnect: true,
			enableReadyCheck: true,
			tls: url.startsWith("rediss://") ? {} : undefined,
		})
	: null;

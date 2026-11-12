import mongoose from "mongoose";
import dns from "dns";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);
const resolveSrv = promisify(dns.resolveSrv);
const resolveTxt = promisify(dns.resolveTxt);

let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function fallbackResolveSrv(hostname: string): Promise<string[]> {
  try {
    const records = await resolveSrv(hostname);
    return records.map(r => `${r.name}:${r.port}`);
  } catch (err) {
    console.warn(`[MongoDB] Node DNS SRV failed. Falling back to nslookup...`);
    const { stdout } = await execAsync(`nslookup -type=SRV ${hostname}`);
    const hosts: string[] = [];
    const lines = stdout.split('\n');
    let currentPort = 27017;
    for (const line of lines) {
      if (line.includes("port")) {
        const match = line.match(/port\s*=\s*(\d+)/);
        if (match) currentPort = parseInt(match[1]);
      }
      if (line.includes("svr hostname")) {
        const match = line.match(/svr hostname\s*=\s*([^\s]+)/);
        if (match) hosts.push(`${match[1]}:${currentPort}`);
      }
    }
    if (hosts.length === 0) throw new Error("No SRV hosts found via nslookup");
    return hosts;
  }
}

async function fallbackResolveTxt(hostname: string): Promise<string> {
  try {
    const records = await resolveTxt(hostname);
    return records.flat().join('');
  } catch (err) {
    console.warn(`[MongoDB] Node DNS TXT failed. Falling back to nslookup...`);
    const { stdout } = await execAsync(`nslookup -type=TXT ${hostname}`);
    const match = stdout.match(/"([^"]+)"/);
    if (match) return match[1];
    throw new Error("No TXT record found via nslookup");
  }
}

async function getFallbackUri(uri: string): Promise<string> {
  const match = uri.match(/^mongodb\+srv:\/\/(.+?:.+?@)([^/]+)(.*)$/);
  if (!match) return uri;

  const [, credentials, hostname, rest] = match;
  const srvHost = `_mongodb._tcp.${hostname}`;
  
  const shardHosts = await fallbackResolveSrv(srvHost);
  const txtOptions = await fallbackResolveTxt(srvHost);
  
  const queryPrefix = rest.includes("?") ? "&" : "?";
  const options = `${rest.replace(/^\/+/, '')}${queryPrefix}ssl=true&${txtOptions}`;
  
  return `mongodb://${credentials}${shardHosts.join(',')}/${options}`;
}

/**
 * Safely resolves the target MongoDB database name based on strict precedence:
 *
 * Precedence:
 * 1. Explicit MONGODB_DB or MONGODB_DATABASE override.
 * 2. Explicit database path in MONGODB_URI.
 * 3. VERCEL_ENV fallback (preview => nexus_recruit_preview, production => nexus_recruit).
 * 4. Safe local development fallback (LOCAL_MONGODB_DB if defined, otherwise nexus_recruit_dev).
 *
 * Security:
 * - Local development is prevented from connecting to the production database ("nexus_recruit")
 *   unless ALLOW_PRODUCTION_DB=true is explicitly set.
 * - Credentials and connection strings are never logged.
 */
export function resolveDatabaseName(
  uri: string,
  env: Partial<NodeJS.ProcessEnv> = process.env
): string {
  // 1. Explicit environment variable override (Highest precedence)
  const explicitDb = env.MONGODB_DB?.trim() || env.MONGODB_DATABASE?.trim();
  if (explicitDb) {
    return explicitDb;
  }

  // 2. Explicit database path in MONGODB_URI
  try {
    const parsed = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "http://"));
    const pathDb = parsed.pathname.replace(/^\//, "").split("/")[0].trim();
    if (pathDb) {
      return pathDb;
    }
  } catch {
    const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/);
    if (match && match[1]?.trim()) {
      return match[1].trim();
    }
  }

  // 3. VERCEL_ENV deployment environment isolation
  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv === "preview") {
    return "nexus_recruit_preview";
  }
  if (vercelEnv === "production") {
    return "nexus_recruit";
  }

  // 4. Safe local development fallback (default: nexus_recruit_dev)
  const localDb = env.LOCAL_MONGODB_DB?.trim();
  if (localDb) {
    return localDb;
  }

  return "nexus_recruit_dev";
}

/**
 * Validates that local development cannot silently connect to the production
 * database ("nexus_recruit") without explicit opt-in (ALLOW_PRODUCTION_DB=true).
 */
export function validateDatabaseAccess(
  dbName: string,
  env: Partial<NodeJS.ProcessEnv> = process.env
): void {
  const isVercelProduction = env.VERCEL_ENV?.trim().toLowerCase() === "production";
  if (dbName === "nexus_recruit" && !isVercelProduction) {
    const allowed = env.ALLOW_PRODUCTION_DB?.trim().toLowerCase() === "true";
    if (!allowed) {
      throw new Error(
        `[MongoDB] Protection Block: Local development environment is attempting to connect to production database "${dbName}". Explicit opt-in ALLOW_PRODUCTION_DB=true is required.`
      );
    }
  }
}

async function connectToDatabase(retries = 3) {
  if (cached.conn) {
    return cached.conn;
  }

  const rawUri = process.env.MONGODB_URI || "";
  if (!rawUri) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
  }

  const dbName = resolveDatabaseName(rawUri, process.env);
  if (!dbName) {
    throw new Error(
      "[MongoDB] Fatal: Target database could not be determined. Set MONGODB_DB or specify an explicit database in MONGODB_URI."
    );
  }

  // Enforce local development protection against accidental production connection
  validateDatabaseAccess(dbName, process.env);

  let attempt = 0;
  let activeUri = rawUri;

  while (attempt < retries) {
    try {
      console.log(`[MongoDB] Connection attempt ${attempt + 1}/${retries} to database: "${dbName}"...`);
      const opts = {
        bufferCommands: false,
        dbName,
        serverSelectionTimeoutMS: 5000,
        family: 4
      };

      if (!cached.promise) {
        cached.promise = mongoose.connect(activeUri, opts).then((mongoose) => {
          console.log("[MongoDB] Successfully connected!");
          return mongoose;
        });
      }

      cached.conn = await cached.promise;
      return cached.conn;

    } catch (error: any) {
      console.error(`[MongoDB] Attempt ${attempt + 1} failed: ${error.message}`);
      cached.promise = null;

      if (attempt === 0 && (error.message.includes("querySrv") || error.message.includes("timeout") || error.message.includes("ENOTFOUND"))) {
        console.log("[MongoDB] SRV/Timeout failure detected. Attempting to construct fallback standard URI...");
        try {
          activeUri = await getFallbackUri(rawUri);
          console.log(`[MongoDB] Fallback URI constructed successfully.`);
        } catch (fallbackError: any) {
          console.error(`[MongoDB] Failed to construct fallback URI: ${fallbackError.message}`);
        }
      }
      
      attempt++;
      if (attempt >= retries) {
        throw error;
      }
      await new Promise(res => setTimeout(res, 2000));
    }
  }
}

export default connectToDatabase;

import mongoose from "mongoose";
import dns from "dns";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);
const resolveSrv = promisify(dns.resolveSrv);
const resolveTxt = promisify(dns.resolveTxt);

const rawUri = process.env.MONGODB_URI || "";
if (!rawUri) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

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

async function connectToDatabase(retries = 3) {
  if (cached.conn) {
    return cached.conn;
  }

  let attempt = 0;
  let activeUri = rawUri;

  while (attempt < retries) {
    try {
      console.log(`[MongoDB] Connection attempt ${attempt + 1}/${retries}...`);
      const opts = {
        bufferCommands: false,
        dbName: "nexus_recruit",
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

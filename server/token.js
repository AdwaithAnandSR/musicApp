// test-terabox2.js
// Tries multiple endpoints to find one that works from your server IP
// Run: node test-terabox2.js

import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const {
  TERABOX_NDUS,
  TERABOX_BROWSER_ID,
  TERABOX_CSRF_TOKEN,
  TERABOX_JS_TOKEN,
  TERABOX_APP_ID = "250528",
} = process.env;

function cookieHeader() {
  const parts = [];
  if (TERABOX_NDUS)       parts.push(`ndus=${TERABOX_NDUS}`);
  if (TERABOX_BROWSER_ID) parts.push(`browserid=${TERABOX_BROWSER_ID}`);
  if (TERABOX_CSRF_TOKEN) parts.push(`csrfToken=${TERABOX_CSRF_TOKEN}`);
  return parts.join("; ");
}

// Multiple base URLs to try — TeraBox has regional CDN endpoints
const ENDPOINTS = [
  "https://www.terabox.com",
  "https://c-jp.terabox.com",
  "https://c-us.terabox.com",
  "https://c-ph.terabox.com",
  "https://pc.terabox.com",
];

async function tryEndpoint(base) {
  const url = `${base}/api/quota?checkexpire=1&checkfree=1&app_id=${TERABOX_APP_ID}&jsToken=${TERABOX_JS_TOKEN}`;
  try {
    const res = await fetch(url, {
      headers: {
        Cookie: cookieHeader(),
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
        Referer: `${base}/main`,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
      },
      timeout: 8000,
    });

    const text = await res.text();

    // Try parse JSON
    try {
      const data = JSON.parse(text);
      if (data.errno === 0) {
        const total = (data.total / 1024 / 1024 / 1024).toFixed(2);
        const used  = (data.used  / 1024 / 1024 / 1024).toFixed(2);
        const free  = ((data.total - data.used) / 1024 / 1024 / 1024).toFixed(2);
        return {
          success: true,
          base,
          storage: { total, used, free }
        };
      } else {
        return { success: false, base, errno: data.errno, msg: data.errmsg };
      }
    } catch {
      return { success: false, base, msg: `Non-JSON response: ${text.slice(0, 80)}` };
    }
  } catch (err) {
    return { success: false, base, msg: err.message };
  }
}

async function main() {
  console.log("\n════════════════════════════════════════════");
  console.log("  TeraBox Endpoint Scanner");
  console.log("════════════════════════════════════════════");

  // Validate .env
  console.log("\n📋 .env check:");
  const fields = { TERABOX_NDUS, TERABOX_BROWSER_ID, TERABOX_CSRF_TOKEN, TERABOX_JS_TOKEN };
  let allSet = true;
  for (const [k, v] of Object.entries(fields)) {
    const ok = !!v;
    if (!ok) allSet = false;
    console.log(`   ${ok ? "✅" : "❌"} ${k} ${ok ? `= ${v.slice(0,12)}...` : "MISSING"}`);
  }

  if (!TERABOX_NDUS || !TERABOX_JS_TOKEN) {
    console.log("\n❌ ndus and jsToken are required. Fix .env first.\n");
    process.exit(1);
  }

  console.log("\n🔍 Scanning endpoints...\n");

  let workingEndpoint = null;

  for (const base of ENDPOINTS) {
    process.stdout.write(`   Testing ${base} ... `);
    const result = await tryEndpoint(base);

    if (result.success) {
      console.log("✅ WORKS!");
      console.log(`      💾 Total: ${result.storage.total} GB`);
      console.log(`      📦 Used : ${result.storage.used} GB`);
      console.log(`      🆓 Free : ${result.storage.free} GB`);
      workingEndpoint = base;
      break; // Stop at first working one
    } else {
      const reason = result.errno
        ? `errno ${result.errno}`
        : result.msg?.slice(0, 50);
      console.log(`❌ ${reason}`);
    }
  }

  console.log("\n════════════════════════════════════════════");

  if (workingEndpoint) {
    console.log(`\n✅ Working endpoint found: ${workingEndpoint}`);
    console.log(`   Add this to your .env:\n`);
    console.log(`   TERABOX_BASE_URL=${workingEndpoint}\n`);
  } else {
    console.log("\n⚠️  No working endpoint found from this server IP.");
    console.log("\n   Possible causes:");
    console.log("   1. Cookies are wrong/expired — re-extract from Kiwi Browser");
    console.log("   2. Your hosting provider IP is fully blocked by TeraBox");
    console.log("   3. jsToken expired — get a fresh one from Kiwi Browser console");
    console.log("\n   In Kiwi Browser console, run:");
    console.log("   document.cookie.split(';').forEach(c => console.log(c.trim()))");
    console.log("   window.jsToken");
    console.log("\n   If all IPs are blocked, consider Cloudflare R2 as an alternative");
    console.log("   (10GB free with a proper public API — no IP blocking)\n");
  }
  console.log("════════════════════════════════════════════\n");
}

main();

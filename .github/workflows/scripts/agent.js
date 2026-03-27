import fetch from "node-fetch";

async function run() {
  console.log("Running DeFi risk monitor...");

  // 1. Fetch DeFi data
  const data = await fetch("https://api.llama.fi/protocols").then(res => res.json());

  // 2. Fake "risk model" (replace with OpenGradient call)
  const risky = data.slice(0, 3).map(p => ({
    name: p.name,
    tvl: p.tvl,
    riskScore: Math.random()
  }));

  console.log("Risk results:", risky);

  // 3. Send to your API (Vercel or DB)
  await fetch(process.env.API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(risky)
  });

  console.log("Done ✅");
}

run();

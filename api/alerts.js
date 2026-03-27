// api/alerts.js
// =============
// Serves the current alert history to the dashboard.
// Called by the frontend every 30 seconds to refresh.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  // Return stored alerts from global state
  // (populated by /api/monitor cron job)
  const alerts = global._alertStore || [];

  // If no alerts yet (cold start), return demo data
  // so the dashboard always has something to show
  const data = alerts.length > 0 ? alerts : getDemoAlerts();

  const stats = {
    totalScans:     data.length,
    highRisk:       data.filter(a => a.riskLevel === "HIGH").length,
    mediumRisk:     data.filter(a => a.riskLevel === "MEDIUM").length,
    lowRisk:        data.filter(a => a.riskLevel === "LOW").length,
    verifiedOnChain:data.filter(a => a.verified).length,
    lastScan:       data.length > 0 ? data[0].timestamp : null,
    totalTvlMonitored: data.reduce((s, a) => s + (a.tvl || 0), 0),
  };

  return res.status(200).json({ alerts: data, stats });
}

// ── Demo alerts for cold start / no wallet configured ─────────
function getDemoAlerts() {
  const now = new Date();
  const protocols = [
    { name:"Aave V3",     chain:"Ethereum", tvl:7_200_000_000, cr:2.4, br:0.38, vol:0.04, hf:2.1, days:365, slug:"aave-v3" },
    { name:"Compound V3", chain:"Ethereum", tvl:1_800_000_000, cr:1.9, br:0.55, vol:0.08, hf:1.5, days:300, slug:"compound-v3" },
    { name:"MakerDAO",    chain:"Ethereum", tvl:5_100_000_000, cr:2.8, br:0.30, vol:0.03, hf:2.6, days:365, slug:"makerdao" },
    { name:"Venus",       chain:"BSC",      tvl:890_000_000,   cr:1.6, br:0.68, vol:0.14, hf:1.2, days:180, slug:"venus" },
    { name:"Radiant V2",  chain:"Arbitrum", tvl:180_000_000,   cr:1.4, br:0.78, vol:0.22, hf:0.95,days:90,  slug:"radiant-v2" },
    { name:"Morpho Blue", chain:"Ethereum", tvl:920_000_000,   cr:2.1, br:0.45, vol:0.06, hf:1.8, days:240, slug:"morpho-blue" },
  ];

  return protocols.map((p, i) => {
    const mu  = [2.0, 0.5, 0.15, 1.75, 182.5];
    const std = [0.6, 0.23, 0.12, 0.62, 105.0];
    const W   = [0.45, -0.82, 0.91, -1.20, -0.08];
    const b   = -0.35;
    const vals = [p.cr, p.br, p.vol, p.hf, p.days];
    const logit = vals.reduce((s, v, j) => s + ((v-mu[j])/std[j])*W[j], b);
    const prob = 1/(1+Math.exp(-logit));
    const risk = prob>=0.7?"HIGH":prob>=0.4?"MEDIUM":"LOW";
    const fakeHash = "0x"+Array.from({length:64},(_,k)=>"0123456789abcdef"[(i*7+k*13)%16]).join("");

    const ts = new Date(now - i * 3600_000);
    return {
      id:          `${p.slug}-demo-${i}`,
      timestamp:   ts.toISOString(),
      protocol:    p.name,
      chain:       p.chain,
      slug:        p.slug,
      tvl:         p.tvl,
      features: {
        collateral_ratio:   p.cr,
        borrowed_ratio:     p.br,
        asset_volatility:   p.vol,
        health_factor:      p.hf,
        days_since_deposit: p.days,
      },
      probability: parseFloat(prob.toFixed(4)),
      riskLevel:   risk,
      txHash:      fakeHash,
      explorerUrl: `https://explorer.opengradient.ai/tx/${fakeHash}`,
      verified:    true,
      modelCid:    "defi_liquidation_risk.onnx",
      isDemo:      true,
    };
  });
}

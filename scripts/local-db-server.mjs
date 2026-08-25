// @ts-check
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, '.data');
const DB_FILE = path.join(DATA_DIR, 'local_game.json');

const PORT = process.env.LOCAL_DB_PORT ? parseInt(process.env.LOCAL_DB_PORT, 10) : 54321;

// Curated 6 starter summons
const STARTER_DEFINITIONS = ['goku', 'naruto', 'luffy', 'eren', 'l', 'lelouch'];

const TIER_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'X'];

const F_EQUIVALENT_COST = {
  F: 1,
  E: 2,
  D: 4,
  C: 8,
  B: 16,
  A: 32,
  S: 64,
  SS: 128,
  SSS: 256,
  X: 512,
};

const RELEASE_REFUND = {
  F: 0,
  E: 1,
  D: 2,
  C: 4,
  B: 8,
  A: 16,
  S: 32,
  SS: 64,
  SSS: 128,
  X: 256,
};

function getNextTier(currentTier) {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx >= 0 && idx < TIER_ORDER.length - 1) {
    return TIER_ORDER[idx + 1];
  }
  return null;
}

function createDefaultState() {
  const summons = [
    { id: 'starter:goku:001', definitionId: 'goku', tier: 'F', createdAt: new Date().toISOString() },
    { id: 'starter:goku:002', definitionId: 'goku', tier: 'F', createdAt: new Date().toISOString() },
    { id: 'starter:naruto:003', definitionId: 'naruto', tier: 'F', createdAt: new Date().toISOString() },
    { id: 'starter:luffy:004', definitionId: 'luffy', tier: 'F', createdAt: new Date().toISOString() },
    { id: 'starter:eren:005', definitionId: 'eren', tier: 'F', createdAt: new Date().toISOString() },
    { id: 'starter:l:006', definitionId: 'l', tier: 'F', createdAt: new Date().toISOString() },
  ];

  const placements = [
    { summonInstanceId: 'starter:goku:001', cell: { x: 2, y: 3 } },
    { summonInstanceId: 'starter:goku:002', cell: { x: 3, y: 3 } },
    { summonInstanceId: 'starter:naruto:003', cell: { x: 1, y: 2 } },
    { summonInstanceId: 'starter:luffy:004', cell: { x: 4, y: 2 } },
    { summonInstanceId: 'starter:eren:005', cell: { x: 2, y: 2 } },
    { summonInstanceId: 'starter:l:006', cell: { x: 3, y: 2 } },
  ];

  return {
    profile: {
      userId: 'local-player-001',
      tutorialStep: 'campaign_intro',
      tutorialComplete: false,
      timeShieldExpiresAt: null,
      illuminatiUpgraded: false,
      powerLevel: 750,
      updatedAt: new Date().toISOString(),
    },
    spawnMachine: {
      medals: 0,
      balls: 0, // compatibility
      dailyPool: [
        { slotIndex: 0, summonDefinitionId: 'goku', probability: 0.10, tier: 'F' },
        { slotIndex: 1, summonDefinitionId: 'naruto', probability: 0.15, tier: 'F' },
        { slotIndex: 2, summonDefinitionId: 'luffy', probability: 0.25, tier: 'F' },
        { slotIndex: 3, summonDefinitionId: 'eren', probability: 0.25, tier: 'F' },
        { slotIndex: 4, summonDefinitionId: 'l', probability: 0.15, tier: 'F' },
        { slotIndex: 5, summonDefinitionId: 'lelouch', probability: 0.10, tier: 'F' },
      ],
      appliedActionIds: [],
    },
    dealer: {
      generatedStock: 100,
      lastAccrualTimestamp: Date.now(),
      stockCap: 100,
    },
    summons,
    campPlacements: placements,
    mergeEvents: [],
    raidMatches: [],
    raidSteals: [],
    defenseSnapshot: null,
    defenseRewardFifo: [],
  };
}

function loadState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[Local DB] Error loading state from disk, initializing default:', err);
  }
  const defaultState = createDefaultState();
  saveState(defaultState);
  return defaultState;
}

function saveState(state) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Local DB] Error saving state to disk:', err);
  }
}

let db = loadState();

function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-action-id',
  });
  res.end(payload);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-action-id',
    });
    res.end();
    return;
  }

  try {
    // 1. Health check
    if (pathname === '/api/health' || pathname === '/health') {
      sendJson(res, 200, {
        status: 'ok',
        version: '0.1.0-v1',
        db: 'local_game.json',
        summonsCount: db.summons.length,
        medals: db.spawnMachine.medals ?? db.spawnMachine.balls,
        dealerStock: db.dealer?.generatedStock ?? 0,
      });
      return;
    }

    // 2. Get full player state
    if (pathname === '/api/player/state' && req.method === 'GET') {
      sendJson(res, 200, {
        profile: db.profile,
        spawnMachine: db.spawnMachine,
        dealer: db.dealer,
        summons: db.summons,
        campPlacements: db.campPlacements,
        mergeEvents: db.mergeEvents,
        raidMatches: db.raidMatches,
        defenseSnapshot: db.defenseSnapshot,
        defenseRewardFifo: db.defenseRewardFifo,
      });
      return;
    }

    // 3. Reset player state
    if (pathname === '/api/player/reset' && req.method === 'POST') {
      db = createDefaultState();
      saveState(db);
      console.log('[Local DB] Player state reset to default starter kit.');
      sendJson(res, 200, { success: true, message: 'Player state reset successfully', state: db });
      return;
    }

    // 4. Seed all tiers for testing merges
    if (pathname === '/api/player/seed-tier-test' && req.method === 'POST') {
      const testSummons = [];
      const testPlacements = [];
      let cellX = 0;
      let cellY = 0;

      const tiersToSeed = ['F', 'F', 'E', 'E', 'D', 'D', 'C', 'C', 'B', 'B', 'A', 'A', 'S', 'S', 'SS', 'SS', 'SSS', 'SSS'];
      for (const tier of tiersToSeed) {
        const id = `test:goku:${tier}:${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        testSummons.push({ id, definitionId: 'goku', tier, createdAt: new Date().toISOString() });
        testPlacements.push({ summonInstanceId: id, cell: { x: cellX, y: cellY } });
        cellX++;
        if (cellX > 5) {
          cellX = 0;
          cellY++;
        }
      }

      db.summons = [...testSummons];
      db.campPlacements = [...testPlacements];
      db.spawnMachine.medals = 100;
      db.spawnMachine.balls = 100;
      saveState(db);

      console.log('[Local DB] Seeded test summons for 10-tier merge exploration.');
      sendJson(res, 200, { success: true, state: db });
      return;
    }

    // 5. Authoritative Spawn Machine Release (Medal spend)
    if ((pathname === '/api/economy/release-ball' || pathname === '/api/economy/spawn') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const actionId = body.clientActionId || `spawn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // Check idempotency
      if (db.spawnMachine.appliedActionIds.includes(actionId)) {
        sendJson(res, 200, { error: 'Action already applied', clientActionId: actionId });
        return;
      }

      const currentMedals = db.spawnMachine.medals ?? db.spawnMachine.balls ?? 0;
      if (currentMedals <= 0) {
        sendJson(res, 400, { error: 'Insufficient Medals to spawn' });
        return;
      }

      if (db.campPlacements.length >= 36) {
        sendJson(res, 400, { error: 'Battle Camp full (36 / 36 capacity)' });
        return;
      }

      // Pick reward slot based on probabilities [10, 15, 25, 25, 15, 10]
      const pool = db.spawnMachine.dailyPool;
      const rand = Math.random();
      let cumulative = 0;
      let selectedSlot = pool[0];
      for (const slot of pool) {
        cumulative += slot.probability;
        if (rand <= cumulative) {
          selectedSlot = slot;
          break;
        }
      }

      const newSummon = {
        id: `spawn:${selectedSlot.summonDefinitionId}:${Date.now()}`,
        definitionId: selectedSlot.summonDefinitionId,
        tier: 'F', // All normal V1 rewards are F tier
        createdAt: new Date().toISOString(),
      };

      // Find first empty camp cell (row 1-5 first, then row 0)
      let targetCell = null;
      for (let y = 1; y < 6; y++) {
        for (let x = 0; x < 6; x++) {
          if (!db.campPlacements.some((p) => p.cell.x === x && p.cell.y === y)) {
            targetCell = { x, y };
            break;
          }
        }
        if (targetCell) break;
      }
      if (!targetCell) {
        for (let x = 0; x < 6; x++) {
          if (!db.campPlacements.some((p) => p.cell.x === x && p.cell.y === 0)) {
            targetCell = { x, y: 0 };
            break;
          }
        }
      }
      if (!targetCell) {
        targetCell = { x: 0, y: 1 };
      }

      const destination = {
        summonInstanceId: newSummon.id,
        cell: targetCell,
      };

      db.spawnMachine.medals = Math.max(0, currentMedals - 1);
      db.spawnMachine.balls = db.spawnMachine.medals;
      db.spawnMachine.appliedActionIds.push(actionId);
      db.summons.push(newSummon);
      db.campPlacements.push(destination);
      saveState(db);

      const result = {
        clientActionId: actionId,
        rewardSlot: selectedSlot.slotIndex,
        createdSummon: newSummon,
        destination,
        medalsRemaining: db.spawnMachine.medals,
        ballsRemaining: db.spawnMachine.medals,
        blobProgress: {},
        replay: {
          replayId: `replay_${actionId}`,
          rewardSlot: selectedSlot.slotIndex,
          presentationSeed: `seed_${Date.now()}`,
        },
      };

      console.log(`[Local DB] Spawned Summon ${newSummon.definitionId} (F) at (${targetCell.x}, ${targetCell.y}), Medals: ${db.spawnMachine.medals}`);
      sendJson(res, 200, result);
      return;
    }

    // 6. Authoritative Merge Summons (10 Tiers)
    if (pathname === '/api/economy/merge-summons' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { sourceSummonInstanceId, targetSummonInstanceId, clientActionId } = body;
      const actionId = clientActionId || `merge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const source = db.summons.find((s) => s.id === sourceSummonInstanceId);
      const target = db.summons.find((s) => s.id === targetSummonInstanceId);

      if (!source || !target) {
        sendJson(res, 400, { error: 'Both parent summons must exist' });
        return;
      }
      if (source.definitionId !== target.definitionId) {
        sendJson(res, 400, { error: 'Summons must share the same identity definition' });
        return;
      }
      if (source.tier !== target.tier) {
        sendJson(res, 400, { error: 'Summons must be the same tier to merge' });
        return;
      }

      const nextTier = getNextTier(target.tier);
      if (!nextTier) {
        sendJson(res, 400, { error: 'Summon has already reached max tier (X)' });
        return;
      }

      const targetPlacement = db.campPlacements.find((p) => p.summonInstanceId === target.id);
      if (!targetPlacement) {
        sendJson(res, 400, { error: 'Target summon is not in Camp' });
        return;
      }

      // Upgrade target, consume source
      const previousTier = target.tier;
      target.tier = nextTier;
      db.summons = db.summons.filter((s) => s.id !== source.id);
      db.campPlacements = db.campPlacements.filter((p) => p.summonInstanceId !== source.id);

      const mergeEvent = {
        id: `merge_evt_${Date.now()}`,
        clientActionId: actionId,
        sourceId: source.id,
        targetId: target.id,
        definitionId: target.definitionId,
        fromTier: previousTier,
        toTier: nextTier,
        createdAt: new Date().toISOString(),
      };
      db.mergeEvents.push(mergeEvent);
      saveState(db);

      const result = {
        clientActionId: actionId,
        consumedSourceInstanceId: source.id,
        upgradedTarget: target,
        targetPlacement,
        previousTier,
        nextTier,
      };

      console.log(`[Local DB] Merged ${target.definitionId}: ${previousTier} -> ${nextTier}`);
      sendJson(res, 200, result);
      return;
    }

    // 7. Authoritative Release Summon (50% F-equivalent refund rounded down)
    if (pathname === '/api/economy/release-summon' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { summonInstanceId, clientActionId } = body;
      const actionId = clientActionId || `release_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const summon = db.summons.find((s) => s.id === summonInstanceId);
      if (!summon) {
        sendJson(res, 400, { error: 'Summon not found in inventory' });
        return;
      }

      const refund = RELEASE_REFUND[summon.tier] ?? 0;
      const placement = db.campPlacements.find((p) => p.summonInstanceId === summon.id);
      const freedCell = placement?.cell ?? null;

      db.summons = db.summons.filter((s) => s.id !== summon.id);
      db.campPlacements = db.campPlacements.filter((p) => p.summonInstanceId !== summon.id);

      const currentMedals = db.spawnMachine.medals ?? db.spawnMachine.balls ?? 0;
      db.spawnMachine.medals = currentMedals + refund;
      db.spawnMachine.balls = db.spawnMachine.medals;
      saveState(db);

      console.log(`[Local DB] Released ${summon.definitionId} [${summon.tier}], refunded ${refund} Medals. Wallet: ${db.spawnMachine.medals}`);
      sendJson(res, 200, {
        clientActionId: actionId,
        releasedSummonInstanceId: summon.id,
        tier: summon.tier,
        medalsRefunded: refund,
        newMedalBalance: db.spawnMachine.medals,
        freedCell,
      });
      return;
    }

    // 8. Authoritative Dealer Collection (Eligible only when wallet < 100)
    if (pathname === '/api/economy/collect-dealer' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const actionId = body.clientActionId || `dealer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const currentMedals = db.spawnMachine.medals ?? db.spawnMachine.balls ?? 0;
      if (currentMedals >= 100) {
        sendJson(res, 400, { error: 'Wallet must be below 100 Medals to collect Dealer stock' });
        return;
      }

      const stock = db.dealer?.generatedStock ?? 0;
      if (stock <= 0) {
        sendJson(res, 400, { error: 'No Dealer stock currently available to collect' });
        return;
      }

      db.spawnMachine.medals = currentMedals + stock;
      db.spawnMachine.balls = db.spawnMachine.medals;
      db.dealer.generatedStock = 0;
      db.dealer.lastAccrualTimestamp = Date.now();
      saveState(db);

      console.log(`[Local DB] Collected ${stock} Dealer Medals. Wallet: ${currentMedals} -> ${db.spawnMachine.medals}`);
      sendJson(res, 200, {
        clientActionId: actionId,
        collectedStock: stock,
        newMedalBalance: db.spawnMachine.medals,
        newDealerStock: 0,
      });
      return;
    }

    // 9. Authoritative Raid Match Simulation
    if (pathname === '/api/raid/start-raid' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const raidId = `raid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // Starting an outgoing raid breaks attacker's Time Shield
      db.profile.timeShieldExpiresAt = null;

      const match = {
        id: raidId,
        attackerId: db.profile.userId,
        defenderId: 'warden-ai-001',
        outcome: 'win',
        createdAt: new Date().toISOString(),
        rounds: [
          { round: 1, size: 2, outcome: 'win' },
          { round: 2, size: 4, outcome: 'win' },
          { round: 3, size: 6, outcome: 'win' },
        ],
      };
      db.raidMatches.push(match);
      saveState(db);

      console.log(`[Local DB] Started raid match ${raidId} (broke attacker Time Shield)`);
      sendJson(res, 200, { success: true, match });
      return;
    }

    // Fallback 404
    sendJson(res, 404, { error: 'Endpoint not found', path: pathname });
  } catch (err) {
    console.error('[Local DB Server Error]:', err);
    sendJson(res, 500, { error: err instanceof Error ? err.message : 'Internal server error' });
  }
});

server.on('error', (err) => {
  if (err && 'code' in err && err.code === 'EADDRINUSE') {
    console.log(`[Local DB] Server already running on port ${PORT}.`);
    process.exit(0);
  } else {
    console.error('[Local DB Server Error]:', err);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`=======================================================`);
  console.log(`🎮 PSYBLR Authoritative Local Database Server Running`);
  console.log(`🔗 API URL: http://127.0.0.1:${PORT}`);
  console.log(`📁 Database File: ${DB_FILE}`);
  console.log(`📦 Summons Loaded: ${db.summons.length} | Medals: ${db.spawnMachine.medals ?? db.spawnMachine.balls}`);
  console.log(`=======================================================`);
});

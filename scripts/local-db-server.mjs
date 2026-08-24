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

function createDefaultState() {
  const summons = STARTER_DEFINITIONS.map((defId, index) => ({
    id: `starter:${defId}:${index + 1}`,
    definitionId: defId,
    tier: 'F',
    createdAt: new Date().toISOString(),
  }));

  const placements = summons.map((summon, index) => ({
    summonInstanceId: summon.id,
    cell: { x: index, y: 3 },
  }));

  return {
    profile: {
      userId: 'local-player-001',
      tutorialStep: 'complete',
      tutorialComplete: true,
      autoCast: false,
      updatedAt: new Date().toISOString(),
    },
    spawnMachine: {
      balls: 10,
      maxBalls: 10,
      dailyPool: [
        { slotIndex: 0, summonDefinitionId: 'goku', probability: 0.16 },
        { slotIndex: 1, summonDefinitionId: 'naruto', probability: 0.16 },
        { slotIndex: 2, summonDefinitionId: 'luffy', probability: 0.16 },
        { slotIndex: 3, summonDefinitionId: 'eren', probability: 0.16 },
        { slotIndex: 4, summonDefinitionId: 'l', probability: 0.18 },
        { slotIndex: 5, summonDefinitionId: 'lelouch', probability: 0.18 },
      ],
      appliedActionIds: [],
    },
    summons,
    campPlacements: placements,
    mergeEvents: [],
    raidMatches: [],
    raidSteals: [],
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

const TIER_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
function getNextTier(currentTier) {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx >= 0 && idx < TIER_ORDER.length - 1) {
    return TIER_ORDER[idx + 1];
  }
  return null;
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
        version: '0.1.0-alpha',
        db: 'local_game.json',
        summonsCount: db.summons.length,
        balls: db.spawnMachine.balls,
      });
      return;
    }

    // 2. Get full player state
    if (pathname === '/api/player/state' && req.method === 'GET') {
      sendJson(res, 200, {
        profile: db.profile,
        spawnMachine: db.spawnMachine,
        summons: db.summons,
        campPlacements: db.campPlacements,
        mergeEvents: db.mergeEvents,
        raidMatches: db.raidMatches,
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
      // Create pairs of summons across tiers F, E, D, C for Goku and Naruto
      const testSummons = [];
      const testPlacements = [];
      let cellX = 0;
      let cellY = 0;

      const tiersToSeed = ['F', 'F', 'E', 'E', 'D', 'D', 'C', 'C'];
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
      db.spawnMachine.balls = 10;
      saveState(db);

      console.log('[Local DB] Seeded test summons for merge exploration.');
      sendJson(res, 200, { success: true, state: db });
      return;
    }

    // 5. Authoritative Gacha / Pachinko Release Ball
    if (pathname === '/api/economy/release-ball' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const actionId = body.clientActionId || `spawn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // Check idempotency
      if (db.spawnMachine.appliedActionIds.includes(actionId)) {
        sendJson(res, 200, { error: 'Action already applied', clientActionId: actionId });
        return;
      }

      if (db.spawnMachine.balls <= 0) {
        db.spawnMachine.balls = 10; // Auto-refill for sandbox exploration
      }

      // Pick reward slot
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
        tier: 'F',
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

      db.spawnMachine.balls = Math.max(0, db.spawnMachine.balls - 1);
      db.spawnMachine.appliedActionIds.push(actionId);
      db.summons.push(newSummon);
      db.campPlacements.push(destination);
      saveState(db);

      const result = {
        clientActionId: actionId,
        rewardSlot: selectedSlot.slotIndex,
        createdSummon: newSummon,
        destination,
        ballsRemaining: db.spawnMachine.balls,
        blobProgress: {},
        replay: {
          replayId: `replay_${actionId}`,
          rewardSlot: selectedSlot.slotIndex,
          presentationSeed: `seed_${Date.now()}`,
        },
      };

      console.log(`[Local DB] Released ball -> Summon ${newSummon.definitionId} (F) at (${targetCell.x}, ${targetCell.y})`);
      sendJson(res, 200, result);
      return;
    }

    // 6. Authoritative Merge Summons
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
        sendJson(res, 400, { error: 'Summon has already reached max tier (SSS)' });
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

    // 7. Authoritative Raid Match Simulation
    if (pathname === '/api/raid/start-raid' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const raidId = `raid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const match = {
        id: raidId,
        attackerId: db.profile.userId,
        defenderId: 'warden-ai-001',
        outcome: 'win',
        createdAt: new Date().toISOString(),
        rounds: [
          { round: 1, size: 2, outcome: 'win' },
        ],
      };
      db.raidMatches.push(match);
      saveState(db);

      console.log(`[Local DB] Started raid match ${raidId}`);
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

server.listen(PORT, '127.0.0.1', () => {
  console.log(`=======================================================`);
  console.log(`🎮 PSYBLR Authoritative Local Database Server Running`);
  console.log(`🔗 API URL: http://127.0.0.1:${PORT}`);
  console.log(`📁 Database File: ${DB_FILE}`);
  console.log(`📦 Summons Loaded: ${db.summons.length} | Balls: ${db.spawnMachine.balls}`);
  console.log(`=======================================================`);
});

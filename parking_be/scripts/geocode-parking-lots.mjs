#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cachePath = resolve(scriptDir, '.geocode-cache.json');

const env = process.env;
const hasLocalPsql = spawnSync('psql', ['--version'], { encoding: 'utf8' }).status === 0;

const config = {
  client: env.PSQL_CLIENT || (hasLocalPsql ? 'local' : 'docker'),
  dockerImage: env.POSTGRES_CLIENT_IMAGE || 'postgres:16-alpine',
  host: env.DB_HOST || (hasLocalPsql ? '127.0.0.1' : 'host.docker.internal'),
  port: Number(env.DB_PORT || 5432),
  database: env.DB_NAME || 'postgres',
  user: env.DB_USERNAME || 'postgres',
  password: env.DB_PASSWORD || '',
  schema: env.DB_SCHEMA || 'smart_parking',
  limit: Number(env.GEOCODE_LIMIT || 50),
  delayMs: Number(env.GEOCODE_DELAY_MS || 1100),
  dryRun: env.GEOCODE_DRY_RUN === 'true',
  onlyInvalidVietnam: env.GEOCODE_ONLY_INVALID_VN !== 'false',
  requireVietnamCoordinate: env.GEOCODE_REQUIRE_VN !== 'false',
  regionSuffix: (env.GEOCODE_REGION_SUFFIX || '').trim(),
  countryCodes: (env.GEOCODE_COUNTRY_CODES || '').trim(),
  geocoderUrl: env.GEOCODER_URL || 'https://nominatim.openstreetmap.org/search',
  userAgent: env.GEOCODER_USER_AGENT || 'SmartParkingGeocoder/1.0 local-dev',
};

function usage() {
  console.log(`
Geocode parking lots from parking_lots.address into latitude/longitude.

Defaults match src/main/resources/application.yml.

Examples:
  GEOCODE_DRY_RUN=true GEOCODE_LIMIT=5 node scripts/geocode-parking-lots.mjs
  GEOCODE_REGION_SUFFIX="Hanoi, Vietnam" GEOCODE_COUNTRY_CODES=vn node scripts/geocode-parking-lots.mjs

Useful env vars:
  DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD, DB_SCHEMA
  GEOCODE_DRY_RUN=true
  GEOCODE_LIMIT=10
  GEOCODE_ONLY_INVALID_VN=false
  GEOCODE_REQUIRE_VN=false
  GEOCODE_REGION_SUFFIX="Hanoi, Vietnam"
  GEOCODE_COUNTRY_CODES=vn
`);
}

if (env.HELP === 'true' || process.argv.includes('--help')) {
  usage();
  process.exit(0);
}

function assertIdent(value, label) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return `"${value}"`;
}

function runPsql(sql, variables = {}) {
  const baseArgs = [
    '-X',
    '-q',
    '-t',
    '-A',
    '-v',
    'ON_ERROR_STOP=1',
    '-h',
    config.host,
    '-p',
    String(config.port),
    '-U',
    config.user,
    '-d',
    config.database,
  ];

  for (const [key, value] of Object.entries(variables)) {
    baseArgs.push('-v', `${key}=${value}`);
  }

  const command = config.client === 'docker' ? 'docker' : 'psql';
  const args =
    config.client === 'docker'
      ? ['run', '--rm', '-i', '-e', `PGPASSWORD=${config.password}`, config.dockerImage, 'psql', ...baseArgs]
      : baseArgs;

  const result = spawnSync(command, args, {
    input: sql,
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: config.password },
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'psql command failed').trim());
  }

  return result.stdout.trim();
}

function loadCache() {
  if (!existsSync(cachePath)) {
    return {};
  }

  return JSON.parse(readFileSync(cachePath, 'utf8'));
}

function saveCache(cache) {
  writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

function buildSearchAddress(address) {
  const trimmed = address.trim();

  if (!config.regionSuffix) {
    return trimmed;
  }

  if (trimmed.toLowerCase().includes(config.regionSuffix.toLowerCase())) {
    return trimmed;
  }

  return `${trimmed}, ${config.regionSuffix}`;
}

function toDbNumber(value) {
  return Number(value).toFixed(7);
}

function isVietnamCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= 8
    && latitude <= 24
    && longitude >= 102
    && longitude <= 110
  );
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function geocode(address, cache) {
  const query = buildSearchAddress(address);
  const cacheKey = JSON.stringify({
    query,
    countryCodes: config.countryCodes,
    geocoderUrl: config.geocoderUrl,
  });

  if (cache[cacheKey]) {
    return { ...cache[cacheKey], fromCache: true, query };
  }

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '0',
  });

  if (config.countryCodes) {
    params.set('countrycodes', config.countryCodes);
  }

  const response = await fetch(`${config.geocoderUrl}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'vi,en',
      'User-Agent': config.userAgent,
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoder returned ${response.status} for "${query}"`);
  }

  const results = await response.json();
  const first = Array.isArray(results) ? results[0] : null;
  const match = first
    ? {
        lat: toDbNumber(first.lat),
        lng: toDbNumber(first.lon),
        displayName: first.display_name,
      }
    : null;

  cache[cacheKey] = match;
  saveCache(cache);

  return match ? { ...match, fromCache: false, query } : null;
}

function readParkingLots() {
  const schema = assertIdent(config.schema, 'schema');
  const limit = Math.max(1, Math.min(config.limit, 500));
  const invalidVietnamFilter = config.onlyInvalidVietnam
    ? `and (
        latitude is null
        or longitude is null
        or latitude < 8
        or latitude > 24
        or longitude < 102
        or longitude > 110
      )`
    : '';

  const sql = `
select coalesce(json_agg(row_to_json(t)), '[]'::json)
from (
  select
    id::text,
    name,
    address,
    latitude::text,
    longitude::text
  from ${schema}.parking_lots
  where address is not null
    and btrim(address) <> ''
    ${invalidVietnamFilter}
  order by name
  limit ${limit}
) t;
`;

  return JSON.parse(runPsql(sql));
}

function updateParkingLot(lot, match) {
  const schema = assertIdent(config.schema, 'schema');
  const sql = `
update ${schema}.parking_lots
set latitude = :'lot_lat'::numeric(10,7),
    longitude = :'lot_lng'::numeric(10,7),
    updated_at = now()
where id = :'lot_id'::uuid;
`;

  runPsql(sql, {
    lot_id: lot.id,
    lot_lat: match.lat,
    lot_lng: match.lng,
  });
}

async function main() {
  console.log(`DB: ${config.user}@${config.host}:${config.port}/${config.database}, schema=${config.schema}`);
  console.log(`Mode: ${config.dryRun ? 'dry-run' : 'update'}, client=${config.client}, limit=${config.limit}`);
  console.log(
    `Geocoder: ${config.geocoderUrl}, suffix="${config.regionSuffix}", countryCodes="${config.countryCodes || 'any'}", requireVN=${config.requireVietnamCoordinate}`
  );

  const lots = readParkingLots();
  const cache = loadCache();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  if (lots.length === 0) {
    console.log('No parking lots need geocoding.');
    return;
  }

  for (let index = 0; index < lots.length; index += 1) {
    const lot = lots[index];

    if (index > 0) {
      await sleep(config.delayMs);
    }

    try {
      const match = await geocode(lot.address, cache);

      if (!match) {
        skipped += 1;
        console.log(`[skip] ${lot.name}: no result for "${buildSearchAddress(lot.address)}"`);
        continue;
      }

      if (config.requireVietnamCoordinate && !isVietnamCoordinate(Number(match.lat), Number(match.lng))) {
        skipped += 1;
        console.log(`[skip] ${lot.name}: result is outside Vietnam for "${match.query}" -> ${match.lat},${match.lng}`);
        console.log(`  match: ${match.displayName}`);
        continue;
      }

      const action = config.dryRun ? 'would update' : 'updated';
      console.log(
        `[${action}] ${lot.name}: ${lot.latitude || 'null'},${lot.longitude || 'null'} -> ${match.lat},${match.lng}`
      );
      console.log(`  query: ${match.query}`);
      console.log(`  match: ${match.displayName}`);

      if (!config.dryRun) {
        updateParkingLot(lot, match);
      }

      updated += 1;
    } catch (error) {
      failed += 1;
      console.error(`[fail] ${lot.name}: ${error.message}`);
    }
  }

  console.log(`Done. ${config.dryRun ? 'Would update' : 'Updated'}: ${updated}, skipped: ${skipped}, failed: ${failed}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

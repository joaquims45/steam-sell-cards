import { readFile } from "node:fs/promises";
import process from "node:process";

const COMMUNITY_APP_ID = 753;
const COMMUNITY_CONTEXT_ID = 6;
const DEFAULT_STEAM_FEE = 0.05;
const DEFAULT_WALLET_FEE_MIN = 1;
const DEFAULT_WALLET_FEE_BASE = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const args = {
    dryRun: true,
    limit: 0,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--live") {
      args.dryRun = false;
      continue;
    }

    if (value === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (value === "--limit") {
      const rawLimit = argv[index + 1];
      if (!rawLimit) {
        throw new Error("Falta el valor para --limit");
      }

      args.limit = Number.parseInt(rawLimit, 10);
      if (!Number.isInteger(args.limit) || args.limit < 0) {
        throw new Error("El valor de --limit debe ser un entero >= 0");
      }

      index += 1;
      continue;
    }
  }

  return args;
}

async function loadConfig() {
  let raw;

  try {
    raw = await readFile(new URL("../config.json", import.meta.url), "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error("No existe config.json. Copia config.example.json a config.json y completa tus cookies.");
    }

    throw error;
  }

  const config = JSON.parse(raw);

  if (!config.steamId64) {
    throw new Error("Falta config.steamId64");
  }

  if (!config.cookies?.sessionid) {
    throw new Error("Falta config.cookies.sessionid");
  }

  if (!config.cookies?.steamLoginSecure) {
    throw new Error("Falta config.cookies.steamLoginSecure");
  }

  return {
    steamId64: String(config.steamId64),
    language: config.language || "english",
    currency: Number.isInteger(config.currency) ? config.currency : 1,
    cookies: {
      sessionid: String(config.cookies.sessionid),
      steamLoginSecure: String(config.cookies.steamLoginSecure),
      steamCountry: config.cookies.steamCountry ? String(config.cookies.steamCountry) : "",
      extraCookies: typeof config.cookies.extraCookies === "object" && config.cookies.extraCookies !== null
        ? config.cookies.extraCookies
        : {},
    },
    price: {
      mode: config.price?.mode || "undercut_lowest",
      undercutCents: Number.isInteger(config.price?.undercutCents) ? config.price.undercutCents : 1,
      minimumBuyerPayCents: Number.isInteger(config.price?.minimumBuyerPayCents)
        ? config.price.minimumBuyerPayCents
        : 3,
      fallbackBuyerPayCents: Number.isInteger(config.price?.fallbackBuyerPayCents)
        ? config.price.fallbackBuyerPayCents
        : 3,
      defaultPublisherFee: Number.isFinite(config.price?.defaultPublisherFee)
        ? Number(config.price.defaultPublisherFee)
        : 0.1,
    },
    filters: {
      includeFoil: config.filters?.includeFoil !== false,
    },
    timing: {
      requestDelayMs: Number.isInteger(config.timing?.requestDelayMs) ? config.timing.requestDelayMs : 2500,
    },
  };
}

function buildCookieHeader(config) {
  const cookieParts = [
    ["sessionid", config.cookies.sessionid],
    ["steamLoginSecure", config.cookies.steamLoginSecure],
  ];

  if (config.cookies.steamCountry) {
    cookieParts.push(["steamCountry", config.cookies.steamCountry]);
  }

  for (const [name, value] of Object.entries(config.cookies.extraCookies)) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      cookieParts.push([name, String(value)]);
    }
  }

  return cookieParts
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function buildHeaders(config, extraHeaders = {}) {
  const headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": buildCookieHeader(config),
    "Origin": "https://steamcommunity.com",
    "Referer": `https://steamcommunity.com/profiles/${config.steamId64}/inventory`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ...extraHeaders,
  };

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) {
      delete headers[name];
    }
  }

  return headers;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const rawBody = await response.text();

  let data;
  try {
    data = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new Error(`Respuesta no JSON desde ${url}: ${rawBody.slice(0, 200)}`);
  }

  if (!response.ok) {
    const message = data?.message || `HTTP ${response.status}`;
    throw new Error(`${message} (${url})`);
  }

  return data;
}

function makeDescriptionKey(classId, instanceId) {
  return `${classId}_${instanceId || "0"}`;
}

function hasTradingCardTag(description) {
  return (description.tags || []).some((tag) => {
    const values = [
      tag.category,
      tag.internal_name,
      tag.localized_tag_name,
      tag.category_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return values.includes("item_class_2") || values.includes("trading card");
  });
}

function isFoilCard(description) {
  const haystack = [
    description.name,
    description.market_hash_name,
    description.type,
    ...(description.tags || []).flatMap((tag) => [
      tag.localized_tag_name,
      tag.category_name,
      tag.internal_name,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes("foil");
}

function normalizeInventoryAsset(asset, description) {
  return {
    assetId: String(asset.assetid || asset.id),
    classId: String(asset.classid),
    instanceId: String(asset.instanceid || "0"),
    amount: Number.parseInt(String(asset.amount || "1"), 10),
    name: description.name || description.market_name || description.market_hash_name,
    marketHashName: description.market_hash_name,
    marketable: Boolean(description.marketable),
    foil: isFoilCard(description),
  };
}

async function getInventoryCards(config) {
  const cards = [];
  const seenAssetIds = new Set();
  let startAssetId = "";

  while (true) {
    const url = new URL(
      `https://steamcommunity.com/inventory/${config.steamId64}/${COMMUNITY_APP_ID}/${COMMUNITY_CONTEXT_ID}`
    );
    url.searchParams.set("l", config.language);
    url.searchParams.set("count", "2000");

    if (startAssetId) {
      url.searchParams.set("start_assetid", startAssetId);
    }

    const data = await fetchJson(url, {
      headers: buildHeaders(config),
    });

    const descriptionMap = new Map(
      (data.descriptions || []).map((description) => [
        makeDescriptionKey(description.classid, description.instanceid),
        description,
      ])
    );

    for (const asset of data.assets || []) {
      const description = descriptionMap.get(makeDescriptionKey(asset.classid, asset.instanceid));
      if (!description) {
        continue;
      }

      if (!description.marketable || !hasTradingCardTag(description)) {
        continue;
      }

      const item = normalizeInventoryAsset(asset, description);
      if (!config.filters.includeFoil && item.foil) {
        continue;
      }

      if (seenAssetIds.has(item.assetId)) {
        continue;
      }

      seenAssetIds.add(item.assetId);
      cards.push(item);
    }

    if (!data.more_items || !data.last_assetid) {
      break;
    }

    startAssetId = String(data.last_assetid);
  }

  return cards;
}

function getListingBuyerPays(listing) {
  const price = Number.isFinite(listing.converted_price) ? listing.converted_price : listing.price;
  const fee = Number.isFinite(listing.converted_fee) ? listing.converted_fee : listing.fee;

  if (!Number.isFinite(price) || !Number.isFinite(fee)) {
    return null;
  }

  return price + fee;
}

function parseLocalizedMoneyToMinorUnits(rawPrice, currencyCode) {
  const input = String(rawPrice || "").trim();
  if (!input) {
    return null;
  }

  const compact = input.replace(/\s|\u00a0/g, "");
  const numeric = compact.replace(/[^\d.,-]/g, "");
  if (!numeric) {
    return null;
  }

  const lastComma = numeric.lastIndexOf(",");
  const lastDot = numeric.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  const currenciesWithoutCents = new Set([8, 15, 16, 23]);

  if (decimalIndex === -1) {
    const whole = numeric.replace(/[^\d-]/g, "");
    if (!whole) {
      return null;
    }

    const units = Number.parseInt(whole, 10);
    if (!Number.isFinite(units)) {
      return null;
    }

    return currenciesWithoutCents.has(currencyCode) ? units : units * 100;
  }

  const integerPart = numeric.slice(0, decimalIndex).replace(/[^\d-]/g, "");
  const fractionPart = numeric.slice(decimalIndex + 1).replace(/[^\d]/g, "");
  if (!integerPart) {
    return null;
  }

  const wholeUnits = Number.parseInt(integerPart, 10);
  if (!Number.isFinite(wholeUnits)) {
    return null;
  }

  if (currenciesWithoutCents.has(currencyCode)) {
    return wholeUnits;
  }

  const centsRaw = (fractionPart + "00").slice(0, 2);
  const cents = Number.parseInt(centsRaw, 10);
  if (!Number.isFinite(cents)) {
    return wholeUnits * 100;
  }

  return wholeUnits * 100 + cents;
}

async function getCheapestListingInfo(config, item) {
  const countryCode = config.cookies.steamCountry
    ? decodeURIComponent(config.cookies.steamCountry).split("|")[0]
    : "US";
  const url = new URL("https://steamcommunity.com/market/priceoverview/");
  url.searchParams.set("country", countryCode);
  url.searchParams.set("language", config.language);
  url.searchParams.set("currency", String(config.currency));
  url.searchParams.set("appid", String(COMMUNITY_APP_ID));
  url.searchParams.set("market_hash_name", item.marketHashName);
  const data = await fetchJson(url, {
    headers: buildHeaders(config, {
      "Referer": `https://steamcommunity.com/market/listings/${COMMUNITY_APP_ID}/${encodeURIComponent(item.marketHashName)}`,
    }),
  });

  const lowestPrice = parseLocalizedMoneyToMinorUnits(data.lowest_price, config.currency);
  if (!data.success || !Number.isFinite(lowestPrice)) {
    return {
      buyerPays: config.price.fallbackBuyerPayCents,
      publisherFee: config.price.defaultPublisherFee,
      usedFallback: true,
    };
  }

  return {
    buyerPays: lowestPrice,
    publisherFee: config.price.defaultPublisherFee,
    usedFallback: false,
  };
}

function receiveToBuyerPays(amount, publisherFee, steamFee = DEFAULT_STEAM_FEE) {
  const steamFeeValue = Math.floor(Math.max(amount * steamFee, DEFAULT_WALLET_FEE_MIN) + DEFAULT_WALLET_FEE_BASE);
  const publisherFeeValue = publisherFee > 0 ? Math.floor(Math.max(amount * publisherFee, 1)) : 0;

  return {
    steamFeeValue,
    publisherFeeValue,
    buyerPays: amount + steamFeeValue + publisherFeeValue,
  };
}

function buyerPaysToReceive(amount, publisherFee, steamFee = DEFAULT_STEAM_FEE) {
  let estimatedAmount = Math.trunc((amount - DEFAULT_WALLET_FEE_BASE) / (steamFee + publisherFee + 1));
  let current = receiveToBuyerPays(estimatedAmount, publisherFee, steamFee);
  let seenLowerValue = false;

  for (let attempt = 0; attempt < 10 && current.buyerPays !== amount; attempt += 1) {
    if (current.buyerPays > amount) {
      if (seenLowerValue) {
        const adjusted = receiveToBuyerPays(estimatedAmount - 1, publisherFee, steamFee);
        return Math.max(1, amount - adjusted.steamFeeValue - adjusted.publisherFeeValue);
      }

      estimatedAmount -= 1;
    } else {
      seenLowerValue = true;
      estimatedAmount += 1;
    }

    current = receiveToBuyerPays(estimatedAmount, publisherFee, steamFee);
  }

  return Math.max(1, current.buyerPays - current.steamFeeValue - current.publisherFeeValue);
}

function chooseBuyerPaysTarget(config, cheapestBuyerPays) {
  if (config.price.mode === "match_lowest") {
    return Math.max(config.price.minimumBuyerPayCents, cheapestBuyerPays);
  }

  if (config.price.mode === "fixed") {
    return Math.max(config.price.minimumBuyerPayCents, config.price.fallbackBuyerPayCents);
  }

  return Math.max(
    config.price.minimumBuyerPayCents,
    cheapestBuyerPays - Math.max(0, config.price.undercutCents)
  );
}

async function listItem(config, item, sellerReceivesCents) {
  const body = new URLSearchParams({
    sessionid: config.cookies.sessionid,
    appid: String(COMMUNITY_APP_ID),
    contextid: String(COMMUNITY_CONTEXT_ID),
    assetid: item.assetId,
    amount: "1",
    price: String(sellerReceivesCents),
  });

  return fetchJson("https://steamcommunity.com/market/sellitem/", {
    method: "POST",
    headers: buildHeaders(config, {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    }),
    body,
  });
}

function formatCents(cents) {
  return `${(cents / 100).toFixed(2)}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadConfig();

  console.log(args.dryRun ? "Modo simulacion activado." : "Modo venta activado.");
  console.log("Leyendo inventario de cromos...");

  let cards = await getInventoryCards(config);
  cards.sort((left, right) => left.marketHashName.localeCompare(right.marketHashName));

  if (args.limit > 0) {
    cards = cards.slice(0, args.limit);
  }

  if (cards.length === 0) {
    console.log("No se encontraron cromos vendibles con la configuracion actual.");
    return;
  }

  console.log(`Se encontraron ${cards.length} cromos.`);

  const summary = {
    listed: 0,
    pendingConfirmation: 0,
    failed: 0,
  };

  for (let index = 0; index < cards.length; index += 1) {
    const item = cards[index];

    try {
      const market = await getCheapestListingInfo(config, item);
      const targetBuyerPays = chooseBuyerPaysTarget(config, market.buyerPays);
      const sellerReceives = buyerPaysToReceive(targetBuyerPays, market.publisherFee);

      const line = `[${index + 1}/${cards.length}] ${item.name} | buyer pays ${formatCents(targetBuyerPays)} | you receive ${formatCents(sellerReceives)}${market.usedFallback ? " | fallback" : ""}`;

      if (args.dryRun) {
        console.log(`${line} | dry-run`);
      } else {
        const result = await listItem(config, item, sellerReceives);
        if (result.success) {
          if (result.requires_confirmation || result.needs_mobile_confirmation) {
            summary.pendingConfirmation += 1;
            console.log(`${line} | publicado, pendiente de confirmacion`);
          } else {
            summary.listed += 1;
            console.log(`${line} | publicado`);
          }
        } else {
          summary.failed += 1;
          console.log(`${line} | error: ${result.message || "respuesta sin exito"}`);
        }
      }
    } catch (error) {
      summary.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[${index + 1}/${cards.length}] ${item.name} | error: ${message}`);
    }

    if (index < cards.length - 1) {
      await sleep(config.timing.requestDelayMs);
    }
  }

  if (args.dryRun) {
    console.log("Simulacion terminada.");
  } else {
    console.log(
      `Proceso terminado. Publicados: ${summary.listed}. Pendientes de confirmacion: ${summary.pendingConfirmation}. Fallidos: ${summary.failed}.`
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error fatal: ${message}`);
  process.exitCode = 1;
});

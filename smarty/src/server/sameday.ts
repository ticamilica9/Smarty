const SAMEDAY_API_BASE = process.env.SAMEDAY_API_URL ?? "https://api.sameday.ro"
const SAMEDAY_USERNAME = process.env.SAMEDAY_USERNAME ?? ""
const SAMEDAY_PASSWORD = process.env.SAMEDAY_PASSWORD ?? ""
const SAMEDAY_EASYBOX_SERVICE_ID = process.env.SAMEDAY_EASYBOX_SERVICE_ID ?? ""

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SamedayLocker {
  id: number
  name: string
  city: string
  county: string
  address: string
  lat: number
  lng: number
  postalCode: string
  /** Free-text opening hours (e.g. "L-V 08:00-20:00") */
  schedule: string
  /** Max parcel weight in kg */
  maxWeight: number
}

export interface CreateEasyboxShipmentParams {
  /** ID of the order in Smarty */
  orderId: string
  /** Sameday locker ID (the target EasyBox) */
  lockerId: number
  /** Recipient (buyer) details */
  recipient: {
    name: string
    phone: string
    email?: string
  }
  /** Sender (seller) details */
  sender: {
    name: string
    phone: string
    email?: string
  }
  /** Parcel dimensions & weight in cm / kg */
  parcels: Array<{
    weight: number
    width: number
    height: number
    length: number
  }>
}

export interface SamedayShipment {
  awb: string
  awbNumber: string
  pickupCode: string
  trackingUrl: string
  estimatedDelivery: string | null
}

export interface SamedayTracking {
  awbNumber: string
  status: string
  statusLabel: string
  /** ISO date string of last update */
  lastUpdate: string | null
  /** ISO date string of estimated delivery */
  estimatedDelivery: string | null
  history: Array<{
    status: string
    statusLabel: string
    timestamp: string
    location: string | null
  }>
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  const res = await fetch(`${SAMEDAY_API_BASE}/api/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: SAMEDAY_USERNAME, password: SAMEDAY_PASSWORD }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new SamedayError(
      `Autentificare Sameday esuata (${res.status}): ${body}`,
      res.status,
    )
  }

  const data = (await res.json()) as { token: string; expiresAt?: string }
  cachedToken = data.token

  // Parse expiresAt from the response (default 30 min if absent)
  const expiresInMs = data.expiresAt
    ? new Date(data.expiresAt).getTime() - Date.now()
    : 30 * 60 * 1000
  tokenExpiresAt = Date.now() + Math.max(expiresInMs, 60_000)

  return cachedToken
}

function authHeaders() {
  return { Authorization: `Bearer ${cachedToken ?? ""}` }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class SamedayError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "SamedayError"
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// Client methods
// ---------------------------------------------------------------------------

/**
 * Fetch available EasyBox locker locations.
 * Optionally filter by city (diacritics-insensitive on the API side).
 */
export async function getEasyboxLocations(city?: string): Promise<SamedayLocker[]> {
  const token = await getToken()

  const url = new URL(`${SAMEDAY_API_BASE}/api/client/lockers`)
  if (city) {
    url.searchParams.set("city", city)
  }

  const res = await fetch(url.toString(), {
    headers: { ...authHeaders(), Accept: "application/json" },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new SamedayError(
      `Eroare la obtinerea locatiilor EasyBox (${res.status}): ${body}`,
      res.status,
    )
  }

  const data = (await res.json()) as SamedayLocker[]
  return data
}

/**
 * Create an EasyBox shipment (AWB).
 * Called by the seller after an order is paid.
 */
export async function createEasyboxShipment(
  params: CreateEasyboxShipmentParams,
): Promise<SamedayShipment> {
  const token = await getToken()

  const body = {
    serviceId: Number(SAMEDAY_EASYBOX_SERVICE_ID) || 4, // 4 = EasyBox service
    lockers: [{ lockerId: params.lockerId }],
    parcels: params.parcels.map((p, i) => ({
      position: i + 1,
      weight: p.weight,
      width: p.width,
      height: p.height,
      length: p.length,
    })),
    recipient: {
      name: params.recipient.name,
      phone: params.recipient.phone,
      email: params.recipient.email ?? "",
    },
    sender: {
      name: params.sender.name,
      phone: params.sender.phone,
      email: params.sender.email ?? "",
    },
    // Use the orderId as the external/internal reference
    reference: params.orderId,
  }

  const res = await fetch(`${SAMEDAY_API_BASE}/api/client/shipments`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const responseBody = await res.text().catch(() => "")
    throw new SamedayError(
      `Eroare la crearea expeditiei Sameday (${res.status}): ${responseBody}`,
      res.status,
    )
  }

  const data = (await res.json()) as {
    awb: string
    awbNumber: string
    pickupCode: string
    trackingUrl?: string
    estimatedDelivery?: string
  }

  // Store shipment record in database
  const { prisma } = await import("@/lib/prisma")
  await prisma.shipment.create({
    data: {
      orderId: params.orderId,
      easyboxAWB: data.awbNumber ?? data.awb,
      trackingUrl: data.trackingUrl ?? null,
      pickupCode: data.pickupCode,
      status: "AWB_CREATED",
      estimatedDelivery: data.estimatedDelivery
        ? new Date(data.estimatedDelivery)
        : null,
    },
  })

  // Update order status to SHIPPED
  await prisma.order.update({
    where: { id: params.orderId },
    data: { status: "SHIPPED" },
  })

  return {
    awb: data.awb,
    awbNumber: data.awbNumber ?? data.awb,
    pickupCode: data.pickupCode,
    trackingUrl: data.trackingUrl ?? "",
    estimatedDelivery: data.estimatedDelivery ?? null,
  }
}

/**
 * Track a shipment by AWB number.
 */
export async function trackShipment(
  awbNumber: string,
): Promise<SamedayTracking> {
  const token = await getToken()

  const res = await fetch(
    `${SAMEDAY_API_BASE}/api/client/awb/${awbNumber}`,
    {
      headers: { ...authHeaders(), Accept: "application/json" },
    },
  )

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new SamedayError(
      `Eroare la urmarirea expeditiei Sameday (${res.status}): ${body}`,
      res.status,
    )
  }

  const data = (await res.json()) as {
    awbNumber: string
    status: string
    statusLabel?: string
    lastUpdate?: string
    estimatedDelivery?: string
    history?: Array<{
      status: string
      statusLabel: string
      timestamp: string
      location: string | null
    }>
  }

  return {
    awbNumber: data.awbNumber,
    status: data.status,
    statusLabel: data.statusLabel ?? data.status,
    lastUpdate: data.lastUpdate ?? null,
    estimatedDelivery: data.estimatedDelivery ?? null,
    history: (data.history ?? []).map((h) => ({
      status: h.status,
      statusLabel: h.statusLabel ?? h.status,
      timestamp: h.timestamp,
      location: h.location,
    })),
  }
}

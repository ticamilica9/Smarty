/**
 * Mock implementations for external services used in preview mode.
 *
 * Each function returns realistic fake data so the UI flows work end-to-end
 * without hitting real APIs (Sameday, S3, email).
 */

// ── Sameday Courier ──

export interface MockShipment {
  awbNumber: string
  pickupCode: string
  trackingUrl: string
  estimatedDelivery: string
}

let _awbCounter = 0

export function mockSamedayShipment(): MockShipment {
  _awbCounter++
  const awb = `9P${String(_awbCounter).padStart(9, '0')}`
  return {
    awbNumber: awb,
    pickupCode: `EZ${String(_awbCounter).padStart(4, '0')}`,
    trackingUrl: `https://sameday.ro/track?awb=${awb}`,
    estimatedDelivery: new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  }
}

export function mockSamedayLocations(city?: string) {
  const base = [
    {
      lockerId: 1,
      name: 'EasyBox București Mall',
      address: 'Calea Vitan 55-59, București',
      city: 'București',
      latitude: 44.4123,
      longitude: 26.1258,
    },
    {
      lockerId: 2,
      name: 'EasyBox AFI Cotroceni',
      address: 'Bd. Vasile Milea 4, București',
      city: 'București',
      latitude: 44.4285,
      longitude: 26.0527,
    },
    {
      lockerId: 3,
      name: 'EasyBox Cluj Central',
      address: 'Piața Unirii 10, Cluj-Napoca',
      city: 'Cluj-Napoca',
      latitude: 46.7712,
      longitude: 23.6236,
    },
  ]
  if (city) return base.filter((l) => l.city.toLowerCase().includes(city.toLowerCase()))
  return base
}

export function mockSamedayTracking(awbNumber: string) {
  return {
    awbNumber,
    status: 'IN_TRANSIT',
    lastEvent: 'Coletul a ajuns in depozitul de destinatie',
    estimatedDelivery: new Date(
      Date.now() + 2 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    events: [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        description: 'Colet preluat de la expeditor',
      },
      {
        timestamp: new Date().toISOString(),
        description: 'Coletul a ajuns in depozitul de destinatie',
      },
    ],
  }
}

// ── S3 / MinIO ──

let _uploadCounter = 0

export function mockUploadUrl(filename: string): string {
  _uploadCounter++
  const ext = filename.split('.').pop() ?? 'jpg'
  return `https://picsum.photos/seed/preview-upload-${_uploadCounter}/800/800.${ext}`
}

// ── Email ──

export function mockEmailSend(to: string, subject: string, _html: string): void {
  console.log(`[Preview Email] To: ${to} | Subject: ${subject}`)
}

import { NextResponse } from 'next/server'
import { APP_VERSION } from '@/lib/version'

// Update checks disabled — this is a private fork.
export async function GET() {
  return NextResponse.json(
    { updateAvailable: false, currentVersion: APP_VERSION },
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  )
}

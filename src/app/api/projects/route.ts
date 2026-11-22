import { NextResponse } from 'next/server';
import { PROJECTS } from '@/lib/projects';

export async function GET() {
  return NextResponse.json(PROJECTS);
}

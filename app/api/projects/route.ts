import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join((process as any).cwd(), 'projects.json');

export async function GET() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const projects = JSON.parse(data);
      return NextResponse.json(projects);
    }
    return NextResponse.json([]);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const projects = await request.json();
    fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save projects' }, { status: 500 });
  }
}
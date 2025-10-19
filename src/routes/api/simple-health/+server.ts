export async function GET() {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    message: 'Plinko Game API is running'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
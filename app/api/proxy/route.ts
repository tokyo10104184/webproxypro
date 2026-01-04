import { NextRequest, NextResponse } from 'next/server';

// Vercel Edge Runtimeを使用 (Node.jsより高速・軽量)
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  
  if (!url) {
    return new NextResponse('URL Parameter is missing', { status: 400 });
  }

  try {
    // ターゲットのHTMLを取得
    const targetRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const contentType = targetRes.headers.get('content-type') || '';
    
    // HTML以外のリソース（画像など）はそのまま流す
    if (!contentType.includes('text/html')) {
      const blob = await targetRes.blob();
      return new NextResponse(blob, {
        status: targetRes.status,
        headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // HTMLの場合は中身を書き換える
    let html = await targetRes.text();

    // 簡易的な書き換えロジック (注意: 完璧ではありません)
    // 相対パス (例: src="/img.png") を 絶対パスに変換しないとリンク切れする
    // 本来はもっと複雑なパーサーが必要ですが、MVPとして簡易実装します
    const origin = new URL(url).origin;
    
    // href="/..." -> href="origin/..." のように単純置換 (不完全ですが動きます)
    // プロキシ経由で読み込ませるためのPrefix
    const proxyBase = `/api/proxy?url=`;

    // <head>にbaseタグを埋め込むのが一番手っ取り早いハックです
    // これにより相対パスの画像などが正しく読み込まれる確率が上がります
    html = html.replace('<head>', `<head><base href="${origin}/">`);

    // レスポンスヘッダーの調整 (iframe拒否を無効化)
    const newHeaders = new Headers();
    newHeaders.set('Content-Type', 'text/html');
    newHeaders.set('Access-Control-Allow-Origin', '*');
    // X-Frame-Optionsなどはセットしないことで無効化される

    return new NextResponse(html, {
      status: 200,
      headers: newHeaders,
    });

  } catch (error) {
    console.error(error);
    return new NextResponse('Proxy Error: Failed to fetch target.', { status: 500 });
  }
}

const ALLOW = [
  'jht7vsp', 'jht7vfm2', 'nftphhy', 'hgd7b2z', 'xn--9kqpgs02hjf4a',
  'mfbskbj', '538fd3d70', 'bh5750'
];

function allowed(u) {
  try {
    const h = new URL(u).hostname;
    return ALLOW.some(function (k) { return h.indexOf(k) !== -1; });
  } catch (e) { return false; }
}

exports.handler = async function (event) {
  const qs = event.queryStringParameters || {};
  const target = qs.url;

  if (!target) {
    return { statusCode: 200, headers: { 'content-type': 'text/plain' }, body: 'ok' };
  }
  if (!allowed(target)) {
    return { statusCode: 400, body: 'bad target' };
  }

  let resp;
  try {
    resp = await fetch(target, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Linux; Android 15; V2403A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        'accept': '*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'referer': 'https://www.mfbskbj.com:2087/',
        'origin': 'https://www.mfbskbj.com:2087'
      }
    });
  } catch (e) {
    return { statusCode: 502, body: 'upstream error: ' + e.message };
  }

  const ct = resp.headers.get('content-type') || '';
  const isM3u8 = target.indexOf('.m3u8') !== -1 || ct.indexOf('mpegurl') !== -1;

  const headers = {
    'access-control-allow-origin': '*',
    'content-type': isM3u8 ? 'application/vnd.apple.mpegurl' : (ct || 'application/octet-stream')
  };

  if (isM3u8) {
    const text = await resp.text();
    const base = target.replace(/[^/]*$/, '');
    const fixed = text.split('\n').map(function (line) {
      const t = line.trim();
      if (!t) return line;
      if (t.charAt(0) === '#') {
        return t.replace(/URI="([^"]+)"/, function (m, uri) {
          if (/^https?:\/\//.test(uri)) return 'URI="' + uri + '"';
          return 'URI="' + base + uri + '"';
        });
      }
      if (/^https?:\/\//.test(t)) return line;
      return base + t;
    }).join('\n');
    return { statusCode: resp.status, headers: headers, body: fixed };
  }

  const buf = Buffer.from(await resp.arrayBuffer());
  return {
    statusCode: resp.status,
    headers: headers,
    body: buf.toString('base64'),
    isBase64Encoded: true
  };
};

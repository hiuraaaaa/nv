// api/proxy.js
const IMAGE_PROXIES = [
    'https://images.weserv.nl/?url=',
    'https://wsrv.nl/?url=',
    'https://proxy.duckduckgo.com/iu/?u=',
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url='
];

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image, page } = req.query;
        
        // Handle image request (dengan proxy untuk bypass Cloudflare)
        if (image) {
            const originalUrl = decodeURIComponent(image);
            console.log('🖼️ Processing image:', originalUrl);
            
            // Coba semua proxy gambar
            for (const proxy of IMAGE_PROXIES) {
                try {
                    const proxyUrl = proxy + encodeURIComponent(originalUrl);
                    console.log('Trying proxy:', proxy);
                    
                    const response = await fetch(proxyUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        timeout: 8000
                    });

                    if (response.ok) {
                        const imageBuffer = await response.arrayBuffer();
                        const contentType = response.headers.get('content-type') || 'image/jpeg';
                        
                        res.setHeader('Content-Type', contentType);
                        res.setHeader('Cache-Control', 'public, max-age=86400');
                        res.setHeader('X-Image-Proxy', proxy);
                        res.status(200).send(Buffer.from(imageBuffer));
                        
                        console.log('✅ Success with proxy:', proxy);
                        return;
                    }
                } catch (error) {
                    console.log(`Proxy ${proxy} failed:`, error.message);
                    continue;
                }
            }
            
            // Jika semua proxy gagal, redirect ke placeholder
            console.log('❌ All proxies failed');
            res.redirect('https://via.placeholder.com/250x350/F5DEB3/8B4513?text=Manga+Cover');
            return;
        }

        // Handle data request (manga list)
        const targetUrl = `https://www.sankavollerei.com/comic/mangasusuku/home${page ? `?page=${page}` : ''}`;
        console.log('📡 Fetching manga data from:', targetUrl);
        
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.sankavollerei.com/'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Modifikasi URL gambar untuk menggunakan proxy
        if (data.hotComics) {
            data.hotComics.forEach(comic => {
                if (comic.image) {
                    comic.image = `/api/proxy?image=${encodeURIComponent(comic.image)}`;
                }
            });
        }
        
        if (data.latestUpdates) {
            data.latestUpdates.forEach(update => {
                if (update.image) {
                    update.image = `/api/proxy?image=${encodeURIComponent(update.image)}`;
                }
            });
        }
        
        if (data.popularToday) {
            data.popularToday.forEach(popular => {
                if (popular.image) {
                    popular.image = `/api/proxy?image=${encodeURIComponent(popular.image)}`;
                }
            });
        }
        
        res.setHeader('Cache-Control', 's-maxage=300');
        res.status(200).json(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch data',
            message: error.message 
        });
    }
}

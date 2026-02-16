// api/proxy.js
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get page parameter from query
        const page = req.query.page || 1;
        
        // Target API URL
        const targetUrl = `https://www.sankavollerei.com/novel/sakuranovel/home?page=${page}`;
        
        console.log(`Fetching: ${targetUrl}`);

        // Fetch data from target API
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SakuraNovelBot/1.0)',
                'Accept': 'application/json',
            },
            timeout: 10000 // 10 second timeout
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        
        // Add cache headers (cache for 5 minutes)
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        
        // Return the data
        res.status(200).json(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        
        // Return error response
        res.status(500).json({ 
            error: 'Failed to fetch data from source',
            message: error.message 
        });
    }
}

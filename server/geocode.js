const cache = new Map();
let lastRequestAt = 0;

function cacheKey(query) {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function waitForSlot() {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < 1100) {
        await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
    }
    lastRequestAt = Date.now();
}

async function nominatim(url) {
    await waitForSlot();
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'SaerbridgeSource/1.0 (local home-planning research)',
        },
    });
    if (!response.ok) return null;
    return response.json();
}

async function geocodeAddress(address) {
    const key = cacheKey(address);
    if (!key) return null;
    if (cache.has(key)) return cache.get(key);
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'za');
    try {
        const results = await nominatim(url);
        const hit = Array.isArray(results) ? results[0] : null;
        if (!hit) {
            cache.set(key, null);
            return null;
        }
        const latitude = Number(hit.lat);
        const longitude = Number(hit.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            cache.set(key, null);
            return null;
        }
        const point = { latitude, longitude };
        cache.set(key, point);
        return point;
    } catch {
        return null;
    }
}

async function reverseArea(latitude, longitude) {
    const key = `reverse:${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    if (cache.has(key)) return cache.get(key);
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('zoom', '14');
    try {
        const hit = await nominatim(url);
        const address = hit && hit.address ? hit.address : {};
        const suburb = address.suburb || address.neighbourhood || address.village || address.town || '';
        const city = address.city || address.town || address.municipality || '';
        const province = address.state || '';
        const area = [suburb, city, province].filter(Boolean).join(', ');
        const value = area || null;
        cache.set(key, value);
        return value;
    } catch {
        return null;
    }
}

module.exports = {
    geocodeAddress,
    reverseArea,
};

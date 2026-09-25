import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from './LocationField';
import type { SupplierResult } from '../api/homeDesign';

type SupplierPanelProps = {
    suppliers: SupplierResult[];
    status: string;
    origin: Coordinates | null;
};

function money(value?: number) {
    if (typeof value !== 'number') return null;
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value);
}

function priceLabel(type: string) {
    if (type === 'listed-current') return 'Current listed price';
    if (type === 'listed-undated') return 'Listed price, date not confirmed';
    if (type === 'estimated') return 'Estimated price';
    return 'Contact supplier for price';
}

function distanceKm(origin: Coordinates, latitude?: number, longitude?: number) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earth = 6371;
    const dLat = toRad(latitude - origin.latitude);
    const dLon = toRad(longitude - origin.longitude);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(origin.latitude)) * Math.cos(toRad(latitude)) * Math.sin(dLon / 2) ** 2;
    return Math.round(earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function checkedLabel(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function SupplierPanel({ suppliers, status, origin }: SupplierPanelProps) {
    const mapNode = useRef<HTMLDivElement>(null);
    const [mapReady, setMapReady] = useState(false);
    const pins = suppliers.filter((supplier) => (
        typeof supplier.latitude === 'number'
        && typeof supplier.longitude === 'number'
        && Math.abs(supplier.latitude) <= 90
        && Math.abs(supplier.longitude) <= 180
    ));

    useEffect(() => {
        const located = suppliers.filter((supplier) => (
            typeof supplier.latitude === 'number'
            && typeof supplier.longitude === 'number'
            && Math.abs(supplier.latitude) <= 90
            && Math.abs(supplier.longitude) <= 180
        ));
        if (located.length === 0 || !mapNode.current) return undefined;
        let map: { remove: () => void } | null = null;
        let cancelled = false;
        import('leaflet').then((leaflet) => {
            if (cancelled || !mapNode.current) return;
            const L = leaflet.default;
            const next = L.map(mapNode.current, { scrollWheelZoom: false });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 18,
            }).addTo(next);
            const bounds: [number, number][] = [];
            located.forEach((supplier) => {
                const latitude = supplier.latitude as number;
                const longitude = supplier.longitude as number;
                bounds.push([latitude, longitude]);
                const marker = L.circleMarker([latitude, longitude], {
                    radius: 8,
                    color: '#11233a',
                    weight: 2,
                    fillColor: '#8b9975',
                    fillOpacity: 0.95,
                }).addTo(next);
                const offer = supplier.offers.find((item) => typeof item.priceZAR === 'number');
                const price = offer ? `${money(offer.priceZAR)} · ${priceLabel(offer.priceType)}` : 'Contact supplier for price';
                const text = [
                    supplier.name,
                    [supplier.address, supplier.suburb, supplier.city].filter(Boolean).join(', '),
                    supplier.materialCategories.join(' · '),
                    price,
                ].map((line) => line.replace(/[&<>"']/g, (char) => (
                    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
                ))).join('<br>');
                marker.bindPopup(text);
            });
            if (bounds.length === 1) next.setView(bounds[0], 13);
            else next.fitBounds(bounds, { padding: [24, 24] });
            map = next;
            setMapReady(true);
        }).catch(() => setMapReady(false));
        return () => {
            cancelled = true;
            map?.remove();
            setMapReady(false);
        };
    }, [suppliers]);

    return (
        <section className='supplier-panel' aria-labelledby='supplier-heading'>
            <h3 id='supplier-heading'>Materials near you</h3>
            {status === 'unavailable' ? <p>Local supplier information is temporarily unavailable.</p> : null}
            {status === 'skipped' ? <p>Add an area to look for nearby suppliers. The design can still be generated without one.</p> : null}
            {status === 'ok' && suppliers.length === 0 ? <p>No sourced suppliers were found for this area.</p> : null}
            <div className='supplier-layout'>
                <ul className='supplier-list'>
                    {suppliers.map((supplier) => {
                        const offer = supplier.offers.find((item) => typeof item.priceZAR === 'number') || supplier.offers[0];
                        const away = origin ? distanceKm(origin, supplier.latitude, supplier.longitude) : null;
                        const delivery = supplier.deliveryAvailable == null
                            ? 'Delivery: Unknown'
                            : supplier.deliveryAvailable
                                ? `Delivery: ${supplier.deliveryNotes || 'Mentioned by the source'}`
                                : 'Delivery: Not stated';
                        return (
                            <li key={supplier.id}>
                                <h4>{supplier.name}</h4>
                                {away != null ? <p>{away} km away</p> : null}
                                <p>{[supplier.address, supplier.suburb, supplier.city].filter(Boolean).join(', ') || 'Address not stated'}</p>
                                <p>{supplier.materialCategories.join(' · ') || 'Building materials'}</p>
                                {offer ? (
                                    <p>
                                        {offer.productName || offer.materialType}
                                        {typeof offer.priceZAR === 'number' ? ` ${money(offer.priceZAR)}` : ''}
                                        {` · ${priceLabel(offer.priceType)}`}
                                    </p>
                                ) : <p>Contact supplier for price</p>}
                                <p>{delivery}</p>
                                <p>Checked: {checkedLabel(supplier.checkedAt)} · {supplier.confidence} confidence</p>
                                <a href={supplier.sourceUrl} target='_blank' rel='noreferrer'>View source</a>
                            </li>
                        );
                    })}
                </ul>
                {pins.length ? (
                    <div className='supplier-map-wrap'>
                        <div ref={mapNode} className='supplier-map' role='region' aria-label='Supplier map' />
                        <p>{mapReady ? 'Pins match sourced supplier addresses. The list includes the same details.' : 'Loading map.'}</p>
                    </div>
                ) : (
                    <p>Suppliers without a reliable map location stay in the list and are not pinned.</p>
                )}
            </div>
        </section>
    );
}

export default SupplierPanel;

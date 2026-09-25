import { useId, useState } from 'react';
import { FiMapPin } from 'react-icons/fi';
import InfoTip from './InfoTip';

export type ManualLocation = {
    suburb: string;
    city: string;
    province: string;
};

export type Coordinates = {
    latitude: number;
    longitude: number;
};

type LocationFieldProps = {
    manual: ManualLocation;
    coordinates: Coordinates | null;
    onManual: (next: ManualLocation) => void;
    onCoordinates: (next: Coordinates | null) => void;
};

function LocationField({ manual, coordinates, onManual, onCoordinates }: LocationFieldProps) {
    const suburbId = useId();
    const cityId = useId();
    const provinceId = useId();
    const [draft, setDraft] = useState(manual);
    const [saved, setSaved] = useState(manual);
    if (
        manual.suburb !== saved.suburb
        || manual.city !== saved.city
        || manual.province !== saved.province
    ) {
        setSaved(manual);
        setDraft(manual);
    }
    const [message, setMessage] = useState('');

    const shareLocation = () => {
        if (!navigator.geolocation) {
            setMessage('This browser cannot share a location. Enter an area manually.');
            return;
        }
        setMessage('Requesting location to find nearby material suppliers.');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onCoordinates({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setMessage('Approximate location saved for supplier research.');
            },
            () => {
                onCoordinates(null);
                setMessage('Location was not shared. Enter an area manually, or generate without nearby suppliers.');
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
        );
    };

    return (
        <section className='planner-card' aria-labelledby='location-heading' onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onManual(draft);
        }}>
            <div className='planner-card-heading'>
                <h2 id='location-heading'><FiMapPin aria-hidden='true' /> Location</h2>
                <InfoTip label='About location'>
                    Optional. Used to find nearby material suppliers. The page asks for your location only after you choose Use my location. You can still generate a design if location is denied.
                </InfoTip>
            </div>
            <div className='location-actions'>
                <button type='button' className='tool-btn' onClick={() => { onManual(draft); shareLocation(); }}>Use my location</button>
                {coordinates ? (
                    <button type='button' className='tool-btn' onClick={() => onCoordinates(null)}>Clear shared location</button>
                ) : null}
            </div>
            <div className='planner-card-fields'>
                <label htmlFor={suburbId}>
                    Suburb or township
                    <input id={suburbId} value={draft.suburb} maxLength={80} onChange={(event) => setDraft({ ...draft, suburb: event.target.value })} />
                </label>
                <label htmlFor={cityId}>
                    City or municipality
                    <input id={cityId} value={draft.city} maxLength={80} onChange={(event) => setDraft({ ...draft, city: event.target.value })} />
                </label>
                <label htmlFor={provinceId}>
                    Province
                    <input id={provinceId} value={draft.province} maxLength={80} onChange={(event) => setDraft({ ...draft, province: event.target.value })} />
                </label>
            </div>
            <p className='location-status' role='status'>{message}</p>
        </section>
    );
}

export default LocationField;

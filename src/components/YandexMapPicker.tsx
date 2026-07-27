import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader as Loader2 } from "lucide-react";

interface YandexMapPickerProps {
    apiKey: string;
    initialAddress?: string;
    center?: [number, number];
    zoom?: number;
    onAddressSelect: (address: string, coords: { lat: number; lon: number }) => void;
}

/*
 * Minimal, loosely-typed accessors for the Yandex Maps JS API v3.
 * The full type surface is large; we only use the handful of methods we need.
 */
interface Y3Map {
    addChild: (child: unknown) => void;
    setCenter: (coords: [number, number], zoom?: number) => void;
    events: { add: (event: string, handler: (e: Y3Event) => void) => void };
}
interface Y3Event {
    location?: { center?: [number, number]; screen?: { x: number; y: number } };
}
interface Y3Marker {
    geometry: { setCoordinates: (coords: [number, number]) => void };
}
interface Y3Suggest {
    events: { add: (event: string, handler: (e: { get: (key: string) => unknown }) => void) => void };
}
interface Y3NS {
    ready: () => Promise<void>;
    YMap: new (el: HTMLElement, props: { location: { center: [number, number]; zoom: number } }) => Y3Map;
    YMapDefaultSchemeLayer: new () => unknown;
    YMapDefaultFeaturesLayer: new () => unknown;
    YMapMarker: new (props: { coordinates: [number, number] }, element: HTMLElement) => Y3Marker;
    suggest: (el: HTMLElement) => Promise<Y3Suggest>;
}

declare global {
    interface Window {
        ymaps3?: Y3NS;
    }
}

let apiPromise: Promise<void> | null = null;

function loadYandexMaps(apiKey: string): Promise<void> {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
        if (window.ymaps3) {
            window.ymaps3.ready().then(resolve).catch(reject);
            return;
        }
        const script = document.createElement("script");
        script.src = `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=ru_RU`;
        script.async = true;
        script.onload = () => {
            if (window.ymaps3) {
                window.ymaps3.ready().then(resolve).catch(reject);
            } else {
                reject(new Error("Yandex Maps API failed to load"));
            }
        };
        script.onerror = () => reject(new Error("Failed to load Yandex Maps script"));
        document.head.appendChild(script);
    });
    return apiPromise;
}

const mapPinSvg = `<svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 26 14 26s14-16.5 14-26C28 6.27 21.73 0 14 0z" fill="#ca8a04"/>
  <circle cx="14" cy="14" r="5" fill="white"/>
</svg>`;

export function YandexMapPicker({
    apiKey,
    initialAddress = "",
    center = [55.751244, 37.618423],
    zoom = 10,
    onAddressSelect,
}: YandexMapPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const mapRef = useRef<Y3Map | null>(null);
    const markerRef = useRef<Y3Marker | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchValue, setSearchValue] = useState(initialAddress);

    async function reverseGeocode(lat: number, lon: number): Promise<string> {
        try {
            const res = await fetch(
                `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${lon},${lat}&lang=ru_RU&format=json`,
            );
            if (!res.ok) return "";
            const data = await res.json();
            const member = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
            if (!member) return "";
            const addr = member?.metaDataProperty?.GeocoderMetaData?.text;
            return typeof addr === "string" ? addr : "";
        } catch {
            return "";
        }
    }

    async function forwardGeocode(
        address: string,
    ): Promise<{ lat: number; lon: number; displayName: string } | null> {
        try {
            const res = await fetch(
                `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(address)}&lang=ru_RU&format=json`,
            );
            if (!res.ok) return null;
            const data = await res.json();
            const member = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
            if (!member) return null;
            const pos: string = member?.Point?.pos || "";
            const [lonStr, latStr] = pos.split(" ");
            const lat = parseFloat(latStr);
            const lon = parseFloat(lonStr);
            if (isNaN(lat) || isNaN(lon)) return null;
            const displayName = member?.metaDataProperty?.GeocoderMetaData?.text || address;
            return { lat, lon, displayName };
        } catch {
            return null;
        }
    }

    function placeMarker(ymaps: Y3NS, coords: [number, number]) {
        if (!mapRef.current) return;
        const markerEl = document.createElement("div");
        markerEl.style.transform = "translate(-50%, -100%)";
        markerEl.innerHTML = mapPinSvg;
        const marker = new ymaps.YMapMarker({ coordinates: coords }, markerEl);
        mapRef.current.addChild(marker);
        markerRef.current = marker;
    }

    function moveMarker(coords: [number, number]) {
        markerRef.current?.geometry.setCoordinates(coords);
        mapRef.current?.setCenter(coords, 16);
    }

    useEffect(() => {
        let cancelled = false;
        loadYandexMaps(apiKey)
            .then(() => {
                if (cancelled || !containerRef.current || !window.ymaps3) return;
                const ymaps = window.ymaps3;
                const map = new ymaps.YMap(containerRef.current, {
                    location: { center, zoom },
                });
                map.addChild(new ymaps.YMapDefaultSchemeLayer());
                map.addChild(new ymaps.YMapDefaultFeaturesLayer());
                mapRef.current = map;

                map.events.add("click", async (e: Y3Event) => {
                    const coords = e.location?.center;
                    if (!coords) return;
                    if (markerRef.current) {
                        moveMarker(coords);
                    } else {
                        placeMarker(ymaps, coords);
                    }
                    const address = await reverseGeocode(coords[0], coords[1]);
                    if (address) {
                        setSearchValue(address);
                        onAddressSelect(address, { lat: coords[0], lon: coords[1] });
                    }
                });

                if (searchInputRef.current) {
                    ymaps.suggest(searchInputRef.current).then((suggest) => {
                        suggest.events.add("select", (event) => {
                            const item = event.get("item") as { value?: string } | undefined;
                            const addr = item?.value || "";
                            if (addr) {
                                setSearchValue(addr);
                                handleSearchSubmit(addr);
                            }
                        });
                    }).catch(() => {
                        /* suggest is a progressive enhancement; ignore failures */
                    });
                }

                setLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.message || "Не удалось загрузить карту");
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleSearchSubmit(address: string) {
        if (!address.trim()) return;
        setLoading(true);
        const geo = await forwardGeocode(address.trim());
        setLoading(false);
        if (!geo) {
            setError("Адрес не найден. Уточните запрос.");
            return;
        }
        setError("");
        setSearchValue(geo.displayName);
        if (markerRef.current) {
            moveMarker([geo.lat, geo.lon]);
        } else if (window.ymaps3) {
            placeMarker(window.ymaps3, [geo.lat, geo.lon]);
        }
        mapRef.current?.setCenter([geo.lat, geo.lon], 16);
        onAddressSelect(geo.displayName, { lat: geo.lat, lon: geo.lon });
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleSearchSubmit(searchValue);
                        }
                    }}
                    placeholder="Введите адрес или кликните по карте"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-600 focus:border-transparent"
                />
            </div>
            <div className="relative w-full h-80 sm:h-96 rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                <div ref={containerRef} className="absolute inset-0" />
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 p-4 text-center">
                        <MapPin className="h-8 w-8 text-red-400 mb-2" />
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}
            </div>
            <p className="text-xs text-gray-500 flex items-center">
                <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                Кликните по карте или найдите адрес в строке поиска — он автоматически подставится в поле «Адрес доставки».
            </p>
        </div>
    );
}

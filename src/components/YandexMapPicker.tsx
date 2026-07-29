import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader as Loader2 } from "lucide-react";

interface YandexMapPickerProps {
    apiKey: string;
    initialAddress?: string;
    center?: [number, number];
    zoom?: number;
    onAddressSelect: (address: string, coords: { lat: number; lon: number }) => void;
}

interface Y2Map {
    setCenter: (coords: [number, number], zoom?: number) => void;
    events: { add: (event: string, handler: (e: Y2Event) => void) => void };
    geoObjects: { add: (obj: Y2Placemark) => void; remove: (obj: Y2Placemark) => void };
}
interface Y2Event {
    get: (key: string) => [number, number];
}
interface Y2Placemark {
    geometry: { setCoordinates: (coords: [number, number]) => void };
}
interface Y2Suggest {
    events: { add: (event: string, handler: (e: { get: (key: string) => unknown }) => void) => void };
}
interface Y2GeoResult {
    getAddress?: () => string;
    geometry: { getCoordinates: () => [number, number] };
    properties: { get: (key: string) => string };
}
interface Y2GeoCollection {
    geoObjects: { get: (i: number) => Y2GeoResult };
}
interface Y2NS {
    ready: (cb: () => void) => void;
    Map: new (el: HTMLElement, props: { center: [number, number]; zoom: number; controls: string[] }) => Y2Map;
    Placemark: new (coords: [number, number], props?: Record<string, unknown>, options?: Record<string, unknown>) => Y2Placemark;
    SuggestControl: new (el: HTMLElement) => Y2Suggest;
    geocode: (query: string | [number, number], options?: { results?: number; json?: boolean }) => Promise<{ geoObjects: Y2GeoCollection }>;
}

declare global {
    interface Window {
        ymaps?: Y2NS;
    }
}

let apiPromise: Promise<void> | null = null;

function loadYandexMaps(apiKey: string): Promise<void> {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
        if (window.ymaps) {
            window.ymaps.ready(() => resolve());
            return;
        }
        const script = document.createElement("script");
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
        script.async = true;
        script.onload = () => {
            if (window.ymaps) {
                window.ymaps.ready(() => resolve());
            } else {
                reject(new Error("Yandex Maps API failed to load"));
            }
        };
        script.onerror = () => reject(new Error("Failed to load Yandex Maps script"));
        document.head.appendChild(script);
    });
    return apiPromise;
}

export function YandexMapPicker({
    apiKey,
    initialAddress = "",
    center = [55.751244, 37.618423],
    zoom = 10,
    onAddressSelect,
}: YandexMapPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const mapRef = useRef<Y2Map | null>(null);
    const placemarkRef = useRef<Y2Placemark | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchValue, setSearchValue] = useState(initialAddress);

    function placeMarker(ymaps: Y2NS, coords: [number, number]) {
        if (!mapRef.current) return;
        if (placemarkRef.current) {
            mapRef.current.geoObjects.remove(placemarkRef.current);
        }
        const pm = new ymaps.Placemark(
            coords,
            {},
            { preset: "islands#yellowDotIcon" },
        );
        mapRef.current.geoObjects.add(pm);
        placemarkRef.current = pm;
    }

    function moveMarker(coords: [number, number]) {
        placemarkRef.current?.geometry.setCoordinates(coords);
        mapRef.current?.setCenter(coords, 16);
    }

    async function reverseGeocode(ymaps: Y2NS, lat: number, lon: number): Promise<string> {
        try {
            const res = await ymaps.geocode([lat, lon], { results: 1 });
            const first = res.geoObjects.get(0);
            if (!first) return "";
            return first.properties.get("text") || first.getAddress?.() || "";
        } catch {
            return "";
        }
    }

    async function forwardGeocode(
        ymaps: Y2NS,
        address: string,
    ): Promise<{ lat: number; lon: number; displayName: string } | null> {
        try {
            const res = await ymaps.geocode(address, { results: 1 });
            const first = res.geoObjects.get(0);
            if (!first) return null;
            const coords = first.geometry.getCoordinates();
            const displayName = first.properties.get("text") || address;
            return { lat: coords[0], lon: coords[1], displayName };
        } catch {
            return null;
        }
    }

    useEffect(() => {
        let cancelled = false;
        loadYandexMaps(apiKey)
            .then(() => {
                if (cancelled || !containerRef.current || !window.ymaps) return;
                const ymaps = window.ymaps;
                const map = new ymaps.Map(containerRef.current, {
                    center,
                    zoom,
                    controls: ["zoomControl"],
                });
                mapRef.current = map;

                map.events.add("click", async (e: Y2Event) => {
                    const coords = e.get("coords");
                    if (!coords) return;
                    if (placemarkRef.current) {
                        moveMarker(coords);
                    } else {
                        placeMarker(ymaps, coords);
                    }
                    const address = await reverseGeocode(ymaps, coords[0], coords[1]);
                    if (address) {
                        setSearchValue(address);
                        onAddressSelect(address, { lat: coords[0], lon: coords[1] });
                    }
                });

                if (searchInputRef.current) {
                    const suggest = new ymaps.SuggestControl(searchInputRef.current);
                    suggest.events.add("select", (event) => {
                        const item = event.get("item") as { value?: string } | undefined;
                        const addr = item?.value || "";
                        if (addr) {
                            setSearchValue(addr);
                            handleSearchSubmit(addr);
                        }
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
        if (!address.trim() || !window.ymaps) return;
        const ymaps = window.ymaps;
        setLoading(true);
        const geo = await forwardGeocode(ymaps, address.trim());
        setLoading(false);
        if (!geo) {
            setError("Адрес не найден. Уточните запрос.");
            return;
        }
        setError("");
        setSearchValue(geo.displayName);
        if (placemarkRef.current) {
            moveMarker([geo.lat, geo.lon]);
        } else {
            placeMarker(ymaps, [geo.lat, geo.lon]);
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

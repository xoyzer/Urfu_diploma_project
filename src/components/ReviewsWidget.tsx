import { useEffect, useRef } from "react";

export function ReviewsWidget() {
    const containerRef = useRef<HTMLDivElement>(null);
    const scriptLoaded = useRef(false);

    useEffect(() => {
        // Если скрипт уже загружен — не загружаем повторно

        const script = document.createElement("script");
        script.src = "https://res.smartwidgets.ru/app.js";
        script.async = true;
        script.onload = () => {
            scriptLoaded.current = true;
        };
        document.body.appendChild(script);
    }, []);

    return <div ref={containerRef} className="sw-app" data-app="3fad8dce0d19995e761be2347adfe4ba" />;
}

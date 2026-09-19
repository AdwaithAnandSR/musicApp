export function makeLightColor(hex, amount = 0.5) {
    if(!hex) return "rgb(247,45,116)"
    
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    let h, s;
    let l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }

        h /= 6;
    }

    // Increase lightness
    l = l + (1 - l) * amount;

    function hueToRgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }

    let rr, gg, bb;

    if (s === 0) {
        rr = gg = bb = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;

        const p = 2 * l - q;

        rr = hueToRgb(p, q, h + 1 / 3);
        gg = hueToRgb(p, q, h);
        bb = hueToRgb(p, q, h - 1 / 3);
    }

    return `#${[rr, gg, bb]
        .map(x =>
            Math.round(x * 255)
                .toString(16)
                .padStart(2, "0")
        )
        .join("")}`;
}

export function isDarkColor(hex) {
    if(!hex) return false
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Perceived brightness
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

    return brightness < 60;
}

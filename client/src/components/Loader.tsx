import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedProps,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    Easing,
    cancelAnimation,
    runOnJS
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const N = 64;
type Pt = [number, number];
type Polygon = Pt[];

function arcLengthSample(curve: (t: number) => Pt, n: number): Polygon {
    const OVER = 512;
    const raw: Pt[] = [];
    for (let i = 0; i <= OVER; i++) raw.push(curve(i / OVER));

    const cum: number[] = [0];
    for (let i = 1; i <= OVER; i++) {
        cum.push(
            cum[i - 1] +
                Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1])
        );
    }
    const total = cum[OVER];

    const result: Polygon = [];
    let j = 0;
    for (let i = 0; i < n; i++) {
        const target = (i / n) * total;
        while (j < OVER - 1 && cum[j + 1] < target) j++;
        const blend =
            cum[j + 1] === cum[j]
                ? 0
                : (target - cum[j]) / (cum[j + 1] - cum[j]);
        result.push([
            raw[j][0] + (raw[j + 1][0] - raw[j][0]) * blend,
            raw[j][1] + (raw[j + 1][1] - raw[j][1]) * blend
        ]);
    }
    return result;
}

function sampleCircle(cx: number, cy: number, r: number): Polygon {
    return arcLengthSample(
        t => [
            cx + r * Math.cos(2 * Math.PI * t),
            cy + r * Math.sin(2 * Math.PI * t)
        ],
        N
    );
}

function sampleSquare(cx: number, cy: number, r: number): Polygon {
    const s = r * 0.82;
    return arcLengthSample(t => {
        const theta = 2 * Math.PI * t;
        const cos = Math.cos(theta),
            sin = Math.sin(theta);
        const p = 6;
        const scale =
            s /
            Math.pow(
                Math.pow(Math.abs(cos), p) + Math.pow(Math.abs(sin), p),
                1 / p
            );
        return [cx + scale * cos, cy + scale * sin];
    }, N);
}

function sampleTriangle(cx: number, cy: number, r: number): Polygon {
    const h = r * 0.9;
    const rc = h * 0.18;
    const verts: Pt[] = [
        [cx, cy - h],
        [
            cx + h * Math.sin((2 * Math.PI) / 3),
            cy - h * Math.cos((2 * Math.PI) / 3)
        ],
        [
            cx + h * Math.sin((4 * Math.PI) / 3),
            cy - h * Math.cos((4 * Math.PI) / 3)
        ]
    ];
    const nv = 3;
    const edgeLen = Math.hypot(
        verts[1][0] - verts[0][0],
        verts[1][1] - verts[0][1]
    );
    const straight = edgeLen - 2 * rc;
    const arcSeg = (Math.PI / 3) * rc;
    const segLen = straight + arcSeg;
    const totalLen = nv * segLen;

    return arcLengthSample(t => {
        const pos = (t * totalLen) % totalLen;
        const si = Math.floor(pos / segLen) % nv;
        const segT = (pos % segLen) / segLen;
        const sf = straight / segLen;

        const A = verts[si];
        const B = verts[(si + 1) % nv];
        const C = verts[(si + 2) % nv];
        const AB = Math.hypot(B[0] - A[0], B[1] - A[1]);
        const uAB: Pt = [(B[0] - A[0]) / AB, (B[1] - A[1]) / AB];

        if (segT < sf) {
            const at = segT / sf;
            const s0: Pt = [A[0] + uAB[0] * rc, A[1] + uAB[1] * rc];
            const s1: Pt = [B[0] - uAB[0] * rc, B[1] - uAB[1] * rc];
            return [s0[0] + (s1[0] - s0[0]) * at, s0[1] + (s1[1] - s0[1]) * at];
        } else {
            const at = (segT - sf) / (1 - sf);
            const BC = Math.hypot(C[0] - B[0], C[1] - B[1]);
            const uBC: Pt = [(C[0] - B[0]) / BC, (C[1] - B[1]) / BC];
            const p1: Pt = [B[0] - uAB[0] * rc, B[1] - uAB[1] * rc];
            const p2: Pt = [B[0] + uBC[0] * rc, B[1] + uBC[1] * rc];
            return [
                (1 - at) * (1 - at) * p1[0] +
                    2 * (1 - at) * at * B[0] +
                    at * at * p2[0],
                (1 - at) * (1 - at) * p1[1] +
                    2 * (1 - at) * at * B[1] +
                    at * at * p2[1]
            ];
        }
    }, N);
}

function sampleDiamond(cx: number, cy: number, r: number): Polygon {
    const d = r * 0.9;
    const rc = d * 0.16;
    const verts: Pt[] = [
        [cx, cy - d],
        [cx + d, cy],
        [cx, cy + d],
        [cx - d, cy]
    ];
    const nv = 4;
    const edgeLen = Math.hypot(
        verts[1][0] - verts[0][0],
        verts[1][1] - verts[0][1]
    );
    const straight = edgeLen - 2 * rc;
    const arcSeg = (Math.PI / 2) * rc;
    const segLen = straight + arcSeg;
    const totalLen = nv * segLen;

    return arcLengthSample(t => {
        const pos = (t * totalLen) % totalLen;
        const si = Math.floor(pos / segLen) % nv;
        const segT = (pos % segLen) / segLen;
        const sf = straight / segLen;

        const A = verts[si];
        const B = verts[(si + 1) % nv];
        const C = verts[(si + 2) % nv];
        const AB = Math.hypot(B[0] - A[0], B[1] - A[1]);
        const uAB: Pt = [(B[0] - A[0]) / AB, (B[1] - A[1]) / AB];

        if (segT < sf) {
            const at = segT / sf;
            const s0: Pt = [A[0] + uAB[0] * rc, A[1] + uAB[1] * rc];
            const s1: Pt = [B[0] - uAB[0] * rc, B[1] - uAB[1] * rc];
            return [s0[0] + (s1[0] - s0[0]) * at, s0[1] + (s1[1] - s0[1]) * at];
        } else {
            const at = (segT - sf) / (1 - sf);
            const BC = Math.hypot(C[0] - B[0], C[1] - B[1]);
            const uBC: Pt = [(C[0] - B[0]) / BC, (C[1] - B[1]) / BC];
            const p1: Pt = [B[0] - uAB[0] * rc, B[1] - uAB[1] * rc];
            const p2: Pt = [B[0] + uBC[0] * rc, B[1] + uBC[1] * rc];
            return [
                (1 - at) * (1 - at) * p1[0] +
                    2 * (1 - at) * at * B[0] +
                    at * at * p2[0],
                (1 - at) * (1 - at) * p1[1] +
                    2 * (1 - at) * at * B[1] +
                    at * at * p2[1]
            ];
        }
    }, N);
}

function alignTo(ref: Polygon, poly: Polygon): Polygon {
    let best = 0,
        bestDist = Infinity;
    for (let s = 0; s < N; s++) {
        let dist = 0;
        for (let i = 0; i < N; i++) {
            const j = (i + s) % N;
            dist +=
                (ref[i][0] - poly[j][0]) ** 2 + (ref[i][1] - poly[j][1]) ** 2;
            if (dist >= bestDist) break;
        }
        if (dist < bestDist) {
            bestDist = dist;
            best = s;
        }
    }
    return [...poly.slice(best), ...poly.slice(0, best)];
}

function flatten(poly: Polygon): number[] {
    const a = new Array(N * 2);
    for (let i = 0; i < N; i++) {
        a[i * 2] = poly[i][0];
        a[i * 2 + 1] = poly[i][1];
    }
    return a;
}

function catmullRomPath(f: number[]): string {
    "worklet";
    const n = f.length >> 1;
    const tension = 0.5;
    const gx = (i: number) => f[(((i % n) + n) % n) * 2];
    const gy = (i: number) => f[(((i % n) + n) % n) * 2 + 1];
    let d = `M ${gx(0)} ${gy(0)}`;
    for (let i = 0; i < n; i++) {
        const cp1x = gx(i) + ((gx(i + 1) - gx(i - 1)) * tension) / 3;
        const cp1y = gy(i) + ((gy(i + 1) - gy(i - 1)) * tension) / 3;
        const cp2x = gx(i + 1) - ((gx(i + 2) - gx(i)) * tension) / 3;
        const cp2y = gy(i + 1) - ((gy(i + 2) - gy(i)) * tension) / 3;
        d += ` C ${cp1x} ${cp1y},${cp2x} ${cp2y},${gx(i + 1)} ${gy(i + 1)}`;
    }
    return d + "Z";
}

function lerpFlat(a: number[], b: number[], t: number): number[] {
    "worklet";
    const out = new Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * t;
    return out;
}

function eioC(t: number): number {
    "worklet";
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

const SHAPE_COUNT = 4;

function buildPairs(cx: number, cy: number, r: number): [number[], number[]][] {
    const circle = sampleCircle(cx, cy, r);
    const square = alignTo(circle, sampleSquare(cx, cy, r));
    const triangle = alignTo(square, sampleTriangle(cx, cy, r));
    const diamond = alignTo(triangle, sampleDiamond(cx, cy, r));
    const circleWrap = alignTo(diamond, sampleCircle(cx, cy, r));

    const shapes = [circle, square, triangle, diamond, circleWrap];

    return Array.from({ length: SHAPE_COUNT }, (_, i) => [
        flatten(shapes[i]),
        flatten(shapes[i + 1])
    ]);
}

interface MorphingLoaderProps {
    size?: number | "small" | "large";
    color?: string;
    animating?: boolean;
    holdDuration?: number;
    morphDuration?: number;
    style?: StyleProp<ViewStyle>;
}

export function MorphingLoader({
    size = "small",
    color = "#c2edd8",
    animating = true,
    holdDuration = 800,
    morphDuration = 600,
    style
}: MorphingLoaderProps) {
    const px = size === "small" ? 24 : size === "large" ? 44 : (size as number);
    const cx = px / 2,
        cy = px / 2,
        r = px * 0.4;

    const pairs = useMemo(() => buildPairs(cx, cy, r), [px]);

    const morphT = useSharedValue(0);
    const pairIdx = useSharedValue(0);
    const rotation = useSharedValue(0);

    const pairIdxRef = useRef(0);
    const activeRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const advanceShape = useCallback(() => {
        if (!activeRef.current) return;

        pairIdxRef.current = (pairIdxRef.current + 1) % SHAPE_COUNT;
        pairIdx.value = pairIdxRef.current;
        morphT.value = 0;

        timerRef.current = setTimeout(() => {
            if (!activeRef.current) return;
            morphT.value = withTiming(
                1,
                {
                    duration: morphDuration,
                    easing: Easing.bezier(0.37, 0, 0.63, 1)
                },
                finished => {
                    if (finished) runOnJS(advanceShape)();
                }
            );
        }, holdDuration);
    }, [holdDuration, morphDuration]);

    useEffect(() => {
        if (!animating) {
            activeRef.current = false;
            if (timerRef.current) clearTimeout(timerRef.current);
            cancelAnimation(morphT);
            cancelAnimation(rotation);
            morphT.value = 0;
            pairIdx.value = 0;
            pairIdxRef.current = 0;
            return;
        }

        activeRef.current = true;
        pairIdxRef.current = 0;
        pairIdx.value = 0;
        morphT.value = 0;

        timerRef.current = setTimeout(() => {
            if (!activeRef.current) return;
            morphT.value = withTiming(
                1,
                {
                    duration: morphDuration,
                    easing: Easing.bezier(0.37, 0, 0.63, 1)
                },
                finished => {
                    if (finished) runOnJS(advanceShape)();
                }
            );
        }, holdDuration);

        const cycleDuration = (holdDuration + morphDuration) * SHAPE_COUNT;
        rotation.value = withRepeat(
            withTiming(360, {
                duration: cycleDuration * 3,
                easing: Easing.linear
            }),
            -1,
            false
        );

        return () => {
            activeRef.current = false;
            if (timerRef.current) clearTimeout(timerRef.current);
            cancelAnimation(morphT);
            cancelAnimation(rotation);
        };
    }, [animating, holdDuration, morphDuration, advanceShape]);

    const animatedPathProps = useAnimatedProps(() => {
        "worklet";
        const idx = pairIdx.value;
        const t = eioC(morphT.value);
        const interpolated = lerpFlat(pairs[idx][0], pairs[idx][1], t);
        return { d: catmullRomPath(interpolated) };
    });

    const rotationStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }]
    }));

    if (!animating) return null;

    return (
        <View style={[s.wrap, style]}>
            <Animated.View style={[{ width: px, height: px }, rotationStyle]}>
                <Svg width={px} height={px} viewBox={`0 0 ${px} ${px}`}>
                    <AnimatedPath
                        animatedProps={animatedPathProps}
                        fill={color}
                    />
                </Svg>
            </Animated.View>
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { alignItems: "center", justifyContent: "center" }
});

export default MorphingLoader;

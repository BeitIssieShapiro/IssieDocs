import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, ImageSize, StyleSheet, TouchableOpacity, View, ViewToken } from 'react-native';

import Canvas from './canvas/canvas';
import { replayPageQueue, PageState } from './canvas/page-state';
import { ElementTypes } from './canvas/types';
import { migrateMetadata } from './state-migrate';
import { FileSystem } from './filesystem';
import { AppText, semanticColors } from './elements';
import { MyIcon } from './common/icons';
import { isRTL } from './lang';

// Delay after scrolling stops before visible pages get their writing drawn.
const SETTLE_MS = 1500;

const THUMB_WIDTH = 130;
const THUMB_HEIGHT = Math.round(THUMB_WIDTH * 1.414); // A4 portrait
const LABEL_HEIGHT = 24;
const ITEM_PADDING = 8;
const ITEM_HEIGHT = THUMB_HEIGHT + LABEL_HEIGHT + ITEM_PADDING * 2;
export const PAGE_NAVIGATOR_WIDTH = THUMB_WIDTH + ITEM_PADDING * 2 + 8;

const noop = () => { };
const VIEWABILITY = { itemVisiblePercentThreshold: 10 };
const NO_EDIT = {};

interface LoadedPage {
    state: PageState;
    imageSize: ImageSize;
}

interface PageNavigatorProps {
    sheet: any; // work-sheet
    currentIndex: number;
    top: number;
    bottom: number;
    // canvas width the writing is laid out for; thumbnails are drawn at this width and scaled down
    referenceWidth: number;
    onSelectPage: (index: number) => void;
    onClose: () => void;
}

export function PageNavigator({ sheet, currentIndex, top, bottom, referenceWidth, onSelectPage, onClose }: PageNavigatorProps) {
    const [settled, setSettled] = useState(false);
    const [visible, setVisible] = useState<Set<number>>(new Set());
    const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const cache = useRef(new Map<string, Promise<LoadedPage | null>>());

    const scheduleSettle = useCallback(() => {
        if (settleTimer.current) clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(() => setSettled(true), SETTLE_MS);
    }, []);

    const onScrollStart = useCallback(() => {
        if (settleTimer.current) clearTimeout(settleTimer.current);
        setSettled(false);
    }, []);

    useEffect(() => {
        scheduleSettle();
        return () => { if (settleTimer.current) clearTimeout(settleTimer.current); };
    }, []);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        setVisible(new Set(viewableItems.map(v => v.index as number)));
    }).current;

    const loadPage = useCallback((index: number) => {
        const path = sheet.getPage(index);
        let p = cache.current.get(path);
        if (!p) {
            p = loadPageState(sheet, index, referenceWidth);
            cache.current.set(path, p);
        }
        return p;
    }, [sheet, referenceWidth]);

    const pages = Array.from({ length: sheet.count }, (_, i) => i);
    const side = isRTL() ? { right: 0 } : { left: 0 };

    return (
        <View style={[styles.panel, side, { top, bottom }]} testID="page-navigator">
            <TouchableOpacity style={styles.close} onPress={onClose} testID="page-navigator-close">
                <MyIcon info={{ type: "MDI", name: "close", size: 30, color: semanticColors.titleText }} />
            </TouchableOpacity>
            <FlatList
                data={pages}
                keyExtractor={i => String(i)}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                initialScrollIndex={Math.max(0, currentIndex - 1)}
                onScrollBeginDrag={onScrollStart}
                onScrollEndDrag={scheduleSettle}
                onMomentumScrollBegin={onScrollStart}
                onMomentumScrollEnd={scheduleSettle}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={VIEWABILITY}
                extraData={[settled, visible, currentIndex]}
                windowSize={5}
                initialNumToRender={6}
                renderItem={({ item: index }) => (
                    <PageThumbnail
                        index={index}
                        src={sheet.getPage(index)}
                        selected={index === currentIndex}
                        drawWriting={settled && visible.has(index)}
                        referenceWidth={referenceWidth}
                        loadPage={loadPage}
                        onPress={() => onSelectPage(index)}
                    />
                )}
            />
        </View>
    );
}

async function loadPageState(sheet: any, index: number, referenceWidth: number): Promise<LoadedPage | null> {
    const path = sheet.getPage(index);
    try {
        const imageSize = await Image.getSize(path);
        const raw = await FileSystem.main.loadFile(path + ".json").catch(() => undefined);
        if (!raw) return null; // never edited: the plain image is accurate
        const parsed = JSON.parse(raw);
        let elements: any[];
        if (Array.isArray(parsed)) {
            const ratio = referenceWidth / imageSize.width;
            elements = migrateMetadata(parsed, { width: referenceWidth, height: imageSize.height * ratio }, ratio);
        } else {
            elements = parsed.elements ?? [];
        }
        if (elements.length === 0) return null;
        const state = replayPageQueue(elements, FileSystem.main.getAttachmentBase(sheet, index));
        return { state, imageSize };
    } catch (e) {
        return null;
    }
}

interface PageThumbnailProps {
    index: number;
    src: string;
    selected: boolean;
    drawWriting: boolean;
    referenceWidth: number;
    loadPage: (index: number) => Promise<LoadedPage | null>;
    onPress: () => void;
}

const PageThumbnail = React.memo(function PageThumbnail({ index, src, selected, drawWriting, referenceWidth, loadPage, onPress }: PageThumbnailProps) {
    const [loaded, setLoaded] = useState<LoadedPage | null>(null);

    // Once drawn, keep the writing while mounted: re-scrolling costs nothing extra.
    useEffect(() => {
        if (!drawWriting || loaded) return;
        let cancelled = false;
        loadPage(index).then(res => { if (!cancelled && res) setLoaded(res); });
        return () => { cancelled = true; };
    }, [drawWriting]);

    return (
        <TouchableOpacity onPress={onPress} style={styles.item} testID={`page-thumb-${index}`}>
            <View style={[styles.thumb, selected && styles.thumbSelected]}>
                {loaded ?
                    <ThumbnailWriting loaded={loaded} src={src} referenceWidth={referenceWidth} /> :
                    <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="contain" />}
            </View>
            <AppText style={[styles.label, selected && styles.labelSelected]}>{index + 1}</AppText>
        </TouchableOpacity>
    );
});

function ThumbnailWriting({ loaded, src, referenceWidth }: { loaded: LoadedPage, src: string, referenceWidth: number }) {
    const { state, imageSize } = loaded;
    const ratio = referenceWidth / imageSize.width;
    const bgHeight = imageSize.height * ratio;
    const canvasHeight = (imageSize.height + state.pageHeightAddition) * ratio;
    const scale = Math.min(THUMB_WIDTH / referenceWidth, THUMB_HEIGHT / canvasHeight);
    const left = (THUMB_WIDTH - referenceWidth * scale) / 2;
    const top = (THUMB_HEIGHT - canvasHeight * scale) / 2;

    return (
        <View pointerEvents="none" style={{
            position: 'absolute', left, top, width: referenceWidth, height: canvasHeight,
            transformOrigin: "0 0 0", transform: [{ scale }],
        }}>
            <Canvas
                paths={state.paths}
                texts={state.texts}
                lines={state.rulers}
                images={state.images}
                tables={state.tables}
                overlays={state.overlays}
                showCutWhiteouts={state.background === undefined}
                currentEdited={NO_EDIT}
                canvasWidth={referenceWidth}
                canvasHeight={canvasHeight}
                originalBgImageHeight={bgHeight}
                imageSource={{ uri: src }}
                background={state.background}
                ratio={ratio}
                zoom={1}
                offset={{ x: 0, y: 0 }}
                sideMargin={0}
                canvasTop={0}
                style={{ overflow: 'hidden' }}
                sketchColor="black"
                sketchStrokeWidth={1}
                currentElementType={ElementTypes.Sketch}
                onZoom={noop}
                onMoveCanvas={noop}
                onSketchStart={noop}
                onSketchStep={noop}
                onSketchEnd={noop}
                onTextChanged={noop}
                onCanvasClick={noop}
                onMoveElement={noop}
                onMoveEnd={noop}
                onDeleteElement={noop}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    panel: {
        position: 'absolute',
        width: PAGE_NAVIGATOR_WIDTH,
        backgroundColor: semanticColors.mainAreaBG,
        zIndex: 150,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    close: {
        alignSelf: 'center',
        padding: 6,
    },
    item: {
        height: ITEM_HEIGHT,
        padding: ITEM_PADDING,
        alignItems: 'center',
    },
    thumb: {
        width: THUMB_WIDTH,
        height: THUMB_HEIGHT,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: semanticColors.inputBorder,
        overflow: 'hidden',
    },
    thumbSelected: {
        borderWidth: 3,
        borderColor: semanticColors.selectedIconColor,
    },
    label: {
        height: LABEL_HEIGHT,
        fontSize: 18,
        lineHeight: LABEL_HEIGHT,
        color: semanticColors.titleText,
    },
    labelSelected: {
        fontWeight: 'bold',
        color: semanticColors.selectedIconColor,
    },
});

import { MapConfig, MarkerTilingOptions, GeoRectBounds, MapProvider, MapViewControllerInterface, MarkerOverlayRenderer, MarkerEntity, AbstractZoomAltitudeConverter, MapCameraPosition, MapViewHolderBase, GeoPointInterface, Offset, GeoPoint, AbstractMarkerOverlayRenderer, BitmapIcon, AddParams, ChangeParams, AbstractMarkerController, MarkerState, RasterLayerState, CircleOverlayRenderer, CircleEntity, CircleAddParams, CircleChangeParams, CircleController, PolylineOverlayRenderer, PolylineEntity, PolylineAddParams, PolylineChangeParams, PolylineController, PolygonOverlayRenderer, PolygonEntity, PolygonAddParams, PolygonChangeParams, PolygonController, GroundImageOverlayRenderer, GroundImageEntity, GroundImageAddParams, GroundImageChangeParams, GroundImageController, RasterLayerOverlayRenderer, RasterLayerEntity, RasterLayerAddParams, RasterLayerChangeParams, RasterLayerController, RasterHeaderSupport, BaseMapViewController, MarkerCapable, CircleCapable, PolylineCapable, PolygonCapable, GroundImageCapable, RasterLayerCapable, MapUISettings, OnMapInitializedHandler, OnMarkerEventHandler, MarkerAnimationOverlayHost, MapViewBaseProps } from '@mapconductor/js-sdk-core';
import { ArcGISDesignTypeInterface, ArcGISMapViewStateInterface } from './state.js';
export { ArcGISDesign, ArcGISDesignType, ArcGISMapViewState, ArcGISMapViewStateParams, ArcGISViewState, ArcGISViewStateOptions, useArcGISViewState } from './state.js';
import Graphic from '@arcgis/core/Graphic';
import * as React from 'react';
import React__default from 'react';

interface ArcGISMapViewInitOptions {
    basemapStyle: string;
    elevationSources: readonly string[];
}
interface ArcGISConfig extends MapConfig {
    apiKey?: string;
    mapDesignType?: ArcGISDesignTypeInterface;
    markerTilingOptions?: MarkerTilingOptions;
    useSceneView?: boolean;
    minZoom?: number;
    maxZoom?: number;
    /** Restricts panning/zooming so the viewport cannot leave this rectangle. */
    restrictBounds?: GeoRectBounds;
}

declare class ArcGISMapProvider extends MapProvider {
    private resizeObserver;
    private restrictBoundsWatchdog;
    initialize(config: ArcGISConfig): Promise<MapViewControllerInterface>;
    destroy(): void;
    private createBasemap;
}

type ArcGISActualMarker = __esri.Graphic;
type ArcGISActualMap = __esri.SceneView | __esri.MapView;
type ArcGISActualCircle = __esri.Graphic;
type ArcGISActualPolyline = __esri.Graphic;
type ArcGISActualPolygon = __esri.Graphic;
type ArcGISActualGroundImage = __esri.ImageElement;
type ArcGISActualRasterLayer = __esri.Layer;

interface ArcGISMarkerRendererInterface<ActualMarker = ArcGISActualMarker> extends MarkerOverlayRenderer<ActualMarker> {
    createMarker(state: MarkerEntity<ActualMarker>): ActualMarker | null;
    updateMarker(marker: ActualMarker, state: MarkerEntity<ActualMarker>): void;
    removeMarker(marker: ActualMarker): void;
}

interface ZoomAltitudeViewportSize {
    width: number;
    height: number;
}
declare class ZoomAltitudeConverter extends AbstractZoomAltitudeConverter {
    private readonly viewportSizeProvider;
    static readonly ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE = 136500000;
    static readonly REFERENCE_VIEWPORT_HEIGHT_PX = 720;
    static readonly SCENE_VIEW_DIAGONAL_FOV_DEG = 55;
    constructor(zoom0Altitude?: number, viewportSizeProvider?: (() => ZoomAltitudeViewportSize | null) | null);
    private effectiveZoom0Altitude;
    private cosLatitudeFactor;
    private cosTiltFactor;
    zoomLevelToAltitude({ zoomLevel, latitude, tilt, }: {
        zoomLevel: number;
        latitude: number;
        tilt: number;
    }): number;
    altitudeToZoomLevel({ altitude, latitude, tilt, }: {
        altitude: number;
        latitude: number;
        tilt: number;
    }): number;
    zoomLevelToDistance({ zoomLevel, latitude, }: {
        zoomLevel: number;
        latitude: number;
    }): number;
    distanceToZoomLevel({ distance, latitude, }: {
        distance: number;
        latitude: number;
    }): number;
    mapCameraPositionToCameraOptions(cameraPosition: MapCameraPosition | null, { snapZoom }?: {
        snapZoom?: boolean;
    }): __esri.CameraProperties | null;
}

declare class ArcGISViewHolder extends MapViewHolderBase<HTMLElement, __esri.SceneView | __esri.MapView> {
    readonly mapView: HTMLElement;
    readonly map: __esri.SceneView | __esri.MapView;
    readonly zoomConverter: ZoomAltitudeConverter;
    constructor(mapView: HTMLElement, map: __esri.SceneView | __esri.MapView, zoomConverter: ZoomAltitudeConverter);
    toScreenOffset(position: GeoPointInterface): Offset | null;
    fromScreenOffsetSync(offset: Offset): GeoPoint | null;
}

declare class ArcGISMarkerRenderer extends AbstractMarkerOverlayRenderer<ArcGISViewHolder, __esri.Graphic> implements ArcGISMarkerRendererInterface<__esri.Graphic> {
    private graphicsLayer;
    constructor(holder: ArcGISViewHolder, graphicsLayer: __esri.GraphicsLayer);
    createMarker(entity: MarkerEntity<__esri.Graphic>, bitmapIcon?: BitmapIcon): __esri.Graphic | null;
    updateMarker(graphic: __esri.Graphic, entity: MarkerEntity<__esri.Graphic>, bitmapIcon?: BitmapIcon): void;
    removeMarker(graphic: __esri.Graphic): void;
    onAdd(data: AddParams[]): Promise<(__esri.Graphic | null)[]>;
    onChange(data: ChangeParams<__esri.Graphic>[]): Promise<(__esri.Graphic | null)[]>;
    onRemove(data: MarkerEntity<__esri.Graphic>[]): Promise<void>;
    onPostProcess(): Promise<void>;
    setMarkerPosition(entity: MarkerEntity<__esri.Graphic>, position: GeoPoint): void;
    setMarkerVisible(entity: MarkerEntity<__esri.Graphic>, visible: boolean): void;
    /**
     * 2D で地図コンテナを CSS `rotateX` で傾けているぶん、マーカーだけ先に縦へ引き伸ばして
     * 潰れを打ち消す倍率（`ArcGIS2DTiltEmulation.markerVerticalStretch`）。3D は常に 1。
     */
    private verticalStretch;
    /**
     * 縦補正の倍率を更新する。変化したら `true`（呼び出し元が既存シンボルを作り直す）。
     */
    setVerticalStretchForTilt(tilt: number): boolean;
    /** 既存マーカーのシンボルを、現在の縦補正で作り直す。 */
    rebuildSymbol(marker: __esri.Graphic, bitmapIcon: BitmapIcon): void;
    private createMarkerSymbol;
}

declare abstract class AbstractArcGISController<ActualMarker = ArcGISActualMarker, Renderer extends ArcGISMarkerRendererInterface<ActualMarker> = ArcGISMarkerRendererInterface<ActualMarker>> extends AbstractMarkerController<ActualMarker> {
    readonly renderer: Renderer;
    constructor(renderer: Renderer, _tilingOptions?: MarkerTilingOptions);
    protected onMarkerAdded(entity: MarkerEntity<ActualMarker>): void;
    protected abstract attachListeners(marker: ActualMarker, state: MarkerState): void;
}

declare class ArcGISMarkerController extends AbstractArcGISController<__esri.Graphic, ArcGISMarkerRenderer> {
    private readonly tilingOptions;
    private dragHandle;
    private dragEntity;
    private dragOrigin;
    private dragStarted;
    private tileRenderer;
    private tileRouteId;
    private tileVersion;
    private tileGeneration;
    /**
     * 2D の tilt 表現が変わったときに、マーカーの縦補正を掛け直す。
     *
     * 地図コンテナを CSS `rotateX` で傾けると中身が縦に潰れるので、マーカーだけ先に
     * 縦へ引き伸ばして立って見えるようにする（他のオーバーレイは寝たままでよい）。
     */
    refreshVerticalStretch(tilt: number): void;
    /** Called by ArcGISMapViewController when RasterLayerState changes. */
    onRasterLayerUpdate: ((state: RasterLayerState | null) => Promise<void>) | null;
    constructor(renderer: ArcGISMarkerRenderer, tilingOptions?: MarkerTilingOptions);
    protected shouldTile(state: MarkerState, totalCount: number): boolean;
    protected onTiledMarkersChanged(): Promise<void>;
    findTiled(position: GeoPoint, zoom: number): MarkerEntity<__esri.Graphic> | null;
    private syncTiledOverlay;
    private removeTileOverlay;
    clear(): Promise<void>;
    protected attachListeners(_marker: __esri.Graphic, _state: MarkerState): void;
    update(state: MarkerState): Promise<void>;
    destroy(): void;
    private readonly handleViewDrag;
    /**
     * ドラッグ位置はカーソル座標をそのまま使う（アンカー ＝ カーソル）。
     * 多くの JS 地図 SDK がこの挙動で、掴んだ瞬間にピンが少し跳ね上がることが
     * 「今ドラッグしている」という手掛かりになる。3 プラットフォームでこれに統一している。
     */
    private dragPositionFromEvent;
    private moveMarkerGraphic;
    findAtScreen(screen: Offset, zoom?: number): MarkerEntity<__esri.Graphic> | null;
    private findDraggableAtScreen;
    private findHitAtScreen;
}

declare class ArcGISCircleOverlayRenderer implements CircleOverlayRenderer<__esri.Graphic> {
    readonly holder: ArcGISViewHolder;
    private graphicsLayer;
    constructor(holder: ArcGISViewHolder, graphicsLayer: __esri.GraphicsLayer);
    createCircle(entity: CircleEntity<__esri.Graphic>): __esri.Graphic | null;
    updateCircle(graphic: __esri.Graphic, entity: CircleEntity<__esri.Graphic>): void;
    private createCircleGeometry;
    removeCircle(graphic: __esri.Graphic): void;
    onAdd(data: CircleAddParams[]): Promise<(Graphic | null)[]>;
    onChange(data: CircleChangeParams<Graphic>[]): Promise<(Graphic | null)[]>;
    onRemove(data: CircleEntity<Graphic>[]): Promise<void>;
    onPostProcess(): Promise<void>;
    private createCircleSymbol;
}

declare class ArcGISCircleOverlayController extends CircleController<__esri.Graphic> {
    readonly renderer: ArcGISCircleOverlayRenderer;
    constructor(renderer: ArcGISCircleOverlayRenderer);
}

declare class ArcGISPolylineOverlayRenderer implements PolylineOverlayRenderer<__esri.Graphic> {
    readonly holder: ArcGISViewHolder;
    private graphicsLayer;
    constructor(holder: ArcGISViewHolder, graphicsLayer: __esri.GraphicsLayer);
    createPolyline(entity: PolylineEntity<__esri.Graphic>): __esri.Graphic | null;
    updatePolyline(graphic: __esri.Graphic, entity: PolylineEntity<__esri.Graphic>): void;
    removePolyline(graphic: __esri.Graphic): void;
    onAdd(data: PolylineAddParams[]): Promise<(Graphic | null)[]>;
    onChange(data: PolylineChangeParams<Graphic>[]): Promise<(Graphic | null)[]>;
    onRemove(data: PolylineEntity<Graphic>[]): Promise<void>;
    onPostProcess(): Promise<void>;
    private createGeometry;
    private createLineSymbol;
    private lineStyleToArcGISStyle;
}

declare class ArcGISPolylineOverlayController extends PolylineController<__esri.Graphic> {
    readonly renderer: ArcGISPolylineOverlayRenderer;
    constructor(renderer: ArcGISPolylineOverlayRenderer);
}

declare class ArcGISPolygonOverlayRenderer implements PolygonOverlayRenderer<__esri.Graphic> {
    readonly holder: ArcGISViewHolder;
    private graphicsLayer;
    constructor(holder: ArcGISViewHolder, graphicsLayer: __esri.GraphicsLayer);
    createPolygon(entity: PolygonEntity<__esri.Graphic>): __esri.Graphic | null;
    updatePolygon(graphic: __esri.Graphic, entity: PolygonEntity<__esri.Graphic>): void;
    removePolygon(graphic: __esri.Graphic): void;
    onAdd(data: PolygonAddParams[]): Promise<(Graphic | null)[]>;
    onChange(data: PolygonChangeParams<Graphic>[]): Promise<(Graphic | null)[]>;
    onRemove(data: PolygonEntity<Graphic>[]): Promise<void>;
    onPostProcess(): Promise<void>;
    private createGeometry;
    private createFillSymbol;
}

declare class ArcGISPolygonOverlayController extends PolygonController<__esri.Graphic> {
    readonly renderer: ArcGISPolygonOverlayRenderer;
    constructor(renderer: ArcGISPolygonOverlayRenderer);
}

declare class ArcGISGroundImageOverlayRenderer implements GroundImageOverlayRenderer<__esri.ImageElement> {
    readonly holder: ArcGISViewHolder;
    private elements;
    constructor(holder: ArcGISViewHolder, elements: __esri.Collection<__esri.MediaElement>);
    createGroundImage(entity: GroundImageEntity<__esri.ImageElement>): __esri.ImageElement | null;
    updateGroundImage(element: __esri.ImageElement, entity: GroundImageEntity<__esri.ImageElement>): void;
    removeGroundImage(element: __esri.ImageElement): void;
    onAdd(data: GroundImageAddParams[]): Promise<(__esri.ImageElement | null)[]>;
    onChange(data: GroundImageChangeParams<__esri.ImageElement>[]): Promise<(__esri.ImageElement | null)[]>;
    onRemove(data: GroundImageEntity<__esri.ImageElement>[]): Promise<void>;
    onPostProcess(): Promise<void>;
}

declare class ArcGISGroundImageController extends GroundImageController<__esri.ImageElement> {
    readonly renderer: ArcGISGroundImageOverlayRenderer;
    constructor(renderer: ArcGISGroundImageOverlayRenderer);
}

declare class ArcGISRasterLayerOverlayRenderer implements RasterLayerOverlayRenderer<__esri.Layer> {
    readonly holder: ArcGISViewHolder;
    constructor(holder: ArcGISViewHolder);
    createRasterLayer(entity: RasterLayerEntity<__esri.Layer>): Promise<__esri.Layer | null>;
    removeRasterLayer(layer: __esri.Layer): Promise<void>;
    onAdd(data: RasterLayerAddParams[]): Promise<(__esri.Layer | null)[]>;
    onChange(data: RasterLayerChangeParams<__esri.Layer>[]): Promise<(__esri.Layer | null)[]>;
    onRemove(data: RasterLayerEntity<__esri.Layer>[]): Promise<void>;
    onCameraChanged(_mapCameraPosition: MapCameraPosition): Promise<void>;
    onPostProcess(): Promise<void>;
    private buildLayer;
}

declare class ArcGISRasterLayerController extends RasterLayerController<__esri.Layer> {
    /**
     * WebTileLayer のタイル取得に介入する口が無い（esriConfig.request.interceptors は
     * 未検証のため、確かめずに対応とは書かない）。
     *
     * userAgent はブラウザが上書きを許さないので、どのプロバイダでも web では効かない。
     */
    protected get headerSupport(): RasterHeaderSupport;
    readonly renderer: ArcGISRasterLayerOverlayRenderer;
    constructor(renderer: ArcGISRasterLayerOverlayRenderer);
}

type ArcGISDesignTypeChangeHandler = (value: ArcGISDesignTypeInterface) => void;
declare function arcGISZoomToScale(zoom: number, latitude: number, snapZoom?: boolean): number;
declare function arcGISScaleToZoom(scale: number, latitude: number): number;
declare class ArcGISMapViewController extends BaseMapViewController implements MapViewControllerInterface, MarkerCapable, CircleCapable, PolylineCapable, PolygonCapable, GroundImageCapable, RasterLayerCapable {
    readonly holder: ArcGISViewHolder;
    private readonly markerController;
    private readonly circleController;
    private readonly polylineController;
    private readonly polygonController;
    private readonly groundImageController;
    private readonly rasterLayerController;
    private readonly eventCleanup;
    /**
     * 2D で直近に要求した論理 tilt。2D `MapView` はカメラピッチを持てないため、
     * 負 tilt は中心の前進で表現しており（`ArcGIS2DTiltEmulation`）、読み戻しで元へ
     * 戻すヒントとして保持する。見た目の傾きの購読にも使う。
     */
    private currentLogicalTilt;
    /** 論理 tilt が変わったことをビュー層へ伝える（CSS の rotateX に使う）。 */
    onVisualTiltChanged: ((tilt: number) => void) | null;
    /** 現在の論理 tilt。 */
    getLogicalTilt(): number;
    private initialized;
    private mapDesignType;
    private mapDesignTypeChangeListener;
    constructor(holder: ArcGISViewHolder, markerController: ArcGISMarkerController, circleController: ArcGISCircleOverlayController, polylineController: ArcGISPolylineOverlayController, polygonController: ArcGISPolygonOverlayController, groundImageController: ArcGISGroundImageController, rasterLayerController: ArcGISRasterLayerController, mapDesignType?: ArcGISDesignTypeInterface);
    getMap(): __esri.SceneView | __esri.MapView;
    private uiSettings;
    private gestureGuardsInstalled;
    /**
     * ArcGIS routes navigation through `navigation.actionMap`, which says what
     * each drag button does, plus a few view-level properties. Double-click zoom
     * has no property, so it is stopped at the event instead — the handler is
     * installed once and reads the current flags.
     *
     * A 3D view tilts with the same drag that rotates, and a 2D view has no tilt
     * at all, so `tiltGesture` cannot be honoured on its own.
     */
    applyUISettings(settings: MapUISettings): void;
    setMapDesignType(value: ArcGISDesignTypeInterface): void;
    setMapDesignTypeChangeListener(listener: ArcGISDesignTypeChangeHandler | null): void;
    private setupEventListeners;
    setMapInitializedListener(listener: OnMapInitializedHandler | null): void;
    /**
     * Called by the provider's ResizeObserver when the view container's size
     * changes. getCameraPosition() re-derives zoom from the current viewport
     * height (see ZoomAltitudeConverter), so this just needs to push a fresh
     * notification through the usual channel instead of leaving listeners with
     * a stale zoom until the next real camera move.
     */
    notifyViewportResized(): void;
    getCameraPosition(): MapCameraPosition | null;
    private get cameraDeps();
    /** クリック配送へ渡す依存一式。private を覗かせずに必要なものだけ束ねる。 */
    private get clickDeps();
    moveCamera(position: MapCameraPosition): Promise<boolean>;
    animateCamera(position: MapCameraPosition, durationMillis: number): Promise<boolean>;
    fitBounds(bounds: GeoRectBounds, padding: number): Promise<boolean>;
    setOnMarkerClickListener(listener: OnMarkerEventHandler | null): void;
    setOnMarkerDragStart(listener: OnMarkerEventHandler | null): void;
    setOnMarkerDrag(listener: OnMarkerEventHandler | null): void;
    setOnMarkerDragEnd(listener: OnMarkerEventHandler | null): void;
    setOnMarkerAnimateStart(listener: OnMarkerEventHandler | null): void;
    setOnMarkerAnimateEnd(listener: OnMarkerEventHandler | null): void;
    setMarkerAnimationOverlayHost(host: MarkerAnimationOverlayHost | null): void;
    clearOverlays(): Promise<void>;
    destroy(): void;
}

interface ArcGISMapViewProps extends MapViewBaseProps<ArcGISMapViewStateInterface> {
    style?: React__default.CSSProperties;
    markerTilingOptions?: MarkerTilingOptions;
    minZoom?: number;
    maxZoom?: number;
    /** Restricts panning/zooming so the viewport cannot leave this rectangle. */
    restrictBounds?: GeoRectBounds;
    onError?: (error: Error) => void;
    children?: React__default.ReactNode;
}

declare function ArcGISMapView({ state, className, style, markerTilingOptions, minZoom, maxZoom, restrictBounds, cameraRestriction, onError, onMapLoaded, onMapClick, onMapLongClick, onCameraMoveStart, onCameraMove, onCameraMoveEnd, children, useSceneView, }: ArcGISMapViewProps & {
    useSceneView?: boolean;
}): React.JSX.Element;
declare function ArcGISMapView2D(props: ArcGISMapViewProps): React.JSX.Element;

export { type ArcGISActualCircle, type ArcGISActualGroundImage, type ArcGISActualMap, type ArcGISActualMarker, type ArcGISActualPolygon, type ArcGISActualPolyline, type ArcGISActualRasterLayer, type ArcGISConfig, type ArcGISDesignTypeChangeHandler, ArcGISDesignTypeInterface, ArcGISMapProvider, ArcGISMapView, ArcGISMapView2D, ArcGISMapViewController, type ArcGISMapViewInitOptions, type ArcGISMapViewProps, ArcGISMapViewStateInterface, ZoomAltitudeConverter, type ZoomAltitudeViewportSize, arcGISScaleToZoom, arcGISZoomToScale };

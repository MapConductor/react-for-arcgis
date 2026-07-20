import * as _mapconductor_js_sdk_core from '@mapconductor/js-sdk-core';
import { MapDesignTypeInterface, AttributionRule, MapConfig, MarkerTilingOptions, MapProvider, MapViewControllerInterface, MarkerOverlayRenderer, MarkerEntity, AbstractZoomAltitudeConverter, MapCameraPosition, MapViewHolderBase, GeoPointInterface, Offset, GeoPoint, MarkerAnimationOverlayHost, AddParams, ChangeParams, AbstractMarkerController, MarkerState, OnMarkerEventHandler, CircleOverlayRenderer, CircleEntity, CircleAddParams, CircleChangeParams, CircleController, CircleState, OnCircleEventHandler, PolylineOverlayRenderer, PolylineEntity, PolylineAddParams, PolylineChangeParams, PolylineController, PolylineState, OnPolylineEventHandler, PolygonOverlayRenderer, PolygonEntity, PolygonAddParams, PolygonChangeParams, PolygonController, PolygonState, OnPolygonEventHandler, GroundImageOverlayRenderer, GroundImageEntity, GroundImageAddParams, GroundImageChangeParams, GroundImageController, GroundImageState, OnGroundImageEventHandler, RasterLayerOverlayRenderer, RasterLayerEntity, RasterLayerAddParams, RasterLayerChangeParams, RasterLayerController, RasterLayerState, BaseMapViewController, MarkerCapable, CircleCapable, PolylineCapable, PolygonCapable, GroundImageCapable, RasterLayerCapable, OnMapInitializedHandler, CameraOptions, GeoRectBounds, MapViewStateInterface, MapViewState, MapViewHolder, MapViewBaseProps } from '@mapconductor/js-sdk-core';
import Graphic from '@arcgis/core/Graphic';
import * as React from 'react';
import React__default from 'react';

interface ArcGISDesignTypeInterface extends MapDesignTypeInterface<string> {
    readonly elevationSources: readonly string[];
}
type ArcGISDesignType = ArcGISDesignTypeInterface;
declare class ArcGISDesign implements ArcGISDesignTypeInterface {
    readonly id: string;
    readonly elevationSources: readonly string[];
    readonly attributionRules: readonly AttributionRule[];
    constructor(id: string, elevationSources?: readonly string[], attributionRules?: readonly AttributionRule[]);
    getValue(): string;
    withElevationSources(sources: readonly string[]): ArcGISDesign;
    static readonly Streets: ArcGISDesign;
    static readonly Imagery: ArcGISDesign;
    static readonly ImageryStandard: ArcGISDesign;
    static readonly ImageryLabels: ArcGISDesign;
    static readonly LightGray: ArcGISDesign;
    static readonly LightGrayBase: ArcGISDesign;
    static readonly LightGrayLabels: ArcGISDesign;
    static readonly DarkGray: ArcGISDesign;
    static readonly DarkGrayBase: ArcGISDesign;
    static readonly DarkGrayLabels: ArcGISDesign;
    static readonly Navigation: ArcGISDesign;
    static readonly NavigationNight: ArcGISDesign;
    static readonly StreetsNight: ArcGISDesign;
    static readonly StreetsRelief: ArcGISDesign;
    static readonly Topographic: ArcGISDesign;
    static readonly Oceans: ArcGISDesign;
    static readonly OceansBase: ArcGISDesign;
    static readonly OceansLabels: ArcGISDesign;
    static readonly Terrain: ArcGISDesign;
    static readonly TerrainBase: ArcGISDesign;
    static readonly TerrainDetail: ArcGISDesign;
    static readonly Community: ArcGISDesign;
    static readonly ChartedTerritory: ArcGISDesign;
    static readonly ColoredPencil: ArcGISDesign;
    static readonly Nova: ArcGISDesign;
    static readonly ModernAntique: ArcGISDesign;
    static readonly Midcentury: ArcGISDesign;
    static readonly Newspaper: ArcGISDesign;
    static readonly HillshadeLight: ArcGISDesign;
    static readonly HillshadeDark: ArcGISDesign;
    static readonly StreetsReliefBase: ArcGISDesign;
    static readonly TopographicBase: ArcGISDesign;
    static readonly ChartedTerritoryBase: ArcGISDesign;
    static readonly ModernAntiqueBase: ArcGISDesign;
    static readonly HumanGeography: ArcGISDesign;
    static readonly HumanGeographyBase: ArcGISDesign;
    static readonly HumanGeographyDetail: ArcGISDesign;
    static readonly HumanGeographyLabels: ArcGISDesign;
    static readonly HumanGeographyDark: ArcGISDesign;
    static readonly HumanGeographyDarkBase: ArcGISDesign;
    static readonly HumanGeographyDarkDetail: ArcGISDesign;
    static readonly HumanGeographyDarkLabels: ArcGISDesign;
    static readonly Outdoor: ArcGISDesign;
    static readonly OsmStandard: ArcGISDesign;
    static readonly OsmStandardRelief: ArcGISDesign;
    static readonly OsmStandardReliefBase: ArcGISDesign;
    static readonly OsmStreets: ArcGISDesign;
    static readonly OsmStreetsRelief: ArcGISDesign;
    static readonly OsmLightGray: ArcGISDesign;
    static readonly OsmLightGrayBase: ArcGISDesign;
    static readonly OsmLightGrayLabels: ArcGISDesign;
    static readonly OsmDarkGray: ArcGISDesign;
    static readonly OsmDarkGrayBase: ArcGISDesign;
    static readonly OsmDarkGrayLabels: ArcGISDesign;
    static readonly OsmStreetsReliefBase: ArcGISDesign;
    static readonly OsmBlueprint: ArcGISDesign;
    static readonly OsmHybrid: ArcGISDesign;
    static readonly OsmHybridDetail: ArcGISDesign;
    static readonly OsmNavigation: ArcGISDesign;
    static readonly OsmNavigationDark: ArcGISDesign;
    private static readonly designs;
    static Create(id: string, sources?: readonly string[]): ArcGISDesign;
    static toBasemapStyle(designType: ArcGISDesignTypeInterface): string;
}

interface ArcGISMapViewInitOptions {
    basemapStyle: string;
    elevationSources: readonly string[];
}
interface ArcGISConfig extends MapConfig {
    apiKey?: string;
    mapDesignType?: ArcGISDesignTypeInterface;
    markerTilingOptions?: MarkerTilingOptions;
    useSceneView?: boolean;
}

declare class ArcGISMapProvider extends MapProvider {
    private resizeObserver;
    initialize(config: ArcGISConfig): Promise<MapViewControllerInterface>;
    destroy(): void;
    private createBasemap;
}

type ArcGISActualMarker = __esri.Graphic;
type ArcGISActualMap = __esri.SceneView | __esri.MapView;
type ArcGISActualCircle = __esri.Graphic;
type ArcGISActualPolyline = __esri.Graphic;
type ArcGISActualPolygon = __esri.Graphic;
type ArcGISActualGroundImage = __esri.Graphic;
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
    mapCameraPositionToCameraOptions(cameraPosition: MapCameraPosition | null): __esri.CameraProperties | null;
}

declare class ArcGISViewHolder extends MapViewHolderBase<HTMLElement, __esri.SceneView | __esri.MapView> {
    readonly mapView: HTMLElement;
    readonly map: __esri.SceneView | __esri.MapView;
    readonly zoomConverter: ZoomAltitudeConverter;
    constructor(mapView: HTMLElement, map: __esri.SceneView | __esri.MapView, zoomConverter: ZoomAltitudeConverter);
    toScreenOffset(position: GeoPointInterface): Offset | null;
    fromScreenOffset(offset: Offset): Promise<GeoPoint | null>;
    fromScreenOffsetSync(offset: Offset): GeoPoint | null;
}

declare class ArcGISMarkerRenderer implements ArcGISMarkerRendererInterface<__esri.Graphic>, MarkerOverlayRenderer<__esri.Graphic> {
    readonly holder: ArcGISViewHolder;
    private graphicsLayer;
    animateStartListener: null;
    animateEndListener: null;
    animationOverlayHost: MarkerAnimationOverlayHost | null;
    constructor(holder: ArcGISViewHolder, graphicsLayer: __esri.GraphicsLayer);
    createMarker(entity: MarkerEntity<__esri.Graphic>): __esri.Graphic | null;
    updateMarker(graphic: __esri.Graphic, entity: MarkerEntity<__esri.Graphic>): void;
    removeMarker(graphic: __esri.Graphic): void;
    onAdd(data: AddParams[]): Promise<(__esri.Graphic | null)[]>;
    onChange(data: ChangeParams<__esri.Graphic>[]): Promise<(__esri.Graphic | null)[]>;
    onRemove(data: MarkerEntity<__esri.Graphic>[]): Promise<void>;
    onAnimate(_entity: MarkerEntity<__esri.Graphic>): Promise<void>;
    onPostProcess(): Promise<void>;
    setMarkerVisible(entity: MarkerEntity<__esri.Graphic>, visible: boolean): void;
    private createMarkerSymbol;
}

declare abstract class AbstractArcGISController<ActualMarker = ArcGISActualMarker, Renderer extends ArcGISMarkerRendererInterface<ActualMarker> = ArcGISMarkerRendererInterface<ActualMarker>> extends AbstractMarkerController<ActualMarker> {
    readonly renderer: Renderer;
    constructor(renderer: Renderer, _tilingOptions?: MarkerTilingOptions);
    composition(data: MarkerState[]): Promise<void>;
    has(state: MarkerState): boolean;
    find(position: _mapconductor_js_sdk_core.GeoPoint): MarkerEntity<ActualMarker> | null;
    setOnClickListener(listener: OnMarkerEventHandler | null): void;
    setOnDragStart(listener: OnMarkerEventHandler | null): void;
    setOnDrag(listener: OnMarkerEventHandler | null): void;
    setOnDragEnd(listener: OnMarkerEventHandler | null): void;
    setOnAnimateStart(listener: OnMarkerEventHandler | null): void;
    setOnAnimateEnd(listener: OnMarkerEventHandler | null): void;
    protected onMarkerAdded(entity: MarkerEntity<ActualMarker>): void;
    protected abstract attachListeners(marker: ActualMarker, state: MarkerState): void;
}

declare class ArcGISMarkerController extends AbstractArcGISController<__esri.Graphic, ArcGISMarkerRenderer> {
    constructor(renderer: ArcGISMarkerRenderer, tilingOptions?: MarkerTilingOptions);
    protected attachListeners(_marker: __esri.Graphic, _state: MarkerState): void;
}

declare class ArcGISCircleOverlayRenderer implements CircleOverlayRenderer<__esri.Graphic> {
    readonly holder: ArcGISViewHolder;
    private graphicsLayer;
    constructor(holder: ArcGISViewHolder, graphicsLayer: __esri.GraphicsLayer);
    createCircle(entity: CircleEntity<__esri.Graphic>): __esri.Graphic | null;
    updateCircle(graphic: __esri.Graphic, entity: CircleEntity<__esri.Graphic>): void;
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
    composition(data: CircleState[]): Promise<void>;
    has(state: CircleState): boolean;
    setOnClickListener(listener: OnCircleEventHandler | null): void;
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
    private createLineSymbol;
    private lineStyleToArcGISStyle;
}

declare class ArcGISPolylineOverlayController extends PolylineController<__esri.Graphic> {
    readonly renderer: ArcGISPolylineOverlayRenderer;
    constructor(renderer: ArcGISPolylineOverlayRenderer);
    composition(data: PolylineState[]): Promise<void>;
    has(state: PolylineState): boolean;
    setOnClickListener(listener: OnPolylineEventHandler | null): void;
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
    private createFillSymbol;
}

declare class ArcGISPolygonOverlayController extends PolygonController<__esri.Graphic> {
    readonly renderer: ArcGISPolygonOverlayRenderer;
    constructor(renderer: ArcGISPolygonOverlayRenderer);
    composition(data: PolygonState[]): Promise<void>;
    has(state: PolygonState): boolean;
    setOnClickListener(listener: OnPolygonEventHandler | null): void;
}

declare class ArcGISGroundImageOverlayRenderer implements GroundImageOverlayRenderer<__esri.Graphic> {
    readonly holder: ArcGISViewHolder;
    private graphicsLayer;
    constructor(holder: ArcGISViewHolder, graphicsLayer: __esri.GraphicsLayer);
    createGroundImage(entity: GroundImageEntity<__esri.Graphic>): __esri.Graphic | null;
    updateGroundImage(graphic: __esri.Graphic, entity: GroundImageEntity<__esri.Graphic>): void;
    removeGroundImage(graphic: __esri.Graphic): void;
    onAdd(data: GroundImageAddParams[]): Promise<(Graphic | null)[]>;
    onChange(data: GroundImageChangeParams<Graphic>[]): Promise<(Graphic | null)[]>;
    onRemove(data: GroundImageEntity<Graphic>[]): Promise<void>;
    onPostProcess(): Promise<void>;
}

declare class ArcGISGroundImageController extends GroundImageController<__esri.Graphic> {
    readonly renderer: ArcGISGroundImageOverlayRenderer;
    constructor(renderer: ArcGISGroundImageOverlayRenderer);
    composition(data: GroundImageState[]): Promise<void>;
    has(state: GroundImageState): boolean;
    setOnClickListener(listener: OnGroundImageEventHandler | null): void;
}

declare class ArcGISRasterLayerOverlayRenderer implements RasterLayerOverlayRenderer<__esri.Layer> {
    readonly holder: ArcGISViewHolder;
    constructor(holder: ArcGISViewHolder);
    createRasterLayer(entity: RasterLayerEntity<__esri.Layer>): Promise<__esri.Layer | null>;
    updateRasterLayer(layer: __esri.Layer, entity: RasterLayerEntity<__esri.Layer>): Promise<void>;
    removeRasterLayer(layer: __esri.Layer): Promise<void>;
    onAdd(data: RasterLayerAddParams[]): Promise<(__esri.Layer | null)[]>;
    onChange(data: RasterLayerChangeParams<__esri.Layer>[]): Promise<(__esri.Layer | null)[]>;
    onRemove(data: RasterLayerEntity<__esri.Layer>[]): Promise<void>;
    onCameraChanged(_mapCameraPosition: MapCameraPosition): Promise<void>;
    onPostProcess(): Promise<void>;
}

declare class ArcGISRasterLayerController extends RasterLayerController<__esri.Layer> {
    readonly renderer: ArcGISRasterLayerOverlayRenderer;
    constructor(renderer: ArcGISRasterLayerOverlayRenderer);
    composition(data: RasterLayerState[]): Promise<void>;
    has(state: RasterLayerState): boolean;
}

type ArcGISDesignTypeChangeHandler = (value: ArcGISDesignTypeInterface) => void;
declare function arcGISZoomToScale(zoom: number, latitude: number): number;
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
    private initialized;
    private mapDesignType;
    private mapDesignTypeChangeListener;
    constructor(holder: ArcGISViewHolder, markerController: ArcGISMarkerController, circleController: ArcGISCircleOverlayController, polylineController: ArcGISPolylineOverlayController, polygonController: ArcGISPolygonOverlayController, groundImageController: ArcGISGroundImageController, rasterLayerController: ArcGISRasterLayerController, mapDesignType?: ArcGISDesignTypeInterface);
    getMap(): __esri.SceneView | __esri.MapView;
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
    moveCamera(position: MapCameraPosition): Promise<boolean>;
    animateCamera(position: MapCameraPosition, options?: CameraOptions): Promise<boolean>;
    fitBounds(bounds: GeoRectBounds, options?: CameraOptions): Promise<boolean>;
    getCameraPosition(): MapCameraPosition | null;
    getBounds(): GeoRectBounds | null;
    private getVisibleRegion;
    private handleMarkerClick;
    private handleCircleClick;
    private handlePolygonClick;
    private handlePolylineClick;
    private handleGroundImageClick;
    compositionMarkers(data: MarkerState[]): Promise<void>;
    updateMarker(state: MarkerState): Promise<void>;
    hasMarker(state: MarkerState): boolean;
    setOnMarkerClickListener(listener: OnMarkerEventHandler | null): void;
    setOnMarkerDragStart(listener: OnMarkerEventHandler | null): void;
    setOnMarkerDrag(listener: OnMarkerEventHandler | null): void;
    setOnMarkerDragEnd(listener: OnMarkerEventHandler | null): void;
    setOnMarkerAnimateStart(listener: OnMarkerEventHandler | null): void;
    setOnMarkerAnimateEnd(listener: OnMarkerEventHandler | null): void;
    setMarkerAnimationOverlayHost(host: MarkerAnimationOverlayHost | null): void;
    setOnCircleClickListener(listener: OnCircleEventHandler | null): void;
    setOnPolylineClickListener(listener: OnPolylineEventHandler | null): void;
    setOnPolygonClickListener(listener: OnPolygonEventHandler | null): void;
    setOnGroundImageClickListener(listener: OnGroundImageEventHandler | null): void;
    compositionCircles(data: CircleState[]): Promise<void>;
    updateCircle(state: CircleState): Promise<void>;
    hasCircle(state: CircleState): boolean;
    compositionPolylines(data: PolylineState[]): Promise<void>;
    updatePolyline(state: PolylineState): Promise<void>;
    hasPolyline(state: PolylineState): boolean;
    compositionPolygons(data: PolygonState[]): Promise<void>;
    updatePolygon(state: PolygonState): Promise<void>;
    hasPolygon(state: PolygonState): boolean;
    compositionGroundImages(data: GroundImageState[]): Promise<void>;
    updateGroundImage(state: GroundImageState): Promise<void>;
    hasGroundImage(state: GroundImageState): boolean;
    compositionRasterLayers(data: RasterLayerState[]): Promise<void>;
    updateRasterLayer(state: RasterLayerState): Promise<void>;
    hasRasterLayer(state: RasterLayerState): boolean;
    clearOverlays(): Promise<void>;
    destroy(): void;
}

interface ArcGISMapViewStateInterface extends MapViewStateInterface<ArcGISDesignTypeInterface> {
    readonly apiKey: string;
}
interface ArcGISMapViewStateParams {
    id?: string;
    apiKey?: string;
    mapDesignType?: ArcGISDesignTypeInterface;
    cameraPosition?: MapCameraPosition;
}
declare class ArcGISMapViewState extends MapViewState<ArcGISDesignTypeInterface> implements ArcGISMapViewStateInterface {
    readonly id: string;
    readonly apiKey: string;
    private _cameraPosition;
    private _mapDesignType;
    private controller;
    private cameraPositionChangeListener;
    constructor({ id, apiKey, mapDesignType, cameraPosition, }?: ArcGISMapViewStateParams);
    get cameraPosition(): MapCameraPosition;
    get mapDesignType(): ArcGISDesignTypeInterface;
    set mapDesignType(value: ArcGISDesignTypeInterface);
    moveCameraTo(position: GeoPoint, durationMillis?: number): void;
    moveCameraTo(cameraPosition: MapCameraPosition, durationMillis?: number): void;
    getMapViewHolder(): MapViewHolder<unknown, unknown> | null;
    setController(controller: MapViewControllerInterface | null): void;
    updateCameraPosition(camera: MapCameraPosition): void;
    setCameraPositionChangeListener(listener: ((camera: MapCameraPosition) => void) | null): void;
}
type ArcGISViewState = ArcGISMapViewState;
type ArcGISViewStateOptions = ArcGISMapViewStateParams;
declare function useArcGISViewState(params?: ArcGISMapViewStateParams): ArcGISMapViewState;

interface ArcGISMapViewProps extends MapViewBaseProps<ArcGISMapViewStateInterface> {
    style?: React__default.CSSProperties;
    markerTilingOptions?: MarkerTilingOptions;
    onError?: (error: Error) => void;
    children?: React__default.ReactNode;
}

declare function ArcGISMapView({ state, className, style, markerTilingOptions, onError, onMapLoaded, onMapClick, onMapLongClick, onCameraMoveStart, onCameraMove, onCameraMoveEnd, children, useSceneView, }: ArcGISMapViewProps & {
    useSceneView?: boolean;
}): React.JSX.Element;
declare function ArcGISMapView2D(props: ArcGISMapViewProps): React.JSX.Element;

export { type ArcGISActualCircle, type ArcGISActualGroundImage, type ArcGISActualMap, type ArcGISActualMarker, type ArcGISActualPolygon, type ArcGISActualPolyline, type ArcGISActualRasterLayer, type ArcGISConfig, ArcGISDesign, type ArcGISDesignType, type ArcGISDesignTypeChangeHandler, type ArcGISDesignTypeInterface, ArcGISMapProvider, ArcGISMapView, ArcGISMapView2D, ArcGISMapViewController, type ArcGISMapViewInitOptions, type ArcGISMapViewProps, ArcGISMapViewState, type ArcGISMapViewStateInterface, type ArcGISMapViewStateParams, type ArcGISViewState, type ArcGISViewStateOptions, ZoomAltitudeConverter, type ZoomAltitudeViewportSize, arcGISScaleToZoom, arcGISZoomToScale, useArcGISViewState };

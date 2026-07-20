import { useEffect, useRef, useState } from 'react';
import '@arcgis/core/assets/esri/themes/light/main.css';
import {
  MapContext,
  MapViewScope,
  MapViewScopeProvider,
  InfoBubbleOverlay,
  MarkerAnimationLayer,
  MapAttributionOverlay,
  type InfoBubbleEntry,
} from '@mapconductor/js-sdk-react';
import type {
  MapCameraPosition,
  GeoPoint,
  OverlayCollector,
  MarkerAnimationOverlayEntry,
} from '@mapconductor/js-sdk-core';
import type { ArcGISMapViewController } from './ArcGISMapViewController';
import type { ArcGISMapViewProps } from './ArcGISMapViewProps';
import { ArcGISMapProvider } from './ArcGISMapProvider';
import type { ArcGISConfig } from './ArcGISMapConfig';

const MISSING_API_KEY_MESSAGE =
  'ArcGIS API key is required. Set arcGISMapViewState.apiKey via useArcGISViewState({ apiKey }).';

const ARCGIS_VIEW_ROOT_STYLE_ID = 'mapconductor-arcgis-view-root-style';

function ensureArcGISViewRootStyle(): void {
  if (typeof document === 'undefined' || document.getElementById(ARCGIS_VIEW_ROOT_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = ARCGIS_VIEW_ROOT_STYLE_ID;
  style.textContent = `
.esri-view .esri-view-root {
  flex: unset;
  height: 100%;
}
`;
  document.head.appendChild(style);
}

export function ArcGISMapView({
  state,
  className,
  style,
  markerTilingOptions,
  minZoom,
  maxZoom,
  restrictBounds,
  onError,
  onMapLoaded,
  onMapClick,
  onMapLongClick,
  onCameraMoveStart,
  onCameraMove,
  onCameraMoveEnd,
  children,
  useSceneView = true,
}: ArcGISMapViewProps & { useSceneView?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [provider] = useState(() => new ArcGISMapProvider());
  const [scope] = useState(() => new MapViewScope());
  const [controller, setController] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const bridgeUnsubs = useRef<(() => void)[]>([]);
  const typedControllerRef = useRef<ArcGISMapViewController | null>(null);
  const [bubbleEntries, setBubbleEntries] = useState<InfoBubbleEntry[]>([]);
  const [animationEntries, setAnimationEntries] = useState<MarkerAnimationOverlayEntry[]>([]);
  const [cameraTick, setCameraTick] = useState(0);
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const missingApiKey = !state.apiKey?.trim();

  const onMapLoadedRef = useRef(onMapLoaded);
  const onMapClickRef = useRef(onMapClick);
  const onMapLongClickRef = useRef(onMapLongClick);
  const onCameraMoveStartRef = useRef(onCameraMoveStart);
  const onCameraMoveRef = useRef(onCameraMove);
  const onCameraMoveEndRef = useRef(onCameraMoveEnd);
  const onErrorRef = useRef(onError);
  onMapLoadedRef.current = onMapLoaded;
  onMapClickRef.current = onMapClick;
  onMapLongClickRef.current = onMapLongClick;
  onCameraMoveStartRef.current = onCameraMoveStart;
  onCameraMoveRef.current = onCameraMove;
  onCameraMoveEndRef.current = onCameraMoveEnd;
  onErrorRef.current = onError;

  useEffect(() => {
    ensureArcGISViewRootStyle();

    if (!containerRef.current) return;

    const resolvedApiKey = state.apiKey?.trim();
    if (!resolvedApiKey) {
      const error = new Error(MISSING_API_KEY_MESSAGE);
      setInitializationError(error);
      onErrorRef.current?.(error);
      return;
    }

    let cancelled = false;
    setInitializationError(null);

    const config: ArcGISConfig = {
      container: containerRef.current,
      initCameraPosition: state.cameraPosition,
      mapDesignType: state.mapDesignType,
      markerTilingOptions,
      apiKey: resolvedApiKey,
      useSceneView,
      minZoom,
      maxZoom,
      restrictBounds,
    };

    provider
      .initialize(config)
      .then((ctrl) => {
        if (cancelled) return;

        state.setController(ctrl);
        state.setCameraPositionChangeListener(() => {
          setCameraTick(t => t + 1);
        });
        setController(ctrl);
        typedControllerRef.current = ctrl as ArcGISMapViewController;

        ctrl.setCameraMoveStartListener((camera: MapCameraPosition) => {
          state.updateCameraPosition(camera);
          onCameraMoveStartRef.current?.(camera);
        });
        ctrl.setCameraMoveListener((camera: MapCameraPosition) => {
          state.updateCameraPosition(camera);
          onCameraMoveRef.current?.(camera);
          setCameraTick(t => t + 1);
        });
        ctrl.setCameraMoveEndListener((camera: MapCameraPosition) => {
          state.updateCameraPosition(camera);
          onCameraMoveEndRef.current?.(camera);
          setCameraTick(t => t + 1);
        });
        ctrl.setMapClickListener((point: GeoPoint) => onMapClickRef.current?.(point));
        ctrl.setMapLongClickListener((point: GeoPoint) => onMapLongClickRef.current?.(point));
        ctrl.setMapInitializedListener(() => {
          onMapLoadedRef.current?.(state);
          setCameraTick(t => t + 1);
        });

        const registry = scope.buildRegistry();
        for (const overlay of registry.getAll()) {
          const unsub = overlay.subscribe((data) => {
            overlay.render(data, ctrl).catch(console.error);
          });
          bridgeUnsubs.current.push(unsub);
        }

        const bubbleUnsub = scope.bubbleCollector.subscribe((map) => {
          setBubbleEntries(Array.from(map.values()));
        });
        bridgeUnsubs.current.push(bubbleUnsub);

        typedControllerRef.current.setMarkerAnimationOverlayHost(scope.markerAnimationStore.start);
        bridgeUnsubs.current.push(() => typedControllerRef.current?.setMarkerAnimationOverlayHost(null));
        const animationUnsub = scope.markerAnimationStore.subscribe(setAnimationEntries);
        bridgeUnsubs.current.push(animationUnsub);

        const c = ctrl as unknown as Record<string, (s: never) => unknown>;
        const setupUpdateHandler = <S extends { id: string }>(
          collector: OverlayCollector<S>,
          hasMethod: string,
          updateMethod: string,
          onUpdated?: () => void,
        ) => {
          collector.setUpdateHandler((state) => {
            if ((c[hasMethod] as (s: S) => boolean)?.(state)) {
              void (c[updateMethod] as (s: S) => Promise<void>)?.(state);
              onUpdated?.();
            }
          });
          bridgeUnsubs.current.push(() => collector.setUpdateHandler(null));
        };

        setupUpdateHandler(scope.markerCollector, 'hasMarker', 'updateMarker', () => setCameraTick(t => t + 1));
        setupUpdateHandler(scope.circleCollector, 'hasCircle', 'updateCircle');
        setupUpdateHandler(scope.polylineCollector, 'hasPolyline', 'updatePolyline');
        setupUpdateHandler(scope.polygonCollector, 'hasPolygon', 'updatePolygon');
        setupUpdateHandler(scope.groundImageCollector, 'hasGroundImage', 'updateGroundImage');
        setupUpdateHandler(scope.rasterLayerCollector, 'hasRasterLayer', 'updateRasterLayer');

        setIsReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to initialize ArcGIS:', error);
        const initializationError = error instanceof Error ? error : new Error(String(error));
        setInitializationError(initializationError);
        onErrorRef.current?.(initializationError);
      });

    return () => {
      cancelled = true;
      state.setCameraPositionChangeListener(null);
      state.setController(null);
      typedControllerRef.current = null;
      bridgeUnsubs.current.forEach((unsub) => unsub());
      bridgeUnsubs.current = [];
      provider.destroy();
    };
  }, [state.apiKey, state.mapDesignType.id, useSceneView]);

  void cameraTick;

  return (
    <MapContext.Provider value={{ controller, isReady }}>
      <>
        <div
          ref={containerRef}
          className={className}
          style={{
            width: '100%',
            height: '100%',
            ...style,
          }}
        />
        {(missingApiKey || initializationError) && (
          <div
            role="alert"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              boxSizing: 'border-box',
              background: '#fff',
              color: '#b91c1c',
              fontFamily: 'sans-serif',
              textAlign: 'center',
            }}
          >
            {missingApiKey ? MISSING_API_KEY_MESSAGE : initializationError?.message}
          </div>
        )}
        <MapAttributionOverlay
          scope={scope}
          camera={typedControllerRef.current?.getCameraPosition() ?? state.cameraPosition}
          designAttributionRules={state.mapDesignType.attributionRules}
        />
        {animationEntries.length > 0 && typedControllerRef.current && (
          <MarkerAnimationLayer
            entries={animationEntries}
            resolveScreenOffset={(entry) => typedControllerRef.current!.holder.toScreenOffset(entry.state.position)}
          />
        )}
        {bubbleEntries.length > 0 && typedControllerRef.current && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {bubbleEntries.map(entry => {
              const holder = typedControllerRef.current!.holder;
              const pos = entry.positionProvider();
              const screenOffset = holder.toScreenOffset(pos);
              if (!screenOffset) return null;
              const icon = entry.icon;
              const iconPixelSize = icon ? icon.iconSize * icon.scale : 0;
              return (
                <InfoBubbleOverlay
                  key={entry.id}
                  positionOffset={screenOffset}
                  iconSize={{ width: iconPixelSize, height: iconPixelSize }}
                  iconOffset={icon ? icon.anchor : { x: 0.5, y: 0.5 }}
                  infoAnchorOffset={icon ? icon.infoAnchor : { x: 0.5, y: 0.5 }}
                  tailOffset={entry.tailOffset}
                  style={{ pointerEvents: 'auto' }}
                >
                  {entry.content as any}
                </InfoBubbleOverlay>
              );
            })}
            </div>
          )}
      </>
      <MapViewScopeProvider scope={scope}>
        {children}
      </MapViewScopeProvider>
    </MapContext.Provider>
  );
}

export function ArcGISMapView2D(props: ArcGISMapViewProps) {
  return <ArcGISMapView {...props} useSceneView={false} />;
}

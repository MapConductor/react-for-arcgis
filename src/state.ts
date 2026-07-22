// Native-safe entry point: only the plain-data view state and design types, with no static
// import of `@arcgis/core` (the web-only Esri JS API). `./index.ts`'s barrel pulls in
// `ArcGISMapView.web`/`ArcGISMapProvider`, which import `@arcgis/core` at module scope - fine for
// bundlers targeting a browser, but Metro/Hermes evaluates that eagerly and `@arcgis/core` uses
// browser globals (e.g. `FinalizationRegistry` usage patterns) that don't hold up in React
// Native. `@mapconductor/reactnative-for-arcgis` imports from here instead of the root barrel.
export {
  ArcGISDesign,
  type ArcGISDesignType,
  type ArcGISDesignTypeInterface,
} from './ArcGISMapDesign';
export {
  ArcGISMapViewState,
  useArcGISViewState,
  type ArcGISMapViewStateInterface,
  type ArcGISMapViewStateParams,
  type ArcGISViewState,
  type ArcGISViewStateOptions,
} from './ArcGISMapViewState';

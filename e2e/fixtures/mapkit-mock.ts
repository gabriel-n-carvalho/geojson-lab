import { test as base } from '@playwright/test'

const STUB = `
  ;(function () {
    function Listenable() {
      this._l = {}
    }
    Listenable.prototype.addEventListener = function (n, h) {
      ;(this._l[n] = this._l[n] || []).push(h)
    }
    Listenable.prototype.removeEventListener = function (n, h) {
      this._l[n] = (this._l[n] || []).filter(function (x) { return x !== h })
    }
    Listenable.prototype._fire = function (n, e) {
      ;(this._l[n] || []).slice().forEach(function (h) { h(e) })
    }

    function Map(element, options) {
      Listenable.call(this)
      this.element = element
      this.annotations = []
      this.overlays = []
      this.region = options && options.region
      var self = this
      setTimeout(function () { self._fire('configuration-change', { status: 'Initialized' }) }, 0)
    }
    Map.prototype = Object.create(Listenable.prototype)
    Map.prototype.addAnnotation = function (a) { this.annotations.push(a); return a }
    Map.prototype.addAnnotations = function (a) { this.annotations.push.apply(this.annotations, a); return a }
    Map.prototype.removeAnnotation = function (a) {
      this.annotations = this.annotations.filter(function (x) { return x !== a }); return a
    }
    Map.prototype.removeAnnotations = function (a) {
      this.annotations = this.annotations.filter(function (x) { return a.indexOf(x) === -1 }); return a
    }
    Map.prototype.addOverlay = function (o) { this.overlays.push(o); return o }
    Map.prototype.addOverlays = function (o) { this.overlays.push.apply(this.overlays, o); return o }
    Map.prototype.removeOverlay = function (o) {
      this.overlays = this.overlays.filter(function (x) { return x !== o }); return o
    }
    Map.prototype.removeOverlays = function (o) {
      this.overlays = this.overlays.filter(function (x) { return o.indexOf(x) === -1 }); return o
    }
    Map.prototype.convertPointOnPageToCoordinate = function (p) {
      return { latitude: p.y, longitude: p.x }
    }
    Map.prototype.convertCoordinateToPointOnPage = function (c) {
      return { x: c.longitude, y: c.latitude }
    }
    Map.prototype.showItems = function (items) { return items }
    Map.prototype.destroy = function () { /* noop */ }

    function Annotation(coordinate, options) {
      Listenable.call(this)
      this.coordinate = coordinate
      this.data = options && options.data
      this.selected = (options && options.selected) || false
    }
    Annotation.prototype = Object.create(Listenable.prototype)

    function Overlay(points, options) {
      Listenable.call(this)
      this.points = points
      this.style = options && options.style
      this.data = options && options.data
      this.selected = false
    }
    Overlay.prototype = Object.create(Listenable.prototype)

    var mapkit = {
      init: function () {},
      Map: Map,
      Coordinate: function (lat, lng) { return { latitude: lat, longitude: lng } },
      CoordinateSpan: function (a, b) { return { latitudeDelta: a, longitudeDelta: b } },
      CoordinateRegion: function (c, s) { return { center: c, span: s } },
      MarkerAnnotation: Annotation,
      PolylineOverlay: Overlay,
      PolygonOverlay: Overlay,
      Style: function (opts) { return opts || {} },
      MapType: { Standard: 'standard', Hybrid: 'hybrid', Satellite: 'satellite', MutedStandard: 'mutedStandard' },
      FeatureVisibility: { Adaptive: 'adaptive', Hidden: 'hidden', Visible: 'visible' },
    }
    window.mapkit = mapkit
    if (typeof window.initMapKit === 'function') {
      window.initMapKit()
    }
  })()
`

export const test = base.extend<{ mockMapKit: void }>({
  mockMapKit: [
    async ({ page }, use) => {
      await page.route('https://cdn.apple-mapkit.com/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: STUB,
        }),
      )
      await page.addInitScript(STUB)
      await use()
    },
    { auto: true },
  ],
})

export const expect = test.expect

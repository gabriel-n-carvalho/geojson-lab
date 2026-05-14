import type { Feature, FeatureCollection } from 'geojson'

export const samplePoint: Feature = {
  type: 'Feature',
  id: 'pt-1',
  properties: { name: 'Anchor' },
  geometry: { type: 'Point', coordinates: [-122, 37] },
}

export const sampleLine: Feature = {
  type: 'Feature',
  id: 'ln-1',
  properties: { name: 'Path' },
  geometry: {
    type: 'LineString',
    coordinates: [
      [-122, 37],
      [-122.01, 37.01],
    ],
  },
}

export const samplePolygon: Feature = {
  type: 'Feature',
  id: 'pg-1',
  properties: { name: 'Plot' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-122, 37],
        [-122.01, 37],
        [-122.01, 37.01],
        [-122, 37.01],
        [-122, 37],
      ],
    ],
  },
}

export const sampleMultiPoint: Feature = {
  type: 'Feature',
  id: 'mpt-1',
  properties: { name: 'Cluster' },
  geometry: {
    type: 'MultiPoint',
    coordinates: [
      [-122, 37],
      [-121.99, 37.01],
    ],
  },
}

export const sampleMultiLine: Feature = {
  type: 'Feature',
  id: 'mln-1',
  properties: { name: 'Routes' },
  geometry: {
    type: 'MultiLineString',
    coordinates: [
      [
        [-122, 37],
        [-122.01, 37.01],
      ],
      [
        [-121.99, 37],
        [-121.98, 37.01],
      ],
    ],
  },
}

export const sampleMultiPolygon: Feature = {
  type: 'Feature',
  id: 'mpg-1',
  properties: { name: 'Plots' },
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [-122, 37],
          [-122.01, 37],
          [-122.01, 37.01],
          [-122, 37.01],
          [-122, 37],
        ],
      ],
    ],
  },
}

export const sampleGeometryCollection: Feature = {
  type: 'Feature',
  id: 'gc-1',
  properties: { name: 'Mixed' },
  geometry: {
    type: 'GeometryCollection',
    geometries: [
      { type: 'Point', coordinates: [-122, 37] },
      {
        type: 'LineString',
        coordinates: [
          [-122, 37],
          [-122.01, 37.01],
        ],
      },
    ],
  },
}

export const sampleFC: FeatureCollection = {
  type: 'FeatureCollection',
  features: [samplePoint, sampleLine, samplePolygon],
}

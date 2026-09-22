import fs from 'fs';
import { geoConicConformal, geoPath } from 'd3-geo';
import { feature, merge } from 'topojson-client';

const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const W = 1000, H = 720;
const proj = geoConicConformal().parallels([40, 56]).rotate([-46, 0]).center([0, 49]).scale(1850).translate([W / 2, H / 2]).clipExtent([[-800,-500],[1900,1150]]);
const path = geoPath(proj);
const r = s => s ? s.replace(/-?\d+\.\d+/g, m => String(Math.round(+m*10)/10)) : '';

// Only countries in view
const inView = topo.objects.countries.geometries.filter(g => {
  const f = feature(topo, g); const b = path.bounds(f);
  return b[1][0] > -800 && b[0][0] < 1900 && b[1][1] > -500 && b[0][1] < 1150;
});
const land = r(path(merge(topo, inView)));
const byName = n => topo.objects.countries.geometries.filter(g => g.properties.name === n);
const ukraine = r(path(merge(topo, byName('Ukraine'))));
const sovietNames = ['Russia', 'Ukraine', 'Belarus', 'Moldova', 'Georgia', 'Armenia', 'Azerbaijan', 'Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan', 'Lithuania', 'Latvia', 'Estonia'];
const ussr = r(path(merge(topo, sovietNames.flatMap(byName))));
const turkey = r(path(merge(topo, byName('Turkey'))));
const borders = r(path({ type: 'MultiLineString', coordinates: [] })); // unused

const poly = pts => r(path({ type: 'Polygon', coordinates: [[...pts, pts[0]].reverse()] }));
// d3 expects clockwise exterior for small polygons; we reverse our counter-clockwise lists and verify area below.
const safePoly = pts => {
  const f1 = { type: 'Polygon', coordinates: [[...pts, pts[0]]] };
  const f2 = { type: 'Polygon', coordinates: [[...pts, pts[0]].reverse()] };
  return r(path(path.area(f1) < path.area(f2) ? f1 : f2));
};

const P = {
  horde: [[28,45.2],[29.5,47.5],[32,49.5],[35,51.3],[39,53],[43,55.3],[47,56],[52,56.3],[57,56.5],[63,56.8],[69,56.2],[74,55],[78,52.5],[78,48.5],[73,45],[67,43.5],[62,42],[60,40.5],[56,40.8],[53,41],[50,41],[48.5,41.8],[47,43],[43,43.2],[40,43.5],[38,44.3],[36.5,45],[33,44.2],[30,44.5]],
  crimea1441: [[32.3,44.3],[32.1,46.2],[33.5,47.2],[35.2,47.3],[36.5,46.9],[36.8,45.3],[36.5,44.3]],
  crimeaPeak: [[28.2,45.3],[28.8,46.6],[30,47.4],[32,47.8],[34.5,48.3],[37,47.8],[39.5,47.3],[40.5,46],[41,45],[39.5,44.3],[37.5,44.5],[36.5,44.3],[32.5,44.3],[30.5,45.3]],
  crimea1774: [[32.1,44.3],[32.0,46.2],[33.5,47.3],[35.5,47.4],[37.2,47.0],[36.9,45.5],[38,46.2],[39.5,46.2],[41,45.3],[39.5,44.3],[37.5,44.5],[36.5,44.3]],
  greatHorde: [[37,47.3],[38,49.5],[41,51.8],[45,52.5],[47,51],[46.5,49],[45,47.8],[44,45.8],[41,46],[39.5,46.8]],
  astrakhan: [[45.5,45.0],[45,47.5],[47,48.8],[49,48],[48.5,46.5],[47.5,45]],
  kazan: [[45,54.2],[46,56.5],[49,58.3],[53,58.5],[55,57.5],[54.5,55.3],[52.5,53.6],[49,53.5],[46.5,53.6]],
  nogai: [[48.6,51.6],[49.5,48.5],[50,46.5],[53,45.2],[56,45.5],[59,47],[61,50],[59.5,53],[56,54.5],[53,53.3],[50,52.5]],
  sibir: [[60,56],[60.5,59.5],[65,60.5],[72,59.5],[75,57],[73,55],[68,54.5],[63,54.5]],
  kazakh: [[59.5,47.5],[61,50],[65,52.5],[70,53],[76,52],[79,49],[78,45],[73,43],[68,42.8],[64,44.2],[61,45]],
  muscovy: [[31,55],[32.5,57.5],[36,59.5],[40,61],[45,61.5],[47,59],[46,56.5],[44.5,55.5],[42,54.5],[39,53.5],[36,54],[33.5,54.5]],
  russia1600: [[28,56],[30,60],[36,62.5],[50,62.5],[62,62.5],[75,62.5],[82,62.5],[82,57],[72,55.3],[63,55.2],[58,56],[55,55],[52.5,53.4],[50,52.5],[48.6,51.6],[49.5,48.5],[49.3,46.3],[47.5,45.3],[46.4,46.6],[45,49],[42,51],[39,51.5],[36,52],[33,52.5],[31,53]],
  russia1774: [[26,56],[30,62.5],[82,62.5],[82,51.5],[76,50.5],[70,51.5],[62,51.3],[55,51],[51,48.5],[49.3,46.3],[47.5,44.8],[46.5,44.2],[43,44.6],[41,45.6],[39.5,46.7],[38.3,47.3],[37.2,47.1],[35.5,47.5],[33.5,47.4],[32,47.9],[31,48.5],[30,50],[27,52]],
  russia1783: [[26,56],[30,62.5],[82,62.5],[82,51.5],[76,50.5],[70,51.5],[62,51.3],[55,51],[51,48.5],[49.3,46.3],[47.5,44.8],[46.5,43.8],[43,43.5],[39.5,44],[37.3,44.6],[36.2,44.2],[32,44.2],[31.6,46.6],[31,48.2],[30,50],[27,52]],
  ottomanBalkans: [[19.3,41.8],[19.5,45.2],[21.5,46.2],[24,45.3],[27,45.5],[28.2,45.5],[30,46.6],[31.6,46.6],[30.2,45.2],[28.6,43.5],[28,41.9],[26.5,41],[24,40.5],[20.5,40]],
  kefe: [[34.9,44.75],[35.5,45.2],[36.7,45.5],[36.7,44.9],[35.9,44.9],[35.3,44.6]],
  azak: [[38.8,46.9],[39.6,47.3],[39.8,46.9],[39.1,46.6]],
  crimeaModern: [[32.3,45.9],[33.6,46.13],[34.0,46.06],[34.8,46.12],[35.3,45.4],[36.66,45.6],[36.66,44.2],[32.3,44.2]],
};
const shapes = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, safePoly(v)]));
shapes.ukraine = ukraine; shapes.ussr = ussr; shapes.turkey = turkey;

const xy = (lon, lat) => proj([lon, lat]).map(v => +v.toFixed(1));
const box = (l0, b0, l1, b1) => {
  const pts = [[l0,b0],[l1,b0],[l0,b1],[l1,b1],[(l0+l1)/2,b0],[(l0+l1)/2,b1]].map(p => proj(p));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return [x, y, Math.max(...xs) - x, Math.max(...ys) - y].map(v => +v.toFixed(1));
};
const views = { wide: box(22, 38, 80, 60), mid: box(24, 38, 72, 52), sea: box(27, 41, 42, 48.8) };
const arcs = {
  surgun: (() => { const a = xy(34.1, 45.0), b = xy(69.24, 41.3), c = xy(56.2, 58.0); return `M${a}Q${xy(52,47)} ${b}M${a}Q${xy(44,55)} ${c}`; })(),
  return: (() => { const a = xy(69.24, 41.3), b = xy(34.2, 44.9); return `M${a}Q${xy(50,40)} ${b}`; })(),
};
const cities = { bagcasaray: xy(33.87, 44.75), moscow: xy(37.62, 55.75), samarkand: xy(69.24, 41.3), urals: xy(56.2, 58.0), kazan: xy(49.1, 55.8), astrakhan: xy(48.03, 46.35), sarai: xy(47.5, 48.6), istanbul: xy(28.98, 41.01), kyiv: xy(30.52, 50.45), tashkent: xy(69.24, 41.3), simferopol: xy(34.1, 44.95) };
const labelAt = (lon, lat) => xy(lon, lat);

fs.writeFileSync('atlas-data.json', JSON.stringify({ W, H, land, shapes, views, arcs, cities,
  lab: {
    horde: labelAt(52, 49.5), crimea: labelAt(34.2, 45.45), crimeaPeak: labelAt(34.3, 46.9), greatHorde: labelAt(41.5, 49.3), astrakhan: labelAt(47.2, 46.8), kazan: labelAt(50, 56.3), nogai: labelAt(55, 49.8), sibir: labelAt(67, 57.6), kazakh: labelAt(71, 48), muscovy: labelAt(39.5, 57.5), russia: labelAt(45, 58.5), ottoman: labelAt(33, 39.3), ukraine: labelAt(31, 49), ussr: labelAt(40, 52), sea: labelAt(34, 43.2), caspian: labelAt(50.5, 42.2), russiaNear: labelAt(39.5, 48.3),
  } }));
console.log('bytes', fs.statSync('atlas-data.json').size, views);

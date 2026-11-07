/**
 * Interaktywny plecak 3D na stronie /pl/plecak-ewakuacyjny/.
 * Ładowany tylko w przeglądarce (dynamiczny import z BagView.astro), więc three.js nie obciąża reszty serwisu.
 *
 * Model zastępczy odwzorowuje plecak z naszego zestawu testowego (Wisport Whistler II 35, kolor graphite):
 * zaokrąglony korpus bez klapy, rzędy MOLLE z przodu i po bokach, duża kieszeń przednia z rzepem,
 * pionowe paski kompresyjne z klamrami, boczne paski, profilowane szelki z paskiem piersiowym i pas biodrowy.
 * Wszystko jest budowane w kodzie z kilku prostych brył (bez plików graficznych), taśmy MOLLE to jedna instancjonowana siatka.
 *
 * Model GLB: najpierw próbujemy /models/plecak-ewakuacyjny.glb (public/models/). Model jest automatycznie centrowany
 * i skalowany do rozmiaru plecaka zastępczego, więc punkty podpisów z src/data/plecak.ts dalej pasują.
 * Dokładne położenie podpisu można ustawić w samym modelu: pusty obiekt (Empty) o nazwie `hs_<id kategorii>`,
 * np. `hs_woda`, nadpisuje punkt z pliku danych.
 */
import {
  ACESFilmicToneMapping, Box3, BoxGeometry, BufferGeometry, CanvasTexture, CapsuleGeometry, Color, DirectionalLight,
  DoubleSide, Float32BufferAttribute, Raycaster, Group, HemisphereLight, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PMREMGenerator, RepeatWrapping, Scene, Spherical,
  SRGBColorSpace, Vector3, WebGLRenderer, CatmullRomCurve3, type Object3D,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface HotspotDef { id: string; anchor: [number, number, number]; normal: [number, number, number] }
export interface BagOptions {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  hotspots: HTMLElement[];
  defs: HotspotDef[];
  /** Karta z zawartością kategorii, przyklejana obok wybranego punktu */
  card?: HTMLElement;
  modelUrl?: string;
  reducedMotion: boolean;
}
export interface BagHandle {
  /** Które kategorie mają podpis (pozostałe są ukryte) */
  setActive(ids: Set<string>): void;
  /** Dodatki: śpiwór przypięty pod spodem, elastyczny panel solarny na MOLLE z przodu (z animacją) */
  setExtras(x: { roll: boolean; solar: boolean }): void;
  /** Wybrany punkt (karta obok niego) albo null */
  select(id: string | null): void;
  /** Płynny obrót plecaka tak, żeby punkt był widoczny z przodu */
  focus(id: string): void;
  /** Ustawienie kamery: azymut i kąt biegunowy w radianach */
  view(azimuth: number, polar: number, instant?: boolean): void;
  destroy(): void;
}

/** Kolory: graphite (tkanina), taśmy odrobinę ciemniejsze; pomarańcz PrepReady tylko na uchwytach zamków. */
const COL = {
  fabric: '#4a4d50', web: '#404346', tack: '#2c2f31', back: '#36393b', velcro: '#2f3235',
  pipe: '#222426', buckle: '#222426', accent: '#E0560C', roll: '#313829', rollBand: '#2a2d2c',
};

/* ───────────────────────── Faktury generowane w kodzie ───────────────────────── */

function texture(size: number, fn: (x: number, y: number, r: number) => number, rep: [number, number]): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = Math.max(0, Math.min(255, fn(x, y, rnd())));
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  return t;
}

function textures() {
  const TAU = Math.PI * 2;
  // Cordura: drobny splot + szum + łagodne zmarszczki (okresowe, żeby kafelek się nie odcinał)
  const cordura = texture(128, (x, y, r) => {
    const weave = ((x >> 1) + (y >> 1)) % 2 ? 9 : -9;
    const wr = 10 * Math.sin(TAU * (x / 128 * 2 + 0.35 * Math.sin(TAU * y / 128))) + 7 * Math.sin(TAU * (y / 128 * 3 + 0.2 * Math.sin(TAU * x / 128 * 2)));
    return 128 + weave + (r - 0.5) * 34 + wr;
  }, [5, 5]);
  // Taśma nylonowa: prążki wzdłuż taśmy
  const web = texture(64, (_x, y, r) => 128 + (y % 4 < 2 ? 22 : -22) + (r - 0.5) * 16, [1, 1]);
  // Rzep: mocny szum
  const velcro = texture(64, (_x, _y, r) => 128 + (r - 0.5) * 120, [4, 2]);
  return { cordura, web, velcro };
}

/* ───────────────────────── Miękkie bryły (SDF) ───────────────────────── */

interface SoftSpec { hw: number; hh: number; hd: number; rTop: number; rBot: number; rEdge: number; bulge: number; taper?: number }

/**
 * Bryła o profilu zaokrąglonego prostokąta (inny promień u góry i u dołu), z zaokrąglonymi krawędziami
 * i lekko wypchniętymi ścianami, jak wypakowana tkanina. Opisana funkcją odległości, więc łatwo
 * „przykleić” do niej taśmy, rzep czy panel: rzucamy promień i dostajemy punkt oraz normalną powierzchni.
 */
class Soft {
  readonly c: Vector3;
  constructor(readonly s: SoftSpec, c: [number, number, number]) { this.c = new Vector3(...c); }

  sdf(x: number, y: number, z: number): number {
    const s = this.s;
    const ty = Math.min(1, Math.max(0, (y / s.hh + 1) / 2));
    const hw = s.hw * (1 - (s.taper ?? 0) * ty);
    const R = y > 0 ? s.rTop : s.rBot;
    const qx = Math.abs(x) - (hw - R), qy = Math.abs(y) - (s.hh - R);
    const d2 = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - R;
    const r = s.rEdge, wx = d2 + r, wy = Math.abs(z) - (s.hd - r);
    let d = Math.min(Math.max(wx, wy), 0) + Math.hypot(Math.max(wx, 0), Math.max(wy, 0)) - r;
    const u = Math.min(1, Math.abs(x) / hw), v = Math.min(1, Math.abs(y) / s.hh), w = Math.min(1, Math.abs(z) / s.hd);
    d -= s.bulge * (1 - v * v) * (1 - 0.5 * u * u * w * w);
    return d;
  }

  /** Lokalny punkt na powierzchni wzdłuż promienia z punktu wewnątrz bryły */
  cast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): Vector3 {
    let lo = 0, hi = 2;
    for (let i = 0; i < 26; i++) {
      const m = (lo + hi) / 2;
      if (this.sdf(ox + dx * m, oy + dy * m, oz + dz * m) > 0) hi = m; else lo = m;
    }
    const t = (lo + hi) / 2;
    return new Vector3(ox + dx * t, oy + dy * t, oz + dz * t);
  }

  normalAt(p: Vector3): Vector3 {
    const e = 1e-3, f = (x: number, y: number, z: number) => this.sdf(x, y, z);
    return new Vector3(
      f(p.x + e, p.y, p.z) - f(p.x - e, p.y, p.z),
      f(p.x, p.y + e, p.z) - f(p.x, p.y - e, p.z),
      f(p.x, p.y, p.z + e) - f(p.x, p.y, p.z - e),
    ).normalize();
  }

  /** Trafienie w przestrzeni modelu: o = punkt startu (lokalnie, wewnątrz), d = kierunek */
  hit(o: [number, number, number], d: [number, number, number]): { p: Vector3; n: Vector3 } {
    const dn = new Vector3(...d).normalize();
    const pl = this.cast(o[0], o[1], o[2], dn.x, dn.y, dn.z);
    return { p: pl.clone().add(this.c), n: this.normalAt(pl) };
  }

  geometry(nx: number, ny: number, nz: number): BufferGeometry {
    const g = new BoxGeometry(2, 2, 2, nx, ny, nz);
    const pos = g.attributes.position, nor = g.attributes.normal;
    const s = this.s, v = new Vector3(), col: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i) * s.hw, pos.getY(i) * s.hh, pos.getZ(i) * s.hd).normalize();
      const p = this.cast(0, 0, 0, v.x, v.y, v.z);
      const n = this.normalAt(p);
      pos.setXYZ(i, p.x, p.y, p.z);
      nor.setXYZ(i, n.x, n.y, n.z);
      // Lekkie przyciemnienie ku dołowi i na krawędziach: namiastka okluzji, bryła mniej „plastikowa”
      const ty = (p.y / s.hh + 1) / 2;
      const edge = 1 - Math.max(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z));
      const k = (0.8 + 0.2 * Math.min(1, ty * 1.4)) * (1 - 0.25 * edge);
      col.push(k, k, k);
    }
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    g.translate(this.c.x, this.c.y, this.c.z);
    return g;
  }

  /** Płat dopasowany do przedniej ściany (rzep, panel solarny) */
  conform(cx: number, cy: number, w: number, h: number, off: number, sx = 10, sy = 8): BufferGeometry {
    const g = new PlaneGeometry(w, h, sx, sy);
    const pos = g.attributes.position, nor = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const { p, n } = this.hit([cx + pos.getX(i), cy + pos.getY(i) - this.c.y, 0], [0, 0, 1]);
      p.addScaledVector(n, off);
      pos.setXYZ(i, p.x, p.y, p.z);
      nor.setXYZ(i, n.x, n.y, n.z);
    }
    return g;
  }
}

/* ───────────────────────── Paski: przeciągnięcie przekroju wzdłuż ścieżki ───────────────────────── */

const sweepTmp = { T: new Vector3(), N: new Vector3(), S: new Vector3() };

/** Pasek / szelka: zaokrąglony prostokąt w×th przeciągnięty po punktach; `norms` mówi, gdzie jest „na zewnątrz”. */
function sweep(pts: Vector3[], norms: Vector3[], w: number | ((t: number) => number), th: number | ((t: number) => number), closed = false): BufferGeometry {
  const n = pts.length, prof: [number, number][] = [];
  const steps = 3;
  for (const [sx, sy, a0] of [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]] as const) {
    for (let k = 0; k <= steps; k++) { const a = ((a0 + (k * 90) / steps) * Math.PI) / 180; prof.push([sx, sy, Math.cos(a), Math.sin(a)] as any); }
  }
  const m = prof.length;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const { T, N, S } = sweepTmp;
  let dist = 0;
  const ring = (i: number, out: number[]) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const ww = typeof w === 'function' ? w(t) : w, tt = typeof th === 'function' ? th(t) : th;
    const hw = ww / 2, ht = tt / 2, r = Math.min(ht * 0.8, hw);
    const a = closed ? (i - 1 + n) % n : Math.max(0, i - 1), b = closed ? (i + 1) % n : Math.min(n - 1, i + 1);
    T.subVectors(pts[b], pts[a]).normalize();
    N.copy(norms[i]).addScaledVector(T, -norms[i].dot(T)).normalize();
    S.crossVectors(T, N);
    for (const pr of prof as any as [number, number, number, number][]) {
      const x = pr[0] * (hw - r) + pr[2] * r, y = pr[1] * (ht - r) + pr[3] * r;
      out.push(pts[i].x + S.x * x + N.x * y, pts[i].y + S.y * x + N.y * y, pts[i].z + S.z * x + N.z * y);
    }
  };
  for (let i = 0; i < n; i++) {
    if (i) dist += pts[i].distanceTo(pts[i - 1]);
    ring(i, pos);
    for (let j = 0; j < m; j++) uv.push(dist / 0.12, j / m);
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const i2 = (i + 1) % n;
    for (let j = 0; j < m; j++) {
      const a = i * m + j, b = i * m + ((j + 1) % m), c = i2 * m + j, d = i2 * m + ((j + 1) % m);
      idx.push(a, b, c, b, d, c);
    }
  }
  if (!closed) {
    // Zaślepki na końcach (osobne wierzchołki, żeby nie psuć cieniowania boków)
    for (const [i, flip] of [[0, true], [n - 1, false]] as const) {
      const start = pos.length / 3;
      const tmp: number[] = [];
      ring(i, tmp);
      pos.push(pts[i].x, pts[i].y, pts[i].z, ...tmp);
      uv.push(0, 0); for (let j = 0; j < m; j++) uv.push(0, 0);
      for (let j = 0; j < m; j++) {
        const a = start + 1 + j, b = start + 1 + ((j + 1) % m);
        flip ? idx.push(start, b, a) : idx.push(start, a, b);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Klamra szybkozatrzaskowa (część żeńska, męska i przelotka), oś y wzdłuż paska */
function buckleGeo(scale = 1): BufferGeometry {
  const a = new RoundedBoxGeometry(0.074, 0.05, 0.02, 2, 0.008); a.translate(0, 0.024, 0);
  const b = new RoundedBoxGeometry(0.062, 0.042, 0.014, 2, 0.006); b.translate(0, -0.018, 0);
  const c = new RoundedBoxGeometry(0.056, 0.012, 0.02, 1, 0.004); c.translate(0, -0.046, 0);
  const g = mergeGeometries([a, b, c])!;
  g.scale(scale, scale, scale);
  return g;
}

const basisM = new Matrix4();
/** Ustawia obiekt w punkcie p: oś y wzdłuż `along`, oś z wzdłuż normalnej */
function orient(obj: Object3D, p: Vector3, along: Vector3, n: Vector3) {
  const t = along.clone().addScaledVector(n, -along.dot(n)).normalize();
  const s = new Vector3().crossVectors(t, n);
  basisM.makeBasis(s, t, n);
  obj.quaternion.setFromRotationMatrix(basisM);
  obj.position.copy(p);
}

/* ───────────────────────── Model zastępczy ───────────────────────── */

interface Built { group: Group; roll: Group; solar: Group; bottom: number; bottomRoll: number }

function buildProcedural(): Built {
  const tx = textures();
  const mFabric = new MeshStandardMaterial({ color: COL.fabric, roughness: 0.86, metalness: 0, bumpMap: tx.cordura, bumpScale: 1.4, vertexColors: true });
  const mPocket = mFabric;
  const mBack = new MeshStandardMaterial({ color: COL.back, roughness: 0.92, bumpMap: tx.cordura, bumpScale: 2, vertexColors: true });
  const mWeb = new MeshStandardMaterial({ color: COL.web, roughness: 0.82, bumpMap: tx.web, bumpScale: 0.7, side: DoubleSide });
  const mTack = new MeshStandardMaterial({ color: COL.tack, roughness: 0.9 });
  const mVelcro = new MeshStandardMaterial({ color: COL.velcro, roughness: 0.97, bumpMap: tx.velcro, bumpScale: 2.5 });
  const mPipe = new MeshStandardMaterial({ color: COL.pipe, roughness: 0.7 });
  const mBuckle = new MeshStandardMaterial({ color: COL.buckle, roughness: 0.5, metalness: 0.05 });
  const mAccent = new MeshStandardMaterial({ color: COL.accent, roughness: 0.6 });

  const g = new Group();
  const add = (geo: BufferGeometry, mat: MeshStandardMaterial) => { const m = new Mesh(geo, mat); g.add(m); return m; };

  // Korpus ~50 × 33 × 23 cm (1 jednostka ≈ 38 cm), bez klapy: zamek dookoła góry
  const body = new Soft({ hw: 0.44, hh: 0.65, hd: 0.2, rTop: 0.17, rBot: 0.08, rEdge: 0.095, bulge: 0.03, taper: 0.04 }, [0, 0, 0]);
  add(body.geometry(24, 34, 14), mFabric);
  // Panel plecowy (ciemniejszy, wyściełany) i podparcie lędźwi
  const back = new Soft({ hw: 0.37, hh: 0.56, hd: 0.035, rTop: 0.14, rBot: 0.07, rEdge: 0.03, bulge: 0.012 }, [0, -0.02, -0.215]);
  add(back.geometry(12, 16, 4), mBack);
  const lumbar = new Soft({ hw: 0.3, hh: 0.075, hd: 0.03, rTop: 0.06, rBot: 0.06, rEdge: 0.025, bulge: 0.01 }, [0, -0.46, -0.245]);
  add(lumbar.geometry(10, 4, 4), mBack);
  // Duża kieszeń przednia: dolne ~60% przodu
  const pocket = new Soft({ hw: 0.39, hh: 0.39, hd: 0.11, rTop: 0.14, rBot: 0.09, rEdge: 0.1, bulge: 0.05, taper: 0.03 }, [0, -0.215, 0.285]);
  add(pocket.geometry(16, 16, 6), mPocket);

  // Taśmy MOLLE/PALS: jedna instancjonowana siatka na odcinki i druga na przeszycia (bar tack)
  const webM: Matrix4[] = [], tackM: Matrix4[] = [];
  const unit = new Vector3();
  const pushBox = (list: Matrix4[], p: Vector3, t: Vector3, n: Vector3, sx: number, sy: number, sz: number) => {
    const tt = t.clone().addScaledVector(n, -t.dot(n)).normalize();
    const b = new Vector3().crossVectors(n, tt);
    const m = new Matrix4().makeBasis(tt, b, n).scale(unit.set(sx, sy, sz));
    m.setPosition(p);
    list.push(m);
  };
  const WEB_H = 0.062, WEB_T = 0.011, PITCH = 0.099;
  /** Rząd MOLLE na ścianie bryły: front (wzdłuż x) albo bok (wzdłuż z) */
  const molle = (sh: Soft, face: 'front' | 'left' | 'right', y: number, from: number, to: number) => {
    const cnt = Math.max(1, Math.round((to - from) / PITCH)), step = (to - from) / cnt;
    const ly = y - sh.c.y;
    const at = (s: number) => face === 'front' ? sh.hit([s, ly, 0], [0, 0, 1]) : sh.hit([0, ly, s], [face === 'left' ? -1 : 1, 0, 0]);
    const along = face === 'front' ? new Vector3(1, 0, 0) : new Vector3(0, 0, face === 'left' ? 1 : -1);
    for (let i = 0; i < cnt; i++) {
      const { p, n } = at(from + step * (i + 0.5));
      pushBox(webM, p.addScaledVector(n, 0.003), along, n, step - 0.004, WEB_H, WEB_T);
    }
    for (let i = 0; i <= cnt; i++) {
      const { p, n } = at(from + step * i);
      pushBox(tackM, p.addScaledVector(n, 0.004), along, n, 0.007, WEB_H + 0.004, WEB_T + 0.002);
    }
  };
  // Przód nad kieszenią: 2 rzędy; kieszeń: 3 rzędy pod rzepem
  for (const y of [0.45, 0.32]) molle(body, 'front', y, -0.36, 0.36);
  for (const y of [-0.25, -0.38, -0.51]) molle(pocket, 'front', y, -0.33, 0.33);
  // Boki: po 8 rzędów
  for (const face of ['left', 'right'] as const) for (let k = 0; k < 8; k++) molle(body, face, 0.4 - k * 0.13, -0.14, 0.14);

  // Rzep na naszywkę u góry kieszeni (ciemniejszy prostokąt)
  add(pocket.conform(0, 0.0, 0.33, 0.145, 0.004, 6, 3), mVelcro);

  // Zamki: ciemna lamówka dookoła komory głównej i kieszeni
  const outline = (sh: Soft, yMin: number, depth: number, n = 90): Vector3[] => {
    const s = sh.s, pts: Vector3[] = [];
    // obiegamy profil od prawego dołu przez górę do lewego dołu
    const ys = yMin - sh.c.y;
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + 0.0001 + (i / n) * (Math.PI * 2 - 0.0002);
      // kierunek w płaszczyźnie profilu (rozciągnięty do proporcji bryły)
      const dx = Math.cos(a + Math.PI / 2) * -1, dy = Math.sin(a + Math.PI / 2) * -1;
      const dir = new Vector3(dx * s.hw, dy * s.hh, 0);
      const flat = sh.cast(0, 0, 0, dir.x, dir.y, 0).multiplyScalar(0.985);
      if (flat.y < ys) continue;
      const { p } = sh.hit([0, 0, 0], [flat.x, flat.y, s.hd * depth]);
      pts.push(p);
    }
    return pts;
  };
  const pipe = (pts: Vector3[], r = 0.007) => {
    const norms = pts.map((p) => p.clone().normalize());
    return add(sweep(pts, norms, r * 2, r * 2), mPipe);
  };
  const mainZip = outline(body, -0.36, 0.95);
  pipe(mainZip);
  const pocketZip = outline(pocket, -0.5, 1.0);
  pipe(pocketZip, 0.008);
  // Szew w miejscu, gdzie kieszeń łączy się z korpusem
  pipe(outline(pocket, -0.7, -0.45, 120), 0.007);
  // Zamek organizera pod rzepem
  const orgZip: Vector3[] = [];
  for (let i = 0; i <= 16; i++) { const { p, n } = pocket.hit([-0.33 + (0.66 * i) / 16, -0.165 - pocket.c.y, 0], [0, 0, 1]); orgZip.push(p.addScaledVector(n, 0.002)); }
  pipe(orgZip, 0.006);

  // Uchwyty zamków: tu jedyny pomarańczowy akcent PrepReady
  const pullGeo = mergeGeometries([
    (() => { const s = new RoundedBoxGeometry(0.022, 0.02, 0.012, 1, 0.004); s.translate(0, 0.012, 0.004); return s; })(),
    (() => { const s = new RoundedBoxGeometry(0.02, 0.05, 0.007, 1, 0.003); s.translate(0, -0.026, 0.006); return s; })(),
  ])!;
  const pull = (sh: Soft, o: [number, number, number], d: [number, number, number]) => {
    const { p, n } = sh.hit(o, d);
    const m = new Mesh(pullGeo, mAccent);
    orient(m, p.addScaledVector(n, 0.004), new Vector3(0, 1, 0), n);
    g.add(m);
  };
  pull(body, [0.07, 0, 0], [0.07, 0.65, 0.19]);
  pull(body, [-0.07, 0, 0], [-0.07, 0.65, 0.19]);
  pull(pocket, [0, 0, 0], [-0.31, 0.33, 0.1]);
  pull(pocket, [-0.3, 0.05, 0], [0, 0, 1]);

  // Pionowe paski kompresyjne: z góry plecaka, przez górną krawędź, w dół przodu, z klamrami na 2. rzędzie MOLLE
  const bGeo = buckleGeo();
  for (const x of [-0.23, 0.23]) {
    const pts: Vector3[] = [], nr: Vector3[] = [];
    const o: [number, number, number] = [x, 0.3, 0];
    for (let i = 0; i <= 16; i++) {
      const a = (118 - (i / 16) * 98) * (Math.PI / 180);
      const { p, n } = body.hit(o, [0, Math.sin(a), Math.cos(a)]);
      pts.push(p.addScaledVector(n, 0.006)); nr.push(n);
    }
    for (const y of [0.42, 0.39, 0.365]) { const { p, n } = body.hit([x, y, 0], [0, 0, 1]); pts.push(p.addScaledVector(n, 0.02)); nr.push(n); }
    add(sweep(pts, nr, 0.064, 0.008), mWeb);
    const { p, n } = body.hit([x, 0.325, 0], [0, 0, 1]);
    const bk = new Mesh(bGeo, mBuckle); orient(bk, p.addScaledVector(n, 0.026), new Vector3(0, 1, 0), n); g.add(bk);
    const low: Vector3[] = [], lowN: Vector3[] = [];
    for (const y of [0.285, 0.25, 0.21, 0.18]) { const h = body.hit([x, y, 0], [0, 0, 1]); low.push(h.p.addScaledVector(h.n, 0.02)); lowN.push(h.n); }
    add(sweep(low, lowN, 0.064, 0.008), mWeb);
  }

  // Boczne paski kompresyjne z klamrami
  for (const sx of [-1, 1]) for (const y of [0.4, -0.12]) {
    const pts: Vector3[] = [], nr: Vector3[] = [];
    for (let i = 0; i <= 14; i++) {
      const z = -0.2 + (i / 14) * 0.33;
      const { p, n } = body.hit([0, y, z * 0.9], [sx, 0, z * 1.6]);
      pts.push(p.addScaledVector(n, 0.02)); nr.push(n);
    }
    add(sweep(pts, nr, 0.05, 0.008), mWeb);
    const { p, n } = body.hit([0, y, 0.06], [sx, 0, 0]);
    const bk = new Mesh(bGeo, mBuckle); orient(bk, p.addScaledVector(n, 0.03), new Vector3(0, 0, 1), n); bk.scale.setScalar(0.85); g.add(bk);
  }

  // Uchwyt do noszenia na górze
  {
    const yTop = body.hit([0.17, 0, -0.03], [0, 1, 0]).p.y;
    const pts: Vector3[] = [], nr: Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, x = -0.19 + 0.38 * t;
      const y = yTop + 0.004 + 0.12 * Math.pow(Math.sin(Math.PI * t), 0.75);
      pts.push(new Vector3(x, y, -0.03));
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const t = b.clone().sub(a).normalize();
      const nn = new Vector3(-t.y, t.x, 0); if (nn.y < 0) nn.negate();
      nr.push(nn);
    }
    add(sweep(pts, nr, 0.05, (t) => (t > 0.28 && t < 0.72 ? 0.026 : 0.009)), mWeb);
    for (const x of [-0.19, 0.19]) {
      const tab = new Mesh(new RoundedBoxGeometry(0.07, 0.016, 0.06, 1, 0.006), mWeb);
      tab.position.set(x, yTop + 0.004, -0.03); g.add(tab);
    }
  }

  // Szelki w kształcie S, z paskiem piersiowym
  const strapAt: Vector3[][] = [];
  for (const s of [-1, 1]) {
    const curve = new CatmullRomCurve3([
      new Vector3(s * 0.1, 0.57, -0.19), new Vector3(s * 0.11, 0.5, -0.31), new Vector3(s * 0.14, 0.36, -0.385),
      new Vector3(s * 0.175, 0.16, -0.41), new Vector3(s * 0.185, -0.04, -0.4), new Vector3(s * 0.22, -0.2, -0.37),
      new Vector3(s * 0.28, -0.33, -0.33),
    ]);
    const pts = curve.getPoints(30);
    const nr = pts.map(() => new Vector3(s * 0.25, 0.05, -1).normalize());
    add(sweep(pts, nr, (t) => 0.13 + 0.035 * Math.sin(Math.PI * Math.min(1, t * 1.3)), (t) => 0.036 + 0.02 * Math.sin(Math.PI * t)), mWeb);
    strapAt.push(pts);
    // Dolna taśma regulacyjna do narożnika plecaka
    const low = [pts[pts.length - 1].clone(), new Vector3(s * 0.34, -0.45, -0.29), new Vector3(s * 0.4, -0.58, -0.23)];
    add(sweep(new CatmullRomCurve3(low).getPoints(8), Array(9).fill(new Vector3(s * 0.6, 0, -0.8)), 0.036, 0.006), mWeb);
    // Taśma w szelce (ze stron zewnętrznych): cienkie paski z rzędem pętli
    for (let i = 6; i < 22; i += 3) {
      const a = pts[i], b = pts[i + 1];
      pushBox(webM, a.clone().add(new Vector3(s * 0.25, 0.05, -1).normalize().multiplyScalar(0.03)), b.clone().sub(a), new Vector3(s * 0.25, 0.05, -1).normalize(), 0.03, 0.09, 0.008);
    }
  }
  {
    // Pasek piersiowy na wysokości ~0.2
    const pick = (pts: Vector3[]) => pts.reduce((best, p) => (Math.abs(p.y - 0.2) < Math.abs(best.y - 0.2) ? p : best));
    const L = pick(strapAt[0]).clone().add(new Vector3(0, 0, -0.03)), R = pick(strapAt[1]).clone().add(new Vector3(0, 0, -0.03));
    const pts = [L, L.clone().lerp(R, 0.5), R];
    add(sweep(pts, pts.map(() => new Vector3(0, 0, -1)), 0.03, 0.006), mWeb);
    const bk = new Mesh(bGeo, mBuckle); orient(bk, L.clone().lerp(R, 0.5).add(new Vector3(0, 0, -0.008)), new Vector3(1, 0, 0), new Vector3(0, 0, -1)); bk.scale.setScalar(0.7); g.add(bk);
  }

  // Pas biodrowy (zdejmowany, wyściełany, z własnym MOLLE)
  for (const s of [-1, 1]) {
    const c = new CatmullRomCurve3([
      new Vector3(s * 0.005, -0.52, -0.265), new Vector3(s * 0.3, -0.52, -0.262), new Vector3(s * 0.45, -0.52, -0.2),
      new Vector3(s * 0.52, -0.52, -0.08), new Vector3(s * 0.535, -0.52, 0.05),
    ]);
    const pts = c.getPoints(22);
    const nr = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const t = b.clone().sub(a).normalize();
      const nn = new Vector3(t.z, 0, -t.x);
      if (nn.dot(new Vector3(p.x, 0, p.z + 0.05)) < 0) nn.negate();
      return nn;
    });
    const TH = 0.05;
    add(sweep(pts, nr, (t) => 0.2 - 0.05 * t, TH), mWeb);
    // Dwa rzędy MOLLE na zewnętrznej stronie skrzydła
    const len = c.getLength();
    for (const dy of [0.045, -0.045]) {
      for (let k = 0; k < 4; k++) {
        const u = c.getUtoTmapping((0.36 + k * 0.15) * 1, 0), u2 = Math.min(1, u + 0.075);
        const p = c.getPoint(u), t = c.getTangent(u);
        const nn = new Vector3(t.z, 0, -t.x); if (nn.dot(new Vector3(p.x, 0, p.z + 0.05)) < 0) nn.negate();
        pushBox(webM, p.clone().add(new Vector3(0, dy * (1 - 0.25 * u), 0)).addScaledVector(nn, TH / 2 + 0.004), t, nn, Math.min(PITCH, len * 0.14) - 0.006, 0.04, WEB_T);
        void u2;
      }
    }
    // Taśma pasa z klamrą
    const end = pts[pts.length - 1], tEnd = c.getTangent(1);
    const belt = [end.clone(), end.clone().addScaledVector(tEnd, 0.09), end.clone().addScaledVector(tEnd, 0.15).add(new Vector3(-s * 0.02, 0, 0))];
    const nE = nr[nr.length - 1];
    add(sweep(belt, belt.map(() => nE), 0.05, 0.006), mWeb);
    const bk = new Mesh(bGeo, mBuckle); orient(bk, belt[1].clone().addScaledVector(nE, 0.012), tEnd, nE); bk.scale.setScalar(0.85); g.add(bk);
  }

  // Dwie małe klamry pod kieszenią (do troczenia śpiwora)
  for (const x of [-0.24, 0.24]) {
    const { p, n } = body.hit([x, -0.5, 0.12], [0, -1, 0.25]);
    const bk = new Mesh(bGeo, mBuckle); orient(bk, p.addScaledVector(n, 0.012), new Vector3(0, 0, 1), n); bk.scale.setScalar(0.7); g.add(bk);
  }

  // Instancje taśm
  const webGeo = new BoxGeometry(1, 1, 1);
  const webInst = new InstancedMesh(webGeo, mWeb, webM.length);
  webM.forEach((m, i) => webInst.setMatrixAt(i, m));
  const tackInst = new InstancedMesh(webGeo, mTack, tackM.length);
  tackM.forEach((m, i) => tackInst.setMatrixAt(i, m));
  g.add(webInst, tackInst);

  const bottom = -0.66;

  // ── Dodatki zależne od wersji ──
  // Śpiwór w worku kompresyjnym, troczony pod spodem dwoma paskami
  const roll = new Group();
  const R = 0.12, rollY = bottom - R + 0.012, rollZ = 0.04;
  const mRoll = new MeshStandardMaterial({ color: COL.roll, roughness: 0.9, bumpMap: tx.cordura, bumpScale: 2.2 });
  const cap = new Mesh(new CapsuleGeometry(R, 0.58, 8, 24), mRoll);
  cap.rotation.z = Math.PI / 2;
  cap.scale.set(1, 1, 0.94);
  cap.position.set(0, rollY, rollZ);
  roll.add(cap);
  const mBand = new MeshStandardMaterial({ color: COL.rollBand, roughness: 0.8, bumpMap: tx.web, bumpScale: 1, side: DoubleSide });
  for (const x of [-0.24, 0.24]) {
    const pts: Vector3[] = [], nr: Vector3[] = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const n = new Vector3(0, Math.sin(a), Math.cos(a));
      nr.push(n);
      pts.push(new Vector3(x, rollY, rollZ).addScaledVector(n, R + 0.004));
    }
    roll.add(new Mesh(sweep(pts, nr, 0.034, 0.006, true), mBand));
  }
  // Szwy worka kompresyjnego i ściągacz na końcu
  const mSeam = new MeshStandardMaterial({ color: '#30362c', roughness: 0.9 });
  for (const x of [-0.08, 0.08]) {
    const pts: Vector3[] = [], nr: Vector3[] = [];
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; const n = new Vector3(0, Math.sin(a), Math.cos(a) * 0.94); nr.push(n); pts.push(new Vector3(x, rollY, rollZ).addScaledVector(n, R + 0.001)); }
    roll.add(new Mesh(sweep(pts, nr, 0.006, 0.004, true), mSeam));
  }
  for (const sx of [-1, 1]) {
    const knot = new Mesh(new RoundedBoxGeometry(0.03, 0.034, 0.03, 1, 0.008), mBand);
    knot.position.set(sx * (0.29 + R * 0.97), rollY, rollZ);
    roll.add(knot);
  }
  // Pivot śpiwora: przy dnie plecaka (animacja „podjeżdża” od dołu)
  const rollPivot = new Group();
  rollPivot.add(roll);
  g.add(rollPivot);

  // Elastyczny panel solarny przypięty do MOLLE kieszeni przedniej
  const sc = document.createElement('canvas');
  sc.width = 256; sc.height = 200;
  const sg = sc.getContext('2d')!;
  sg.fillStyle = '#16181a'; sg.fillRect(0, 0, 256, 200);
  for (let cx = 0; cx < 2; cx++) for (let cy = 0; cy < 2; cy++) {
    const x0 = 14 + cx * 118, y0 = 14 + cy * 88;
    sg.fillStyle = '#14283f'; sg.fillRect(x0, y0, 110, 80);
    sg.strokeStyle = 'rgba(190,205,225,.55)'; sg.lineWidth = 1;
    for (let k = 1; k < 4; k++) { sg.beginPath(); sg.moveTo(x0 + (k * 110) / 4, y0); sg.lineTo(x0 + (k * 110) / 4, y0 + 80); sg.stroke(); }
    for (let k = 1; k < 3; k++) { sg.beginPath(); sg.moveTo(x0, y0 + (k * 80) / 3); sg.lineTo(x0 + 110, y0 + (k * 80) / 3); sg.stroke(); }
    sg.strokeStyle = 'rgba(120,150,190,.35)';
    for (let k = 0; k < 110; k += 6) { sg.beginPath(); sg.moveTo(x0 + k, y0); sg.lineTo(x0 + k, y0 + 80); sg.stroke(); }
  }
  // oczka do mocowania
  sg.fillStyle = '#8a8f94';
  for (const [x, y] of [[7, 7], [249, 7], [7, 193], [249, 193], [128, 7], [128, 193]]) { sg.beginPath(); sg.arc(x, y, 4, 0, Math.PI * 2); sg.fill(); }
  const sTex = new CanvasTexture(sc);
  sTex.colorSpace = SRGBColorSpace;
  const mSolar = new MeshStandardMaterial({ map: sTex, roughness: 0.38, metalness: 0.25, side: DoubleSide });
  const solar = new Group();
  const top = pocket.hit([0, -0.185 - pocket.c.y, 0], [0, 0, 1]);
  const pivot = top.p.clone().addScaledVector(top.n, 0.024);
  const panel = new Mesh(pocket.conform(0, -0.385, 0.56, 0.4, 0.024, 14, 10), mSolar);
  panel.position.sub(pivot);
  solar.add(panel);
  // dwa paski mocujące do MOLLE
  for (const x of [-0.2, 0.2]) {
    const pts: Vector3[] = [], nr: Vector3[] = [];
    for (const y of [-0.15, -0.18, -0.22]) { const h = pocket.hit([x, y - pocket.c.y, 0], [0, 0, 1]); pts.push(h.p.addScaledVector(h.n, 0.03).sub(pivot)); nr.push(h.n); }
    solar.add(new Mesh(sweep(pts, nr, 0.03, 0.005), mBand));
  }
  solar.position.copy(pivot);
  g.add(solar);

  return { group: g, roll: rollPivot, solar, bottom, bottomRoll: rollY - R };
}

/** Miękki cień pod plecakiem (tekstura z radialnym zanikiem). */
function contactShadow(): Mesh {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.36)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const m = new Mesh(new PlaneGeometry(1.9, 1.3), new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

const easeOutBack = (t: number) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function mountBag(o: BagOptions): BagHandle {
  const renderer = new WebGLRenderer({ canvas: o.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // Miękkie światło studyjne: duże otoczenie + klucz z przodu, kontra z tyłu, żeby grafit odcinał się też w trybie ciemnym
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;
  scene.add(new HemisphereLight(0xffffff, new Color('#5d615c'), 0.55));
  const key = new DirectionalLight(0xfffaf2, 2.8); key.position.set(0.9, 2.4, 3.2); scene.add(key);
  const fill = new DirectionalLight(0xeef3ff, 1.0); fill.position.set(-3, 0.4, 0.6); scene.add(fill);
  const rim = new DirectionalLight(0xdfe8ff, 1.8); rim.position.set(1.2, 2.0, -3.5); scene.add(rim);

  const camera = new PerspectiveCamera(28, 1, 0.1, 50);
  const root = new Group();
  scene.add(root);
  const built = buildProcedural();
  const { group: proc, roll, solar } = built;
  root.add(proc);

  const shadow = contactShadow();
  shadow.position.y = built.bottom;
  scene.add(shadow);

  const fitBox = new Box3().setFromObject(proc);
  const center = fitBox.getCenter(new Vector3());
  // Dodatki zaczynają schowane, pokazuje je setExtras()
  const ex = { roll: { cur: 0, goal: 0 }, solar: { cur: 0, goal: 0 } };
  const applyExtras = () => {
    const r = ex.roll.cur, s = ex.solar.cur;
    roll.visible = r > 0.002;
    const er = easeOutBack(Math.min(1, r));
    roll.scale.set(0.55 + 0.45 * er, Math.max(0.001, er), Math.max(0.001, er));
    roll.position.y = (1 - easeOut(r)) * 0.05;
    roll.position.y += (1 - roll.scale.y) * (built.bottom - 0.12);
    solar.visible = s > 0.002;
    const es = easeOutBack(Math.min(1, s));
    solar.scale.set(0.7 + 0.3 * easeOut(s), Math.max(0.001, es), 1);
    shadow.position.y = built.bottom + (built.bottomRoll - built.bottom) * easeOut(r);
  };
  applyExtras();

  // Kotwice podpisów: punkt + kierunek w przestrzeni sceny
  const anchors = new Map<string, { p: Vector3; n: Vector3 }>();
  for (const d of o.defs) anchors.set(d.id, { p: new Vector3(...d.anchor), n: new Vector3(...d.normal).normalize() });
  // Kropki „przyklejamy” do powierzchni modelu zastępczego: promień z zewnątrz wzdłuż normalnej punktu
  {
    const rc = new Raycaster();
    proc.updateMatrixWorld(true);
    const solids = proc.children.filter((c) => c !== roll && c !== solar);
    for (const a of anchors.values()) {
      rc.set(a.p.clone().addScaledVector(a.n, 0.6), a.n.clone().negate());
      rc.far = 1.0;
      const h = rc.intersectObjects(solids, false)[0];
      if (h) a.p.copy(h.point).addScaledVector(a.n, 0.004);
    }
  }

  const controls = new OrbitControls(camera, o.canvas);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.minPolarAngle = 1.05;
  controls.maxPolarAngle = 1.75;
  controls.autoRotate = !o.reducedMotion;
  controls.autoRotateSpeed = 1.0;
  controls.target.set(center.x, center.y, center.z);
  // Pionowe przesunięcie palcem przewija stronę, poziome obraca plecak
  o.canvas.style.touchAction = 'pan-y';

  let selected: string | null = null;
  let dock = 0;
  let idle: number | undefined;
  const resumeLater = (ms = 3500) => {
    clearTimeout(idle);
    if (!o.reducedMotion) idle = window.setTimeout(() => { if (!selected) controls.autoRotate = true; }, ms);
  };
  let goal: { az: number; pol: number } | null = null;
  controls.addEventListener('start', () => { controls.autoRotate = false; goal = null; clearTimeout(idle); o.stage.classList.add('dragging'); });
  controls.addEventListener('end', () => { o.stage.classList.remove('dragging'); resumeLater(); });

  const frame = () => {
    const w = o.stage.clientWidth, h = o.stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Odległość kamery tak, żeby plecak (z dodatkami) mieścił się z marginesem w pionie i w poziomie
    const size = fitBox.getSize(new Vector3());
    const vfov = (camera.fov * Math.PI) / 180;
    const radius = Math.max(size.y, Math.hypot(size.x, size.z)) * 0.5;
    const dV = (size.y * 0.5 + 0.06) / Math.tan(vfov / 2);
    const dH = radius / (Math.tan(vfov / 2) * camera.aspect);
    const dist = Math.max(dV, dH) * 1.04 + 0.22;
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(-0.62, 0.2, 1);
    camera.position.copy(controls.target).add(dir.normalize().multiplyScalar(dist));
    camera.updateProjectionMatrix();
    if (dock > 0) applyDock();
  };
  camera.position.set(-0.62, 0.2, 1);
  frame();
  const ro = new ResizeObserver(() => { frame(); measureCard(); });
  ro.observe(o.stage);

  // Próba podmiany na prawdziwy model
  if (o.modelUrl) {
    import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
      new GLTFLoader().load(o.modelUrl!, (gltf) => {
        const model: Object3D = gltf.scene;
        const b = new Box3().setFromObject(model);
        const s = new Box3().setFromObject(proc).getSize(new Vector3()), ms = b.getSize(new Vector3());
        const k = s.y / (ms.y || 1);
        model.scale.setScalar(k);
        const b2 = new Box3().setFromObject(model);
        model.position.sub(b2.getCenter(new Vector3())).add(center);
        // Dodatki (śpiwór, panel) zostają przy modelu
        proc.remove(roll); proc.remove(solar);
        root.remove(proc);
        root.add(model, roll, solar);
        model.updateMatrixWorld(true);
        model.traverse((n) => {
          const m = /^hs_(.+)$/.exec(n.name);
          if (m && anchors.has(m[1])) {
            const p = n.getWorldPosition(new Vector3());
            const prev = anchors.get(m[1])!;
            const nrm = p.clone().sub(center).setY(0);
            anchors.set(m[1], { p, n: nrm.lengthSq() > 1e-4 ? nrm.normalize() : prev.n });
          }
        });
        o.stage.dataset.model = 'glb';
      }, undefined, () => { /* brak pliku: zostaje plecak zastępczy */ });
    });
  }

  // Karta obok wybranego punktu
  let cardW = 0, cardH = 0;
  const measureCard = () => {
    if (!o.card) return;
    o.card.classList.toggle('dock', o.stage.clientWidth < 560);
    cardW = o.card.offsetWidth; cardH = o.card.offsetHeight;
    if (dock > 0) applyDock();
  };
  if (o.card) ro.observe(o.card);

  // Podpisy
  let active = new Set(o.defs.map((d) => d.id));
  const tmp = new Vector3(), toCam = new Vector3();
  const placeHotspots = () => {
    const w = o.stage.clientWidth, h = o.stage.clientHeight;
    const placed: { el: HTMLElement; id: string; x: number; y: number; dotY: number; left: boolean }[] = [];
    for (const el of o.hotspots) {
      const id = el.dataset.cat!;
      const a = anchors.get(id);
      if (!a || !active.has(id)) { el.classList.remove('on'); continue; }
      toCam.copy(camera.position).sub(a.p).normalize();
      const facing = a.n.dot(toCam);
      if (facing < 0.12) { el.classList.remove('on'); continue; }
      tmp.copy(a.p).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      // Podpis po stronie, po której się zmieści
      const lab = el.querySelector<HTMLElement>('span');
      const lw = Number(el.dataset.lw) || (lab ? lab.offsetWidth : 0) || 110;
      if (lab && lab.offsetWidth) el.dataset.lw = String(lab.offsetWidth);
      let left = x < w / 2;
      if (!left && x + 14 + lw > w - 4) left = true;
      else if (left && x - 14 - lw < 4) left = false;
      placed.push({ el, id, x, y, dotY: y, left });
    }
    // Proste rozsuwanie podpisów po tej samej stronie, żeby się nie nakładały (sama kropka zostaje na miejscu)
    for (const side of [true, false]) {
      const list = placed.filter((p) => p.left === side).sort((a, b) => a.y - b.y);
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1];
        if (list[i].y - prev.y < 24) list[i].y = prev.y + 24;
      }
    }
    let cardDot: { x: number; y: number } | null = null;
    for (const p of placed) {
      p.el.classList.add('on');
      p.el.classList.toggle('l', p.left);
      p.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.dotY.toFixed(1)}px, 0)`;
      const lab = p.el.querySelector<HTMLElement>('span');
      if (lab) lab.style.marginTop = `${(p.y - p.dotY).toFixed(1)}px`;
      if (p.id === selected) cardDot = { x: p.x, y: p.dotY };
    }
    if (o.card) {
      o.card.classList.toggle('on', !!cardDot);
      const docked = w < 560;
      o.card.classList.toggle('dock', docked);
      if (cardDot && docked) {
        // Telefon: karta jako panel na dole sceny (pozycja w CSS), plecak przesuwa się wyżej
        if (o.card.style.transform) o.card.style.transform = '';
      } else if (cardDot) {
        // karta w lewej części sceny, na wysokości punktu (plecak jest wtedy przesunięty w prawo)
        const x = 16;
        const y = Math.max(16, Math.min(h - cardH - 16, cardDot.y - 40));
        const tf = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        if (o.card.style.transform !== tf) o.card.style.transform = tf;
      }
    }
  };

  const sph = new Spherical(), off = new Vector3();
  const stepGoal = (k: number) => {
    if (!goal) return;
    off.copy(camera.position).sub(controls.target);
    sph.setFromVector3(off);
    let d = goal.az - sph.theta;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const dp = goal.pol - sph.phi;
    if (Math.abs(d) < 0.002 && Math.abs(dp) < 0.002) { goal = null; return; }
    sph.theta += d * k; sph.phi += dp * k;
    off.setFromSpherical(sph);
    camera.position.copy(controls.target).add(off);
    camera.lookAt(controls.target);
  };

  const applyDock = () => {
    const w = o.stage.clientWidth, h = o.stage.clientHeight;
    const e = easeOut(dock);
    if (w < 560) {
      // telefon: karta na dole, plecak mieści się w całości w wolnym miejscu nad nią
      const free = Math.max(0.32 * h, h - cardH - 20);
      camera.zoom = 1 - (1 - Math.min(1, (free / h) * 1.1)) * e;
      if (e > 0.001) camera.setViewOffset(w, h, 0, ((h - free) / 2) * e, w, h); else camera.clearViewOffset();
    } else {
      // szeroki ekran: karta po lewej, plecak odsuwa się w prawo
      camera.zoom = 1 - 0.12 * e;
      if (e > 0.001) camera.setViewOffset(w, h, (-(cardW + 28) / 2) * e, 0, w, h); else camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
  };
  let visible = true, raf = 0, running = false, last = performance.now();
  const tick = (dt: number) => {
    let moved = false;
    for (const e of [ex.roll, ex.solar]) {
      if (e.cur !== e.goal) {
        const sp = dt / 650;
        e.cur = e.goal > e.cur ? Math.min(e.goal, e.cur + sp) : Math.max(e.goal, e.cur - sp * 1.6);
        moved = true;
      }
    }
    if (moved) applyExtras();
    // Otwarta karta: plecak odsuwa się (w bok albo w górę), żeby karta go nie zasłaniała
    const goalDock = selected ? 1 : 0;
    if (dock !== goalDock) {
      dock = o.reducedMotion ? goalDock : goalDock > dock ? Math.min(1, dock + dt / 350) : Math.max(0, dock - dt / 350);
      applyDock();
    }
  };
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(64, now - last);
    last = now;
    tick(dt);
    stepGoal(0.09);
    controls.update();
    renderer.render(scene, camera);
    placeHotspots();
  };
  const start = () => { if (!running && visible && !document.hidden) { running = true; last = performance.now(); loop(); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); });
  io.observe(o.stage);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  start();

  const redraw = () => { if (!running) { controls.update(); renderer.render(scene, camera); placeHotspots(); } };
  const setGoal = (az: number, pol: number, instant: boolean) => {
    controls.autoRotate = false;
    clearTimeout(idle);
    goal = { az, pol: Math.max(controls.minPolarAngle, Math.min(controls.maxPolarAngle, pol)) };
    if (instant || o.reducedMotion || !running) { for (let i = 0; i < 400 && goal; i++) stepGoal(1); goal = null; redraw(); }
  };

  return {
    setActive(ids) { active = ids; if (selected && !ids.has(selected)) selected = null; redraw(); },
    setExtras({ roll: r, solar: s }) {
      ex.roll.goal = r ? 1 : 0; ex.solar.goal = s ? 1 : 0;
      if (o.reducedMotion || !running) { ex.roll.cur = ex.roll.goal; ex.solar.cur = ex.solar.goal; applyExtras(); redraw(); }
    },
    select(id) {
      selected = id;
      measureCard();
      if (id) { controls.autoRotate = false; clearTimeout(idle); } else resumeLater(2500);
      redraw();
    },
    focus(id) {
      const a = anchors.get(id);
      if (!a) return;
      let az = Math.atan2(a.n.x, a.n.z);
      // boki pokazujemy w ujęciu 3/4 (widać też przód), tył i przód na wprost
      if (Math.abs(az) > 0.3 && Math.abs(az) < Math.PI - 0.6) az -= 0.45 * Math.sign(az);
      const pol = 1.42 - a.n.y * 0.4;
      setGoal(az, pol, false);
    },
    view(az, pol, instant = true) { setGoal(az, pol, instant); },
    destroy() {
      stop(); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis);
      clearTimeout(idle);
      controls.dispose(); renderer.dispose(); pmrem.dispose();
    },
  };
}

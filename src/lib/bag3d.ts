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
 *
 * Wnętrze: kolorowe saszetki (po jednej na kategorię). „Otwórz plecak”: zamek komory głównej się rozsuwa,
 * a saszetki wychodzą górą i układają się nad plecakiem (widok rozłożony, zawsze przodem do widza).
 * Wybrana saszetka unosi się i dostaje obrys; apteczka otwiera się i pokazuje środek.
 * Kolor plecaka: jednolity (kolor materiału) albo kamuflaż rysowany w kodzie na canvasie z palety wariantu.
 */
import {
  ACESFilmicToneMapping, Box3, BoxGeometry, BufferGeometry, CanvasTexture, CapsuleGeometry, Color, DirectionalLight,
  DoubleSide, Float32BufferAttribute, Raycaster, Group, HemisphereLight, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PMREMGenerator, RepeatWrapping, Scene, Spherical,
  SRGBColorSpace, Vector3, WebGLRenderer, Plane, Matrix3, CatmullRomCurve3, CylinderGeometry, CircleGeometry, BackSide, Vector2,
  type Object3D, type Texture,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface HotspotDef {
  id: string; anchor: [number, number, number]; normal: [number, number, number];
  /** Saszetka w środku plecaka (brak = punkt tylko na plecaku) */
  pouch?: { hex: string; cross?: boolean };
}
export type BagColorSpec = { hex: string; palette?: string[]; pattern?: 'pantera' | 'multi'; id?: string };
export interface BagExtras {
  /** Śpiwór / plandeka troczone pod spodem */ roll: boolean;
  /** Panel solarny na MOLLE z przodu */ solar: boolean;
  /** Czołówka na szelce */ headlamp?: boolean;
  /** Butelki w niebieskiej saszetce */ bottles?: boolean;
  /** Akumulatory i ładowarka przy żółtej saszetce */ batteries?: boolean;
  /** Staza w apteczce (Pro) */ tourniquet?: boolean;
  /** Id rzeczy w zestawie: decydują, co widać w otwartych saszetkach */ items?: string[];
}
export interface BagOptions {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  hotspots: HTMLElement[];
  defs: HotspotDef[];
  /** Karta z zawartością kategorii, przyklejana obok wybranego punktu */
  card?: HTMLElement;
  modelUrl?: string;
  reducedMotion: boolean;
  /** Klik w saszetkę na modelu (id) albo w tło (null) */
  onPick?: (id: string | null) => void;
}
export interface BagHandle {
  /** Które kategorie mają podpis (pozostałe są ukryte) */
  setActive(ids: Set<string>): void;
  /** Dodatki: śpiwór pod spodem, panel solarny, czołówka na szelce, butelki, akumulatory, staza (z animacją) */
  setExtras(x: BagExtras): void;
  /** Otwarcie / zamknięcie plecaka (saszetki wychodzą na wierzch) */
  open(on: boolean): void;
  isOpen(): boolean;
  /** Kolor albo kamuflaż plecaka */
  setColor(c: BagColorSpec): void;
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


/**
 * Kamuflaż bez rozciągania: wzór rzutujemy z trzech osi (triplanar) według położenia w modelu, a nie według UV.
 * UV brył i pasków mają różną skalę na każdej ścianie (przód 0,88 × 1,3, bok 0,4 × 1,3 dostają ten sam kafelek 0..1),
 * przez co plamy były rozciągnięte na bokach, ściśnięte na klapie i urwane na krawędziach.
 * `scale` = ile kafelków wzoru na 1 jednostkę sceny (≈ 38 cm). Działa tylko, gdy materiał ma `map`.
 */
function triplanar(m: MeshStandardMaterial, scale: number) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.triScale = { value: scale };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriP;\nvarying vec3 vTriN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 triP = vec4(position, 1.0);
        vec3 triN = normal;
        #ifdef USE_INSTANCING
          triP = instanceMatrix * triP;
          triN = mat3(instanceMatrix) * triN;
        #endif
        vTriP = triP.xyz; vTriN = triN;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriP;\nvarying vec3 vTriN;\nuniform float triScale;')
      .replace('#include <map_fragment>', `#ifdef USE_MAP
        vec3 triW = pow(abs(normalize(vTriN)), vec3(6.0));
        triW /= (triW.x + triW.y + triW.z);
        vec3 triQ = vTriP * triScale;
        vec4 triC = texture2D(map, triQ.zy) * triW.x + texture2D(map, triQ.xz + 0.37) * triW.y + texture2D(map, triQ.xy) * triW.z;
        diffuseColor *= triC;
      #endif`);
  };
  m.customProgramCacheKey = () => `tri${scale}`;
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

interface ZipPt { p: Vector3; n: Vector3; t: Vector3 }
interface Built {
  group: Group; roll: Group; solar: Group; headlamp: Group; bottom: number; bottomRoll: number;
  mats: { fabric: MeshStandardMaterial; back: MeshStandardMaterial; web: MeshStandardMaterial; tack: MeshStandardMaterial; velcro: MeshStandardMaterial; band: MeshStandardMaterial };
  /** Zamek komory głównej: punkty, dwa uchwyty na górze i ciemna szczelina, która się rozsuwa */
  zip: { pts: ZipPt[]; pulls: Mesh[]; at: number[]; dir: number[]; gaps: Mesh[]; mouth: Mesh; body: Soft };
}

/** Kafelki wzoru kamuflażu na 1 jednostkę sceny: przód plecaka (0,88 j.) ≈ 1,4 kafelka, plama ≈ 6–12 cm */
const CAMO_SCALE = 1.6;

function buildProcedural(): Built {
  const tx = textures();
  const mFabric = new MeshStandardMaterial({ color: COL.fabric, roughness: 0.86, metalness: 0, bumpMap: tx.cordura, bumpScale: 1.4, vertexColors: true });
  const mPocket = mFabric;
  const mBack = new MeshStandardMaterial({ color: COL.back, roughness: 0.92, bumpMap: tx.cordura, bumpScale: 2, vertexColors: true });
  const mWeb = new MeshStandardMaterial({ color: COL.web, roughness: 0.82, bumpMap: tx.web, bumpScale: 0.7, side: DoubleSide });
  const mTack = new MeshStandardMaterial({ color: COL.tack, roughness: 0.9 });
  const mVelcro = new MeshStandardMaterial({ color: COL.velcro, roughness: 0.97, bumpMap: tx.velcro, bumpScale: 2.5 });
  // kamuflaż: jedna skala wzoru na całym plecaku, paskach i rzepie (patrz triplanar)
  for (const mm of [mFabric, mBack, mWeb, mVelcro]) triplanar(mm, CAMO_SCALE);
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
    return m;
  };
  const topPulls = [pull(body, [0.07, 0, 0], [0.07, 0.65, 0.19]), pull(body, [-0.07, 0, 0], [-0.07, 0.65, 0.19])];
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

  // ── Zamek komory głównej: dane do animacji otwierania ──
  const zpts: ZipPt[] = mainZip.map((p, i) => {
    const a = mainZip[Math.max(0, i - 1)], b = mainZip[Math.min(mainZip.length - 1, i + 1)];
    return { p: p.clone(), n: body.normalAt(p.clone().sub(body.c)), t: b.clone().sub(a).normalize() };
  });
  const nearest = (q: Vector3) => zpts.reduce((bi, z, i) => (z.p.distanceToSquared(q) < zpts[bi].p.distanceToSquared(q) ? i : bi), 0);
  const at = topPulls.map((m) => nearest(m.position));
  const dir = at.map((i, k) => {
    const want = k === 0 ? 1 : -1; // pierwszy uchwyt jedzie w prawo (+x), drugi w lewo
    const nx = zpts[Math.min(zpts.length - 1, i + 1)].p.x - zpts[i].p.x;
    return Math.sign(nx) === want ? 1 : -1;
  });
  const mid = Math.round((at[0] + at[1]) / 2);
  const mGap = new MeshBasicMaterial({ color: '#0b0c0d' });
  const gaps = dir.map((d) => {
    const pts: Vector3[] = [], nr: Vector3[] = [];
    for (let i = mid; i >= 0 && i < zpts.length; i += d) { pts.push(zpts[i].p.clone().addScaledVector(zpts[i].n, 0.004)); nr.push(zpts[i].n); }
    const geo = sweep(pts, nr, 0.05, 0.004);
    geo.setDrawRange(0, 0);
    const m = new Mesh(geo, mGap);
    m.userData.segs = pts.length - 1;
    g.add(m);
    return m;
  });
  // Rozchylona góra: ciemny owal na wierzchu, rośnie przy otwieraniu (wierzchołki liczone w mountBag)
  const mouthGeo = new CircleGeometry(1, 40);
  mouthGeo.rotateX(-Math.PI / 2);
  const mouth = new Mesh(mouthGeo, new MeshBasicMaterial({ color: '#0e0f10' }));
  mouth.userData.base = Float32Array.from(mouthGeo.attributes.position.array as Float32Array);
  mouth.visible = false;
  g.add(mouth);

  // ── Czołówka na lewej szelce (opaska owinięta wokół szelki, lampka na zewnątrz, światłem do przodu) ──
  const headlamp = new Group();
  {
    const pts = strapAt[0], i = 11, s = -1;
    const c = pts[i].clone();
    const T = pts[i + 1].clone().sub(pts[i - 1]).normalize();
    const N = new Vector3(s * 0.25, 0.05, -1).normalize();
    N.addScaledVector(T, -N.dot(T)).normalize();
    const S = new Vector3().crossVectors(T, N);
    const t = i / (pts.length - 1);
    const W = 0.13 + 0.035 * Math.sin(Math.PI * Math.min(1, t * 1.3)), TH = 0.036 + 0.02 * Math.sin(Math.PI * t);
    const ring: Vector3[] = [], rn: Vector3[] = [];
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      // zaokrąglony prostokąt wokół przekroju szelki
      const px = Math.sign(ca) * Math.pow(Math.abs(ca), 0.4) * (W / 2 + 0.006), py = Math.sign(sa) * Math.pow(Math.abs(sa), 0.4) * (TH / 2 + 0.006);
      ring.push(c.clone().addScaledVector(S, px).addScaledVector(N, py));
      rn.push(S.clone().multiplyScalar(ca).addScaledVector(N, sa).normalize());
    }
    const mHb = new MeshStandardMaterial({ color: '#3b3f43', roughness: 0.85, bumpMap: tx.web, bumpScale: 0.8 });
    headlamp.add(new Mesh(sweep(ring, rn, 0.042, 0.006, true), mHb));
    const lamp = new Group();
    const mHouse = new MeshStandardMaterial({ color: '#202224', roughness: 0.45 });
    const house = new Mesh(new RoundedBoxGeometry(0.12, 0.072, 0.055, 2, 0.016), mHouse);
    house.position.z = 0.028;
    const lens = new Mesh(new CylinderGeometry(0.027, 0.027, 0.012, 28), new MeshStandardMaterial({ color: '#f3efe0', emissive: '#fff1c2', emissiveIntensity: 0.6, roughness: 0.15 }));
    lens.rotation.x = Math.PI / 2; lens.position.set(-0.016, 0, 0.058);
    const ringL = new Mesh(new CylinderGeometry(0.034, 0.034, 0.01, 28), new MeshStandardMaterial({ color: '#9aa0a6', roughness: 0.3, metalness: 0.6 }));
    ringL.rotation.x = Math.PI / 2; ringL.position.set(-0.016, 0, 0.054);
    const btn = new Mesh(new RoundedBoxGeometry(0.026, 0.014, 0.02, 1, 0.005), mAccent);
    btn.position.set(0.034, 0.038, 0.032);
    lamp.add(house, ringL, lens, btn);
    orient(lamp, c.clone().addScaledVector(N, TH / 2 + 0.008), T, N);
    headlamp.add(lamp);
  }
  headlamp.visible = false;
  g.add(headlamp);

  return {
    group: g, roll: rollPivot, solar, headlamp, bottom, bottomRoll: rollY - R,
    mats: { fabric: mFabric, back: mBack, web: mWeb, tack: mTack, velcro: mVelcro, band: mBand },
    zip: { pts: zpts, pulls: topPulls, at, dir, gaps, mouth, body },
  };
}

/* ───────────────────────── Kolor i kamuflaż ───────────────────────── */

/** Przyciemnienie / rozjaśnienie koloru (k < 1 ciemniej) */
function shade(hex: string, k: number): Color {
  const c = new Color(hex);
  return k <= 1 ? c.multiplyScalar(k) : c.lerp(new Color('#ffffff'), k - 1);
}

/** Szum wartości, powtarzalny (kafelek bez szwów), z oktawami. cx/cy: liczba komórek w poziomie / pionie (anizotropia). */
function tileNoise(size: number, cx: number, cy: number, seed: number, oct = 3): Float32Array {
  const out = new Float32Array(size * size);
  let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const gx = cx << o, gy = cy << o;
    const grid = new Float32Array(gx * gy);
    let sd = seed * 977 + o * 131 + 7;
    for (let i = 0; i < grid.length; i++) { sd = (sd * 16807) % 2147483647; grid[i] = sd / 2147483647; }
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * gy, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
      const r0 = (y0 % gy) * gx, r1 = ((y0 + 1) % gy) * gx;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * gx, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
        const a = grid[r0 + (x0 % gx)], b = grid[r0 + ((x0 + 1) % gx)], c = grid[r1 + (x0 % gx)], d = grid[r1 + ((x0 + 1) % gx)];
        out[y * size + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
      }
    }
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

/**
 * Kamuflaż rysowany w kodzie (bez zdjęć producenta): ogólny wzór przywołujący charakter oryginału.
 * 'pantera' (wz. 93): duże, poziomo wydłużone plamy z postrzępionym brzegiem i czarne smugi;
 * 'multi' (MultiCam): miękkie, pionowe pociągnięcia i drobne plamki, płynne przejścia tonów.
 */
export function camoCanvas(palette: string[], pattern: 'pantera' | 'multi', size = 256): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(size, size);
  const cols = palette.map((h) => { const c = new Color(h); return [c.r * 255, c.g * 255, c.b * 255]; });
  // c = kolor tła, potem kolejne warstwy: [kolor, pole szumu, próg, miękkość]
  const layers: [number, Float32Array, number, number][] = [];
  if (pattern === 'pantera') {
    layers.push([1, tileNoise(size, 3, 6, 11, 4), 0.52, 0.012]);
    layers.push([2, tileNoise(size, 3, 7, 23, 4), 0.56, 0.012]);
    if (cols[4]) layers.push([4, tileNoise(size, 4, 9, 41, 3), 0.66, 0.01]);
  } else {
    layers.push([1, tileNoise(size, 8, 3, 5, 3), 0.47, 0.1]);
    layers.push([2, tileNoise(size, 7, 3, 17, 3), 0.57, 0.08]);
    layers.push([3, tileNoise(size, 9, 4, 29, 3), 0.66, 0.06]);
    if (cols[4]) layers.push([4, tileNoise(size, 14, 6, 53, 3), 0.74, 0.035]);
  }
  // Smugi (pantera: czarne, poziome; multi: ciemne plamki)
  const streak = pattern === 'pantera' ? tileNoise(size, 2, 10, 61, 3) : null;
  for (let i = 0; i < size * size; i++) {
    let r = cols[0][0], gg = cols[0][1], b = cols[0][2];
    for (const [ci, f, th, soft] of layers) {
      const v = f[i];
      const a = Math.max(0, Math.min(1, (v - th) / soft + 0.5));
      if (a > 0) { const c = cols[ci]; r += (c[0] - r) * a; gg += (c[1] - gg) * a; b += (c[2] - b) * a; }
    }
    if (streak) {
      const d = Math.abs(streak[i] - 0.5);
      if (d < 0.022) { const c = cols[3] || cols[2]; const a = Math.min(1, (0.022 - d) / 0.008); r += (c[0] - r) * a; gg += (c[1] - gg) * a; b += (c[2] - b) * a; }
    }
    const j = i * 4;
    img.data[j] = r; img.data[j + 1] = gg; img.data[j + 2] = b; img.data[j + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return cv;
}

/* ───────────────────────── Saszetki ───────────────────────── */

const POUCH_SIZE: Record<string, [number, number, number]> = {
  woda: [0.36, 0.25, 0.15], jedzenie: [0.36, 0.24, 0.14], ogien: [0.32, 0.22, 0.12], apteczka: [0.34, 0.24, 0.12],
  swiatlo: [0.32, 0.22, 0.12], lacznosc: [0.34, 0.22, 0.1], higiena: [0.3, 0.2, 0.11], ochrona: [0.38, 0.25, 0.15],
};
/** Kolejność w widoku rozłożonym: od dolnego rzędu (nad plecakiem) w górę; woda na końcu, bo butelki wystają z góry */
const POUCH_ORDER = ['swiatlo', 'apteczka', 'ogien', 'jedzenie', 'lacznosc', 'higiena', 'ochrona', 'woda'];

interface Pouch {
  id: string; size: [number, number, number];
  /** Pozycja w układzie (bez uniesienia); w nim: inner (uniesienie) i rekwizyty obok */
  slot: Group; inner: Group; outline: Mesh; hits: Mesh[];
  cur: Vector3; goal: Vector3; p: number; a: number; aGoal: number; lift: number; order: number;
  flap?: Group; kit?: Group; tq?: Group; bottles?: Group; batt?: Group; things?: Group[];
  bottlesOn: number; battOn: number; tqOn: number; kitOpen: number;
}

/* ── Zawartość saszetek: proste bryły zamiast zdjęć, każda przypisana do rzeczy z listy (userData.items) ── */
const contentMats = new Map<string, MeshStandardMaterial>();
const cm = (hex: string, rough = 0.7, metal = 0, extra: Partial<{ transparent: boolean; opacity: number; emissive: string }> = {}) => {
  const k = `${hex}|${rough}|${metal}|${JSON.stringify(extra)}`;
  let m = contentMats.get(k);
  if (!m) { m = new MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal, ...extra }); contentMats.set(k, m); }
  return m;
};
const rbox = (w: number, h: number, t: number, m: MeshStandardMaterial, r = 0.004) => new Mesh(new RoundedBoxGeometry(w, h, t, 1, Math.min(r, t * 0.45, w * 0.3, h * 0.3)), m);
const cyl = (r: number, len: number, m: MeshStandardMaterial, seg = 16) => new Mesh(new CylinderGeometry(r, r, len, seg), m);
/** Rzecz w saszetce: grupa leżąca na dnie (oś z = grubość), fw × fh to jej obrys w układzie, items = id rzeczy z listy */
const thing = (items: string[], fw: number, fh: number, ...parts: Object3D[]) => {
  const g = new Group();
  g.add(...parts);
  g.userData = { items, fw, fh };
  return g;
};
/** Leżący walec (oś wzdłuż x) */
const lying = (m: Mesh, x = 0, y = 0, z = 0) => { m.rotation.z = Math.PI / 2; m.position.set(x, y, z); return m; };

function pouchContents(id: string, tx: ReturnType<typeof textures>): Group[] {
  const out: Group[] = [];
  const dark = cm('#1f2124', 0.5), steel = cm('#b8bcc0', 0.3, 0.75), white = cm('#f2f1ec', 0.85);
  switch (id) {
    case 'woda': {
      // tabletki do uzdatniania (pudełko), słomka filtrująca, butelka z filtrem, tuba elektrolitów
      const box = rbox(0.07, 0.05, 0.016, cm('#e9eef4', 0.6)); box.position.z = 0.008;
      const band = rbox(0.072, 0.014, 0.017, cm('#1f63b5', 0.5)); band.position.z = 0.008;
      out.push(thing(['woda'], 0.075, 0.055, box, band));
      const straw = lying(cyl(0.014, 0.15, cm('#2c7fd1', 0.4), 18), 0, 0, 0.014);
      const capS = lying(cyl(0.015, 0.02, cm('#1b3f6b', 0.5)), 0.08, 0, 0.014);
      out.push(thing(['filtr'], 0.17, 0.035, straw, capS));
      const flask = rbox(0.06, 0.13, 0.03, cm('#9cc4e4', 0.15, 0, { transparent: true, opacity: 0.85 }), 0.02); flask.position.z = 0.016;
      const fcap = cyl(0.016, 0.02, cm('#3a4d63', 0.5)); fcap.position.set(0, 0.075, 0.016);
      out.push(thing(['filtr-pro'], 0.065, 0.16, flask, fcap));
      const tube = lying(cyl(0.013, 0.1, cm('#e8792a', 0.45)), 0, 0, 0.013);
      out.push(thing(['elektrolity'], 0.11, 0.03, tube));
      break;
    }
    case 'jedzenie': {
      const pack = (col: string) => { const m = rbox(0.085, 0.11, 0.014, cm(col, 0.45, 0.35), 0.006); m.position.z = 0.007; const lab = rbox(0.06, 0.035, 0.002, white, 0.001); lab.position.set(0, 0.01, 0.015); return [m, lab]; };
      out.push(thing(['jedzenie-3'], 0.09, 0.115, ...pack('#d96a1c')));
      out.push(thing(['jedzenie-3'], 0.09, 0.115, ...pack('#c9c3b5')));
      out.push(thing(['jedzenie-3'], 0.09, 0.115, ...pack('#d96a1c')));
      out.push(thing(['jedzenie-5'], 0.09, 0.115, ...pack('#6b7a3a')));
      out.push(thing(['jedzenie-5'], 0.09, 0.115, ...pack('#6b7a3a')));
      const spoonH = rbox(0.13, 0.012, 0.005, cm('#e2602b', 0.45), 0.003); spoonH.position.set(-0.015, 0, 0.003);
      const bowl = new Mesh(new CircleGeometry(0.016, 18), cm('#e2602b', 0.45)); bowl.scale.set(1.4, 1, 1); bowl.position.set(0.07, 0, 0.006);
      out.push(thing(['lyzka'], 0.16, 0.035, spoonH, bowl));
      const gl = rbox(0.03, 0.08, 0.02, cm('#f3f0e6', 0.6), 0.008); gl.position.z = 0.01;
      const glb = rbox(0.031, 0.02, 0.021, cm('#d83a3a', 0.5), 0.004); glb.position.set(0, 0.02, 0.01);
      out.push(thing(['glukoza'], 0.035, 0.085, gl, glb));
      break;
    }
    case 'ogien': {
      const lighter = rbox(0.025, 0.07, 0.012, cm('#d23a2c', 0.35), 0.005); lighter.position.set(-0.025, 0, 0.006);
      const rod = lying(cyl(0.006, 0.075, dark, 10), 0.018, 0.012, 0.007);
      const handle = lying(cyl(0.01, 0.03, cm('#e0a020', 0.5), 12), 0.018, -0.016, 0.01);
      out.push(thing(['ogien'], 0.08, 0.075, lighter, rod, handle));
      const mt = rbox(0.11, 0.032, 0.018, cm('#2b2d30', 0.35, 0.4), 0.006); mt.position.z = 0.009;
      const mtb = rbox(0.07, 0.006, 0.004, steel, 0.001); mtb.position.set(0.02, 0.012, 0.019);
      out.push(thing(['multitool'], 0.115, 0.04, mt, mtb));
      const tape = new Mesh(new CylinderGeometry(0.03, 0.03, 0.022, 24, 1, true), cm('#a9adb1', 0.45, 0.5)); tape.rotation.x = Math.PI / 2; tape.position.z = 0.011;
      const core = new Mesh(new CylinderGeometry(0.018, 0.018, 0.022, 20, 1, true), cm('#8a6d4a', 0.9)); core.rotation.x = Math.PI / 2; core.position.z = 0.011;
      const face = new Mesh(new CircleGeometry(0.03, 24), cm('#9ea2a6', 0.5, 0.4)); face.position.z = 0.0225;
      out.push(thing(['tasma'], 0.065, 0.065, tape, core, face));
      const can = cyl(0.033, 0.045, cm('#2363a8', 0.4, 0.3), 24); can.rotation.x = Math.PI / 2; can.position.z = 0.0225;
      const valve = cyl(0.012, 0.012, steel); valve.rotation.x = Math.PI / 2; valve.position.z = 0.05;
      out.push(thing(['kuchenka'], 0.07, 0.07, can, valve));
      const blade = rbox(0.075, 0.018, 0.004, steel, 0.002); blade.position.set(0.04, 0, 0.004);
      const kh = rbox(0.06, 0.022, 0.014, cm('#e2602b', 0.5), 0.007); kh.position.set(-0.03, 0, 0.007);
      out.push(thing(['noz'], 0.14, 0.025, blade, kh));
      break;
    }
    case 'apteczka': {
      // bandaże, plastry, buteleczka (podstawowa lub rozszerzona); staza tylko w rozszerzonej
      const mBand = new MeshStandardMaterial({ color: '#f4f3ee', roughness: 0.95, bumpMap: tx.cordura, bumpScale: 0.6 });
      const rolls: Object3D[] = [];
      for (const y of [0.025, -0.025]) {
        rolls.push(lying(cyl(0.024, 0.07, mBand, 20), 0, y, 0.024));
        rolls.push(lying(cyl(0.01, 0.072, cm('#d6d3c8', 1), 12), 0, y, 0.024));
      }
      out.push(thing(['apteczka', 'apteczka-pro'], 0.075, 0.1, ...rolls));
      const plasters = rbox(0.08, 0.055, 0.012, cm('#d7ad80', 0.7)); plasters.position.z = 0.006;
      const strip = rbox(0.065, 0.013, 0.002, cm('#f1e3d0', 0.8), 0.001); strip.position.z = 0.013;
      out.push(thing(['apteczka', 'apteczka-pro'], 0.085, 0.06, plasters, strip));
      const bottle = lying(cyl(0.017, 0.065, cm('#f2f2ee', 0.3), 18), 0, 0, 0.017);
      const cap = lying(cyl(0.012, 0.02, cm('#c2352e', 0.5), 14), 0.042, 0, 0.017);
      out.push(thing(['apteczka', 'apteczka-pro'], 0.09, 0.04, bottle, cap));
      const mBlack = new MeshStandardMaterial({ color: '#17181a', roughness: 0.7, bumpMap: tx.web, bumpScale: 0.6 });
      const strap = rbox(0.03, 0.15, 0.012, mBlack); strap.position.z = 0.006;
      const wind = cyl(0.007, 0.065, mBlack, 10); wind.rotation.z = Math.PI / 2; wind.position.set(0, -0.01, 0.018);
      const tab = rbox(0.034, 0.024, 0.01, cm('#d1322a', 0.55)); tab.position.set(0, 0.065, 0.014);
      out.push(thing(['apteczka-pro'], 0.04, 0.155, strap, wind, tab));
      const blister = (y: number) => { const m = rbox(0.07, 0.03, 0.004, cm('#c7cbcf', 0.25, 0.7), 0.002); m.position.set(0, y, 0.002); return m; };
      out.push(thing(['leki-otc'], 0.075, 0.07, blister(0.018), blister(-0.018)));
      const jar = cyl(0.02, 0.045, cm('#f4f2ea', 0.4), 18); jar.rotation.x = Math.PI / 2; jar.position.z = 0.0225;
      const jcap = cyl(0.021, 0.008, cm('#e08a1e', 0.5), 18); jcap.rotation.x = Math.PI / 2; jcap.position.z = 0.047;
      out.push(thing(['multiwitamina'], 0.045, 0.045, jar, jcap));
      const ch = rbox(0.045, 0.03, 0.012, cm('#1c1d1f', 0.6), 0.003); ch.position.z = 0.006;
      out.push(thing(['wegiel'], 0.05, 0.035, ch));
      break;
    }
    case 'swiatlo': {
      const pb = (w: number, h: number) => { const m = rbox(w, h, 0.02, cm('#26292c', 0.45), 0.008); m.position.z = 0.01; const l = rbox(0.012, 0.004, 0.002, cm('#3fbf6a', 0.4, 0, { emissive: '#3fbf6a' }), 0.001); l.position.set(w * 0.3, h * 0.4, 0.021); return [m, l]; };
      out.push(thing(['powerbank'], 0.07, 0.11, ...pb(0.065, 0.105)));
      out.push(thing(['duzy-powerbank'], 0.085, 0.14, ...pb(0.08, 0.135)));
      const coil = new Mesh(new CylinderGeometry(0.028, 0.028, 0.012, 20, 1, true), cm('#e9e9e6', 0.6)); coil.rotation.x = Math.PI / 2; coil.position.z = 0.006;
      out.push(thing(['powerbank', 'duzy-powerbank', 'solar'], 0.06, 0.06, coil));
      const fl = lying(cyl(0.015, 0.11, cm('#1d1f22', 0.35, 0.3), 18), 0, 0, 0.016);
      const head = lying(cyl(0.02, 0.025, cm('#2a2c2f', 0.3, 0.4), 18), 0.065, 0, 0.02);
      out.push(thing(['latarka'], 0.14, 0.045, fl, head));
      break;
    }
    case 'lacznosc': {
      const radio = rbox(0.12, 0.075, 0.03, cm('#2b2f33', 0.5), 0.008); radio.position.z = 0.015;
      const grill = rbox(0.05, 0.045, 0.002, cm('#55595e', 0.6), 0.002); grill.position.set(-0.025, 0, 0.031);
      const dial = cyl(0.012, 0.006, cm('#e2602b', 0.5), 16); dial.rotation.x = Math.PI / 2; dial.position.set(0.035, 0.008, 0.032);
      const ant = lying(cyl(0.003, 0.11, steel, 8), 0.0, 0.043, 0.02);
      out.push(thing(['radio'], 0.125, 0.09, radio, grill, dial, ant));
      const doc = rbox(0.1, 0.07, 0.006, cm('#d7e3e6', 0.15, 0, { transparent: true, opacity: 0.7 }), 0.003); doc.position.z = 0.003;
      const paper = rbox(0.08, 0.05, 0.002, cm('#efe9da', 0.9), 0.001); paper.position.z = 0.002;
      out.push(thing(['etui'], 0.105, 0.075, paper, doc));
      const nb = rbox(0.055, 0.085, 0.01, cm('#59613a', 0.8), 0.003); nb.position.z = 0.005;
      const pen = lying(cyl(0.004, 0.08, cm('#2c2c2c', 0.6), 8), 0.0, -0.05, 0.004);
      out.push(thing(['notes'], 0.085, 0.1, nb, pen));
      const wh = rbox(0.045, 0.014, 0.012, cm('#f07a1a', 0.4), 0.005); wh.position.z = 0.006;
      out.push(thing(['gwizdek'], 0.05, 0.02, wh));
      const comp = rbox(0.05, 0.08, 0.006, cm('#d9dbd6', 0.2, 0, { transparent: true, opacity: 0.85 }), 0.004); comp.position.z = 0.003;
      const dialc = cyl(0.016, 0.01, cm('#2b2f33', 0.4), 20); dialc.rotation.x = Math.PI / 2; dialc.position.set(0, 0.01, 0.009);
      const map = rbox(0.07, 0.09, 0.008, cm('#e4dcc2', 0.85), 0.002); map.position.set(0.065, 0, 0.004);
      out.push(thing(['mapa'], 0.13, 0.095, map, comp, dialc));
      const wt = (col: string, x: number) => { const m = rbox(0.03, 0.07, 0.02, cm(col, 0.5), 0.008); m.position.set(x, 0, 0.01); const a2 = cyl(0.004, 0.02, dark, 8); a2.position.set(x - 0.008, 0.045, 0.01); return [m, a2]; };
      out.push(thing(['pmr'], 0.075, 0.09, ...wt('#ec7a1c', -0.018), ...wt('#2f7fd0', 0.018)));
      break;
    }
    case 'higiena': {
      const mask = rbox(0.09, 0.05, 0.01, cm('#f4f4f0', 0.95), 0.012); mask.position.z = 0.005;
      const mask2 = rbox(0.09, 0.05, 0.01, cm('#e9e9e4', 0.95), 0.012); mask2.position.set(0.006, -0.012, 0.012);
      out.push(thing(['ffp2'], 0.1, 0.07, mask, mask2));
      const wipes = rbox(0.1, 0.06, 0.02, cm('#3a8fd0', 0.55), 0.01); wipes.position.z = 0.01;
      const lid = rbox(0.045, 0.02, 0.004, white, 0.003); lid.position.set(0, 0.008, 0.021);
      const gel = rbox(0.03, 0.065, 0.016, cm('#bfe3f5', 0.2, 0, { transparent: true, opacity: 0.85 }), 0.008); gel.position.set(0.075, 0, 0.008);
      out.push(thing(['chusteczki'], 0.14, 0.07, wipes, lid, gel));
      const bags = lying(cyl(0.022, 0.08, cm('#151618', 0.6), 18), 0, 0, 0.022);
      out.push(thing(['worki'], 0.085, 0.05, bags));
      const tp = rbox(0.08, 0.06, 0.02, cm('#fbfbf8', 0.95), 0.01); tp.position.z = 0.01;
      const brush = rbox(0.1, 0.01, 0.008, cm('#2f9fd8', 0.4), 0.003); brush.position.set(0, -0.042, 0.004);
      out.push(thing(['higiena-podst'], 0.1, 0.1, tp, brush));
      const pads = rbox(0.06, 0.045, 0.015, cm('#e9a6c3', 0.6), 0.006); pads.position.z = 0.0075;
      out.push(thing(['intymne'], 0.065, 0.05, pads));
      break;
    }
    case 'ochrona': {
      const foil = rbox(0.1, 0.07, 0.012, cm('#c9cbc6', 0.25, 0.85), 0.005); foil.position.z = 0.006;
      const foilG = rbox(0.1, 0.012, 0.0125, cm('#c8a640', 0.3, 0.8), 0.003); foilG.position.set(0, -0.02, 0.0065);
      out.push(thing(['koc-nrc'], 0.105, 0.075, foil, foilG));
      const poncho = rbox(0.11, 0.08, 0.025, new MeshStandardMaterial({ color: '#5a6338', roughness: 0.85, bumpMap: tx.cordura, bumpScale: 0.8 }), 0.01); poncho.position.z = 0.0125;
      out.push(thing(['poncho'], 0.115, 0.085, poncho));
      const glove = (x: number) => { const m = rbox(0.04, 0.075, 0.01, cm('#2f6db5', 0.7), 0.012); m.position.set(x, 0, 0.005); return m; };
      out.push(thing(['rekawice'], 0.09, 0.08, glove(-0.022), glove(0.022)));
      const th = rbox(0.1, 0.06, 0.02, cm('#4a4d52', 0.9), 0.008); th.position.z = 0.01;
      out.push(thing(['bielizna'], 0.105, 0.065, th));
      const cap = rbox(0.08, 0.05, 0.02, new MeshStandardMaterial({ color: '#2d3033', roughness: 1, bumpMap: tx.velcro, bumpScale: 1.2 }), 0.012); cap.position.z = 0.01;
      out.push(thing(['czapka'], 0.085, 0.055, cap));
      const lens = rbox(0.09, 0.03, 0.01, cm('#d8e2e6', 0.1, 0, { transparent: true, opacity: 0.6 }), 0.008); lens.position.z = 0.012;
      const fr = rbox(0.092, 0.006, 0.012, dark, 0.002); fr.position.set(0, 0.016, 0.012);
      out.push(thing(['okulary'], 0.095, 0.035, lens, fr));
      break;
    }
  }
  return out;
}

/** Układa widoczne rzeczy na dnie saszetki rzędami (od góry), wyśrodkowane; zwraca czy coś jest widoczne */
function layoutContents(list: Group[], kit: Set<string>, w: number, h: number): boolean {
  const vis = list.filter((g) => (g.userData.items as string[]).some((i) => kit.has(i)));
  for (const g of list) g.visible = vis.includes(g);
  if (!vis.length) return false;
  const gap = 0.012, maxW = w * 0.88, maxH = h * 0.84;
  const rows: { items: Group[]; w: number; h: number }[] = [];
  let cur = { items: [] as Group[], w: 0, h: 0 };
  for (const g of vis) {
    const fw = g.userData.fw as number, fh = g.userData.fh as number;
    if (cur.items.length && cur.w + gap + fw > maxW) { rows.push(cur); cur = { items: [], w: 0, h: 0 }; }
    cur.w += (cur.items.length ? gap : 0) + fw; cur.h = Math.max(cur.h, fh); cur.items.push(g);
  }
  rows.push(cur);
  const totalH = rows.reduce((t, r) => t + r.h, 0) + gap * (rows.length - 1);
  // gdy się nie mieści, całość lekko zmniejszamy
  const k = Math.min(1, maxH / totalH, maxW / Math.max(...rows.map((r) => r.w)));
  let y = (totalH * k) / 2;
  for (const r of rows) {
    let x = (-r.w * k) / 2;
    for (const g of r.items) {
      const fw = (g.userData.fw as number) * k;
      g.scale.setScalar(k);
      g.position.set(x + fw / 2, y - (r.h * k) / 2, 0);
      x += fw + gap * k;
    }
    y -= r.h * k + gap * k;
  }
  return true;
}

function buildPouch(id: string, hex: string, cross: boolean, tx: ReturnType<typeof textures>): Pouch {
  const [w, h, d] = POUCH_SIZE[id] || [0.32, 0.22, 0.12];
  const slot = new Group(), inner = new Group();
  slot.add(inner);
  const light = new Color(hex).getHSL({ h: 0, s: 0, l: 0 }).l > 0.7;
  const mat = new MeshStandardMaterial({ color: hex, roughness: light ? 0.9 : 0.8, bumpMap: tx.cordura, bumpScale: 1.1 });
  const dark = new MeshStandardMaterial({ color: shade(hex, light ? 0.78 : 0.7), roughness: 0.95, bumpMap: tx.velcro, bumpScale: 1.5 });
  const mZip = new MeshStandardMaterial({ color: light ? '#8d8e8a' : '#151617', roughness: 0.6 });
  const hits: Mesh[] = [];
  const r = Math.min(d * 0.32, 0.035);
  const p: Pouch = { id, size: [w, h, d], slot, inner, outline: null as any, hits, cur: new Vector3(), goal: new Vector3(), p: 0, a: 1, aGoal: 1, lift: 0, order: 0, bottlesOn: 0, battOn: 0, tqOn: 0, kitOpen: 0 };

  // Każda saszetka: korpus + przednia klapa na zawiasie u dołu (otwiera się, gdy saszetka jest wybrana), w środku jej rzeczy
  const bd = d * 0.58, fd = d - bd;
  const body = new Mesh(new RoundedBoxGeometry(w, h, bd, 3, r), mat);
  body.position.z = -d / 2 + bd / 2;
  inner.add(body); hits.push(body);
  const front = -d / 2 + bd;
  const pivot = new Group();
  pivot.position.set(0, -h / 2, front);
  const flap = new Mesh(new RoundedBoxGeometry(w, h, fd, 3, Math.min(r, fd * 0.45)), mat);
  flap.position.set(0, h / 2, fd / 2);
  pivot.add(flap); hits.push(flap);
  // podszewka klapy (widać ją, gdy klapa leży otwarta)
  const flapIn = new Mesh(new PlaneGeometry(w * 0.9, h * 0.86), new MeshStandardMaterial({ color: shade(hex, light ? 0.86 : 0.55), roughness: 0.95 }));
  flapIn.rotation.y = Math.PI; flapIn.position.set(0, h / 2, -0.001);
  pivot.add(flapIn);
  if (cross) {
    const mWhite = new MeshStandardMaterial({ color: '#f6f6f2', roughness: 0.55 });
    const cs = h * 0.56, ct = cs / 3;
    const crossGeo = mergeGeometries([new BoxGeometry(ct, cs, 0.004), new BoxGeometry(cs, ct, 0.004)])!;
    const c1 = new Mesh(crossGeo, mWhite); c1.position.set(0, h / 2, fd + 0.002); pivot.add(c1);
    const c2 = new Mesh(crossGeo, mWhite); c2.position.set(0, 0, -d / 2 - 0.002); inner.add(c2);
  } else {
    // naszywka z rzepem i uchwyt zamka na klapie
    const patch = new Mesh(new RoundedBoxGeometry(w * 0.44, h * 0.3, 0.006, 1, 0.003), dark); patch.position.set(0, h * 0.56, fd - 0.001); pivot.add(patch);
    const pull = new Mesh(new RoundedBoxGeometry(0.016, 0.04, 0.006, 1, 0.002), mZip); pull.position.set(w * 0.4, h - 0.018, fd + 0.004); pivot.add(pull);
  }
  // zamek dookoła szwu
  const seam = new Mesh(new BoxGeometry(w + 0.004, 0.008, 0.01), mZip); seam.position.set(0, h / 2 - 0.004, front); inner.add(seam);
  inner.add(pivot);
  p.flap = pivot;
  // Środek: jasne dno i rzeczy (układ zależy od zestawu, patrz layoutContents)
  const kit = new Group();
  const lum = new Color(hex).getHSL({ h: 0, s: 0, l: 0 }).l;
  const lining = new Mesh(new PlaneGeometry(w * 0.92, h * 0.88), new MeshStandardMaterial({ color: light ? '#cfd0cb' : lum < 0.2 ? '#4a4e52' : shade(hex, 0.42), roughness: 0.95 }));
  lining.position.set(0, 0, front + 0.001);
  kit.add(lining);
  const stuff = new Group();
  stuff.position.z = front + 0.002;
  const things = pouchContents(id, tx);
  if (things.length) stuff.add(...things);
  kit.add(stuff);
  kit.visible = false;
  inner.add(kit);
  p.kit = kit; p.things = things;

  // Obrys wybranej saszetki
  const outline = new Mesh(new RoundedBoxGeometry(w, h, d, 2, r), new MeshBasicMaterial({ color: '#EA5A0C', side: BackSide }));
  outline.scale.setScalar(1.07);
  outline.visible = false;
  inner.add(outline);
  p.outline = outline;

  if (id === 'woda') {
    // Dwie butelki wystające z niebieskiej saszetki
    const bottles = new Group();
    const mB = new MeshStandardMaterial({ color: '#c6dceb', roughness: 0.1, metalness: 0, transparent: true, opacity: 0.82 });
    const mCap = new MeshStandardMaterial({ color: '#1f4d86', roughness: 0.5 });
    for (const x of [-0.075, 0.075]) {
      const b = new Group();
      const bodyB = new Mesh(new CylinderGeometry(0.044, 0.044, 0.25, 22), mB); bodyB.position.y = 0.125;
      const sh = new Mesh(new CylinderGeometry(0.018, 0.044, 0.05, 22), mB); sh.position.y = 0.275;
      const c = new Mesh(new CylinderGeometry(0.02, 0.02, 0.03, 16), mCap); c.position.y = 0.315;
      const lab = new Mesh(new CylinderGeometry(0.0445, 0.0445, 0.07, 22, 1, true), new MeshStandardMaterial({ color: '#2b6cb0', roughness: 0.6 })); lab.position.y = 0.14;
      b.add(bodyB, sh, c, lab);
      b.position.set(x, -h / 2 + 0.02, -d / 2 + d * 0.29); // w tylnej części, żeby nie zasłaniały otwartej klapy
      bottles.add(b);
    }
    bottles.visible = false;
    inner.add(bottles);
    p.bottles = bottles;
  }
  if (id === 'swiatlo') {
    // Akumulatory AA i ładowarka: pojawiają się przed żółtą saszetką, gdy jest wybrana
    const batt = new Group();
    const charger = new Mesh(new RoundedBoxGeometry(0.17, 0.034, 0.11, 2, 0.01), new MeshStandardMaterial({ color: '#2a2d30', roughness: 0.5 }));
    batt.add(charger);
    const led = new Mesh(new BoxGeometry(0.012, 0.004, 0.012), new MeshStandardMaterial({ color: '#3fbf6a', emissive: '#3fbf6a', emissiveIntensity: 0.8 }));
    led.position.set(0.065, 0.018, 0.04); batt.add(led);
    const mCell = new MeshStandardMaterial({ color: '#2f7a46', roughness: 0.35 });
    const mCell2 = new MeshStandardMaterial({ color: '#1d1f22', roughness: 0.35 });
    const mTip = new MeshStandardMaterial({ color: '#b9bcbf', roughness: 0.25, metalness: 0.8 });
    const cell = (m: MeshStandardMaterial) => {
      const c = new Group();
      const b = new Mesh(new CylinderGeometry(0.019, 0.019, 0.12, 16), m);
      const t = new Mesh(new CylinderGeometry(0.008, 0.008, 0.008, 10), mTip); t.position.y = 0.064;
      const bot = new Mesh(new CylinderGeometry(0.017, 0.017, 0.004, 14), mTip); bot.position.y = -0.061;
      c.add(b, t, bot);
      return c;
    };
    for (const [x, m] of [[-0.024, mCell], [0.024, mCell]] as const) { const c = cell(m); c.rotation.x = Math.PI / 2; c.position.set(x - 0.03, 0.022, 0); batt.add(c); }
    for (const [x, z, m] of [[0.14, 0.0, mCell2], [0.185, 0.02, mCell]] as const) { const c = cell(m); c.rotation.x = Math.PI / 2; c.rotation.z = 0.35; c.position.set(x, 0.002, z); batt.add(c); }
    batt.position.set(-0.04, -h / 2 + 0.017, d / 2 + 0.11);
    batt.visible = false;
    slot.add(batt);
    p.batt = batt;
  }
  for (const m of hits) m.userData.pouch = id;
  return p;
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

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

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
  const { group: proc, roll, solar, headlamp, zip } = built;
  root.add(proc);

  const shadow = contactShadow();
  shadow.position.y = built.bottom;
  scene.add(shadow);

  // Ramka kadru bez elementów pomocniczych (owal otworu ma na starcie promień 1)
  proc.remove(zip.mouth);
  const fitBox = new Box3().setFromObject(proc);
  proc.add(zip.mouth);
  const center = fitBox.getCenter(new Vector3());

  /* ── Saszetki ── */
  const tx = textures();
  const layout = new Group();
  root.add(layout);
  const pouches: Pouch[] = [];
  for (const d of o.defs) {
    if (!d.pouch) continue;
    const pc = buildPouch(d.id, d.pouch.hex, !!d.pouch.cross, tx);
    pc.order = POUCH_ORDER.indexOf(d.id) < 0 ? 99 : POUCH_ORDER.indexOf(d.id);
    pc.slot.visible = false;
    layout.add(pc.slot);
    pouches.push(pc);
  }
  const pouchById = new Map(pouches.map((p) => [p.id, p]));
  const hitMeshes = pouches.flatMap((p) => p.hits);
  const START = new Vector3(0, 0.3, 0);
  /** Układ rozłożony: rzędy nad plecakiem, liczba kolumn zależy od proporcji sceny */
  let cols = 4, rows = 2;
  /** PS: saszetki w widoku rozłożonym są nieco powiększone, żeby było je dobrze widać */
  const PS = 1.22, ROW_Y = 1.08, ROW_DY = 0.46, COL_DX = 0.55, LAY_Z = 0.16;
  const relayout = () => {
    const act = pouches.filter((p) => p.aGoal > 0).sort((a, b) => a.order - b.order);
    cols = camera.aspect < 0.95 ? 3 : 4;
    rows = Math.max(1, Math.ceil(act.length / cols));
    act.forEach((p, i) => {
      const r = Math.floor(i / cols), inRow = Math.min(cols, act.length - r * cols), c = i - r * cols;
      const x = (c - (inRow - 1) / 2) * COL_DX;
      p.goal.set(x, ROW_Y + r * ROW_DY, LAY_Z - 0.12 * Math.abs(x));
    });
    for (const p of pouches) if (p.aGoal === 0 && p.goal.lengthSq() === 0) p.goal.copy(START);
  };

  // Dodatki zaczynają schowane, pokazuje je setExtras()
  const ex = { roll: { cur: 0, goal: 0 }, solar: { cur: 0, goal: 0 }, lamp: { cur: 0, goal: 0 } };
  const props = { bottles: false, batteries: false, tourniquet: false };
  const applyExtras = () => {
    const r = ex.roll.cur, s = ex.solar.cur, l = ex.lamp.cur;
    roll.visible = r > 0.002;
    const er = easeOutBack(Math.min(1, r));
    roll.scale.set(0.55 + 0.45 * er, Math.max(0.001, er), Math.max(0.001, er));
    roll.position.y = (1 - easeOut(r)) * 0.05;
    roll.position.y += (1 - roll.scale.y) * (built.bottom - 0.12);
    solar.visible = s > 0.002;
    const es = easeOutBack(Math.min(1, s));
    solar.scale.set(0.7 + 0.3 * easeOut(s), Math.max(0.001, es), 1);
    headlamp.visible = l > 0.002;
    headlamp.scale.setScalar(Math.max(0.001, easeOutBack(Math.min(1, l))));
    shadow.position.y = built.bottom + (built.bottomRoll - built.bottom) * easeOut(r);
  };
  // czołówka skaluje się wokół własnego środka
  {
    const hb = new Box3().setFromObject(headlamp.children.length ? headlamp : proc);
    headlamp.visible = true;
    const hc = new Box3().setFromObject(headlamp).getCenter(new Vector3());
    headlamp.children.forEach((c) => c.position.sub(hc));
    headlamp.position.copy(hc);
    void hb;
  }
  applyExtras();

  /* ── Otwieranie: zamek, owal na górze, saszetki ── */
  let open = 0, openGoal = 0;
  const mouth = zip.mouth, mouthBase = mouth.userData.base as Float32Array;
  const topY = zip.body.hit([0, 0, -0.03], [0, 1, 0]).p.y;
  /** Otwieranie: góra plecaka (klapa za zamkiem) odchyla się do tyłu na zawiasie, widać ciemne wnętrze */
  let lid: Group | null = null;
  const LID_ANGLE = 1.85;
  const updateZip = (e: number) => {
    if (lid) lid.rotation.x = -LID_ANGLE * e;
  };

  // Kotwice podpisów: punkt + kierunek w przestrzeni sceny
  const anchors = new Map<string, { p: Vector3; n: Vector3 }>();
  for (const d of o.defs) anchors.set(d.id, { p: new Vector3(...d.anchor), n: new Vector3(...d.normal).normalize() });
  // Kropki „przyklejamy” do powierzchni modelu zastępczego: promień z zewnątrz wzdłuż normalnej punktu
  {
    const rc = new Raycaster();
    proc.updateMatrixWorld(true);
    const solids = proc.children.filter((c) => c !== roll && c !== solar && c !== headlamp && c !== mouth && !zip.gaps.includes(c as Mesh));
    for (const a of anchors.values()) {
      rc.set(a.p.clone().addScaledVector(a.n, 0.6), a.n.clone().negate());
      rc.far = 1.0;
      const h = rc.intersectObjects(solids, false)[0];
      if (h) a.p.copy(h.point).addScaledVector(a.n, 0.004);
    }
  }

  /* ── Klapa: górę plecaka (nad LID_Y) przenosimy do osobnej grupy na zawiasie z tyłu; bryły, które przecinają
     linię cięcia, rysujemy dwa razy z płaszczyznami przycinania (dół zostaje, góra jedzie z klapą) ── */
  const clonePairs: [MeshStandardMaterial, MeshStandardMaterial][] = [];
  const syncClip = (() => {
    const LID_Y = 0.56, HINGE_Z = -0.16;
    renderer.localClippingEnabled = true;
    proc.remove(zip.mouth);
    zip.gaps.forEach((m) => proc.remove(m));
    const L = new Group();
    L.position.set(0, LID_Y, HINGE_Z);
    const lowLocal = new Plane(new Vector3(0, -1, 0), LID_Y), highLocal = new Plane(new Vector3(0, 1, 0), 0);
    const clipLow = lowLocal.clone(), clipHigh = highLocal.clone();
    const mats = new Map<string, MeshStandardMaterial>();
    const clipped = (m: MeshStandardMaterial, high: boolean) => {
      const k = `${m.uuid}|${high}`;
      let c = mats.get(k);
      if (!c) {
        c = m.clone();
        c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey;
        c.clippingPlanes = [high ? clipHigh : clipLow];
        mats.set(k, c); clonePairs.push([m, c]);
      }
      return c;
    };
    const skip = new Set<Object3D>([roll, solar, headlamp]);
    const box = new Box3();
    let bodyMesh: Mesh | null = null, bodyVol = 0;
    for (const ch of [...proc.children]) {
      if (skip.has(ch) || !(ch as Mesh).isMesh || (ch as InstancedMesh).isInstancedMesh) continue;
      const m = ch as Mesh;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      box.copy(m.geometry.boundingBox!).applyMatrix4(m.matrix);
      const mat = m.material as MeshStandardMaterial;
      if (mat === built.mats.fabric) { const sz = box.getSize(new Vector3()); const v = sz.x * sz.y * sz.z; if (v > bodyVol) { bodyVol = v; bodyMesh = m; } }
      if (box.min.y >= LID_Y - 0.002) { m.position.sub(L.position); L.add(m); continue; }
      if (box.max.y <= LID_Y + 0.002) continue;
      // tył (panel plecowy, szelki) zostaje w całości
      if ((box.min.z + box.max.z) / 2 < -0.19) continue;
      const top = new Mesh(m.geometry, clipped(mat, true));
      top.matrix.copy(m.matrix); top.matrix.decompose(top.position, top.quaternion, top.scale);
      top.position.sub(L.position);
      L.add(top);
      m.material = clipped(mat, false);
    }
    // wnętrze: ciemna podszewka (tył ścian korpusu) w dolnej części i pod klapą
    if (bodyMesh) {
      const lining = new MeshStandardMaterial({ color: '#202224', roughness: 1, side: BackSide });
      const inLow = new Mesh(bodyMesh.geometry, lining.clone()); (inLow.material as MeshStandardMaterial).clippingPlanes = [clipLow];
      proc.add(inLow);
      const inHigh = new Mesh(bodyMesh.geometry, lining.clone()); (inHigh.material as MeshStandardMaterial).clippingPlanes = [clipHigh];
      inHigh.position.sub(L.position);
      L.add(inHigh);
    }
    // uchwyty zamka zostają na klapie w miejscu startowym
    proc.add(L);
    lid = L;
    const nm = new Matrix3();
    return () => {
      proc.updateMatrixWorld();
      clipLow.copy(lowLocal).applyMatrix4(proc.matrixWorld, nm.getNormalMatrix(proc.matrixWorld));
      clipHigh.copy(highLocal).applyMatrix4(L.matrixWorld, nm.getNormalMatrix(L.matrixWorld));
    };
  })();
  scene.onBeforeRender = () => syncClip();

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
    if (!o.reducedMotion) idle = window.setTimeout(() => { if (!selected && !openGoal) controls.autoRotate = true; }, ms);
  };
  let goal: { az: number; pol: number } | null = null;
  controls.addEventListener('start', () => { controls.autoRotate = false; goal = null; clearTimeout(idle); o.stage.classList.add('dragging'); });
  controls.addEventListener('end', () => { o.stage.classList.remove('dragging'); resumeLater(); });

  /* ── Kadrowanie: zamknięty plecak albo plecak z saszetkami nad nim ── */
  const vfov = (camera.fov * Math.PI) / 180;
  const fitDist = (halfH: number, halfW: number) => {
    const t = Math.tan(vfov / 2);
    return Math.max((halfH + 0.06) / t, halfW / (t * camera.aspect)) * 1.04 + 0.22;
  };
  const shot = { cC: new Vector3(), dC: 1, cO: new Vector3(), dO: 1 };
  const computeShots = () => {
    const size = fitBox.getSize(new Vector3());
    shot.cC.copy(center);
    shot.dC = fitDist(size.y * 0.5, Math.max(size.y, Math.hypot(size.x, size.z)) * 0.5);
    const yMin = 0.05, yMax = ROW_Y + (rows - 1) * ROW_DY + 0.4 + (pouches.some((p) => p.id === 'woda' && p.aGoal > 0) ? 0.26 : 0);
    const halfW = (Math.min(cols, Math.max(1, pouches.filter((p) => p.aGoal > 0).length)) * COL_DX) / 2 + 0.04;
    shot.cO.set(0, (yMin + yMax) / 2, 0.05);
    shot.dO = fitDist((yMax - yMin) / 2, halfW);
  };
  const tgt = new Vector3();
  const applyShot = () => {
    const e = easeInOut(open);
    tgt.copy(shot.cC).lerp(shot.cO, e);
    const dist = shot.dC + (shot.dO - shot.dC) * e;
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(-0.62, 0.2, 1);
    controls.target.copy(tgt);
    camera.position.copy(tgt).add(dir.normalize().multiplyScalar(dist));
  };

  const frame = () => {
    const w = o.stage.clientWidth, h = o.stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    relayout();
    computeShots();
    applyShot();
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
        // Dodatki (śpiwór, panel, czołówka) zostają przy modelu
        proc.remove(roll); proc.remove(solar); proc.remove(headlamp);
        root.remove(proc);
        root.add(model, roll, solar, headlamp);
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
    const placed: { el: HTMLElement; id: string; x: number; y: number; dotY: number; left: boolean; c: boolean }[] = [];
    const isOpen = open > 0.98, isClosed = open < 0.02;
    for (const el of o.hotspots) {
      const id = el.dataset.cat!;
      const pc = pouchById.get(id);
      let a = anchors.get(id);
      if (!a || !active.has(id) || (pc && !isOpen && !isClosed)) { el.classList.remove('on'); continue; }
      let centered = false;
      if (pc && isOpen) {
        if (pc.p < 0.98 || pc.a < 0.5) { el.classList.remove('on'); continue; }
        pc.inner.getWorldPosition(tmp);
        tmp.y += (pc.size[1] / 2 + 0.03) * pc.inner.scale.y * pc.slot.scale.y;
        if (pc.id === 'woda' && pc.bottlesOn > 0.5) tmp.y += 0.2 * pc.slot.scale.y;
        centered = true;
      } else {
        toCam.copy(camera.position).sub(a.p).normalize();
        const facing = a.n.dot(toCam);
        if (facing < 0.12) { el.classList.remove('on'); continue; }
        tmp.copy(a.p);
      }
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      // Podpis po stronie, po której się zmieści
      const lab = el.querySelector<HTMLElement>('span');
      const lw = Number(el.dataset.lw) || (lab ? lab.offsetWidth : 0) || 110;
      if (lab && lab.offsetWidth) el.dataset.lw = String(lab.offsetWidth);
      let left = x < w / 2;
      if (!left && x + 14 + lw > w - 4) left = true;
      else if (left && x - 14 - lw < 4) left = false;
      placed.push({ el, id, x, y, dotY: y, left, c: centered });
    }
    // Proste rozsuwanie podpisów po tej samej stronie, żeby się nie nakładały (sama kropka zostaje na miejscu)
    for (const side of [true, false]) {
      const list = placed.filter((p) => !p.c && p.left === side).sort((a, b) => a.y - b.y);
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1];
        if (list[i].y - prev.y < 24) list[i].y = prev.y + 24;
      }
    }
    let cardDot: { x: number; y: number } | null = null;
    for (const p of placed) {
      p.el.classList.add('on');
      p.el.classList.toggle('l', !p.c && p.left);
      p.el.classList.toggle('c', p.c);
      p.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.dotY.toFixed(1)}px, 0)`;
      const lab = p.el.querySelector<HTMLElement>('span');
      if (lab) lab.style.marginTop = p.c ? '' : `${(p.y - p.dotY).toFixed(1)}px`;
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
        // karta w lewej części sceny, na wysokości punktu (plecak jest wtedy przesunięty w prawo);
        // przy otwartym plecaku: po przeciwnej stronie niż wybrana saszetka
        const x = open > 0.5 && cardDot.x < w / 2 ? w - cardW - 16 : 16;
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
    if (open > 0.5) {
      // otwarty plecak: saszetki są w górnej części kadru, więc wystarczy (na telefonie) lekko przesunąć scenę w górę
      camera.zoom = 1;
      const sh = w < 560 ? Math.max(0, cardH + 16 - 0.34 * h) : 0;
      if (e > 0.001 && sh > 0) camera.setViewOffset(w, h, 0, sh * e, w, h); else camera.clearViewOffset();
    } else if (w < 560) {
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

  /** Saszetki: wyjście z plecaka (z opóźnieniem jedna po drugiej), uniesienie wybranej, apteczka i rekwizyty */
  const animPouches = (dt: number, instant: boolean) => {
    let moving = false;
    const k = instant ? 1 : 1 - Math.pow(0.0015, dt / 1000);
    const act = pouches.filter((p) => p.aGoal > 0).sort((a, b) => a.order - b.order);
    const n = Math.max(1, act.length);
    const sel = openGoal ? selected : null;
    // cały układ obraca się razem z kamerą, żeby saszetki były zawsze przodem do widza
    off.copy(camera.position).sub(controls.target);
    sph.setFromVector3(off);
    layout.rotation.y = sph.theta;
    for (const pc of pouches) {
      const idx = Math.max(0, act.indexOf(pc));
      const stag = 0.45 / n;
      const local = openGoal ? clamp01((open - idx * stag) / (1 - 0.45)) : clamp01((open - (n - 1 - idx) * stag * 0.4) / (1 - 0.18));
      pc.p = instant ? (openGoal ? 1 : 0) : local;
      if (Math.abs(pc.cur.distanceToSquared(pc.goal)) > 1e-7) { pc.cur.lerp(pc.goal, k); moving = true; }
      const aT = pc.aGoal;
      if (pc.a !== aT) { pc.a = instant ? aT : aT > pc.a ? Math.min(aT, pc.a + dt / 300) : Math.max(aT, pc.a - dt / 300); moving = true; }
      const e = easeInOut(pc.p);
      // ścieżka: ze środka plecaka w górę przez otwór, potem łukiem na miejsce
      const mid = new Vector3(0, Math.max(pc.cur.y, ROW_Y) + 0.18, 0);
      const t = e, u = 1 - t;
      pc.slot.position.set(
        u * u * START.x + 2 * u * t * mid.x + t * t * pc.cur.x,
        u * u * START.y + 2 * u * t * mid.y + t * t * pc.cur.y,
        u * u * START.z + 2 * u * t * mid.z + t * t * pc.cur.z,
      );
      const sc = (0.55 + (PS - 0.55) * e) * easeOut(pc.a);
      pc.slot.scale.setScalar(Math.max(0.001, sc));
      pc.slot.visible = pc.p > 0.001 && pc.a > 0.01;
      // uniesienie wybranej
      const lT = sel === pc.id ? 1 : 0;
      if (pc.lift !== lT) { pc.lift = instant ? lT : lT > pc.lift ? Math.min(1, pc.lift + dt / 280) : Math.max(0, pc.lift - dt / 280); moving = true; }
      const le = easeOutBack(pc.lift);
      // otwarta saszetka wysuwa się do przodu i rośnie, żeby było widać, co jest w środku
      const oe = easeInOut(pc.kitOpen);
      pc.inner.position.set(0, 0.07 * le - 0.04 * oe, 0.09 * le + 0.16 * oe);
      pc.inner.scale.setScalar(1 + 0.07 * le + 0.3 * oe);
      pc.outline.visible = pc.lift > 0.05;
      // każda saszetka: klapa się otwiera, gdy saszetka jest wybrana, w środku widać jej rzeczy
      if (pc.flap) {
        const kT = sel === pc.id && pc.p > 0.98 ? 1 : 0;
        if (pc.kitOpen !== kT) { pc.kitOpen = instant ? kT : kT > pc.kitOpen ? Math.min(1, pc.kitOpen + dt / 520) : Math.max(0, pc.kitOpen - dt / 380); moving = true; }
        const ke = easeInOut(pc.kitOpen);
        pc.flap.rotation.x = 1.72 * ke;
        pc.kit!.visible = pc.kitOpen > 0.01;
      }
      if (pc.bottles) {
        const bT = props.bottles ? 1 : 0;
        if (pc.bottlesOn !== bT) { pc.bottlesOn = instant ? bT : bT > pc.bottlesOn ? Math.min(1, pc.bottlesOn + dt / 400) : Math.max(0, pc.bottlesOn - dt / 400); moving = true; }
        pc.bottles.visible = pc.bottlesOn > 0.01;
        pc.bottles.position.y = -0.2 * (1 - easeOut(pc.bottlesOn));
      }
      if (pc.batt) {
        const bT = props.batteries && sel === pc.id ? 1 : 0;
        if (pc.battOn !== bT) { pc.battOn = instant ? bT : bT > pc.battOn ? Math.min(1, pc.battOn + dt / 380) : Math.max(0, pc.battOn - dt / 300); moving = true; }
        pc.batt.visible = pc.battOn > 0.01;
        pc.batt.scale.setScalar(Math.max(0.001, easeOutBack(pc.battOn)));
      }
    }
    return moving;
  };

  let visible = true, raf = 0, running = false, last = performance.now();
  const tick = (dt: number) => {
    let moved = false;
    for (const e of [ex.roll, ex.solar, ex.lamp]) {
      if (e.cur !== e.goal) {
        const sp = dt / 650;
        e.cur = e.goal > e.cur ? Math.min(e.goal, e.cur + sp) : Math.max(e.goal, e.cur - sp * 1.6);
        moved = true;
      }
    }
    if (moved) applyExtras();
    if (open !== openGoal) {
      open = o.reducedMotion ? openGoal : openGoal > open ? Math.min(1, open + dt / 1500) : Math.max(0, open - dt / 1100);
      updateZip(easeInOut(clamp01(open * 2.2)));
      applyShot();
      if (dock > 0) applyDock();
    }
    animPouches(dt, o.reducedMotion);
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

  /** Gdy pętla stoi (scena poza ekranem): od razu stan końcowy */
  const settle = () => {
    if (running) return;
    open = openGoal; updateZip(open); applyShot();
    ex.roll.cur = ex.roll.goal; ex.solar.cur = ex.solar.goal; ex.lamp.cur = ex.lamp.goal; applyExtras();
    animPouches(16, true);
    if (dock !== (selected ? 1 : 0)) { dock = selected ? 1 : 0; applyDock(); }
  };
  const redraw = () => { if (!running) { settle(); controls.update(); renderer.render(scene, camera); placeHotspots(); } };
  const setGoal = (az: number, pol: number, instant: boolean) => {
    controls.autoRotate = false;
    clearTimeout(idle);
    goal = { az, pol: Math.max(controls.minPolarAngle, Math.min(controls.maxPolarAngle, pol)) };
    if (instant || o.reducedMotion || !running) { for (let i = 0; i < 400 && goal; i++) stepGoal(1); goal = null; redraw(); }
  };

  // Klik (bez przeciągania): saszetka na modelu albo tło
  {
    const rc = new Raycaster(), ndc = new Vector2();
    let down: [number, number] | null = null;
    o.canvas.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
    o.canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) { down = null; return; }
      down = null;
      const r = o.canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      rc.setFromCamera(ndc, camera);
      const hit = open > 0.9 ? rc.intersectObjects(hitMeshes, false).find((h) => h.object.visible) : undefined;
      o.onPick?.(hit ? (hit.object.userData.pouch as string) : null);
    });
  }

  /* ── Kolor plecaka ── */
  const camoCache = new Map<string, { body: Texture; web: Texture }>();
  const setColor = (c: BagColorSpec) => {
    const m = built.mats;
    if (c.palette && c.palette.length && c.pattern) {
      const keyC = c.id || c.palette.join();
      let t = camoCache.get(keyC);
      if (!t) {
        const cv = camoCanvas(c.palette, c.pattern, 512);
        // skalę wzoru ustala triplanar (CAMO_SCALE), więc repeat zostaje 1 i ten sam kafelek idzie na korpus, paski i rzep
        const body = new CanvasTexture(cv); body.colorSpace = SRGBColorSpace; body.wrapS = body.wrapT = RepeatWrapping;
        body.anisotropy = 8;
        const web = body;
        t = { body, web };
        camoCache.set(keyC, t);
      }
      const darkest = c.palette.map((h) => new Color(h)).sort((a, b) => a.getHSL({ h: 0, s: 0, l: 0 }).l - b.getHSL({ h: 0, s: 0, l: 0 }).l)[0];
      m.fabric.map = t.body; m.fabric.color.set('#ffffff');
      m.web.map = t.web; m.web.color.set('#e8e8e8');
      m.back.map = t.body; m.back.color.set('#9a9a9a');
      m.tack.color.copy(darkest).multiplyScalar(0.8);
      m.velcro.map = t.body; m.velcro.color.set('#bdbdbd');
    } else {
      m.fabric.map = null; m.fabric.color.set(c.hex);
      m.web.map = null; m.web.color.copy(shade(c.hex, 0.9));
      m.back.map = null; m.back.color.copy(shade(c.hex, 0.78));
      m.tack.color.copy(shade(c.hex, 0.62));
      m.velcro.map = null; m.velcro.color.copy(shade(c.hex, 0.72));
    }
    for (const mm of [m.fabric, m.web, m.back, m.velcro]) mm.needsUpdate = true;
    for (const [b, c] of clonePairs) { c.map = b.map; c.color.copy(b.color); c.needsUpdate = true; }
    redraw();
  };

  // podgląd stanu do testów zrzutów ekranu (Playwright)
  (o.stage as any).__dbg = () => ({ cam: camera.position.toArray(), tgt: controls.target.toArray(), shot: { cC: shot.cC.toArray(), dC: shot.dC, cO: shot.cO.toArray(), dO: shot.dO }, open, cols, rows, zoom: camera.zoom });
  return {
    setActive(ids) {
      active = ids;
      if (selected && !ids.has(selected)) selected = null;
      for (const pc of pouches) pc.aGoal = ids.has(pc.id) ? 1 : 0;
      relayout(); computeShots();
      if (open > 0) applyShot();
      redraw();
    },
    setExtras(x) {
      ex.roll.goal = x.roll ? 1 : 0; ex.solar.goal = x.solar ? 1 : 0; ex.lamp.goal = x.headlamp ? 1 : 0;
      props.bottles = !!x.bottles; props.batteries = !!x.batteries; props.tourniquet = !!x.tourniquet;
      const kitIds = new Set(x.items || []);
      for (const pc of pouches) if (pc.things) layoutContents(pc.things, kitIds, pc.size[0], pc.size[1]);
      if (o.reducedMotion || !running) { ex.roll.cur = ex.roll.goal; ex.solar.cur = ex.solar.goal; ex.lamp.cur = ex.lamp.goal; applyExtras(); redraw(); }
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
    open(on) {
      const g = on ? 1 : 0;
      if (g === openGoal) return;
      openGoal = g;
      if (on) {
        controls.autoRotate = false; clearTimeout(idle);
        // lekko z góry, żeby było widać otwór; azymut zbliżony do obecnego, ale od przodu
        off.copy(camera.position).sub(controls.target); sph.setFromVector3(off);
        const az = Math.max(-0.75, Math.min(0.75, Math.atan2(Math.sin(sph.theta), Math.cos(sph.theta))));
        setGoal(az, 1.22, false);
      } else {
        setGoal(-0.62, 1.42, false);
        resumeLater(2500);
      }
      redraw();
    },
    isOpen() { return openGoal === 1; },
    setColor,
    view(az, pol, instant = true) { setGoal(az, pol, instant); },
    destroy() {
      stop(); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis);
      clearTimeout(idle);
      controls.dispose(); renderer.dispose(); pmrem.dispose();
    },
  };
}

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Settings } from 'lucide-react';

type Placement = {
  id: string;
  code: string;
  name: string;
  kind: 'print' | 'logo';
  surface: string;
  active: boolean;
};

type GarmentModel = {
  id: string;
  name: string;
  slug: string;
  frontMockupUrl?: string;
  backMockupUrl?: string;
};

type PrintArea = {
  id: string;
  garmentModelId: string;
  placementId: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  active: boolean;
  placement?: Placement;
};

type BrandLogo = {
  id: string;
  name: string;
  slug: string;
  code: string;
  imageUrl: string;
  widthCm: number;
  heightCm: number;
  active: boolean;
  placements: Array<{ id: string; placement?: Placement }>;
};

type AreaForm = {
  xPct: string;
  yPct: string;
  widthPct: string;
  heightPct: string;
  active: boolean;
};

type LogoForm = {
  name: string;
  code: string;
  imageUrl: string;
  widthCm: string;
  heightCm: string;
  placementCodes: string[];
};

const DEFAULTS_BY_CODE: Record<string, AreaForm> = {
  FRONT: { xPct: '30', yPct: '22', widthPct: '40', heightPct: '52', active: true },
  BACK: { xPct: '28', yPct: '20', widthPct: '44', heightPct: '56', active: true },
};

function formKey(garmentModelId: string, placementCode: string) {
  return `${garmentModelId}:${placementCode}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function buildEmptyLogoForm(logoPlacements: Placement[]): LogoForm {
  return {
    name: '',
    code: '',
    imageUrl: '',
    widthCm: '',
    heightCm: '',
    placementCodes: logoPlacements.map((item) => item.code).slice(0, 1),
  };
}

export default function ProductionConfigAdmin() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [models, setModels] = useState<GarmentModel[]>([]);
  const [printAreas, setPrintAreas] = useState<PrintArea[]>([]);
  const [brandLogos, setBrandLogos] = useState<BrandLogo[]>([]);
  const [forms, setForms] = useState<Record<string, AreaForm>>({});
  const [bootstrapping, setBootstrapping] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [editingLogoId, setEditingLogoId] = useState<string | null>(null);
  const [deletingLogoId, setDeletingLogoId] = useState<string | null>(null);
  const [logoForm, setLogoForm] = useState<LogoForm>(buildEmptyLogoForm([]));

  const printPlacements = useMemo(
    () => placements.filter((item) => item.kind === 'print' && (item.code === 'FRONT' || item.code === 'BACK')),
    [placements]
  );
  const logoPlacements = useMemo(() => placements.filter((item) => item.kind === 'logo'), [placements]);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const nextForms: Record<string, AreaForm> = {};

    for (const model of models) {
      for (const placement of printPlacements) {
        const area = printAreas.find((item) => item.garmentModelId === model.id && item.placement?.code === placement.code);
        nextForms[formKey(model.id, placement.code)] = area
          ? {
              xPct: String(area.xPct),
              yPct: String(area.yPct),
              widthPct: String(area.widthPct),
              heightPct: String(area.heightPct),
              active: area.active,
            }
          : { ...(DEFAULTS_BY_CODE[placement.code] || DEFAULTS_BY_CODE.FRONT) };
      }
    }

    setForms(nextForms);
    setLogoForm((current) => ({
      ...current,
      placementCodes: current.placementCodes.length ? current.placementCodes : logoPlacements.map((item) => item.code).slice(0, 1),
    }));
  }, [models, printAreas, printPlacements, logoPlacements]);

  async function loadData() {
    const [placementsResponse, printAreasResponse, modelsResponse, logosResponse] = await Promise.all([
      axios.get('/api/admin/placements'),
      axios.get('/api/admin/print-areas'),
      axios.get('/api/admin/garment-models'),
      axios.get('/api/admin/brand-logos'),
    ]);

    setPlacements(placementsResponse.data || []);
    setPrintAreas(printAreasResponse.data || []);
    setModels(modelsResponse.data || []);
    setBrandLogos(logosResponse.data || []);
  }

  async function bootstrapPlacements() {
    setBootstrapping(true);
    try {
      await axios.post('/api/admin/placements/bootstrap');
      await loadData();
    } finally {
      setBootstrapping(false);
    }
  }

  function updateForm(garmentModelId: string, placementCode: string, field: keyof AreaForm, value: string | boolean) {
    const key = formKey(garmentModelId, placementCode);
    setForms((current) => ({
      ...current,
      [key]: {
        ...(current[key] || DEFAULTS_BY_CODE[placementCode] || DEFAULTS_BY_CODE.FRONT),
        [field]: value,
      },
    }));
  }

  async function savePrintArea(garmentModelId: string, placementCode: string) {
    const key = formKey(garmentModelId, placementCode);
    const form = forms[key];
    if (!form) return;

    setSavingKey(key);
    try {
      await axios.post('/api/admin/print-areas', {
        garmentModelId,
        placementCode,
        xPct: Number(form.xPct),
        yPct: Number(form.yPct),
        widthPct: Number(form.widthPct),
        heightPct: Number(form.heightPct),
        active: form.active,
      });
      await loadData();
    } finally {
      setSavingKey(null);
    }
  }

  function toggleLogoPlacement(code: string) {
    setLogoForm((current) => {
      const exists = current.placementCodes.includes(code);
      const next = exists ? current.placementCodes.filter((item) => item !== code) : [...current.placementCodes, code];
      return { ...current, placementCodes: next.length ? next : current.placementCodes };
    });
  }

  async function uploadLogoFile(file: File) {
    setUploadingLogo(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await axios.post('/api/admin/assets/upload', {
        folder: 'logos',
        filename: file.name,
        dataUrl,
      });
      setLogoForm((current) => ({ ...current, imageUrl: response.data.url }));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function submitLogo(event: React.FormEvent) {
    event.preventDefault();
    setSavingLogo(true);
    try {
      const payload = {
        name: logoForm.name,
        slug: slugify(logoForm.name),
        code: logoForm.code.toUpperCase(),
        imageUrl: logoForm.imageUrl,
        widthCm: Number(logoForm.widthCm),
        heightCm: Number(logoForm.heightCm),
        placementCodes: logoForm.placementCodes,
      };

      if (editingLogoId) {
        await axios.patch(`/api/admin/brand-logos/${editingLogoId}`, payload);
      } else {
        await axios.post('/api/admin/brand-logos', payload);
      }

      resetLogoForm();
      await loadData();
    } finally {
      setSavingLogo(false);
    }
  }

  function resetLogoForm() {
    setEditingLogoId(null);
    setLogoForm(buildEmptyLogoForm(logoPlacements));
  }

  function startEditingLogo(logo: BrandLogo) {
    setEditingLogoId(logo.id);
    setLogoForm({
      name: logo.name,
      code: logo.code,
      imageUrl: logo.imageUrl,
      widthCm: String(logo.widthCm),
      heightCm: String(logo.heightCm),
      placementCodes: logo.placements.map((item) => item.placement?.code).filter((item): item is string => Boolean(item)),
    });
  }

  async function deleteLogo(id: string) {
    setDeletingLogoId(id);
    try {
      await axios.delete(`/api/admin/brand-logos/${id}`);
      if (editingLogoId === id) {
        resetLogoForm();
      }
      await loadData();
    } finally {
      setDeletingLogoId(null);
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Produccion</h1>
        <p className="mt-1 text-gray-500">Configura placements, areas imprimibles y logos disponibles para produccion.</p>
      </div>

      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <Settings size={20} className="text-blue-500" /> Placements del sistema
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {printPlacements.length
                ? `Hay ${printPlacements.length} placements de impresion disponibles.`
                : 'No hay placements de impresion cargados todavia.'}
            </p>
          </div>
          <button onClick={() => void bootstrapPlacements()} disabled={bootstrapping} className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white disabled:opacity-50">
            {bootstrapping ? 'Inicializando...' : 'Inicializar placements estandar'}
          </button>
        </div>

        {placements.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {placements.map((placement) => (
              <span key={placement.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {placement.code} · {placement.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={submitLogo} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Logos de marca</h2>
              <p className="mt-1 text-sm text-gray-500">Carga logos con medidas fisicas y ubicaciones permitidas.</p>
            </div>
            {editingLogoId ? (
              <button type="button" onClick={resetLogoForm} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
                Cancelar
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border border-gray-200 bg-gray-50 p-3"
              placeholder="Nombre del logo"
              value={logoForm.name}
              onChange={(event) => setLogoForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <input
              className="rounded-xl border border-gray-200 bg-gray-50 p-3 uppercase"
              placeholder="Codigo"
              value={logoForm.code}
              onChange={(event) => setLogoForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              required
            />
            <input
              className="rounded-xl border border-gray-200 bg-gray-50 p-3"
              type="number"
              step="0.1"
              placeholder="Ancho cm"
              value={logoForm.widthCm}
              onChange={(event) => setLogoForm((current) => ({ ...current, widthCm: event.target.value }))}
              required
            />
            <input
              className="rounded-xl border border-gray-200 bg-gray-50 p-3"
              type="number"
              step="0.1"
              placeholder="Alto cm"
              value={logoForm.heightCm}
              onChange={(event) => setLogoForm((current) => ({ ...current, heightCm: event.target.value }))}
              required
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Archivo del logo</label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3"
                placeholder="/uploads/logos/..."
                value={logoForm.imageUrl}
                onChange={(event) => setLogoForm((current) => ({ ...current, imageUrl: event.target.value }))}
                required
              />
              <label className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                {uploadingLogo ? 'Subiendo...' : 'Subir'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadLogoFile(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Ubicaciones permitidas</label>
            <div className="flex flex-wrap gap-2">
              {logoPlacements.map((placement) => (
                <button
                  key={placement.id}
                  type="button"
                  onClick={() => toggleLogoPlacement(placement.code)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    logoForm.placementCodes.includes(placement.code) ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {placement.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={savingLogo} className="rounded-xl bg-gray-900 px-5 py-3 font-medium text-white disabled:opacity-50">
              {savingLogo ? 'Guardando...' : editingLogoId ? 'Actualizar logo' : 'Guardar logo'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">Logos cargados</h2>
          <div className="mt-4 space-y-4">
            {brandLogos.map((logo) => (
              <article key={logo.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start gap-4">
                  <img src={logo.imageUrl} alt={logo.name} className="h-20 w-20 rounded-xl border bg-white object-contain p-2" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-gray-600">{logo.code}</span>
                      <span className="text-sm text-gray-500">
                        {logo.widthCm}cm x {logo.heightCm}cm
                      </span>
                      {!logo.active ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Inactivo</span> : null}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-gray-900">{logo.name}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {logo.placements.map((item) => (
                        <span key={item.id} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                          {item.placement?.name || item.placement?.code}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEditingLogo(logo)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteLogo(logo.id)}
                        disabled={deletingLogoId === logo.id}
                        className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 disabled:opacity-50"
                      >
                        {deletingLogoId === logo.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {!brandLogos.length ? <p className="text-sm text-gray-500">Todavia no hay logos cargados.</p> : null}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {models.map((model) => (
          <section key={model.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{model.name}</h2>
                <p className="mt-1 text-sm text-gray-500">{model.slug}</p>
              </div>
            </div>

            {!printPlacements.length ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Primero inicializa los placements estandar para poder configurar areas de impresion.
              </p>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {printPlacements.map((placement) => {
                  const key = formKey(model.id, placement.code);
                  const form = forms[key] || DEFAULTS_BY_CODE[placement.code] || DEFAULTS_BY_CODE.FRONT;
                  const previewImage = placement.code === 'BACK' ? model.backMockupUrl || model.frontMockupUrl : model.frontMockupUrl || model.backMockupUrl;

                  return (
                    <div key={key} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{placement.name}</h3>
                          <p className="text-xs text-gray-500">{placement.code}</p>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={form.active} onChange={(event) => updateForm(model.id, placement.code, 'active', event.target.checked)} />
                          Activa
                        </label>
                      </div>

                      {previewImage ? <img src={previewImage} alt={`${model.name} ${placement.code}`} className="mb-4 h-40 w-full rounded-xl border bg-white object-contain" /> : null}

                      <div className="grid gap-3 md:grid-cols-2">
                        <input className="rounded-xl border border-gray-200 bg-white p-3" type="number" step="0.1" placeholder="x %" value={form.xPct} onChange={(event) => updateForm(model.id, placement.code, 'xPct', event.target.value)} />
                        <input className="rounded-xl border border-gray-200 bg-white p-3" type="number" step="0.1" placeholder="y %" value={form.yPct} onChange={(event) => updateForm(model.id, placement.code, 'yPct', event.target.value)} />
                        <input className="rounded-xl border border-gray-200 bg-white p-3" type="number" step="0.1" placeholder="width %" value={form.widthPct} onChange={(event) => updateForm(model.id, placement.code, 'widthPct', event.target.value)} />
                        <input className="rounded-xl border border-gray-200 bg-white p-3" type="number" step="0.1" placeholder="height %" value={form.heightPct} onChange={(event) => updateForm(model.id, placement.code, 'heightPct', event.target.value)} />
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button type="button" onClick={() => void savePrintArea(model.id, placement.code)} disabled={savingKey === key} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                          {savingKey === key ? 'Guardando...' : 'Guardar area'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

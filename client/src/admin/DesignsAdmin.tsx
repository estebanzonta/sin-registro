import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Image as ImageIcon, Layers3, Pencil, Plus, X } from 'lucide-react';
import { readFriendlyApiError } from '../lib/apiErrors';
import { getCatalogInit, invalidateCatalogCache } from '../lib/catalogCache';

type DesignCategory = {
  id: string;
  name: string;
  code: string;
};

type Collection = {
  id: string;
  name: string;
  type: 'fixed' | 'capsule';
  startsAt?: string | null;
  endsAt?: string | null;
};

type Placement = {
  id: string;
  code: string;
  name: string;
  kind: 'print' | 'logo';
};

type TransferSizeForm = {
  sizeCode: string;
  widthCm: string;
  heightCm: string;
  stock: string;
  extraPrice: string;
};

type DesignRecord = {
  id: string;
  name: string;
  slug: string;
  code: string;
  description?: string | null;
  imageUrl: string;
  limited: boolean;
  active: boolean;
  collectionId?: string | null;
  designCategoryId?: string | null;
  collection?: Collection | null;
  designCategory?: DesignCategory | null;
  placements?: Array<{ placement: Placement }>;
  transferSizes?: Array<{
    id: string;
    sizeCode: string;
    widthCm: number;
    heightCm: number;
    stock: number;
    extraPrice: number;
  }>;
};

type DesignForm = {
  collectionId: string;
  designCategoryId: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  imageUrl: string;
  active: boolean;
  placementCodes: string[];
  transferSizes: TransferSizeForm[];
};

const DEFAULT_TRANSFER_SIZES: TransferSizeForm[] = [
  { sizeCode: 'chico', widthCm: '18', heightCm: '18', stock: '20', extraPrice: '0' },
  { sizeCode: 'mediano', widthCm: '28', heightCm: '28', stock: '20', extraPrice: '0' },
  { sizeCode: 'grande', widthCm: '36', heightCm: '36', stock: '20', extraPrice: '0' },
];

const EMPTY_COLLECTION = { name: '', description: '', startsAt: '', endsAt: '' };
const EMPTY_CATEGORY = { name: '', code: '' };

function buildEmptyForm(defaultCategoryId = ''): DesignForm {
  return {
    collectionId: '',
    designCategoryId: defaultCategoryId,
    name: '',
    slug: '',
    code: '',
    description: '',
    imageUrl: '',
    active: true,
    placementCodes: ['FRONT'],
    transferSizes: DEFAULT_TRANSFER_SIZES.map((item) => ({ ...item })),
  };
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

function mapTransferSizes(items?: DesignRecord['transferSizes']): TransferSizeForm[] {
  if (!items?.length) {
    return DEFAULT_TRANSFER_SIZES.map((item) => ({ ...item }));
  }

  return items.map((item) => ({
    sizeCode: item.sizeCode,
    widthCm: String(item.widthCm),
    heightCm: String(item.heightCm),
    stock: String(item.stock),
    extraPrice: String(item.extraPrice),
  }));
}

export default function DesignsAdmin() {
  const [designs, setDesigns] = useState<DesignRecord[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [designCategories, setDesignCategories] = useState<DesignCategory[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [form, setForm] = useState<DesignForm>(() => buildEmptyForm());
  const [editingDesignId, setEditingDesignId] = useState<string | null>(null);
  const [newCollection, setNewCollection] = useState(EMPTY_COLLECTION);
  const [newCategory, setNewCategory] = useState(EMPTY_CATEGORY);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingDesignId, setDeletingDesignId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const printPlacements = useMemo(
    () => placements.filter((item) => item.kind === 'print' && (item.code === 'FRONT' || item.code === 'BACK')),
    [placements]
  );
  const capsuleCollections = useMemo(() => collections.filter((item) => item.type === 'capsule'), [collections]);
  const selectedCollection = useMemo(
    () => capsuleCollections.find((item) => item.id === form.collectionId) || null,
    [capsuleCollections, form.collectionId]
  );
  const isCapsuleDesign = Boolean(selectedCollection);

  async function loadData() {
    const [designsResponse, collectionsResponse, catalogResponse] = await Promise.all([
      axios.get('/api/admin/designs'),
      axios.get('/api/admin/collections'),
      getCatalogInit<{
        designCategories?: DesignCategory[];
        placements?: Placement[];
      }>({ force: true }),
    ]);

    const nextCategories = catalogResponse.designCategories || [];

    setDesigns(designsResponse.data || []);
    setCollections(collectionsResponse.data || []);
    setDesignCategories(nextCategories);
    setPlacements(catalogResponse.placements || []);
    setForm((current) => {
      if (editingDesignId) {
        return current;
      }

      return current.name || current.code || current.imageUrl
        ? current
        : buildEmptyForm(current.designCategoryId || nextCategories[0]?.id || '');
    });
  }

  function resetForm(defaultCategoryId = designCategories[0]?.id || '') {
    setEditingDesignId(null);
    setForm(buildEmptyForm(defaultCategoryId));
  }

  function updateTransferSize(index: number, field: keyof TransferSizeForm, value: string) {
    setForm((current) => ({
      ...current,
      transferSizes: current.transferSizes.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addTransferSize() {
    setForm((current) => ({
      ...current,
      transferSizes: [...current.transferSizes, { sizeCode: '', widthCm: '', heightCm: '', stock: '0', extraPrice: '0' }],
    }));
  }

  function removeTransferSize(index: number) {
    setForm((current) => ({
      ...current,
      transferSizes: current.transferSizes.length === 1 ? current.transferSizes : current.transferSizes.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function togglePlacement(code: string) {
    setForm((current) => {
      const exists = current.placementCodes.includes(code);
      const placementCodes = exists ? current.placementCodes.filter((item) => item !== code) : [...current.placementCodes, code];
      return { ...current, placementCodes: placementCodes.length ? placementCodes : current.placementCodes };
    });
  }

  function startEditing(design: DesignRecord) {
    const capsuleCollection = design.collection?.type === 'capsule' ? design.collection : null;

    setEditingDesignId(design.id);
    setForm({
      collectionId: capsuleCollection?.id || '',
      designCategoryId: capsuleCollection ? '' : design.designCategoryId || designCategories[0]?.id || '',
      name: design.name,
      slug: design.slug,
      code: design.code,
      description: design.description || '',
      imageUrl: design.imageUrl,
      active: design.active,
      placementCodes: design.placements?.map((item) => item.placement.code) || ['FRONT'],
      transferSizes: mapTransferSizes(design.transferSizes),
    });
  }

  async function uploadImage(file: File) {
    setUploadingImage(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await axios.post('/api/admin/assets/upload', {
        folder: 'designs',
        filename: file.name,
        dataUrl,
      });
      setForm((current) => ({ ...current, imageUrl: response.data.url }));
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleCreateCollection(event: React.FormEvent) {
    event.preventDefault();
    await axios.post('/api/admin/collections', {
      name: newCollection.name,
      type: 'capsule',
      description: newCollection.description || undefined,
      startsAt: newCollection.startsAt || undefined,
      endsAt: newCollection.endsAt || undefined,
    });
    invalidateCatalogCache();
    setNewCollection(EMPTY_COLLECTION);
    await loadData();
  }

  async function handleCreateCategory(event: React.FormEvent) {
    event.preventDefault();
    await axios.post('/api/admin/design-categories', {
      name: newCategory.name,
      code: newCategory.code.toUpperCase(),
    });
    invalidateCatalogCache();
    setNewCategory(EMPTY_CATEGORY);
    await loadData();
    if (!form.collectionId) {
      setForm((current) => ({
        ...current,
        designCategoryId: current.designCategoryId || designCategories[0]?.id || '',
      }));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        ...form,
        collectionId: form.collectionId || null,
        designCategoryId: form.collectionId ? null : form.designCategoryId || null,
        slug: form.slug || slugify(form.name),
        transferSizes: form.transferSizes.map((item) => ({
          sizeCode: item.sizeCode,
          widthCm: Number(item.widthCm),
          heightCm: Number(item.heightCm),
          stock: Number(item.stock),
          extraPrice: Number(item.extraPrice),
        })),
      };

      if (editingDesignId) {
        await axios.patch(`/api/admin/designs/${editingDesignId}`, payload);
      } else {
        await axios.post('/api/admin/designs', payload);
      }

      invalidateCatalogCache();
      await loadData();
      resetForm(designCategories[0]?.id || '');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.response?.data?.error;
        setSaveError(typeof message === 'string' && message.trim() ? message : 'No se pudo guardar el diseño');
      } else {
        setSaveError(error instanceof Error ? error.message : 'No se pudo guardar el diseño');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDesign(design: DesignRecord) {
    const confirmed = window.confirm(`Eliminar el diseño "${design.name}"?`);
    if (!confirmed) return;

    setDeletingDesignId(design.id);
    setSaveError(null);

    try {
      await axios.delete(`/api/admin/designs/${design.id}`);
      invalidateCatalogCache();
      if (editingDesignId === design.id) {
        resetForm(designCategories[0]?.id || '');
      }
      await loadData();
    } catch (error) {
      setSaveError(readFriendlyApiError(error, 'No se pudo eliminar el diseño.'));
    } finally {
      setDeletingDesignId(null);
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Diseños de marca</h1>
        <p className="mt-1 text-gray-500">Edita estampas fijas por categoría y cápsulas limitadas como modelo de venta separado.</p>
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleCreateCategory} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
            <Layers3 size={20} className="text-indigo-500" /> Nueva categoría fija
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <input className="rounded-xl border border-gray-200 bg-gray-50 p-3" placeholder="Ej. Anime" value={newCategory.name} onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))} required />
            <input className="rounded-xl border border-gray-200 bg-gray-50 p-3 uppercase" placeholder="ANI" value={newCategory.code} onChange={(event) => setNewCategory((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required />
          </div>
          <button className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white" type="submit">Guardar categoría</button>
        </form>

        <form onSubmit={handleCreateCollection} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
            <Plus size={20} className="text-emerald-500" /> Nueva cápsula
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <input className="rounded-xl border border-gray-200 bg-gray-50 p-3" placeholder="Ej. Drop invierno" value={newCollection.name} onChange={(event) => setNewCollection((current) => ({ ...current, name: event.target.value }))} required />
            <input className="rounded-xl border border-gray-200 bg-gray-50 p-3" type="datetime-local" value={newCollection.startsAt} onChange={(event) => setNewCollection((current) => ({ ...current, startsAt: event.target.value }))} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input className="rounded-xl border border-gray-200 bg-gray-50 p-3" type="datetime-local" value={newCollection.endsAt} onChange={(event) => setNewCollection((current) => ({ ...current, endsAt: event.target.value }))} />
            <textarea className="min-h-24 rounded-xl border border-gray-200 bg-gray-50 p-3" placeholder="Descripción opcional" value={newCollection.description} onChange={(event) => setNewCollection((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <p className="mt-3 text-sm text-gray-500">Las cápsulas siempre se tratan como venta limitada. El límite puede venir por fechas, por stock o por ambos.</p>
          <button className="mt-4 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white" type="submit">Guardar cápsula</button>
        </form>
      </div>

      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <ImageIcon size={20} className="text-pink-500" /> {editingDesignId ? 'Editar diseño' : 'Nuevo diseño'}
          </h2>
          {editingDesignId ? (
            <button type="button" onClick={() => resetForm()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
              <X size={16} /> Cancelar edición
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
            <input className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: current.slug || slugify(event.target.value) }))} required />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Código</label>
            <input className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 uppercase" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Slug</label>
            <input className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} required />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cápsula</label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3"
              value={form.collectionId}
              onChange={(event) => {
                const nextCollectionId = event.target.value;
                setForm((current) => ({
                  ...current,
                  collectionId: nextCollectionId,
                  designCategoryId: nextCollectionId ? '' : current.designCategoryId || designCategories[0]?.id || '',
                }));
              }}
            >
              <option value="">Sin cápsula (diseño fijo)</option>
              {capsuleCollections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Categoría</label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 disabled:cursor-not-allowed disabled:bg-gray-100"
              value={isCapsuleDesign ? '' : form.designCategoryId}
              onChange={(event) => setForm((current) => ({ ...current, designCategoryId: event.target.value }))}
              required={!isCapsuleDesign}
              disabled={isCapsuleDesign}
            >
              <option value="">{isCapsuleDesign ? 'Las cápsulas no usan categoría' : 'Selecciona una categoría'}</option>
              {designCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {isCapsuleDesign ? 'Este diseño se venderá como cápsula limitada y no se asocia a categoría.' : 'Los diseños fijos se ordenan por categoría y no usan cápsula.'}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Imagen del diseño</label>
            <div className="flex gap-2">
              <input className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3" placeholder="/uploads/designs/..." value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} required />
              <label className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                {uploadingImage ? 'Subiendo...' : 'Subir'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />
              </label>
            </div>
            {form.imageUrl ? <img src={form.imageUrl} alt="Preview" className="mt-3 h-24 w-24 rounded-xl border object-cover" /> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
            <textarea className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">Ubicaciones permitidas</label>
            {printPlacements.length ? (
              <div className="flex flex-wrap gap-2">
                {printPlacements.map((item) => (
                  <button key={item.id} type="button" onClick={() => togglePlacement(item.code)} className={`rounded-full px-4 py-2 text-sm font-semibold ${form.placementCodes.includes(item.code) ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-700'}`}>
                    {item.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No hay placements de impresión configurados en el sistema. Igual podés editar el diseño y guardar cambios.
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-4">
              <label className="block text-sm font-medium text-gray-700">Tamaños de transfer y stock</label>
              <button type="button" onClick={addTransferSize} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
                Agregar tamaño
              </button>
            </div>
            <div className="space-y-3">
              {form.transferSizes.map((item, index) => (
                <div key={`${item.sizeCode}-${index}`} className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-2 xl:grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(110px,0.9fr)_auto]">
                  <input className="min-w-0 rounded-xl border border-gray-200 bg-white p-3" placeholder="Código" value={item.sizeCode} onChange={(event) => updateTransferSize(index, 'sizeCode', event.target.value)} />
                  <input className="min-w-0 rounded-xl border border-gray-200 bg-white p-3" type="number" step="0.1" placeholder="Ancho cm" value={item.widthCm} onChange={(event) => updateTransferSize(index, 'widthCm', event.target.value)} />
                  <input className="min-w-0 rounded-xl border border-gray-200 bg-white p-3" type="number" step="0.1" placeholder="Alto cm" value={item.heightCm} onChange={(event) => updateTransferSize(index, 'heightCm', event.target.value)} />
                  <input className="min-w-0 rounded-xl border border-gray-200 bg-white p-3" type="number" placeholder="Stock" value={item.stock} onChange={(event) => updateTransferSize(index, 'stock', event.target.value)} />
                  <input className="min-w-0 rounded-xl border border-gray-200 bg-white p-3" type="number" step="0.01" placeholder="Extra $" value={item.extraPrice} onChange={(event) => updateTransferSize(index, 'extraPrice', event.target.value)} />
                  <button type="button" onClick={() => removeTransferSize(index)} className="rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-600 md:col-span-2 xl:col-span-1">
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
            Diseño activo
          </label>

          <div className="flex items-center text-sm text-gray-500">
            {isCapsuleDesign ? 'Se guardará como cápsula limitada.' : 'Se guardará como diseño fijo de catálogo.'}
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button disabled={saving} className="rounded-xl bg-pink-600 px-6 py-3 font-medium text-white disabled:opacity-50" type="submit">
              {saving ? 'Guardando...' : editingDesignId ? 'Guardar cambios' : 'Guardar diseño'}
            </button>
          </div>
          {saveError ? <p className="md:col-span-2 text-sm text-rose-600">{saveError}</p> : null}
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {designs.map((design) => {
          const capsule = design.collection?.type === 'capsule' ? design.collection : null;
          const isFixed = !capsule;

          return (
            <article key={design.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                <img src={design.imageUrl} alt={design.name} className="h-24 w-24 rounded-xl border object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-gray-600">{design.code}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${isFixed ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {isFixed ? 'Fijo' : 'Cápsula'}
                    </span>
                    {capsule ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{capsule.name}</span> : null}
                    {isFixed && design.designCategory ? <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{design.designCategory.name}</span> : null}
                    {!design.active ? <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">Inactivo</span> : null}
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-gray-900">{design.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{design.description || 'Sin descripción'}</p>
                  <p className="mt-3 text-xs text-gray-500">
                    {(design.transferSizes || []).map((item) => `${item.sizeCode}: ${item.stock}`).join(' · ')}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEditing(design)} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
                        <Pencil size={16} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteDesign(design)}
                        disabled={deletingDesignId === design.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 disabled:opacity-50"
                      >
                        <X size={16} /> {deletingDesignId === design.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

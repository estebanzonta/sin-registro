import { useEffect, useState } from 'react';
import axios from 'axios';
import { Palette, Plus, Ruler, Shirt } from 'lucide-react';
import { readFriendlyApiError } from '../lib/apiErrors';

type Category = {
  id: string;
  name: string;
};

type Size = {
  id: string;
  name: string;
};

type Color = {
  id: string;
  name: string;
  hex: string;
};

type GarmentModel = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  frontMockupUrl?: string;
  backMockupUrl?: string;
  categoryId?: string;
  category?: { id: string; name: string };
  sizes?: Array<{ sizeId: string; size: Size }>;
  colors?: Array<{ colorId: string; color: Color; frontMockupUrl?: string; backMockupUrl?: string }>;
};

type ModelFormState = {
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  frontMockupUrl: string;
  backMockupUrl: string;
  sizeIds: string[];
  colorIds: string[];
  colorMockups: Array<{ colorId: string; frontMockupUrl: string; backMockupUrl: string }>;
};

const EMPTY_MODEL_FORM: ModelFormState = {
  name: '',
  slug: '',
  description: '',
  basePrice: 0,
  frontMockupUrl: '',
  backMockupUrl: '',
  sizeIds: [],
  colorIds: [],
  colorMockups: [],
};

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

function toggleSelection(current: string[], value: string) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function ensureColorMockups(colorIds: string[], current: Array<{ colorId: string; frontMockupUrl: string; backMockupUrl: string }>) {
  return colorIds.map((colorId) => {
    const existing = current.find((item) => item.colorId === colorId);
    return existing || { colorId, frontMockupUrl: '', backMockupUrl: '' };
  });
}

export default function GarmentModelsAdmin() {
  const [models, setModels] = useState<GarmentModel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSizeName, setNewSizeName] = useState('');
  const [newColor, setNewColor] = useState({ name: '', hex: '#111111' });
  const [uploadingField, setUploadingField] = useState<'frontMockupUrl' | 'backMockupUrl' | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [newModel, setNewModel] = useState<ModelFormState>(EMPTY_MODEL_FORM);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [deletingColorId, setDeletingColorId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    await Promise.all([fetchModels(), fetchCatalog()]);
  }

  async function fetchModels() {
    const response = await axios.get('/api/admin/garment-models');
    setModels(response.data);
  }

  async function fetchCatalog() {
    const response = await axios.get('/api/catalog/init');
    const nextCategories = response.data.categories || [];
    const nextSizes = response.data.sizes || [];
    const nextColors = response.data.colors || [];

    setCategories(nextCategories);
    setSizes(nextSizes);
    setColors(nextColors);

    if (nextCategories.length) {
      setSelectedCategoryId((current) => current || nextCategories[0].id);
    }
  }

  async function uploadMockup(file: File, field: 'frontMockupUrl' | 'backMockupUrl') {
    setUploadingField(field);
    setErrorMessage(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await axios.post('/api/admin/assets/upload', {
        folder: 'mockups',
        filename: file.name,
        dataUrl,
      });
      setNewModel((current) => ({ ...current, [field]: response.data.url }));
      setFeedbackMessage(`Mockup ${field === 'frontMockupUrl' ? 'de frente' : 'de espalda'} subido correctamente.`);
    } catch (error) {
      setErrorMessage(readFriendlyApiError(error, 'No se pudo subir el mockup. Verificá el formato e intentá nuevamente.'));
    } finally {
      setUploadingField(null);
    }
  }

  async function uploadColorMockup(file: File, colorId: string, field: 'frontMockupUrl' | 'backMockupUrl') {
    setUploadingField(field);
    setErrorMessage(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await axios.post('/api/admin/assets/upload', {
        folder: 'mockups',
        filename: file.name,
        dataUrl,
      });
      setNewModel((current) => ({
        ...current,
        colorMockups: ensureColorMockups(current.colorIds, current.colorMockups).map((item) =>
          item.colorId === colorId ? { ...item, [field]: response.data.url } : item
        ),
      }));
      setFeedbackMessage(`Mockup por color ${field === 'frontMockupUrl' ? 'de frente' : 'de espalda'} subido correctamente.`);
    } catch (error) {
      setErrorMessage(readFriendlyApiError(error, 'No se pudo subir el mockup por color.'));
    } finally {
      setUploadingField(null);
    }
  }

  async function handleCreateCategory(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await axios.post('/api/admin/garment-categories', { name: newCategoryName });
      setNewCategoryName('');
      setFeedbackMessage('Categoria creada correctamente.');
      await fetchCatalog();
    } catch (error) {
      setErrorMessage(readFriendlyApiError(error, 'No se pudo crear la categoria.'));
    }
  }

  async function handleCreateSize(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await axios.post('/api/admin/sizes', { name: newSizeName });
      setNewSizeName('');
      setFeedbackMessage('Talle creado correctamente.');
      await fetchCatalog();
    } catch (error) {
      setErrorMessage(readFriendlyApiError(error, 'No se pudo crear el talle.'));
    }
  }

  async function handleCreateColor(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await axios.post('/api/admin/colors', newColor);
      setNewColor({ name: '', hex: '#111111' });
      setFeedbackMessage('Color creado correctamente.');
      await fetchCatalog();
    } catch (error) {
      setErrorMessage(readFriendlyApiError(error, 'No se pudo crear el color.'));
    }
  }

  function resetModelForm() {
    setEditingModelId(null);
    setNewModel(EMPTY_MODEL_FORM);
  }

  function startEditing(model: GarmentModel) {
    setEditingModelId(model.id);
    setSelectedCategoryId(model.category?.id || model.categoryId || '');
    setNewModel({
      name: model.name,
      slug: model.slug,
      description: model.description || '',
      basePrice: model.basePrice,
      frontMockupUrl: model.frontMockupUrl || '',
      backMockupUrl: model.backMockupUrl || '',
      sizeIds: (model.sizes || []).map((item) => item.sizeId),
      colorIds: (model.colors || []).map((item) => item.colorId),
      colorMockups: (model.colors || []).map((item) => ({
        colorId: item.colorId,
        frontMockupUrl: item.frontMockupUrl || '',
        backMockupUrl: item.backMockupUrl || '',
      })),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleCreateModel(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    const payload = {
      ...newModel,
      slug: newModel.slug || slugify(newModel.name),
      categoryId: selectedCategoryId,
    };

    try {
      if (editingModelId) {
        await axios.patch(`/api/admin/garment-models/${editingModelId}`, payload);
        setFeedbackMessage('Modelo actualizado correctamente.');
      } else {
        await axios.post('/api/admin/garment-models', payload);
        setFeedbackMessage('Modelo creado correctamente.');
      }

      await fetchModels();
      resetModelForm();
    } catch (error) {
      setErrorMessage(readFriendlyApiError(error, 'No se pudo guardar el modelo.'));
    }
  }

  async function handleDeleteModel(model: GarmentModel) {
    const confirmed = window.confirm(`Eliminar el modelo "${model.name}"?`);
    if (!confirmed) return;

    setDeletingModelId(model.id);
    setErrorMessage(null);
    try {
      const response = await axios.delete(`/api/admin/garment-models/${model.id}`);
      if (editingModelId === model.id) {
        resetModelForm();
      }
      setFeedbackMessage(response.data?.message || 'Modelo eliminado correctamente.');
      await fetchModels();
    } catch (error) {
      setErrorMessage(readFriendlyApiError(error, 'No se pudo eliminar el modelo.'));
    } finally {
      setDeletingModelId(null);
    }
  }

  async function handleDeleteColor(color: Color) {
    const confirmed = window.confirm(`Eliminar el color "${color.name}"?`);
    if (!confirmed) return;

    setDeletingColorId(color.id);
    setErrorMessage(null);
    try {
      const response = await axios.delete(`/api/admin/colors/${color.id}`);
      setFeedbackMessage(response.data?.message || 'Color eliminado correctamente.');
      setNewModel((current) => {
        const colorIds = current.colorIds.filter((item) => item !== color.id);
        return {
          ...current,
          colorIds,
          colorMockups: ensureColorMockups(colorIds, current.colorMockups),
        };
      });
      await fetchCatalog();
      await fetchModels();
    } catch (error) {
      setErrorMessage(readFriendlyApiError(error, 'No se pudo eliminar el color.'));
    } finally {
      setDeletingColorId(null);
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Modelos base</h1>
        <p className="mt-1 text-gray-500">Administra prendas, talles, colores y mockups visibles en el storefront.</p>
      </div>
      {feedbackMessage ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedbackMessage}</div> : null}
      {errorMessage ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

      <div className="mb-8 grid gap-6 xl:grid-cols-3">
        <form onSubmit={handleCreateCategory} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
            <Plus size={20} className="text-indigo-500" /> Nueva categoría
          </h2>
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3"
            placeholder="Ej. Indumentaria premium"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            required
          />
          <button className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white" type="submit">
            Guardar categoría
          </button>
        </form>

        <form onSubmit={handleCreateSize} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
            <Ruler size={20} className="text-emerald-500" /> Nuevo talle
          </h2>
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 uppercase"
            placeholder="Ej. M"
            value={newSizeName}
            onChange={(event) => setNewSizeName(event.target.value.toUpperCase())}
            required
          />
          <button className="mt-4 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white" type="submit">
            Guardar talle
          </button>
        </form>

        <form onSubmit={handleCreateColor} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
            <Palette size={20} className="text-pink-500" /> Nuevo color
          </h2>
          <div className="grid gap-4 md:grid-cols-[1fr_120px]">
            <input
              className="rounded-xl border border-gray-200 bg-gray-50 p-3"
              placeholder="Ej. Negro"
              value={newColor.name}
              onChange={(event) => setNewColor((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <input
              className="h-12 rounded-xl border border-gray-200 bg-gray-50 p-2"
              type="color"
              value={newColor.hex}
              onChange={(event) => setNewColor((current) => ({ ...current, hex: event.target.value }))}
            />
          </div>
          <button className="mt-4 rounded-xl bg-pink-600 px-5 py-3 font-medium text-white" type="submit">
            Guardar color
          </button>
          {colors.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {colors.map((color) => (
                <div key={color.id} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
                  <span>{color.name}</span>
                  <button type="button" className="text-xs font-semibold text-rose-600 disabled:opacity-50" disabled={deletingColorId === color.id} onClick={() => void handleDeleteColor(color)}>
                    {deletingColorId === color.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </form>
      </div>

      <form onSubmit={handleCreateModel} className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-800">
          <Shirt size={20} className="text-blue-500" /> {editingModelId ? 'Editar modelo' : 'Nuevo modelo'}
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          <input
            className="rounded-xl border border-gray-200 bg-gray-50 p-3"
            placeholder="Nombre"
            value={newModel.name}
            onChange={(event) => setNewModel((current) => ({ ...current, name: event.target.value, slug: current.slug || slugify(event.target.value) }))}
            required
          />
          <input
            className="rounded-xl border border-gray-200 bg-gray-50 p-3"
            placeholder="Slug"
            value={newModel.slug}
            onChange={(event) => setNewModel((current) => ({ ...current, slug: slugify(event.target.value) }))}
            required
          />
          <input
            className="rounded-xl border border-gray-200 bg-gray-50 p-3"
            type="number"
            placeholder="Precio base"
            value={newModel.basePrice || ''}
            onChange={(event) => setNewModel((current) => ({ ...current, basePrice: Number(event.target.value) }))}
            required
          />
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 p-3"
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            required
          >
            <option value="" disabled>Selecciona una categoría</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>

          <textarea
            className="md:col-span-2 min-h-24 rounded-xl border border-gray-200 bg-gray-50 p-3"
            placeholder="Descripción"
            value={newModel.description}
            onChange={(event) => setNewModel((current) => ({ ...current, description: event.target.value }))}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mockup frente</label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3"
                value={newModel.frontMockupUrl}
                onChange={(event) => setNewModel((current) => ({ ...current, frontMockupUrl: event.target.value }))}
              />
              <label className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                {uploadingField === 'frontMockupUrl' ? 'Subiendo...' : 'Subir'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (file) void uploadMockup(file, 'frontMockupUrl'); }} />
              </label>
            </div>
            {newModel.frontMockupUrl ? (
              <img src={newModel.frontMockupUrl} alt="Preview mockup frente" className="mt-3 h-32 w-full rounded-xl border bg-white object-contain" />
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mockup espalda</label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3"
                value={newModel.backMockupUrl}
                onChange={(event) => setNewModel((current) => ({ ...current, backMockupUrl: event.target.value }))}
              />
              <label className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                {uploadingField === 'backMockupUrl' ? 'Subiendo...' : 'Subir'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (file) void uploadMockup(file, 'backMockupUrl'); }} />
              </label>
            </div>
            {newModel.backMockupUrl ? (
              <img src={newModel.backMockupUrl} alt="Preview mockup espalda" className="mt-3 h-32 w-full rounded-xl border bg-white object-contain" />
            ) : null}
          </div>

          <div className="md:col-span-2 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Talles disponibles</h3>
                <span className="text-xs text-gray-500">{newModel.sizeIds.length} seleccionados</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setNewModel((current) => ({ ...current, sizeIds: toggleSelection(current.sizeIds, size.id) }))}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${newModel.sizeIds.includes(size.id) ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-700'}`}
                  >
                    {size.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Colores disponibles</h3>
                <span className="text-xs text-gray-500">{newModel.colorIds.length} seleccionados</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setNewModel((current) => {
                      const colorIds = toggleSelection(current.colorIds, color.id);
                      return {
                        ...current,
                        colorIds,
                        colorMockups: ensureColorMockups(colorIds, current.colorMockups),
                      };
                    })}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${newModel.colorIds.includes(color.id) ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-700'}`}
                  >
                    <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {newModel.colorIds.length ? (
            <div className="md:col-span-2 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900">Mockups por color</h3>
                <p className="mt-1 text-sm text-gray-500">Si cargás mockups por color, el storefront los usará al cambiar el color de la prenda.</p>
              </div>
              <div className="space-y-4">
                {ensureColorMockups(newModel.colorIds, newModel.colorMockups).map((mockup) => {
                  const color = colors.find((item) => item.id === mockup.colorId);
                  return (
                    <div key={mockup.colorId} className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: color?.hex || '#ffffff' }} />
                        {color?.name || mockup.colorId}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Frente</label>
                          <div className="flex gap-2">
                            <input
                              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3"
                              value={mockup.frontMockupUrl}
                              onChange={(event) => setNewModel((current) => ({
                                ...current,
                                colorMockups: ensureColorMockups(current.colorIds, current.colorMockups).map((item) =>
                                  item.colorId === mockup.colorId ? { ...item, frontMockupUrl: event.target.value } : item
                                ),
                              }))}
                            />
                            <label className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                              {uploadingField === 'frontMockupUrl' ? 'Subiendo...' : 'Subir'}
                              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (file) void uploadColorMockup(file, mockup.colorId, 'frontMockupUrl'); }} />
                            </label>
                          </div>
                          {mockup.frontMockupUrl ? <img src={mockup.frontMockupUrl} alt={`Preview frente ${color?.name || mockup.colorId}`} className="mt-3 h-28 w-full rounded-xl border bg-white object-contain" /> : null}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Espalda</label>
                          <div className="flex gap-2">
                            <input
                              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3"
                              value={mockup.backMockupUrl}
                              onChange={(event) => setNewModel((current) => ({
                                ...current,
                                colorMockups: ensureColorMockups(current.colorIds, current.colorMockups).map((item) =>
                                  item.colorId === mockup.colorId ? { ...item, backMockupUrl: event.target.value } : item
                                ),
                              }))}
                            />
                            <label className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                              {uploadingField === 'backMockupUrl' ? 'Subiendo...' : 'Subir'}
                              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (file) void uploadColorMockup(file, mockup.colorId, 'backMockupUrl'); }} />
                            </label>
                          </div>
                          {mockup.backMockupUrl ? <img src={mockup.backMockupUrl} alt={`Preview espalda ${color?.name || mockup.colorId}`} className="mt-3 h-28 w-full rounded-xl border bg-white object-contain" /> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end">
          <div className="flex gap-3">
            {editingModelId ? (
              <button className="rounded-xl border border-gray-200 bg-white px-6 py-3 font-medium text-gray-700" type="button" onClick={resetModelForm}>
                Cancelar edición
              </button>
            ) : null}
            <button className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white" type="submit">
              {editingModelId ? 'Guardar cambios' : 'Guardar modelo'}
            </button>
          </div>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        {models.map((model) => (
          <article key={model.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Shirt size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-gray-900">{model.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{model.description || 'Sin descripción'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-gray-100 px-3 py-1">{model.category?.name}</span>
                  <span className="rounded-full bg-gray-100 px-3 py-1">{model.slug}</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">${model.basePrice}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {(model.sizes || []).map((item) => (
                    <span key={item.sizeId} className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{item.size.name}</span>
                  ))}
                  {(model.colors || []).map((item) => (
                    <span key={item.colorId} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: item.color.hex }} />
                      {item.color.name}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {model.frontMockupUrl ? <img src={model.frontMockupUrl} alt={`${model.name} frente`} className="h-32 w-full rounded-xl border object-contain" /> : <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-sm text-gray-400">Sin mockup frente</div>}
                  {model.backMockupUrl ? <img src={model.backMockupUrl} alt={`${model.name} espalda`} className="h-32 w-full rounded-xl border object-contain" /> : <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-sm text-gray-400">Sin mockup espalda</div>}
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700" type="button" onClick={() => startEditing(model)}>
                    Editar
                  </button>
                  <button className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 disabled:opacity-50" disabled={deletingModelId === model.id} type="button" onClick={() => void handleDeleteModel(model)}>
                    {deletingModelId === model.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

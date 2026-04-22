import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ChevronDown, PackageSearch, RefreshCw, Search } from 'lucide-react';
import { readFriendlyApiError } from '../lib/apiErrors';
import { invalidateCatalogCache } from '../lib/catalogCache';

type StockRow = {
  id: string;
  garmentModelId: string;
  quantity: number;
  garmentModel?: { id: string; name: string; active?: boolean | null } | null;
  color?: { id: string; name: string; hex?: string | null; active?: boolean | null } | null;
  size?: { id: string; name: string } | null;
};

type GroupedColor = {
  colorId: string;
  colorName: string;
  colorHex: string;
  entries: StockRow[];
  totalQuantity: number;
};

type GroupedModel = {
  garmentModelId: string;
  garmentModelName: string;
  active: boolean;
  colors: GroupedColor[];
  totalQuantity: number;
  lowStockCount: number;
};

const DEFAULT_LOW_STOCK_LIMIT = 5;
const DEFAULT_OPEN_MODELS = 2;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function sortSizes(left: string, right: string) {
  const ranking = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
  const leftIndex = ranking.indexOf(left.toUpperCase());
  const rightIndex = ranking.indexOf(right.toUpperCase());

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  }

  return left.localeCompare(right, 'es', { numeric: true, sensitivity: 'base' });
}

export default function BlankStockAdmin() {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const [expandedModelIds, setExpandedModelIds] = useState<string[]>([]);
  const [lowStockLimit, setLowStockLimit] = useState(DEFAULT_LOW_STOCK_LIMIT);

  useEffect(() => {
    void fetchStock();
  }, []);

  async function fetchStock() {
    setErrorMessage(null);
    const response = await axios.get('/api/admin/blank-stock');
    const nextStock = (response.data || []) as StockRow[];
    setStock(nextStock);

    const nextOpenModels = Array.from(
      new Set(
        nextStock
          .map((item) => item.garmentModelId)
          .filter(Boolean)
      )
    ).slice(0, DEFAULT_OPEN_MODELS);
    setExpandedModelIds((current) => (current.length ? current : nextOpenModels));
  }

  async function setQuantity(id: string, quantity: number) {
    const nextQuantity = Math.max(0, quantity);
    const previousStock = stock;
    setErrorMessage(null);
    setSavingId(id);
    setStock((current) => current.map((item) => (item.id === id ? { ...item, quantity: nextQuantity } : item)));

    try {
      await axios.patch(`/api/admin/blank-stock/${id}`, { quantity: nextQuantity });
      invalidateCatalogCache();
    } catch (error) {
      setStock(previousStock);
      setErrorMessage(readFriendlyApiError(error, 'No se pudo actualizar el stock.'));
    } finally {
      setSavingId(null);
    }
  }

  function readQuantity(id: string) {
    return stock.find((item) => item.id === id)?.quantity || 0;
  }

  function toggleModel(modelId: string) {
    setExpandedModelIds((current) =>
      current.includes(modelId) ? current.filter((item) => item !== modelId) : [...current, modelId]
    );
  }

  const groupedModels = useMemo<GroupedModel[]>(() => {
    const modelMap = new Map<string, GroupedModel>();

    for (const item of stock) {
      const garmentModelId = item.garmentModelId;
      if (!garmentModelId) continue;

      const existingModel = modelMap.get(garmentModelId) || {
        garmentModelId,
        garmentModelName: item.garmentModel?.name || 'Modelo sin nombre',
        active: item.garmentModel?.active !== false,
        colors: [],
        totalQuantity: 0,
        lowStockCount: 0,
      };

      existingModel.totalQuantity += item.quantity;
      if (item.quantity <= lowStockLimit) {
        existingModel.lowStockCount += 1;
      }

      const colorId = item.color?.id || `unknown-${item.id}`;
      let existingColor = existingModel.colors.find((color) => color.colorId === colorId);
      if (!existingColor) {
        existingColor = {
          colorId,
          colorName: item.color?.name || 'Color sin nombre',
          colorHex: item.color?.hex || '#e5e7eb',
          entries: [],
          totalQuantity: 0,
        };
        existingModel.colors.push(existingColor);
      }

      existingColor.entries.push(item);
      existingColor.totalQuantity += item.quantity;
      modelMap.set(garmentModelId, existingModel);
    }

    return Array.from(modelMap.values())
      .map((model) => ({
        ...model,
        colors: model.colors
          .map((color) => ({
            ...color,
            entries: [...color.entries].sort((left, right) => sortSizes(left.size?.name || '', right.size?.name || '')),
          }))
          .sort((left, right) => left.colorName.localeCompare(right.colorName, 'es', { sensitivity: 'base' })),
      }))
      .sort((left, right) => left.garmentModelName.localeCompare(right.garmentModelName, 'es', { sensitivity: 'base' }));
  }, [lowStockLimit, stock]);

  const visibleModels = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm.trim());

    return groupedModels.filter((model) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(model.garmentModelName).includes(normalizedSearch) ||
        model.colors.some((color) => normalizeText(color.colorName).includes(normalizedSearch)) ||
        model.colors.some((color) =>
          color.entries.some((entry) => normalizeText(entry.size?.name || '').includes(normalizedSearch))
        );

      const matchesLowStock = !showOnlyLowStock || model.lowStockCount > 0;
      return matchesSearch && matchesLowStock;
    });
  }, [groupedModels, searchTerm, showOnlyLowStock]);

  const summary = useMemo(() => {
    const rowCount = stock.length;
    const modelCount = groupedModels.length;
    const units = stock.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockRows = stock.filter((item) => item.quantity <= lowStockLimit).length;

    return { rowCount, modelCount, units, lowStockRows };
  }, [groupedModels, lowStockLimit, stock]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock de prendas lisas</h1>
          <p className="mt-1 text-gray-500">Agrupado por modelo para editar stock sin recorrer una lista plana interminable.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void fetchStock()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
          >
            <RefreshCw size={16} /> Actualizar
          </button>
          <button
            type="button"
            onClick={() => setExpandedModelIds(visibleModels.map((model) => model.garmentModelId))}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
          >
            Expandir todo
          </button>
          <button
            type="button"
            onClick={() => setExpandedModelIds([])}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
          >
            Colapsar todo
          </button>
        </div>
      </div>

      {errorMessage ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Modelos</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{summary.modelCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Combinaciones</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{summary.rowCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Unidades</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{summary.units}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Stock Bajo</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{summary.lowStockRows}</p>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
            <Search size={18} className="text-gray-400" />
            <input
              className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              placeholder="Buscar por modelo, color o talle"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            <span className="font-medium">Stock bajo hasta</span>
            <input
              type="number"
              min={0}
              className="w-20 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-right font-semibold text-gray-900 outline-none"
              value={lowStockLimit}
              onChange={(event) => setLowStockLimit(Math.max(0, Number(event.target.value || 0)))}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowOnlyLowStock((current) => !current)}
            className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
              showOnlyLowStock ? 'bg-amber-100 text-amber-800' : 'border border-gray-200 bg-white text-gray-700'
            }`}
          >
            {showOnlyLowStock ? `Mostrando hasta ${lowStockLimit}` : 'Filtrar stock bajo'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {visibleModels.map((model) => {
          const isExpanded = expandedModelIds.includes(model.garmentModelId);

          return (
            <article key={model.garmentModelId} className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => toggleModel(model.garmentModelId)}
                className="flex w-full flex-col gap-4 px-5 py-5 text-left transition-colors hover:bg-gray-50 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <PackageSearch size={22} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{model.garmentModelName}</h2>
                      {!model.active ? <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-600">Inactivo</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {model.colors.length} colores · {model.colors.reduce((sum, color) => sum + color.entries.length, 0)} variantes · {model.totalQuantity} unidades
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {model.colors.length} colores
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${model.lowStockCount ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                    {model.lowStockCount ? `${model.lowStockCount} bajos` : 'Sin alertas'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {model.totalQuantity} uds
                  </span>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isExpanded ? (
                <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-5">
                  <div className="space-y-4">
                    {model.colors.map((color) => (
                      <section key={color.colorId} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: color.colorHex }} />
                            <div>
                              <h3 className="font-semibold text-gray-900">{color.colorName}</h3>
                              <p className="text-sm text-gray-500">{color.entries.length} talles · {color.totalQuantity} unidades</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                            Total color: {color.totalQuantity}
                          </span>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                          {color.entries.map((entry) => {
                            const quantity = readQuantity(entry.id);
                            const isLow = quantity <= lowStockLimit;

                            return (
                              <div key={entry.id} className={`rounded-2xl border p-4 ${isLow ? 'border-amber-200 bg-amber-50/60' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Talle</p>
                                    <p className="mt-1 text-lg font-bold text-gray-900">{entry.size?.name || 'Sin talle'}</p>
                                  </div>
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {isLow ? 'Bajo' : 'OK'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => void setQuantity(entry.id, quantity - 10)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">-10</button>
                                  <button type="button" onClick={() => void setQuantity(entry.id, quantity - 1)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">-1</button>
                                  <input
                                    type="number"
                                    className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white p-2 text-center text-lg font-bold text-gray-900"
                                    value={entry.quantity}
                                    onChange={(event) => {
                                      const nextValue = Number(event.target.value || 0);
                                      setStock((current) => current.map((row) => (row.id === entry.id ? { ...row, quantity: nextValue } : row)));
                                    }}
                                    onBlur={(event) => void setQuantity(entry.id, Number(event.target.value || 0))}
                                  />
                                  <button type="button" onClick={() => void setQuantity(entry.id, quantity + 1)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">+1</button>
                                  <button type="button" onClick={() => void setQuantity(entry.id, quantity + 10)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">+10</button>
                                </div>

                                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                                  <span>Stock actual: {quantity}</span>
                                  {savingId === entry.id ? <span>Guardando...</span> : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {!visibleModels.length ? (
        <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold text-gray-800">No hay resultados para ese filtro.</p>
          <p className="mt-1 text-sm text-gray-500">Probá con otro modelo, color o talle.</p>
        </div>
      ) : null}
    </div>
  );
}

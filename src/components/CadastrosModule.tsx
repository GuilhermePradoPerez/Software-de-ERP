import React, { useState } from 'react';
import {
  DatabaseSchema,
  ProductSpec,
  RawMaterial,
  Customer,
  Supplier,
  ProductiveCapacity,
  BOMMaterialItem,
  ProcessStage
} from '../types';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  Layers,
  Package,
  Users,
  Truck,
  Gauge,
  Check,
  X,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface CadastrosModuleProps {
  db: DatabaseSchema;
  onUpdateDb: (updater: (prev: DatabaseSchema) => DatabaseSchema) => void;
  activeSubTab: 'fichas' | 'materia-prima' | 'clientes' | 'fornecedores' | 'capacidade';
  setActiveSubTab: (tab: 'fichas' | 'materia-prima' | 'clientes' | 'fornecedores' | 'capacidade') => void;
}

export const CadastrosModule: React.FC<CadastrosModuleProps> = ({
  db,
  onUpdateDb,
  activeSubTab,
  setActiveSubTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // --- Product Tech Spec (Ficha Técnica) State ---
  const [editingProduct, setEditingProduct] = useState<ProductSpec | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);

  const emptyProduct = (): ProductSpec => ({
    id: `prod-${Date.now()}`,
    code: `PRD-${1000 + db.products.length + 1}`,
    name: '',
    category: 'Conjunto Mecânico',
    unit: 'un',
    batchSizeStandard: 20,
    materials: [
      {
        rawMaterialId: db.rawMaterials[0]?.id || '',
        quantityRequired: 1,
        wastePercent: 2,
      },
    ],
    stages: [
      {
        id: `st-${Date.now()}-1`,
        sequence: 1,
        stageName: 'Corte e Preparação Inicial',
        workCenterId: db.capacities[0]?.id || '',
        setupTimeMinutes: 15,
        unitCycleTimeMinutes: 4.0,
        instructions: '',
      },
    ],
    totalSetupMinutes: 15,
    totalUnitCycleMinutes: 4.0,
    estimatedUnitMaterialCost: 0,
    sellingPrice: 100,
    technicalNotes: '',
    updatedBy: db.settings.technicalResponsibleName,
    createdAt: new Date().toISOString(),
  });

  // --- Raw Material (Matéria Prima) Bulk / Entry State ---
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [materialRows, setMaterialRows] = useState<Omit<RawMaterial, 'id' | 'createdAt'>[]>([]);
  const [showMaterialModal, setShowMaterialModal] = useState(false);

  // --- Customers (Clientes) Bulk / Entry State ---
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerRows, setCustomerRows] = useState<Omit<Customer, 'id' | 'createdAt'>[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // --- Suppliers (Fornecedores) Bulk / Entry State ---
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierRows, setSupplierRows] = useState<Omit<Supplier, 'id' | 'createdAt'>[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // --- Productive Capacity (Capacidade Produtiva) State ---
  const [editingCapacity, setEditingCapacity] = useState<ProductiveCapacity | null>(null);
  const [capacityRows, setCapacityRows] = useState<Omit<ProductiveCapacity, 'id' | 'createdAt' | 'availableMinutesPerDay'>[]>([]);
  const [showCapacityModal, setShowCapacityModal] = useState(false);

  // Helpers to calculate Product Spec totals
  const calculateProductMetrics = (materials: BOMMaterialItem[], stages: ProcessStage[]) => {
    const totalSetupMinutes = stages.reduce((acc, s) => acc + (Number(s.setupTimeMinutes) || 0), 0);
    const totalUnitCycleMinutes = stages.reduce((acc, s) => acc + (Number(s.unitCycleTimeMinutes) || 0), 0);
    const estimatedUnitMaterialCost = materials.reduce((acc, item) => {
      const rm = db.rawMaterials.find((r) => r.id === item.rawMaterialId);
      if (!rm) return acc;
      const grossQty = (Number(item.quantityRequired) || 0) * (1 + (Number(item.wastePercent) || 0) / 100);
      return acc + grossQty * rm.unitCost;
    }, 0);

    return {
      totalSetupMinutes: Math.round(totalSetupMinutes * 100) / 100,
      totalUnitCycleMinutes: Math.round(totalUnitCycleMinutes * 100) / 100,
      estimatedUnitMaterialCost: Math.round(estimatedUnitMaterialCost * 100) / 100,
    };
  };

  // Save Ficha Técnica
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) return;

    const metrics = calculateProductMetrics(editingProduct.materials, editingProduct.stages);
    const normalizedStages = editingProduct.stages.map((st, idx) => ({
      ...st,
      sequence: idx + 1,
    }));

    const finalProduct: ProductSpec = {
      ...editingProduct,
      stages: normalizedStages,
      ...metrics,
      updatedBy: db.settings.technicalResponsibleName,
    };

    onUpdateDb((prev) => {
      const exists = prev.products.some((p) => p.id === finalProduct.id);
      return {
        ...prev,
        products: exists
          ? prev.products.map((p) => (p.id === finalProduct.id ? finalProduct : p))
          : [finalProduct, ...prev.products],
      };
    });

    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id: string) => {
    onUpdateDb((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  // --- Raw Materials Handlers ---
  const openNewMaterialModal = () => {
    setEditingMaterial(null);
    setMaterialRows([
      {
        code: `MP-${100 + db.rawMaterials.length + 1}`,
        name: '',
        unit: 'kg',
        unitCost: 10,
        currentStock: 100,
        minStock: 25,
        supplierId: db.suppliers[0]?.id || '',
        location: 'Almoxarifado A',
      },
    ]);
    setShowMaterialModal(true);
  };

  const handleSaveMaterials = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMaterial) {
      onUpdateDb((prev) => ({
        ...prev,
        rawMaterials: prev.rawMaterials.map((rm) =>
          rm.id === editingMaterial.id ? editingMaterial : rm
        ),
      }));
    } else {
      const validRows = materialRows.filter((r) => r.name.trim() !== '');
      if (validRows.length === 0) return;
      const newItems: RawMaterial[] = validRows.map((r, idx) => ({
        ...r,
        id: `rm-${Date.now()}-${idx}`,
        createdAt: new Date().toISOString(),
      }));
      onUpdateDb((prev) => ({
        ...prev,
        rawMaterials: [...newItems, ...prev.rawMaterials],
      }));
    }
    setShowMaterialModal(false);
    setEditingMaterial(null);
  };

  // --- Customers Handlers ---
  const openNewCustomerModal = () => {
    setEditingCustomer(null);
    setCustomerRows([
      {
        code: `CLI-${String(db.customers.length + 1).padStart(3, '0')}`,
        name: '',
        document: '',
        contactName: '',
        phone: '',
        email: '',
        cityState: 'São Paulo / SP',
        paymentTerms: '30 DDL',
      },
    ]);
    setShowCustomerModal(true);
  };

  const handleSaveCustomers = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      onUpdateDb((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === editingCustomer.id ? editingCustomer : c
        ),
      }));
    } else {
      const validRows = customerRows.filter((r) => r.name.trim() !== '');
      if (validRows.length === 0) return;
      const newItems: Customer[] = validRows.map((r, idx) => ({
        ...r,
        id: `cust-${Date.now()}-${idx}`,
        createdAt: new Date().toISOString(),
      }));
      onUpdateDb((prev) => ({
        ...prev,
        customers: [...newItems, ...prev.customers],
      }));
    }
    setShowCustomerModal(false);
    setEditingCustomer(null);
  };

  // --- Suppliers Handlers ---
  const openNewSupplierModal = () => {
    setEditingSupplier(null);
    setSupplierRows([
      {
        code: `FOR-${String(db.suppliers.length + 1).padStart(3, '0')}`,
        name: '',
        cnpj: '',
        contactName: '',
        phone: '',
        email: '',
        leadTimeDays: 5,
        category: 'Insumos Industriais',
      },
    ]);
    setShowSupplierModal(true);
  };

  const handleSaveSuppliers = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      onUpdateDb((prev) => ({
        ...prev,
        suppliers: prev.suppliers.map((s) =>
          s.id === editingSupplier.id ? editingSupplier : s
        ),
      }));
    } else {
      const validRows = supplierRows.filter((r) => r.name.trim() !== '');
      if (validRows.length === 0) return;
      const newItems: Supplier[] = validRows.map((r, idx) => ({
        ...r,
        id: `sup-${Date.now()}-${idx}`,
        createdAt: new Date().toISOString(),
      }));
      onUpdateDb((prev) => ({
        ...prev,
        suppliers: [...newItems, ...prev.suppliers],
      }));
    }
    setShowSupplierModal(false);
    setEditingSupplier(null);
  };

  // --- Capacity Handlers ---
  const computeAvailableMinutes = (
    machinesCount: number,
    hoursPerShift: number,
    shiftsPerDay: number,
    efficiencyPercent: number
  ) => {
    return Math.round(machinesCount * hoursPerShift * shiftsPerDay * 60 * (efficiencyPercent / 100));
  };

  const openNewCapacityModal = () => {
    setEditingCapacity(null);
    setCapacityRows([
      {
        code: `CT-0${db.capacities.length + 1}`,
        name: '',
        sector: 'Produção Geral',
        machinesCount: 1,
        operatorsCount: 1,
        hoursPerShift: 8,
        shiftsPerDay: 1,
        efficiencyPercent: 85,
        maintenanceStatus: 'Operacional',
      },
    ]);
    setShowCapacityModal(true);
  };

  const handleSaveCapacities = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCapacity) {
      const updated: ProductiveCapacity = {
        ...editingCapacity,
        availableMinutesPerDay: computeAvailableMinutes(
          editingCapacity.machinesCount,
          editingCapacity.hoursPerShift,
          editingCapacity.shiftsPerDay,
          editingCapacity.efficiencyPercent
        ),
      };
      onUpdateDb((prev) => ({
        ...prev,
        capacities: prev.capacities.map((c) => (c.id === updated.id ? updated : c)),
      }));
    } else {
      const validRows = capacityRows.filter((r) => r.name.trim() !== '');
      if (validRows.length === 0) return;
      const newItems: ProductiveCapacity[] = validRows.map((r, idx) => ({
        ...r,
        id: `cap-${Date.now()}-${idx}`,
        availableMinutesPerDay: computeAvailableMinutes(
          r.machinesCount,
          r.hoursPerShift,
          r.shiftsPerDay,
          r.efficiencyPercent
        ),
        createdAt: new Date().toISOString(),
      }));
      onUpdateDb((prev) => ({
        ...prev,
        capacities: [...newItems, ...prev.capacities],
      }));
    }
    setShowCapacityModal(false);
    setEditingCapacity(null);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('fichas')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'fichas'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Fichas Técnicas ({db.products.length})
          </button>
          <button
            onClick={() => setActiveSubTab('materia-prima')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'materia-prima'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Matéria-Prima ({db.rawMaterials.length})
          </button>
          <button
            onClick={() => setActiveSubTab('capacidade')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'capacidade'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Capacidade Produtiva ({db.capacities.length})
          </button>
          <button
            onClick={() => setActiveSubTab('clientes')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'clientes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Clientes ({db.customers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('fornecedores')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'fornecedores'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Fornecedores ({db.suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar código, descrição..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          {activeSubTab === 'fichas' && (
            <button
              onClick={() => {
                setEditingProduct(emptyProduct());
                setShowProductForm(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nova Ficha Técnica
            </button>
          )}
          {activeSubTab === 'materia-prima' && (
            <button
              onClick={openNewMaterialModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Matéria-Prima (Lote)
            </button>
          )}
          {activeSubTab === 'capacidade' && (
            <button
              onClick={openNewCapacityModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Novo Centro de Trabalho
            </button>
          )}
          {activeSubTab === 'clientes' && (
            <button
              onClick={openNewCustomerModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Clientes (Lote)
            </button>
          )}
          {activeSubTab === 'fornecedores' && (
            <button
              onClick={openNewSupplierModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Fornecedores (Lote)
            </button>
          )}
        </div>
      </div>

      {/* 1. FICHAS TÉCNICAS DO PRODUTO */}
      {activeSubTab === 'fichas' && (
        <div className="space-y-6">
          {showProductForm && editingProduct && (
            <form
              onSubmit={handleSaveProduct}
              className="bg-white border border-slate-200 rounded-lg p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Engenharia de Produto — Ficha Técnica e Roteiro de Processo
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Defina os múltiplos insumos (BOM) e as etapas de fabricação com tempo de setup e ciclo por unidade.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Dados Gerais do Produto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Código SKU</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.code}
                    onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Descrição Técnica do Produto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Eixo Entalhado Tratado SAE 1045"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Família / Categoria</label>
                  <input
                    type="text"
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unidade / Lote Padrão</label>
                  <div className="flex gap-2">
                    <select
                      value={editingProduct.unit}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          unit: e.target.value as ProductSpec['unit'],
                        })
                      }
                      className="w-20 px-2 py-2 text-sm border border-slate-300 rounded-md bg-white"
                    >
                      <option value="un">un</option>
                      <option value="conj">conj</option>
                      <option value="par">par</option>
                      <option value="cx">cx</option>
                      <option value="kg">kg</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={editingProduct.batchSizeStandard}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          batchSizeStandard: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                      title="Lote econômico padrão"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Preço Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={editingProduct.sellingPrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        sellingPrice: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Múltiplas Entradas de Matéria-Prima (Lista de Materiais / BOM) */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      1. Estrutura de Matéria-Prima e Componentes (BOM)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Adicione todas as matérias-primas consumidas para fabricar 1 {editingProduct.unit} deste produto.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct({
                        ...editingProduct,
                        materials: [
                          ...editingProduct.materials,
                          {
                            rawMaterialId: db.rawMaterials[0]?.id || '',
                            quantityRequired: 1,
                            wastePercent: 0,
                          },
                        ],
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Matéria-Prima
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-3">Insumo / Matéria-Prima</th>
                        <th className="py-2.5 px-3 w-36 text-right">Qtd. Líquida / un</th>
                        <th className="py-2.5 px-3 w-32 text-right">Perda Técnica (%)</th>
                        <th className="py-2.5 px-3 w-36 text-right">Custo Subtotal</th>
                        <th className="py-2.5 px-3 w-12 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {editingProduct.materials.map((mat, idx) => {
                        const rm = db.rawMaterials.find((r) => r.id === mat.rawMaterialId);
                        const subtotal = rm
                          ? mat.quantityRequired * (1 + mat.wastePercent / 100) * rm.unitCost
                          : 0;
                        return (
                          <tr key={idx}>
                            <td className="p-2">
                              <select
                                value={mat.rawMaterialId}
                                onChange={(e) => {
                                  const next = [...editingProduct.materials];
                                  next[idx] = { ...next[idx], rawMaterialId: e.target.value };
                                  setEditingProduct({ ...editingProduct, materials: next });
                                }}
                                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md bg-white"
                              >
                                {db.rawMaterials.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.code} - {r.name} ({r.unit} · R$ {r.unitCost.toFixed(2)})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center justify-end gap-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={mat.quantityRequired}
                                  onChange={(e) => {
                                    const next = [...editingProduct.materials];
                                    next[idx] = {
                                      ...next[idx],
                                      quantityRequired: Number(e.target.value) || 0,
                                    };
                                    setEditingProduct({ ...editingProduct, materials: next });
                                  }}
                                  className="w-24 px-2 py-1.5 text-sm font-mono text-right border border-slate-300 rounded-md"
                                />
                                <span className="text-xs text-slate-500 w-8">{rm?.unit || 'un'}</span>
                              </div>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="100"
                                value={mat.wastePercent}
                                onChange={(e) => {
                                  const next = [...editingProduct.materials];
                                  next[idx] = {
                                    ...next[idx],
                                    wastePercent: Number(e.target.value) || 0,
                                  };
                                  setEditingProduct({ ...editingProduct, materials: next });
                                }}
                                className="w-full px-2 py-1.5 text-sm font-mono text-right border border-slate-300 rounded-md"
                              />
                            </td>
                            <td className="p-2 text-right font-mono text-sm text-slate-800">
                              R$ {subtotal.toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = editingProduct.materials.filter((_, i) => i !== idx);
                                  setEditingProduct({ ...editingProduct, materials: next });
                                }}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Remover insumo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Múltiplas Entradas de Roteiro de Processo & Tempos */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      2. Roteiro Produtivo e Tempo de Processo por Operação
                    </h4>
                    <p className="text-xs text-slate-500">
                      Especifique cada operação sequencial, o centro de trabalho e o tempo padrão (Setup + Ciclo Unitário).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct({
                        ...editingProduct,
                        stages: [
                          ...editingProduct.stages,
                          {
                            id: `st-${Date.now()}-${editingProduct.stages.length + 1}`,
                            sequence: editingProduct.stages.length + 1,
                            stageName: '',
                            workCenterId: db.capacities[0]?.id || '',
                            setupTimeMinutes: 15,
                            unitCycleTimeMinutes: 5.0,
                            instructions: '',
                          },
                        ],
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Etapa de Processo
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-3 w-14 text-center">Seq.</th>
                        <th className="py-2.5 px-3">Operação / Etapa</th>
                        <th className="py-2.5 px-3">Centro de Trabalho (Capacidade)</th>
                        <th className="py-2.5 px-3 w-28 text-right">Setup (min)</th>
                        <th className="py-2.5 px-3 w-32 text-right">Ciclo Unit. (min)</th>
                        <th className="py-2.5 px-3">Instrução Técnica</th>
                        <th className="py-2.5 px-3 w-12 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {editingProduct.stages.map((st, idx) => (
                        <tr key={st.id}>
                          <td className="p-2 text-center font-mono text-xs font-semibold text-slate-500">
                            #{idx + 1}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              placeholder="Ex: Usinagem CNC Eixo"
                              value={st.stageName}
                              onChange={(e) => {
                                const next = [...editingProduct.stages];
                                next[idx] = { ...next[idx], stageName: e.target.value };
                                setEditingProduct({ ...editingProduct, stages: next });
                              }}
                              className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={st.workCenterId}
                              onChange={(e) => {
                                const next = [...editingProduct.stages];
                                next[idx] = { ...next[idx], workCenterId: e.target.value };
                                setEditingProduct({ ...editingProduct, stages: next });
                              }}
                              className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md bg-white"
                            >
                              {db.capacities.map((cap) => (
                                <option key={cap.id} value={cap.id}>
                                  {cap.code} - {cap.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={st.setupTimeMinutes}
                              onChange={(e) => {
                                const next = [...editingProduct.stages];
                                next[idx] = {
                                  ...next[idx],
                                  setupTimeMinutes: Number(e.target.value) || 0,
                                };
                                setEditingProduct({ ...editingProduct, stages: next });
                              }}
                              className="w-full px-2 py-1.5 text-sm font-mono text-right border border-slate-300 rounded-md"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={st.unitCycleTimeMinutes}
                              onChange={(e) => {
                                const next = [...editingProduct.stages];
                                next[idx] = {
                                  ...next[idx],
                                  unitCycleTimeMinutes: Number(e.target.value) || 0,
                                };
                                setEditingProduct({ ...editingProduct, stages: next });
                              }}
                              className="w-full px-2 py-1.5 text-sm font-mono text-right border border-slate-300 rounded-md"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Tolerância, gabarito, norma..."
                              value={st.instructions}
                              onChange={(e) => {
                                const next = [...editingProduct.stages];
                                next[idx] = { ...next[idx], instructions: e.target.value };
                                setEditingProduct({ ...editingProduct, stages: next });
                              }}
                              className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md"
                            />
                          </td>
                          <td className="p-2 text-center">
                            {editingProduct.stages.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = editingProduct.stages.filter((_, i) => i !== idx);
                                  setEditingProduct({ ...editingProduct, stages: next });
                                }}
                                className="text-slate-400 hover:text-red-600 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Observações Técnicas e Sumário de Engenharia */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Requisitos de Qualidade e Inspeção Técnica
                  </label>
                  <textarea
                    rows={2}
                    value={editingProduct.technicalNotes}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, technicalNotes: e.target.value })
                    }
                    placeholder="Instruções de controle dimensional, normas aplicáveis e critérios de aprovação..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
                  {(() => {
                    const m = calculateProductMetrics(editingProduct.materials, editingProduct.stages);
                    return (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Setup Total de Roteiro:</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {m.totalSetupMinutes} min
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Tempo de Ciclo Unitário:</span>
                          <span className="font-mono font-semibold text-blue-700">
                            {m.totalUnitCycleMinutes.toFixed(1)} min / {editingProduct.unit}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Custo Ind. Matéria-Prima:</span>
                          <span className="font-mono font-semibold text-slate-900">
                            R$ {m.estimatedUnitMaterialCost.toFixed(2)}
                          </span>
                        </div>
                        <div className="pt-1 border-t border-slate-200 flex justify-between text-slate-500">
                          <span>Resp. Técnico:</span>
                          <span className="font-medium text-slate-800">
                            {db.settings.technicalResponsibleName}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  <Check className="w-4 h-4" />
                  Salvar Ficha Técnica
                </button>
              </div>
            </form>
          )}

          {/* Lista de Fichas Técnicas */}
          <div className="space-y-4">
            {db.products
              .filter(
                (p) =>
                  p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.category.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <span className="font-semibold text-slate-900">{product.code}</span>
                        <span>·</span>
                        <span>{product.category}</span>
                        <span>·</span>
                        <span>Lote Padrão: {product.batchSizeStandard} {product.unit}</span>
                        <span>·</span>
                        <span>Resp. Técnico: {product.updatedBy}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mt-1">{product.name}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Tempo de Processo</div>
                        <div className="text-sm font-mono font-semibold text-blue-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {product.totalUnitCycleMinutes.toFixed(1)} min/{product.unit} (+{product.totalSetupMinutes}m setup)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Custo MP / Preço Venda</div>
                        <div className="text-sm font-mono font-semibold text-slate-900">
                          R$ {product.estimatedUnitMaterialCost.toFixed(2)} / R$ {product.sellingPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setShowProductForm(true);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar Ficha
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                          title="Excluir ficha técnica"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detalhamento de BOM e Etapas */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-700 mb-2">
                        Composição de Matéria-Prima (por 1 {product.unit})
                      </h4>
                      <div className="border border-slate-200 rounded-md overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                              <th className="py-1.5 px-2.5">Insumo</th>
                              <th className="py-1.5 px-2.5 text-right">Consumo</th>
                              <th className="py-1.5 px-2.5 text-right">Perda</th>
                              <th className="py-1.5 px-2.5 text-right">Custo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {product.materials.map((m, i) => {
                              const rm = db.rawMaterials.find((r) => r.id === m.rawMaterialId);
                              const cost = rm
                                ? m.quantityRequired * (1 + m.wastePercent / 100) * rm.unitCost
                                : 0;
                              return (
                                <tr key={i}>
                                  <td className="py-1.5 px-2.5 text-slate-800">
                                    <span className="font-mono text-slate-500 mr-1">{rm?.code}</span>
                                    {rm?.name || 'Insumo removido'}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono">
                                    {m.quantityRequired} {rm?.unit}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-500">
                                    {m.wastePercent}%
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono font-medium">
                                    R$ {cost.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-700 mb-2">
                        Roteiro e Tempos de Processo ({product.stages.length} Operações)
                      </h4>
                      <div className="border border-slate-200 rounded-md overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                              <th className="py-1.5 px-2.5">Etapa</th>
                              <th className="py-1.5 px-2.5">Centro de Trabalho</th>
                              <th className="py-1.5 px-2.5 text-right">Setup</th>
                              <th className="py-1.5 px-2.5 text-right">Ciclo/un</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {product.stages.map((st) => {
                              const wc = db.capacities.find((c) => c.id === st.workCenterId);
                              return (
                                <tr key={st.id}>
                                  <td className="py-1.5 px-2.5 font-medium text-slate-800">
                                    {st.sequence}. {st.stageName}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-slate-600">
                                    {wc ? `${wc.code} - ${wc.name}` : '-'}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono">
                                    {st.setupTimeMinutes} min
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-blue-700">
                                    {st.unitCycleTimeMinutes.toFixed(1)} min
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {product.technicalNotes && (
                    <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded border border-slate-200/80">
                      <span className="font-semibold text-slate-800">Norma de Inspeção: </span>
                      {product.technicalNotes}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 2. MATÉRIA-PRIMA */}
      {activeSubTab === 'materia-prima' && (
        <div className="space-y-4">
          {showMaterialModal && (
            <form
              onSubmit={handleSaveMaterials}
              className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {editingMaterial
                      ? 'Editar Matéria-Prima'
                      : 'Cadastro Múltiplo de Matérias-Primas'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Insira uma ou várias matérias-primas de uma só vez com controle de estoque mínimo e fornecedor.
                  </p>
                </div>
                {!editingMaterial && (
                  <button
                    type="button"
                    onClick={() =>
                      setMaterialRows([
                        ...materialRows,
                        {
                          code: `MP-${100 + db.rawMaterials.length + materialRows.length + 1}`,
                          name: '',
                          unit: 'kg',
                          unitCost: 10,
                          currentStock: 0,
                          minStock: 20,
                          supplierId: db.suppliers[0]?.id || '',
                          location: 'Almoxarifado A',
                        },
                      ])
                    }
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Linha
                  </button>
                )}
              </div>

              {editingMaterial ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Código</label>
                    <input
                      type="text"
                      required
                      value={editingMaterial.code}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, code: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Descrição</label>
                    <input
                      type="text"
                      required
                      value={editingMaterial.name}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, name: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Unidade</label>
                    <select
                      value={editingMaterial.unit}
                      onChange={(e) =>
                        setEditingMaterial({
                          ...editingMaterial,
                          unit: e.target.value as RawMaterial['unit'],
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white"
                    >
                      <option value="kg">kg</option>
                      <option value="m">m</option>
                      <option value="un">un</option>
                      <option value="L">L</option>
                      <option value="m²">m²</option>
                      <option value="barra">barra</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Custo Unit. (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingMaterial.unitCost}
                      onChange={(e) =>
                        setEditingMaterial({
                          ...editingMaterial,
                          unitCost: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Saldo Atual</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingMaterial.currentStock}
                      onChange={(e) =>
                        setEditingMaterial({
                          ...editingMaterial,
                          currentStock: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Estoque Mínimo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingMaterial.minStock}
                      onChange={(e) =>
                        setEditingMaterial({
                          ...editingMaterial,
                          minStock: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fornecedor Padrão</label>
                    <select
                      value={editingMaterial.supplierId}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, supplierId: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white"
                    >
                      {db.suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2 w-24">Código</th>
                        <th className="p-2">Descrição da Matéria-Prima</th>
                        <th className="p-2 w-20">Unid.</th>
                        <th className="p-2 w-28 text-right">Custo (R$)</th>
                        <th className="p-2 w-28 text-right">Estoque Atual</th>
                        <th className="p-2 w-28 text-right">Est. Mínimo</th>
                        <th className="p-2">Fornecedor</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {materialRows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-1.5">
                            <input
                              type="text"
                              required
                              value={row.code}
                              onChange={(e) => {
                                const next = [...materialRows];
                                next[idx] = { ...next[idx], code: e.target.value };
                                setMaterialRows(next);
                              }}
                              className="w-full px-2 py-1 font-mono border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              required
                              placeholder="Ex: Chapa Aço Inox 304 #2mm"
                              value={row.name}
                              onChange={(e) => {
                                const next = [...materialRows];
                                next[idx] = { ...next[idx], name: e.target.value };
                                setMaterialRows(next);
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.unit}
                              onChange={(e) => {
                                const next = [...materialRows];
                                next[idx] = {
                                  ...next[idx],
                                  unit: e.target.value as RawMaterial['unit'],
                                };
                                setMaterialRows(next);
                              }}
                              className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white"
                            >
                              <option value="kg">kg</option>
                              <option value="m">m</option>
                              <option value="un">un</option>
                              <option value="L">L</option>
                              <option value="m²">m²</option>
                              <option value="barra">barra</option>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={row.unitCost}
                              onChange={(e) => {
                                const next = [...materialRows];
                                next[idx] = {
                                  ...next[idx],
                                  unitCost: Number(e.target.value) || 0,
                                };
                                setMaterialRows(next);
                              }}
                              className="w-full px-2 py-1 font-mono text-right border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={row.currentStock}
                              onChange={(e) => {
                                const next = [...materialRows];
                                next[idx] = {
                                  ...next[idx],
                                  currentStock: Number(e.target.value) || 0,
                                };
                                setMaterialRows(next);
                              }}
                              className="w-full px-2 py-1 font-mono text-right border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={row.minStock}
                              onChange={(e) => {
                                const next = [...materialRows];
                                next[idx] = {
                                  ...next[idx],
                                  minStock: Number(e.target.value) || 0,
                                };
                                setMaterialRows(next);
                              }}
                              className="w-full px-2 py-1 font-mono text-right border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.supplierId}
                              onChange={(e) => {
                                const next = [...materialRows];
                                next[idx] = { ...next[idx], supplierId: e.target.value };
                                setMaterialRows(next);
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                            >
                              {db.suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-1.5 text-center">
                            {materialRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setMaterialRows(materialRows.filter((_, i) => i !== idx))
                                }
                                className="text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Salvar Matéria-Prima
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Matéria-Prima / Insumo</th>
                  <th className="py-3 px-4">Fornecedor Homologado</th>
                  <th className="py-3 px-4">Localização</th>
                  <th className="py-3 px-4 text-right">Custo Unit.</th>
                  <th className="py-3 px-4 text-right">Estoque Atual</th>
                  <th className="py-3 px-4 text-right">Est. Mínimo</th>
                  <th className="py-3 px-4 text-right">Situação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {db.rawMaterials
                  .filter(
                    (rm) =>
                      rm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      rm.code.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((rm) => {
                    const supplier = db.suppliers.find((s) => s.id === rm.supplierId);
                    const isLow = rm.currentStock <= rm.minStock;
                    return (
                      <tr key={rm.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-mono text-xs font-semibold text-slate-700">
                          {rm.code}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{rm.name}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-600">
                          {supplier ? supplier.name : 'Não vinculado'}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">{rm.location}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs">
                          R$ {rm.unitCost.toFixed(2)} / {rm.unit}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                          {rm.currentStock.toFixed(1)} {rm.unit}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-500">
                          {rm.minStock} {rm.unit}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" /> Repor Estoque
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">Normal</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingMaterial(rm);
                                setShowMaterialModal(true);
                              }}
                              className="text-slate-500 hover:text-blue-600"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                onUpdateDb((prev) => ({
                                  ...prev,
                                  rawMaterials: prev.rawMaterials.filter((x) => x.id !== rm.id),
                                }))
                              }
                              className="text-slate-400 hover:text-red-600"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CAPACIDADE PRODUTIVA */}
      {activeSubTab === 'capacidade' && (
        <div className="space-y-4">
          {showCapacityModal && (
            <form
              onSubmit={handleSaveCapacities}
              className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {editingCapacity
                      ? 'Editar Centro de Trabalho'
                      : 'Cadastrar Centros de Trabalho / Capacidade Produtiva'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    A capacidade disponível diária (minutos/dia) é calculada automaticamente a partir do nº de máquinas, turnos, horas e eficiência OEE.
                  </p>
                </div>
                {!editingCapacity && (
                  <button
                    type="button"
                    onClick={() =>
                      setCapacityRows([
                        ...capacityRows,
                        {
                          code: `CT-0${db.capacities.length + capacityRows.length + 1}`,
                          name: '',
                          sector: 'Usinagem',
                          machinesCount: 1,
                          operatorsCount: 1,
                          hoursPerShift: 8,
                          shiftsPerDay: 1,
                          efficiencyPercent: 85,
                          maintenanceStatus: 'Operacional',
                        },
                      ])
                    }
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Linha
                  </button>
                )}
              </div>

              {editingCapacity ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Código CT</label>
                    <input
                      type="text"
                      required
                      value={editingCapacity.code}
                      onChange={(e) =>
                        setEditingCapacity({ ...editingCapacity, code: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nome do Centro de Trabalho / Máquina</label>
                    <input
                      type="text"
                      required
                      value={editingCapacity.name}
                      onChange={(e) =>
                        setEditingCapacity({ ...editingCapacity, name: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Setor</label>
                    <input
                      type="text"
                      value={editingCapacity.sector}
                      onChange={(e) =>
                        setEditingCapacity({ ...editingCapacity, sector: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nº Máquinas</label>
                    <input
                      type="number"
                      min={1}
                      value={editingCapacity.machinesCount}
                      onChange={(e) =>
                        setEditingCapacity({
                          ...editingCapacity,
                          machinesCount: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Horas/Turno</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={editingCapacity.hoursPerShift}
                      onChange={(e) =>
                        setEditingCapacity({
                          ...editingCapacity,
                          hoursPerShift: Number(e.target.value) || 8,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Turnos/Dia</label>
                    <input
                      type="number"
                      min={1}
                      max={3}
                      value={editingCapacity.shiftsPerDay}
                      onChange={(e) =>
                        setEditingCapacity({
                          ...editingCapacity,
                          shiftsPerDay: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Eficiência OEE (%)</label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={editingCapacity.efficiencyPercent}
                      onChange={(e) =>
                        setEditingCapacity({
                          ...editingCapacity,
                          efficiencyPercent: Number(e.target.value) || 85,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2 w-24">Código</th>
                        <th className="p-2">Centro de Trabalho</th>
                        <th className="p-2">Setor</th>
                        <th className="p-2 w-20 text-right">Máq.</th>
                        <th className="p-2 w-20 text-right">Oper.</th>
                        <th className="p-2 w-20 text-right">H/Turno</th>
                        <th className="p-2 w-20 text-right">Turnos</th>
                        <th className="p-2 w-24 text-right">Efic. (%)</th>
                        <th className="p-2 w-28 text-right">Cap. (min/dia)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {capacityRows.map((row, idx) => {
                        const avail = computeAvailableMinutes(
                          row.machinesCount,
                          row.hoursPerShift,
                          row.shiftsPerDay,
                          row.efficiencyPercent
                        );
                        return (
                          <tr key={idx}>
                            <td className="p-1.5">
                              <input
                                type="text"
                                required
                                value={row.code}
                                onChange={(e) => {
                                  const next = [...capacityRows];
                                  next[idx] = { ...next[idx], code: e.target.value };
                                  setCapacityRows(next);
                                }}
                                className="w-full px-2 py-1 font-mono border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                required
                                placeholder="Ex: Torno Romi Centur 30D"
                                value={row.name}
                                onChange={(e) => {
                                  const next = [...capacityRows];
                                  next[idx] = { ...next[idx], name: e.target.value };
                                  setCapacityRows(next);
                                }}
                                className="w-full px-2 py-1 border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.sector}
                                onChange={(e) => {
                                  const next = [...capacityRows];
                                  next[idx] = { ...next[idx], sector: e.target.value };
                                  setCapacityRows(next);
                                }}
                                className="w-full px-2 py-1 border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                min={1}
                                value={row.machinesCount}
                                onChange={(e) => {
                                  const next = [...capacityRows];
                                  next[idx] = {
                                    ...next[idx],
                                    machinesCount: Number(e.target.value) || 1,
                                  };
                                  setCapacityRows(next);
                                }}
                                className="w-full px-2 py-1 font-mono text-right border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                min={1}
                                value={row.operatorsCount}
                                onChange={(e) => {
                                  const next = [...capacityRows];
                                  next[idx] = {
                                    ...next[idx],
                                    operatorsCount: Number(e.target.value) || 1,
                                  };
                                  setCapacityRows(next);
                                }}
                                className="w-full px-2 py-1 font-mono text-right border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                min={1}
                                value={row.hoursPerShift}
                                onChange={(e) => {
                                  const next = [...capacityRows];
                                  next[idx] = {
                                    ...next[idx],
                                    hoursPerShift: Number(e.target.value) || 8,
                                  };
                                  setCapacityRows(next);
                                }}
                                className="w-full px-2 py-1 font-mono text-right border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                min={1}
                                value={row.shiftsPerDay}
                                onChange={(e) => {
                                  const next = [...capacityRows];
                                  next[idx] = {
                                    ...next[idx],
                                    shiftsPerDay: Number(e.target.value) || 1,
                                  };
                                  setCapacityRows(next);
                                }}
                                className="w-full px-2 py-1 font-mono text-right border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                min={10}
                                max={100}
                                value={row.efficiencyPercent}
                                onChange={(e) => {
                                  const next = [...capacityRows];
                                  next[idx] = {
                                    ...next[idx],
                                    efficiencyPercent: Number(e.target.value) || 85,
                                  };
                                  setCapacityRows(next);
                                }}
                                className="w-full px-2 py-1 font-mono text-right border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5 text-right font-mono font-semibold text-blue-700">
                              {avail} min
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCapacityModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md"
                >
                  Salvar Capacidade Produtiva
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Centro de Trabalho</th>
                  <th className="py-3 px-4">Setor</th>
                  <th className="py-3 px-4 text-right">Máquinas / Oper.</th>
                  <th className="py-3 px-4 text-right">Regime de Turno</th>
                  <th className="py-3 px-4 text-right">Eficiência OEE</th>
                  <th className="py-3 px-4 text-right">Capacidade Líquida Diária</th>
                  <th className="py-3 px-4 text-right">Carga Atual (OPs Ativas)</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {db.capacities.map((cap) => {
                  // Calculate active load in minutes from Production Orders not completed/cancelled
                  const activeLoadMinutes = db.productionOrders
                    .filter((op) => op.status !== 'Concluída' && op.status !== 'Cancelada')
                    .reduce((acc, op) => {
                      const stageLoad = op.stageLogs
                        .filter((st) => st.workCenterId === cap.id && st.status !== 'Concluída')
                        .reduce((sAcc, st) => sAcc + Math.max(0, st.plannedMinutes - st.actualMinutes), 0);
                      return acc + stageLoad;
                    }, 0);

                  const occupationRatio = Math.round(
                    (activeLoadMinutes / Math.max(1, cap.availableMinutesPerDay)) * 100
                  );

                  return (
                    <tr key={cap.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                        {cap.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{cap.name}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{cap.sector}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">
                        {cap.machinesCount} máq · {cap.operatorsCount} op
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs">
                        {cap.shiftsPerDay}x {cap.hoursPerShift}h
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs">
                        {cap.efficiencyPercent}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {cap.availableMinutesPerDay} min/dia ({(cap.availableMinutesPerDay / 60).toFixed(1)}h)
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs">
                        <span
                          className={
                            occupationRatio > 100
                              ? 'text-red-700 font-semibold'
                              : occupationRatio > 75
                              ? 'text-amber-700 font-semibold'
                              : 'text-emerald-700 font-medium'
                          }
                        >
                          {activeLoadMinutes} min ({occupationRatio}% de 1 dia)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingCapacity(cap);
                              setShowCapacityModal(true);
                            }}
                            className="text-slate-500 hover:text-blue-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              onUpdateDb((prev) => ({
                                ...prev,
                                capacities: prev.capacities.filter((c) => c.id !== cap.id),
                              }))
                            }
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CLIENTES */}
      {activeSubTab === 'clientes' && (
        <div className="space-y-4">
          {showCustomerModal && (
            <form
              onSubmit={handleSaveCustomers}
              className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {editingCustomer ? 'Editar Cliente' : 'Cadastro Múltiplo de Clientes'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Adicione um ou múltiplos clientes industriais/comerciais simultaneamente.
                  </p>
                </div>
                {!editingCustomer && (
                  <button
                    type="button"
                    onClick={() =>
                      setCustomerRows([
                        ...customerRows,
                        {
                          code: `CLI-${String(db.customers.length + customerRows.length + 1).padStart(3, '0')}`,
                          name: '',
                          document: '',
                          contactName: '',
                          phone: '',
                          email: '',
                          cityState: '',
                          paymentTerms: '30 DDL',
                        },
                      ])
                    }
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Linha
                  </button>
                )}
              </div>

              {editingCustomer ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Código</label>
                    <input
                      type="text"
                      required
                      value={editingCustomer.code}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, code: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Razão Social / Nome</label>
                    <input
                      type="text"
                      required
                      value={editingCustomer.name}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, name: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">CNPJ / CPF</label>
                    <input
                      type="text"
                      value={editingCustomer.document}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, document: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Contato / Comprador</label>
                    <input
                      type="text"
                      value={editingCustomer.contactName}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, contactName: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={editingCustomer.phone}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, phone: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={editingCustomer.email}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, email: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Cidade / UF</label>
                    <input
                      type="text"
                      value={editingCustomer.cityState}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, cityState: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Condição Pagto.</label>
                    <input
                      type="text"
                      value={editingCustomer.paymentTerms}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, paymentTerms: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2 w-24">Código</th>
                        <th className="p-2">Razão Social / Cliente</th>
                        <th className="p-2 w-36">CNPJ / CPF</th>
                        <th className="p-2">Contato</th>
                        <th className="p-2 w-32">Telefone</th>
                        <th className="p-2">Cidade / UF</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {customerRows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-1.5">
                            <input
                              type="text"
                              required
                              value={row.code}
                              onChange={(e) => {
                                const next = [...customerRows];
                                next[idx] = { ...next[idx], code: e.target.value };
                                setCustomerRows(next);
                              }}
                              className="w-full px-2 py-1 font-mono border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              required
                              placeholder="Nome da empresa cliente"
                              value={row.name}
                              onChange={(e) => {
                                const next = [...customerRows];
                                next[idx] = { ...next[idx], name: e.target.value };
                                setCustomerRows(next);
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="00.000.000/0001-00"
                              value={row.document}
                              onChange={(e) => {
                                const next = [...customerRows];
                                next[idx] = { ...next[idx], document: e.target.value };
                                setCustomerRows(next);
                              }}
                              className="w-full px-2 py-1 font-mono border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="Responsável"
                              value={row.contactName}
                              onChange={(e) => {
                                const next = [...customerRows];
                                next[idx] = { ...next[idx], contactName: e.target.value };
                                setCustomerRows(next);
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="(11) 99999-9999"
                              value={row.phone}
                              onChange={(e) => {
                                const next = [...customerRows];
                                next[idx] = { ...next[idx], phone: e.target.value };
                                setCustomerRows(next);
                              }}
                              className="w-full px-2 py-1 font-mono border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.cityState}
                              onChange={(e) => {
                                const next = [...customerRows];
                                next[idx] = { ...next[idx], cityState: e.target.value };
                                setCustomerRows(next);
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            {customerRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomerRows(customerRows.filter((_, i) => i !== idx))
                                }
                                className="text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md"
                >
                  Salvar Clientes
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Cliente / Razão Social</th>
                  <th className="py-3 px-4">CNPJ / Documento</th>
                  <th className="py-3 px-4">Contato</th>
                  <th className="py-3 px-4">Telefone / E-mail</th>
                  <th className="py-3 px-4">Cidade / UF</th>
                  <th className="py-3 px-4 text-right">Faturamento</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {db.customers
                  .filter(
                    (c) =>
                      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      c.code.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                        {c.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{c.document}</td>
                      <td className="py-3 px-4 text-xs text-slate-700">{c.contactName}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        <div>{c.phone}</div>
                        <div>{c.email}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{c.cityState}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
                        {c.paymentTerms}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingCustomer(c);
                              setShowCustomerModal(true);
                            }}
                            className="text-slate-500 hover:text-blue-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              onUpdateDb((prev) => ({
                                ...prev,
                                customers: prev.customers.filter((x) => x.id !== c.id),
                              }))
                            }
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. FORNECEDORES */}
      {activeSubTab === 'fornecedores' && (
        <div className="space-y-4">
          {showSupplierModal && (
            <form
              onSubmit={handleSaveSuppliers}
              className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {editingSupplier ? 'Editar Fornecedor' : 'Cadastro Múltiplo de Fornecedores'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cadastre fornecedores homologados de matéria-prima e insumos industriais.
                  </p>
                </div>
                {!editingSupplier && (
                  <button
                    type="button"
                    onClick={() =>
                      setSupplierRows([
                        ...supplierRows,
                        {
                          code: `FOR-${String(db.suppliers.length + supplierRows.length + 1).padStart(3, '0')}`,
                          name: '',
                          cnpj: '',
                          contactName: '',
                          phone: '',
                          email: '',
                          leadTimeDays: 5,
                          category: 'Matéria-Prima',
                        },
                      ])
                    }
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Linha
                  </button>
                )}
              </div>

              {editingSupplier ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Código</label>
                    <input
                      type="text"
                      required
                      value={editingSupplier.code}
                      onChange={(e) =>
                        setEditingSupplier({ ...editingSupplier, code: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Razão Social</label>
                    <input
                      type="text"
                      required
                      value={editingSupplier.name}
                      onChange={(e) =>
                        setEditingSupplier({ ...editingSupplier, name: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={editingSupplier.cnpj}
                      onChange={(e) =>
                        setEditingSupplier({ ...editingSupplier, cnpj: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Representante Comercial</label>
                    <input
                      type="text"
                      value={editingSupplier.contactName}
                      onChange={(e) =>
                        setEditingSupplier({ ...editingSupplier, contactName: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Lead Time Médio (Dias)</label>
                    <input
                      type="number"
                      min={1}
                      value={editingSupplier.leadTimeDays}
                      onChange={(e) =>
                        setEditingSupplier({
                          ...editingSupplier,
                          leadTimeDays: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2 w-24">Código</th>
                        <th className="p-2">Fornecedor</th>
                        <th className="p-2 w-36">CNPJ</th>
                        <th className="p-2">Contato</th>
                        <th className="p-2 w-32">Telefone</th>
                        <th className="p-2 w-28 text-right">Lead Time (dias)</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {supplierRows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-1.5">
                            <input
                              type="text"
                              required
                              value={row.code}
                              onChange={(e) => {
                                const next = [...supplierRows];
                                next[idx] = { ...next[idx], code: e.target.value };
                                setSupplierRows(next);
                              }}
                              className="w-full px-2 py-1 font-mono border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              required
                              placeholder="Razão Social do Fornecedor"
                              value={row.name}
                              onChange={(e) => {
                                const next = [...supplierRows];
                                next[idx] = { ...next[idx], name: e.target.value };
                                setSupplierRows(next);
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.cnpj}
                              onChange={(e) => {
                                const next = [...supplierRows];
                                next[idx] = { ...next[idx], cnpj: e.target.value };
                                setSupplierRows(next);
                              }}
                              className="w-full px-2 py-1 font-mono border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.contactName}
                              onChange={(e) => {
                                const next = [...supplierRows];
                                next[idx] = { ...next[idx], contactName: e.target.value };
                                setSupplierRows(next);
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.phone}
                              onChange={(e) => {
                                const next = [...supplierRows];
                                next[idx] = { ...next[idx], phone: e.target.value };
                                setSupplierRows(next);
                              }}
                              className="w-full px-2 py-1 font-mono border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              min={1}
                              value={row.leadTimeDays}
                              onChange={(e) => {
                                const next = [...supplierRows];
                                next[idx] = {
                                  ...next[idx],
                                  leadTimeDays: Number(e.target.value) || 1,
                                };
                                setSupplierRows(next);
                              }}
                              className="w-full px-2 py-1 font-mono text-right border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            {supplierRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSupplierRows(supplierRows.filter((_, i) => i !== idx))
                                }
                                className="text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md"
                >
                  Salvar Fornecedores
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">CNPJ</th>
                  <th className="py-3 px-4">Contato</th>
                  <th className="py-3 px-4 text-right">Lead Time Entrega</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {db.suppliers
                  .filter(
                    (s) =>
                      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      s.code.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                        {s.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{s.name}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{s.category}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{s.cnpj}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div>{s.contactName}</div>
                        <div className="text-slate-400">{s.phone} · {s.email}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-slate-800">
                        {s.leadTimeDays} dias úteis
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingSupplier(s);
                              setShowSupplierModal(true);
                            }}
                            className="text-slate-500 hover:text-blue-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              onUpdateDb((prev) => ({
                                ...prev,
                                suppliers: prev.suppliers.filter((x) => x.id !== s.id),
                              }))
                            }
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

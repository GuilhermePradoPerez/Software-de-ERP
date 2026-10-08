import React, { useState, useEffect } from 'react';
import {
  DatabaseSchema,
  CustomerOrder,
  OrderItem,
  ProductionOrder,
  ProductionStageLog
} from '../types';
import {
  Plus,
  Play,
  Pause,
  CheckCircle2,
  Printer,
  Clock,
  FileText,
  ArrowRight,
  Trash2,
  X,
  Check,
  AlertCircle,
  ClipboardCheck
} from 'lucide-react';

interface ProducaoModuleProps {
  db: DatabaseSchema;
  onUpdateDb: (updater: (prev: DatabaseSchema) => DatabaseSchema) => void;
  activeSubTab: 'acompanhamento' | 'ordens' | 'pedidos';
  setActiveSubTab: (tab: 'acompanhamento' | 'ordens' | 'pedidos') => void;
  onPrintOP: (op: ProductionOrder) => void;
}

export const ProducaoModule: React.FC<ProducaoModuleProps> = ({
  db,
  onUpdateDb,
  activeSubTab,
  setActiveSubTab,
  onPrintOP,
}) => {
  // Live clock tick every second for active timers
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Customer Order Form State ---
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [newOrderCustomerId, setNewOrderCustomerId] = useState(db.customers[0]?.id || '');
  const [newOrderDeliveryDate, setNewOrderDeliveryDate] = useState('2026-10-22');
  const [newOrderPriority, setNewOrderPriority] = useState<CustomerOrder['priority']>('Normal');
  const [newOrderNotes, setNewOrderNotes] = useState('');
  const [newOrderItems, setNewOrderItems] = useState<OrderItem[]>([
    {
      productId: db.products[0]?.id || '',
      quantity: 20,
      unitPrice: db.products[0]?.sellingPrice || 148,
    },
  ]);

  // --- New Production Order (OP) Form State ---
  const [showOPModal, setShowOPModal] = useState(false);
  const [opOrderId, setOpOrderId] = useState<string>('ESTOQUE');
  const [opProductId, setOpProductId] = useState<string>(db.products[0]?.id || '');
  const [opQuantity, setOpQuantity] = useState<number>(25);
  const [opPriority, setOpPriority] = useState<ProductionOrder['priority']>('Normal');
  const [opDueDate, setOpDueDate] = useState<string>('2026-10-20');
  const [deductMaterialsNow, setDeductMaterialsNow] = useState<boolean>(true);

  // --- Baixa / Concluir OP Modal State ---
  const [closingOP, setClosingOP] = useState<ProductionOrder | null>(null);
  const [closingQtyProduced, setClosingQtyProduced] = useState<number>(0);
  const [closingQtyScrap, setClosingQtyScrap] = useState<number>(0);
  const [closingActualMinutes, setClosingActualMinutes] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>('');

  // --- Apontar Tempo de Processo Modal State ---
  const [loggingTimeOP, setLoggingTimeOP] = useState<ProductionOrder | null>(null);
  const [stageMinutesInput, setStageMinutesInput] = useState<Record<string, number>>({});
  const [stageOperatorInput, setStageOperatorInput] = useState<Record<string, string>>({});

  // Helper: get live elapsed minutes for an OP
  const getLiveElapsedMinutes = (op: ProductionOrder) => {
    if (!op.timerRunning || !op.timerStartedAt) {
      return op.actualTotalMinutes;
    }
    const startMs = new Date(op.timerStartedAt).getTime();
    const diffMinutes = Math.max(0, (nowMs - startMs) / 60000);
    return Math.round((op.actualTotalMinutes + diffMinutes) * 10) / 10;
  };

  const formatTimerClock = (op: ProductionOrder) => {
    if (!op.timerRunning || !op.timerStartedAt) {
      return `${op.actualTotalMinutes} min`;
    }
    const startMs = new Date(op.timerStartedAt).getTime();
    const totalSeconds = Math.max(0, Math.floor(op.actualTotalMinutes * 60 + (nowMs - startMs) / 1000));
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  // Create Customer Order
  const handleCreateCustomerOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = newOrderItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) return;

    const totalValue = validItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const newOrder: CustomerOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `PV-2026-0${90 + db.orders.length + 1}`,
      customerId: newOrderCustomerId,
      orderDate: new Date().toISOString().slice(0, 10),
      deliveryDate: newOrderDeliveryDate,
      priority: newOrderPriority,
      status: 'Pendente',
      items: validItems,
      totalValue,
      notes: newOrderNotes,
      createdBy: db.settings.technicalResponsibleName,
      createdAt: new Date().toISOString(),
    };

    onUpdateDb((prev) => ({
      ...prev,
      orders: [newOrder, ...prev.orders],
    }));

    setShowOrderModal(false);
    setNewOrderNotes('');
  };

  // Issue Production Order (OP) directly from an Order or manually
  const createOPObject = (
    productId: string,
    quantity: number,
    orderId: string,
    priority: ProductionOrder['priority'],
    dueDate: string,
    opIndexOffset: number,
    deductMaterials: boolean
  ): ProductionOrder | null => {
    const product = db.products.find((p) => p.id === productId);
    if (!product) return null;

    const stageLogs: ProductionStageLog[] = product.stages.map((st, idx) => {
      const planned = Math.round(st.setupTimeMinutes + st.unitCycleTimeMinutes * quantity);
      return {
        stageId: st.id,
        stageName: st.stageName,
        workCenterId: st.workCenterId,
        plannedMinutes: planned,
        actualMinutes: 0,
        status: idx === 0 ? 'Pendente' : 'Pendente',
      };
    });

    const plannedTotalMinutes = stageLogs.reduce((acc, s) => acc + s.plannedMinutes, 0);

    return {
      id: `op-${Date.now()}-${opIndexOffset}`,
      opNumber: `OP-2026-${100 + db.productionOrders.length + opIndexOffset + 1}`,
      orderId,
      productId,
      quantityPlanned: quantity,
      quantityProduced: 0,
      quantityScrap: 0,
      priority,
      status: 'Emitida',
      workCenterId: product.stages[0]?.workCenterId || db.capacities[0]?.id || '',
      currentStageIndex: 0,
      stageLogs,
      plannedTotalMinutes,
      actualTotalMinutes: 0,
      timerRunning: false,
      issuedDate: new Date().toISOString().slice(0, 10),
      dueDate,
      technicalResponsible: db.settings.technicalResponsibleName,
      materialsDeducted: deductMaterials,
    };
  };

  const handleEmitManualOP = (e: React.FormEvent) => {
    e.preventDefault();
    const newOP = createOPObject(
      opProductId,
      opQuantity,
      opOrderId,
      opPriority,
      opDueDate,
      0,
      deductMaterialsNow
    );
    if (!newOP) return;

    const product = db.products.find((p) => p.id === opProductId);

    onUpdateDb((prev) => {
      let updatedMaterials = [...prev.rawMaterials];
      if (deductMaterialsNow && product) {
        updatedMaterials = updatedMaterials.map((rm) => {
          const bomItem = product.materials.find((m) => m.rawMaterialId === rm.id);
          if (!bomItem) return rm;
          const totalConsumed =
            bomItem.quantityRequired * (1 + bomItem.wastePercent / 100) * opQuantity;
          return {
            ...rm,
            currentStock: Math.max(0, Math.round((rm.currentStock - totalConsumed) * 100) / 100),
          };
        });
      }

      const updatedOrders = prev.orders.map((ord) =>
        ord.id === opOrderId && ord.status === 'Pendente'
          ? { ...ord, status: 'Planejado' as const }
          : ord
      );

      return {
        ...prev,
        rawMaterials: updatedMaterials,
        orders: updatedOrders,
        productionOrders: [newOP, ...prev.productionOrders],
      };
    });

    setShowOPModal(false);
    setActiveSubTab('ordens');
  };

  // Emit all OPs for a CustomerOrder in 1 click
  const handleEmitOPsFromOrder = (order: CustomerOrder) => {
    const newOPs: ProductionOrder[] = [];
    order.items.forEach((item, idx) => {
      const op = createOPObject(
        item.productId,
        item.quantity,
        order.id,
        order.priority,
        order.deliveryDate,
        idx,
        true
      );
      if (op) newOPs.push(op);
    });

    if (newOPs.length === 0) return;

    onUpdateDb((prev) => {
      let updatedMaterials = [...prev.rawMaterials];
      newOPs.forEach((op) => {
        const product = prev.products.find((p) => p.id === op.productId);
        if (!product) return;
        updatedMaterials = updatedMaterials.map((rm) => {
          const bomItem = product.materials.find((m) => m.rawMaterialId === rm.id);
          if (!bomItem) return rm;
          const consumed =
            bomItem.quantityRequired * (1 + bomItem.wastePercent / 100) * op.quantityPlanned;
          return {
            ...rm,
            currentStock: Math.max(0, Math.round((rm.currentStock - consumed) * 100) / 100),
          };
        });
      });

      return {
        ...prev,
        rawMaterials: updatedMaterials,
        orders: prev.orders.map((o) =>
          o.id === order.id ? { ...o, status: 'Em Produção' as const } : o
        ),
        productionOrders: [...newOPs, ...prev.productionOrders],
      };
    });

    setActiveSubTab('ordens');
  };

  // Start / Pause OP Timer in Real-Time
  const handleToggleOPTimer = (op: ProductionOrder) => {
    onUpdateDb((prev) => ({
      ...prev,
      productionOrders: prev.productionOrders.map((item) => {
        if (item.id !== op.id) return item;

        if (!item.timerRunning) {
          // Starting timer
          const updatedStages = item.stageLogs.map((st, idx) =>
            idx === item.currentStageIndex && st.status === 'Pendente'
              ? { ...st, status: 'Em Execução' as const, startedAt: new Date().toISOString() }
              : st
          );
          return {
            ...item,
            status: 'Em Produção',
            timerRunning: true,
            timerStartedAt: new Date().toISOString(),
            stageLogs: updatedStages,
          };
        } else {
          // Pausing timer and accumulating elapsed minutes
          const startMs = item.timerStartedAt ? new Date(item.timerStartedAt).getTime() : Date.now();
          const elapsedMin = Math.max(1, Math.round((Date.now() - startMs) / 60000));
          const updatedStages = item.stageLogs.map((st, idx) =>
            idx === item.currentStageIndex
              ? { ...st, actualMinutes: st.actualMinutes + elapsedMin }
              : st
          );
          const totalActual = updatedStages.reduce((acc, s) => acc + s.actualMinutes, 0);

          return {
            ...item,
            status: 'Pausada',
            timerRunning: false,
            timerStartedAt: undefined,
            actualTotalMinutes: totalActual,
            stageLogs: updatedStages,
          };
        }
      }),
    }));
  };

  // Advance OP to next stage on Shop Floor
  const handleAdvanceStage = (op: ProductionOrder) => {
    onUpdateDb((prev) => ({
      ...prev,
      productionOrders: prev.productionOrders.map((item) => {
        if (item.id !== op.id) return item;
        const currentIdx = item.currentStageIndex;
        const nextIdx = Math.min(item.stageLogs.length - 1, currentIdx + 1);

        const updatedStages = item.stageLogs.map((st, idx) => {
          if (idx === currentIdx) {
            return {
              ...st,
              status: 'Concluída' as const,
              actualMinutes: st.actualMinutes > 0 ? st.actualMinutes : st.plannedMinutes,
              completedAt: new Date().toISOString(),
            };
          }
          if (idx === nextIdx && currentIdx < item.stageLogs.length - 1) {
            return {
              ...st,
              status: 'Em Execução' as const,
              startedAt: new Date().toISOString(),
            };
          }
          return st;
        });

        const totalActual = updatedStages.reduce((acc, s) => acc + s.actualMinutes, 0);
        const nextWorkCenter = updatedStages[nextIdx]?.workCenterId || item.workCenterId;

        return {
          ...item,
          status: 'Em Produção',
          currentStageIndex: nextIdx,
          workCenterId: nextWorkCenter,
          stageLogs: updatedStages,
          actualTotalMinutes: totalActual,
        };
      }),
    }));
  };

  // Open Modal to Record Detailed Process Time per Stage
  const openLogTimeModal = (op: ProductionOrder) => {
    const minsMap: Record<string, number> = {};
    const opMap: Record<string, string> = {};
    op.stageLogs.forEach((st) => {
      minsMap[st.stageId] = st.actualMinutes || st.plannedMinutes;
      opMap[st.stageId] = st.operatorName || 'Operador Turno A';
    });
    setStageMinutesInput(minsMap);
    setStageOperatorInput(opMap);
    setLoggingTimeOP(op);
  };

  const handleSaveStageTimes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingTimeOP) return;

    onUpdateDb((prev) => ({
      ...prev,
      productionOrders: prev.productionOrders.map((item) => {
        if (item.id !== loggingTimeOP.id) return item;
        const updatedStages = item.stageLogs.map((st) => ({
          ...st,
          actualMinutes: Number(stageMinutesInput[st.stageId]) || 0,
          operatorName: stageOperatorInput[st.stageId] || st.operatorName,
        }));
        const totalActual = updatedStages.reduce((acc, s) => acc + s.actualMinutes, 0);
        return {
          ...item,
          stageLogs: updatedStages,
          actualTotalMinutes: totalActual,
        };
      }),
    }));

    setLoggingTimeOP(null);
  };

  // Open Modal for Baixa de Ordem de Produção (Completion)
  const openBaixaModal = (op: ProductionOrder) => {
    setClosingOP(op);
    setClosingQtyProduced(op.quantityPlanned);
    setClosingQtyScrap(op.quantityScrap || 0);
    const currentActual = getLiveElapsedMinutes(op);
    setClosingActualMinutes(currentActual > 0 ? Math.round(currentActual) : op.plannedTotalMinutes);
    setClosingNotes(
      op.completionNotes ||
        `Ordem de produção finalizada e inspecionada sob responsabilidade técnica de ${db.settings.technicalResponsibleName}.`
    );
  };

  const handleConfirmBaixaOP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingOP) return;

    const product = db.products.find((p) => p.id === closingOP.productId);

    onUpdateDb((prev) => {
      // Deduct raw materials if not yet deducted
      let updatedMaterials = [...prev.rawMaterials];
      if (!closingOP.materialsDeducted && product) {
        updatedMaterials = updatedMaterials.map((rm) => {
          const bomItem = product.materials.find((m) => m.rawMaterialId === rm.id);
          if (!bomItem) return rm;
          const totalConsumed =
            bomItem.quantityRequired *
            (1 + bomItem.wastePercent / 100) *
            (closingQtyProduced + closingQtyScrap);
          return {
            ...rm,
            currentStock: Math.max(0, Math.round((rm.currentStock - totalConsumed) * 100) / 100),
          };
        });
      }

      const updatedOPs = prev.productionOrders.map((item) => {
        if (item.id !== closingOP.id) return item;

        // Distribute actual minutes proportionally if stages weren't individually logged
        const completedStages = item.stageLogs.map((st) => ({
          ...st,
          status: 'Concluída' as const,
          actualMinutes:
            st.actualMinutes > 0
              ? st.actualMinutes
              : Math.round((st.plannedMinutes / Math.max(1, item.plannedTotalMinutes)) * closingActualMinutes),
          completedAt: st.completedAt || new Date().toISOString(),
        }));

        return {
          ...item,
          status: 'Concluída' as const,
          quantityProduced: closingQtyProduced,
          quantityScrap: closingQtyScrap,
          actualTotalMinutes: closingActualMinutes,
          timerRunning: false,
          timerStartedAt: undefined,
          stageLogs: completedStages,
          completedAt: new Date().toISOString(),
          materialsDeducted: true,
          completionNotes: closingNotes,
          technicalResponsible: prev.settings.technicalResponsibleName,
        };
      });

      // Check if linked CustomerOrder has all OPs completed
      const updatedOrders = prev.orders.map((ord) => {
        if (ord.id !== closingOP.orderId) return ord;
        const relatedOPs = updatedOPs.filter((o) => o.orderId === ord.id);
        const allDone = relatedOPs.length > 0 && relatedOPs.every((o) => o.status === 'Concluída');
        return allDone ? { ...ord, status: 'Concluído' as const } : ord;
      });

      return {
        ...prev,
        rawMaterials: updatedMaterials,
        productionOrders: updatedOPs,
        orders: updatedOrders,
      };
    });

    setClosingOP(null);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation & Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('acompanhamento')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'acompanhamento'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Acompanhamento em Tempo Real (Chão de Fábrica)
          </button>
          <button
            onClick={() => setActiveSubTab('ordens')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'ordens'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Ordens de Produção & Baixas ({db.productionOrders.length})
          </button>
          <button
            onClick={() => setActiveSubTab('pedidos')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'pedidos'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Carteira de Pedidos ({db.orders.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOrderModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Novo Pedido de Venda
          </button>
          <button
            onClick={() => setShowOPModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Emitir Ordem de Produção (OP)
          </button>
        </div>
      </div>

      {/* MODAL: Novo Pedido de Venda (com múltiplos produtos) */}
      {showOrderModal && (
        <form
          onSubmit={handleCreateCustomerOrder}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Cadastrar Novo Pedido de Cliente
              </h3>
              <p className="text-xs text-slate-500">
                Inclua múltiplos itens da Ficha Técnica e gere as Ordens de Produção automaticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOrderModal(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Cliente</label>
              <select
                value={newOrderCustomerId}
                onChange={(e) => setNewOrderCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {db.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Data de Entrega</label>
              <input
                type="date"
                required
                value={newOrderDeliveryDate}
                onChange={(e) => setNewOrderDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Prioridade PCP</label>
              <select
                value={newOrderPriority}
                onChange={(e) =>
                  setNewOrderPriority(e.target.value as CustomerOrder['priority'])
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="Baixa">Baixa</option>
                <option value="Normal">Normal</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Itens do Pedido (Múltiplas Entradas)
              </label>
              <button
                type="button"
                onClick={() =>
                  setNewOrderItems([
                    ...newOrderItems,
                    {
                      productId: db.products[0]?.id || '',
                      quantity: 10,
                      unitPrice: db.products[0]?.sellingPrice || 100,
                    },
                  ])
                }
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Produto
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-2">Produto (Ficha Técnica)</th>
                    <th className="p-2 w-32 text-right">Quantidade</th>
                    <th className="p-2 w-36 text-right">Preço Unit. (R$)</th>
                    <th className="p-2 w-36 text-right">Tempo Est. Processo</th>
                    <th className="p-2 w-36 text-right">Subtotal</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {newOrderItems.map((item, idx) => {
                    const prod = db.products.find((p) => p.id === item.productId);
                    const estMinutes = prod
                      ? prod.totalSetupMinutes + prod.totalUnitCycleMinutes * item.quantity
                      : 0;
                    return (
                      <tr key={idx}>
                        <td className="p-2">
                          <select
                            value={item.productId}
                            onChange={(e) => {
                              const selectedProd = db.products.find((p) => p.id === e.target.value);
                              const next = [...newOrderItems];
                              next[idx] = {
                                ...next[idx],
                                productId: e.target.value,
                                unitPrice: selectedProd ? selectedProd.sellingPrice : item.unitPrice,
                              };
                              setNewOrderItems(next);
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                          >
                            {db.products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.code} - {p.name} ({p.totalUnitCycleMinutes} min/un)
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const next = [...newOrderItems];
                              next[idx] = {
                                ...next[idx],
                                quantity: Number(e.target.value) || 1,
                              };
                              setNewOrderItems(next);
                            }}
                            className="w-full px-2 py-1.5 font-mono text-right border border-slate-300 rounded"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const next = [...newOrderItems];
                              next[idx] = {
                                ...next[idx],
                                unitPrice: Number(e.target.value) || 0,
                              };
                              setNewOrderItems(next);
                            }}
                            className="w-full px-2 py-1.5 font-mono text-right border border-slate-300 rounded"
                          />
                        </td>
                        <td className="p-2 text-right font-mono text-slate-600">
                          {Math.round(estMinutes)} min ({(estMinutes / 60).toFixed(1)}h)
                        </td>
                        <td className="p-2 text-right font-mono font-semibold text-slate-900">
                          R$ {(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          {newOrderItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setNewOrderItems(newOrderItems.filter((_, i) => i !== idx))
                              }
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Observações de Entrega / Requisitos do Pedido
            </label>
            <input
              type="text"
              value={newOrderNotes}
              onChange={(e) => setNewOrderNotes(e.target.value)}
              placeholder="Ex: Embalar em palete tratado, enviar laudo dimensional..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowOrderModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Registrar Pedido
            </button>
          </div>
        </form>
      )}

      {/* MODAL: Emitir Ordem de Produção (OP) */}
      {showOPModal && (
        <form
          onSubmit={handleEmitManualOP}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Emissão de Ordem de Produção (OP)
              </h3>
              <p className="text-xs text-slate-500">
                Gera o roteiro de fabricação completo com tempos calculados pela Ficha Técnica e reserva/baixa de matéria-prima.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOPModal(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Produto (Ficha Técnica)
              </label>
              <select
                value={opProductId}
                onChange={(e) => setOpProductId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {db.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pedido Vinculado
              </label>
              <select
                value={opOrderId}
                onChange={(e) => setOpOrderId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="ESTOQUE">Reposição de Estoque Interno</option>
                {db.orders.map((o) => {
                  const cli = db.customers.find((c) => c.id === o.customerId);
                  return (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} ({cli?.name.slice(0, 18)})
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Qtd. a Produzir
              </label>
              <input
                type="number"
                min={1}
                required
                value={opQuantity}
                onChange={(e) => setOpQuantity(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Prazo de Conclusão
              </label>
              <input
                type="date"
                required
                value={opDueDate}
                onChange={(e) => setOpDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
          </div>

          {(() => {
            const selectedProd = db.products.find((p) => p.id === opProductId);
            if (!selectedProd) return null;
            const totalMin =
              selectedProd.totalSetupMinutes + selectedProd.totalUnitCycleMinutes * opQuantity;
            return (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Tempo Total Planejado do Lote:</span>
                  <span className="font-mono text-sm font-semibold text-blue-700">
                    {Math.round(totalMin)} minutos ({(totalMin / 60).toFixed(1)} horas)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Responsável Técnico Emissor:</span>
                  <span className="font-semibold text-slate-900">
                    {db.settings.technicalResponsibleName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="deductMat"
                    type="checkbox"
                    checked={deductMaterialsNow}
                    onChange={(e) => setDeductMaterialsNow(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <label htmlFor="deductMat" className="text-slate-700 font-medium cursor-pointer">
                    Deduzir matéria-prima do almoxarifado na emissão
                  </label>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowOPModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Confirmar Emissão da OP
            </button>
          </div>
        </form>
      )}

      {/* MODAL: Registro de Tempo de Processo por Etapa */}
      {loggingTimeOP && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveStageTimes}
            className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full p-6 space-y-5 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Registro de Tempo de Processo — {loggingTimeOP.opNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Aponte o tempo real gasto em cada etapa produtiva e o operador responsável.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoggingTimeOP(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-2.5">Etapa do Processo</th>
                    <th className="p-2.5 text-right">Previsto (Ficha)</th>
                    <th className="p-2.5 w-32 text-right">Realizado (min)</th>
                    <th className="p-2.5 w-44">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loggingTimeOP.stageLogs.map((st) => (
                    <tr key={st.stageId}>
                      <td className="p-2.5 font-medium text-slate-900">{st.stageName}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {st.plannedMinutes} min
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min={0}
                          value={stageMinutesInput[st.stageId] ?? 0}
                          onChange={(e) =>
                            setStageMinutesInput({
                              ...stageMinutesInput,
                              [st.stageId]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 font-mono text-right border border-slate-300 rounded"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={stageOperatorInput[st.stageId] ?? ''}
                          onChange={(e) =>
                            setStageOperatorInput({
                              ...stageOperatorInput,
                              [st.stageId]: e.target.value,
                            })
                          }
                          placeholder="Nome do operador"
                          className="w-full px-2 py-1 border border-slate-300 rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600 pt-1">
              <span>Responsável Técnico: {db.settings.technicalResponsibleName}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLoggingTimeOP(null)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Salvar Apontamento de Tempos
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Dar Baixa / Concluir Ordem de Produção */}
      {closingOP && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmBaixaOP}
            className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 space-y-4 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Baixa de Ordem de Produção — {closingOP.opNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Registre a quantidade aprovada, refugo e tempo total efetivo de processo para encerrar a OP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClosingOP(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Qtd. Boa Produzida
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={closingQtyProduced}
                  onChange={(e) => setClosingQtyProduced(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Qtd. Refugo / Perda
                </label>
                <input
                  type="number"
                  min={0}
                  value={closingQtyScrap}
                  onChange={(e) => setClosingQtyScrap(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tempo Real Total (min)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={closingActualMinutes}
                  onChange={(e) => setClosingActualMinutes(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Laudo de Encerramento e Qualidade
              </label>
              <textarea
                rows={3}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-600 flex justify-between">
              <span>Tempo Planejado: {closingOP.plannedTotalMinutes} min</span>
              <span>
                Eficiência da OP:{' '}
                <strong className="font-mono text-slate-900">
                  {Math.round(
                    (closingOP.plannedTotalMinutes / Math.max(1, closingActualMinutes)) * 100
                  )}
                  %
                </strong>
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClosingOP(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                <Check className="w-4 h-4" />
                Confirmar Baixa de Produção
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 1. ACOMPANHAMENTO EM TEMPO REAL (CHÃO DE FÁBRICA) */}
      {activeSubTab === 'acompanhamento' && (
        <div className="space-y-6">
          {/* Painel de Carga de Centros de Trabalho em Tempo Real */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {db.capacities.map((cap) => {
              const activeOPsInCenter = db.productionOrders.filter(
                (op) =>
                  (op.status === 'Em Produção' || op.status === 'Emitida' || op.status === 'Pausada') &&
                  op.workCenterId === cap.id
              );
              const runningNow = activeOPsInCenter.some((op) => op.timerRunning);

              return (
                <div
                  key={cap.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>{cap.code} · {cap.sector}</span>
                      <span
                        className={
                          runningNow
                            ? 'text-emerald-700 font-semibold'
                            : 'text-slate-500'
                        }
                      >
                        {runningNow ? 'Em Operação' : 'Disponível'}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 mt-1">{cap.name}</h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">OPs na fila/execução:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {activeOPsInCenter.length} OPs · Cap. {cap.availableMinutesPerDay} min/dia
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lista de OPs Ativas em Tempo Real */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Monitoramento de Ordens em Execução e Fila no Chão de Fábrica
              </h3>
              <span className="text-xs text-slate-500">
                Responsável Técnico pelo Turno: <strong className="text-slate-800">{db.settings.technicalResponsibleName}</strong>
              </span>
            </div>

            {db.productionOrders.filter((op) => op.status !== 'Concluída' && op.status !== 'Cancelada')
              .length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  Nenhuma Ordem de Produção ativa no momento no chão de fábrica.
                </p>
                <button
                  onClick={() => setShowOPModal(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
                >
                  Emitir Nova Ordem de Produção
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {db.productionOrders
                  .filter((op) => op.status !== 'Concluída' && op.status !== 'Cancelada')
                  .map((op) => {
                    const product = db.products.find((p) => p.id === op.productId);
                    const order = db.orders.find((o) => o.id === op.orderId);
                    const customer = order
                      ? db.customers.find((c) => c.id === order.customerId)
                      : null;
                    const currentWorkCenter = db.capacities.find((c) => c.id === op.workCenterId);
                    const liveMinutes = getLiveElapsedMinutes(op);
                    const progressPct = Math.min(
                      100,
                      Math.round((liveMinutes / Math.max(1, op.plannedTotalMinutes)) * 100)
                    );

                    return (
                      <div
                        key={op.id}
                        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                              <span className="font-bold text-slate-900 text-sm">{op.opNumber}</span>
                              <span>·</span>
                              <span
                                className={
                                  op.status === 'Em Produção'
                                    ? 'text-blue-700 font-semibold'
                                    : op.status === 'Pausada'
                                    ? 'text-amber-700 font-semibold'
                                    : 'text-slate-600'
                                }
                              >
                                Status: {op.status}
                              </span>
                              <span>·</span>
                              <span>Prioridade {op.priority}</span>
                              <span>·</span>
                              <span>
                                Origem: {order ? `${order.orderNumber} (${customer?.name})` : 'Estoque'}
                              </span>
                              <span>·</span>
                              <span>Entrega: {op.dueDate}</span>
                            </div>
                            <h4 className="text-base font-semibold text-slate-900 mt-1">
                              {product?.code} — {product?.name} ({op.quantityPlanned} {product?.unit})
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Centro Atual: <strong>{currentWorkCenter?.code} - {currentWorkCenter?.name}</strong> · Resp. Técnico: {op.technicalResponsible}
                            </p>
                          </div>

                          {/* Cronômetro e Controles Rápidos */}
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg text-right font-mono">
                              <div className="text-[10px] text-slate-400">
                                TEMPO DE PROCESSO ({op.plannedTotalMinutes}m prev.)
                              </div>
                              <div className="text-sm font-semibold tracking-tight flex items-center justify-end gap-1.5">
                                {op.timerRunning && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                )}
                                {formatTimerClock(op)}
                              </div>
                            </div>

                            <button
                              onClick={() => handleToggleOPTimer(op)}
                              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                                op.timerRunning
                                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {op.timerRunning ? (
                                <>
                                  <Pause className="w-3.5 h-3.5" /> Pausar Cronômetro
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5" /> Iniciar / Retomar
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => openLogTimeModal(op)}
                              className="px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                            >
                              Apontar Tempos
                            </button>

                            <button
                              onClick={() => openBaixaModal(op)}
                              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 whitespace-nowrap"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Dar Baixa (Concluir OP)
                            </button>

                            <button
                              onClick={() => onPrintOP(op)}
                              className="p-2 text-slate-500 hover:text-slate-900 border border-slate-300 rounded-lg"
                              title="Imprimir Ordem de Produção"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Barra de Progresso de Etapas */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>
                              Avanço do Roteiro Produtivo (Etapa {op.currentStageIndex + 1} de{' '}
                              {op.stageLogs.length})
                            </span>
                            <span className="font-mono font-semibold">{progressPct}% do tempo padrão</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
                            {op.stageLogs.map((st, idx) => {
                              const wc = db.capacities.find((c) => c.id === st.workCenterId);
                              const isCurrent = idx === op.currentStageIndex;
                              return (
                                <div
                                  key={st.stageId}
                                  className={`p-3 rounded-md border text-xs flex flex-col justify-between ${
                                    st.status === 'Concluída'
                                      ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                                      : isCurrent
                                      ? 'bg-blue-50/60 border-blue-300 text-slate-900'
                                      : 'bg-slate-50 border-slate-200 text-slate-500'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between font-mono text-[11px]">
                                      <span className="font-semibold">ETAPA {idx + 1}</span>
                                      <span>{st.status}</span>
                                    </div>
                                    <div className="font-semibold text-slate-900 mt-1">
                                      {st.stageName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      {wc?.code} - {wc?.name}
                                    </div>
                                  </div>

                                  <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between font-mono">
                                    <span>
                                      {st.actualMinutes}m / {st.plannedMinutes}m
                                    </span>
                                    {isCurrent && st.status !== 'Concluída' && (
                                      <button
                                        onClick={() => handleAdvanceStage(op)}
                                        className="text-blue-700 hover:underline font-sans font-semibold flex items-center gap-0.5"
                                      >
                                        Concluir Etapa <ArrowRight className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. TODAS AS ORDENS DE PRODUÇÃO & BAIXAS */}
      {activeSubTab === 'ordens' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Nº OP</th>
                <th className="py-3 px-4">Produto / Ficha Técnica</th>
                <th className="py-3 px-4">Pedido Origem</th>
                <th className="py-3 px-4 text-right">Qtd. Planejada / Prod.</th>
                <th className="py-3 px-4 text-right">Tempo Prev. / Real</th>
                <th className="py-3 px-4">Prazo</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Resp. Técnico</th>
                <th className="py-3 px-4 text-right">Ações e Impressão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {db.productionOrders.map((op) => {
                const prod = db.products.find((p) => p.id === op.productId);
                const ord = db.orders.find((o) => o.id === op.orderId);
                return (
                  <tr key={op.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                      {op.opNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{prod?.name}</div>
                      <div className="text-xs font-mono text-slate-500">{prod?.code}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {ord ? ord.orderNumber : 'ESTOQUE'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs">
                      <span className="font-semibold text-slate-900">{op.quantityProduced}</span> /{' '}
                      {op.quantityPlanned} {prod?.unit}
                      {op.quantityScrap > 0 && (
                        <span className="text-red-600 ml-1">(-{op.quantityScrap} ref.)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs">
                      {op.plannedTotalMinutes}m /{' '}
                      <span className="font-semibold text-blue-700">
                        {getLiveElapsedMinutes(op)}m
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{op.dueDate}</td>
                    <td className="py-3 px-4 text-xs font-semibold">
                      <span
                        className={
                          op.status === 'Concluída'
                            ? 'text-emerald-700'
                            : op.status === 'Em Produção'
                            ? 'text-blue-700'
                            : op.status === 'Pausada'
                            ? 'text-amber-700'
                            : 'text-slate-600'
                        }
                      >
                        {op.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {op.technicalResponsible}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {op.status !== 'Concluída' && (
                          <>
                            <button
                              onClick={() => openLogTimeModal(op)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-100"
                            >
                              Tempos
                            </button>
                            <button
                              onClick={() => openBaixaModal(op)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700"
                            >
                              Dar Baixa
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => onPrintOP(op)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded"
                          title="Visualizar e Imprimir Ordem de Produção"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir OP
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. CARTEIRA DE PEDIDOS DE CLIENTES */}
      {activeSubTab === 'pedidos' && (
        <div className="space-y-4">
          {db.orders.map((order) => {
            const customer = db.customers.find((c) => c.id === order.customerId);
            const linkedOPs = db.productionOrders.filter((op) => op.orderId === order.id);

            return (
              <div
                key={order.id}
                className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                      <span className="font-bold text-slate-900 text-sm">{order.orderNumber}</span>
                      <span>·</span>
                      <span>Emissão: {order.orderDate}</span>
                      <span>·</span>
                      <span>Entrega: {order.deliveryDate}</span>
                      <span>·</span>
                      <span>Prioridade: {order.priority}</span>
                      <span>·</span>
                      <span
                        className={
                          order.status === 'Concluído'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-blue-700 font-semibold'
                        }
                      >
                        Status: {order.status}
                      </span>
                    </div>
                    <h4 className="text-base font-semibold text-slate-900 mt-1">
                      {customer?.code} — {customer?.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Valor Total do Pedido</div>
                      <div className="text-sm font-mono font-semibold text-slate-900">
                        R$ {order.totalValue.toFixed(2)}
                      </div>
                    </div>

                    {linkedOPs.length === 0 ? (
                      <button
                        onClick={() => handleEmitOPsFromOrder(order)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                        Gerar Ordens de Produção (OPs)
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-emerald-700 font-semibold">
                        {linkedOPs.length} OP(s) Emitida(s)
                      </span>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2 px-3">Item / Produto</th>
                        <th className="py-2 px-3 text-right">Qtd. Pedida</th>
                        <th className="py-2 px-3 text-right">Tempo Ciclo Unit.</th>
                        <th className="py-2 px-3 text-right">Carga Total Estimada</th>
                        <th className="py-2 px-3 text-right">Preço Unit.</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.items.map((item, i) => {
                        const prod = db.products.find((p) => p.id === item.productId);
                        const totalProcessMin = prod
                          ? prod.totalSetupMinutes + prod.totalUnitCycleMinutes * item.quantity
                          : 0;
                        return (
                          <tr key={i}>
                            <td className="py-2 px-3 font-medium text-slate-900">
                              <span className="font-mono text-slate-500 mr-1.5">{prod?.code}</span>
                              {prod?.name}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {item.quantity} {prod?.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {prod?.totalUnitCycleMinutes.toFixed(1)} min
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-blue-700 font-medium">
                              {Math.round(totalProcessMin)} min
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              R$ {item.unitPrice.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">
                              R$ {(item.quantity * item.unitPrice).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {order.notes && (
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>Obs: {order.notes}</span>
                    <span>Resp. Técnico: {order.createdBy}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

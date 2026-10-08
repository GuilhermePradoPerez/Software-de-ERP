import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseSchema, ProductionOrder } from './types';
import { CadastrosModule } from './components/CadastrosModule';
import { ProducaoModule } from './components/ProducaoModule';
import { RelatoriosModule } from './components/RelatoriosModule';
import {
  LayoutDashboard,
  Layers,
  Factory,
  FileBarChart,
  UserCheck,
  Printer,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  X,
  Check
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'manufaturapro_erp_db_v1';

export default function App() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'sincronizado' | 'salvando'>('sincronizado');

  // Navigation State
  const [mainSection, setMainSection] = useState<'painel' | 'cadastros' | 'producao' | 'relatorios'>('painel');
  const [cadastrosTab, setCadastrosTab] = useState<'fichas' | 'materia-prima' | 'clientes' | 'fornecedores' | 'capacidade'>('fichas');
  const [producaoTab, setProducaoTab] = useState<'acompanhamento' | 'ordens' | 'pedidos'>('acompanhamento');
  const [selectedOPForPrint, setSelectedOPForPrint] = useState<ProductionOrder | null>(null);

  // Technical Responsible Modal State
  const [showTechModal, setShowTechModal] = useState(false);
  const [techName, setTechName] = useState('');
  const [techRole, setTechRole] = useState('');
  const [techReg, setTechReg] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Load initial database from backend API (with localStorage backup)
  useEffect(() => {
    async function loadDatabase() {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data: DatabaseSchema = await res.json();
          setDb(data);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Fallback para cache local:', err);
      }

      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          setDb(JSON.parse(cached));
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    }
    loadDatabase();
  }, []);

  // Persist changes to Backend API + LocalStorage
  const handleUpdateDb = useCallback((updater: (prev: DatabaseSchema) => DatabaseSchema) => {
    setDb((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      setSyncStatus('salvando');
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
        .then(() => setSyncStatus('sincronizado'))
        .catch(() => setSyncStatus('sincronizado'));
      return next;
    });
  }, []);

  const handleOpenPrintOP = (op: ProductionOrder) => {
    setSelectedOPForPrint(op);
    setMainSection('relatorios');
  };

  const openTechSettings = () => {
    if (!db) return;
    setTechName(db.settings.technicalResponsibleName);
    setTechRole(db.settings.technicalResponsibleRole);
    setTechReg(db.settings.technicalResponsibleRegistration);
    setCompanyName(db.settings.companyName);
    setShowTechModal(true);
  };

  const handleSaveTechSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techName.trim()) return;
    handleUpdateDb((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        technicalResponsibleName: techName.trim(),
        technicalResponsibleRole: techRole.trim(),
        technicalResponsibleRegistration: techReg.trim(),
        companyName: companyName.trim(),
      },
    }));
    setShowTechModal(false);
  };

  if (loading || !db) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-sm w-full space-y-3 text-center">
          <div className="text-sm font-semibold text-slate-900">
            Carregando Sistema ManufaturaPro PCP & ERP...
          </div>
          <div className="text-xs text-slate-500">
            Sincronizando fichas técnicas, estoques e ordens de produção.
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Metrics
  const activeOPs = db.productionOrders.filter(
    (op) => op.status === 'Em Produção' || op.status === 'Emitida' || op.status === 'Pausada'
  );
  const completedOPs = db.productionOrders.filter((op) => op.status === 'Concluída');
  const lowStockMaterials = db.rawMaterials.filter((rm) => rm.currentStock <= rm.minStock);
  const totalDailyCapacityMin = db.capacities.reduce(
    (acc, c) => acc + c.availableMinutesPerDay,
    0
  );
  const activeLoadMin = activeOPs.reduce(
    (acc, op) => acc + Math.max(0, op.plannedTotalMinutes - op.actualTotalMinutes),
    0
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones (Brand | 4 Nav Links | Primary Action) */}
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#painel"
          onClick={(e) => {
            e.preventDefault();
            setMainSection('painel');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
        >
          ManufaturaPro ERP
        </a>

        {/* Zone 2: 4 clean navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
          <button
            onClick={() => setMainSection('painel')}
            className={`py-1 transition-colors whitespace-nowrap ${
              mainSection === 'painel'
                ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                : 'hover:text-slate-900'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setMainSection('cadastros')}
            className={`py-1 transition-colors whitespace-nowrap ${
              mainSection === 'cadastros'
                ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                : 'hover:text-slate-900'
            }`}
          >
            Cadastros & Engenharia
          </button>
          <button
            onClick={() => setMainSection('producao')}
            className={`py-1 transition-colors whitespace-nowrap ${
              mainSection === 'producao'
                ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                : 'hover:text-slate-900'
            }`}
          >
            Gestão de Produção
          </button>
          <button
            onClick={() => setMainSection('relatorios')}
            className={`py-1 transition-colors whitespace-nowrap ${
              mainSection === 'relatorios'
                ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                : 'hover:text-slate-900'
            }`}
          >
            Relatórios & Impressão
          </button>
        </nav>

        {/* Zone 3: Technical Responsible Identification & Quick Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={openTechSettings}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            title="Clique para editar os dados do Responsável Técnico exibido em todas as telas e documentos"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate max-w-[220px]">
              Resp. Técnico: <strong>{db.settings.technicalResponsibleName}</strong>
            </span>
          </button>
        </div>
      </header>

      {/* Sub-header Banner: Technical Responsibility & Persistence Context */}
      <div className="no-print bg-slate-900 text-slate-200 px-6 py-2.5 text-xs border-b border-slate-800">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{db.settings.companyName}</span>
            <span className="text-slate-500">·</span>
            <span>
              Responsável Técnico Oficial:{' '}
              <strong className="text-white">{db.settings.technicalResponsibleName}</strong> (
              {db.settings.technicalResponsibleRegistration})
            </span>
            <span className="text-slate-500">·</span>
            <button
              onClick={openTechSettings}
              className="text-blue-400 hover:underline font-medium"
            >
              Alterar Responsável
            </button>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Banco de Dados Persistente ({syncStatus === 'salvando' ? 'Gravando alterações...' : 'Sincronizado'})
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">
        {/* PAINEL EXECUTIVO (VISÃO GERAL E FLUXO RÁPIDO) */}
        {mainSection === 'painel' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  PLANEJAMENTO E CONTROLE DA PRODUÇÃO (PCP)
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mt-1">
                  Painel Integrado de Manufatura e Engenharia
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Acompanhe a capacidade instalada, ordens em fabricação em tempo real, estoques de matéria-prima e carteira de pedidos.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setCadastrosTab('fichas');
                    setMainSection('cadastros');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Ver Fichas Técnicas
                </button>
                <button
                  onClick={() => {
                    setProducaoTab('acompanhamento');
                    setMainSection('producao');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Factory className="w-4 h-4" />
                  Ir para Chão de Fábrica (Tempo Real)
                </button>
              </div>
            </div>

            {/* Key Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="text-xs font-medium text-slate-500">
                  Ordens de Produção Ativas
                </div>
                <div className="text-3xl font-mono font-bold text-slate-900 mt-2">
                  {activeOPs.length} OPs
                </div>
                <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
                  <span>Concluídas/Baixadas: {completedOPs.length}</span>
                  <button
                    onClick={() => {
                      setProducaoTab('ordens');
                      setMainSection('producao');
                    }}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Ver OPs →
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="text-xs font-medium text-slate-500">
                  Carga de Máquina vs. Capacidade Diária
                </div>
                <div className="text-3xl font-mono font-bold text-blue-700 mt-2">
                  {activeLoadMin} / {totalDailyCapacityMin} min
                </div>
                <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
                  <span>
                    Ocupação: {Math.round((activeLoadMin / Math.max(1, totalDailyCapacityMin)) * 100)}% de 1 dia
                  </span>
                  <button
                    onClick={() => {
                      setCadastrosTab('capacidade');
                      setMainSection('cadastros');
                    }}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Centros →
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="text-xs font-medium text-slate-500">
                  Fichas Técnicas & Tempos de Processo
                </div>
                <div className="text-3xl font-mono font-bold text-slate-900 mt-2">
                  {db.products.length} Produtos
                </div>
                <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
                  <span>Com roteiro e BOM completos</span>
                  <button
                    onClick={() => {
                      setCadastrosTab('fichas');
                      setMainSection('cadastros');
                    }}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Engenharia →
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="text-xs font-medium text-slate-500">
                  Matéria-Prima & Suprimentos
                </div>
                <div className="text-3xl font-mono font-bold text-slate-900 mt-2">
                  {db.rawMaterials.length} Insumos
                </div>
                <div className="text-xs mt-2 flex items-center justify-between">
                  {lowStockMaterials.length > 0 ? (
                    <span className="text-red-600 font-semibold">
                      {lowStockMaterials.length} item(ns) abaixo do mínimo
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium">
                      Estoques acima do mínimo
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setCadastrosTab('materia-prima');
                      setMainSection('cadastros');
                    }}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Almoxarifado →
                  </button>
                </div>
              </div>
            </div>

            {/* Fluxo de Trabalho Intuitivo (Navegação Rápida entre Módulos) */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Fluxo Operacional Integrado (Acesso Rápido aos Módulos)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Navegue diretamente para qualquer etapa do ciclo de planejamento e controle da produção.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <button
                  onClick={() => {
                    setCadastrosTab('materia-prima');
                    setMainSection('cadastros');
                  }}
                  className="text-left p-4 rounded-lg border border-slate-200 hover:border-blue-600 hover:bg-blue-50/30 transition-colors group"
                >
                  <div className="text-xs font-mono text-slate-500">01. SUPRIMENTOS</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1 group-hover:text-blue-700">
                    Matéria-Prima & Fornecedores
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {db.rawMaterials.length} matérias-primas · {db.suppliers.length} fornecedores
                  </div>
                </button>

                <button
                  onClick={() => {
                    setCadastrosTab('fichas');
                    setMainSection('cadastros');
                  }}
                  className="text-left p-4 rounded-lg border border-slate-200 hover:border-blue-600 hover:bg-blue-50/30 transition-colors group"
                >
                  <div className="text-xs font-mono text-slate-500">02. ENGENHARIA</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1 group-hover:text-blue-700">
                    Ficha Técnica & Tempos
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Estrutura BOM e tempo de ciclo por etapa
                  </div>
                </button>

                <button
                  onClick={() => {
                    setCadastrosTab('capacidade');
                    setMainSection('cadastros');
                  }}
                  className="text-left p-4 rounded-lg border border-slate-200 hover:border-blue-600 hover:bg-blue-50/30 transition-colors group"
                >
                  <div className="text-xs font-mono text-slate-500">03. CAPACIDADE</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1 group-hover:text-blue-700">
                    Centros de Trabalho & Clientes
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {db.capacities.length} centros · {db.customers.length} clientes ativos
                  </div>
                </button>

                <button
                  onClick={() => {
                    setProducaoTab('acompanhamento');
                    setMainSection('producao');
                  }}
                  className="text-left p-4 rounded-lg border border-slate-200 hover:border-blue-600 hover:bg-blue-50/30 transition-colors group"
                >
                  <div className="text-xs font-mono text-slate-500">04. CHÃO DE FÁBRICA</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1 group-hover:text-blue-700">
                    Pedidos, OPs & Baixas
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Cronômetro em tempo real e baixa de lotes
                  </div>
                </button>

                <button
                  onClick={() => setMainSection('relatorios')}
                  className="text-left p-4 rounded-lg border border-slate-200 hover:border-blue-600 hover:bg-blue-50/30 transition-colors group"
                >
                  <div className="text-xs font-mono text-slate-500">05. DOCUMENTAÇÃO</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1 group-hover:text-blue-700">
                    Relatórios & Impressão OP
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Assinatura de {db.settings.technicalResponsibleName}
                  </div>
                </button>
              </div>
            </div>

            {/* Resumo das Ordens de Produção em Tempo Real + Fichas Técnicas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Ordens de Produção Recentes (Acompanhamento e Impressão)
                  </h3>
                  <button
                    onClick={() => {
                      setProducaoTab('acompanhamento');
                      setMainSection('producao');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Abrir Painel de Controle →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 pr-3">OP</th>
                        <th className="py-2 px-3">Produto</th>
                        <th className="py-2 px-3 text-right">Qtd.</th>
                        <th className="py-2 px-3 text-right">Tempo Prev./Real</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 pl-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {db.productionOrders.slice(0, 5).map((op) => {
                        const prod = db.products.find((p) => p.id === op.productId);
                        return (
                          <tr key={op.id}>
                            <td className="py-2.5 pr-3 font-mono font-bold text-slate-900">
                              {op.opNumber}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">
                              {prod?.name}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              {op.quantityPlanned} {prod?.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              {op.plannedTotalMinutes}m /{' '}
                              <span className="font-semibold text-blue-700">
                                {op.actualTotalMinutes}m
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold">
                              <span
                                className={
                                  op.status === 'Concluída'
                                    ? 'text-emerald-700'
                                    : op.status === 'Em Produção'
                                    ? 'text-blue-700'
                                    : 'text-slate-600'
                                }
                              >
                                {op.status}
                              </span>
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <button
                                onClick={() => handleOpenPrintOP(op)}
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                              >
                                <Printer className="w-3.5 h-3.5" /> Imprimir OP
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Tempos de Processo por Produto
                  </h3>
                  <button
                    onClick={() => {
                      setCadastrosTab('fichas');
                      setMainSection('cadastros');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Editar Fichas →
                  </button>
                </div>

                <div className="space-y-3">
                  {db.products.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-md bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-slate-500">
                        <span className="font-semibold text-slate-800">{p.code}</span>
                        <span>{p.stages.length} etapas</span>
                      </div>
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="flex items-center justify-between pt-1 text-slate-600 font-mono">
                        <span>Setup: {p.totalSetupMinutes} min</span>
                        <span className="font-bold text-blue-700">
                          Ciclo: {p.totalUnitCycleMinutes.toFixed(1)} min/{p.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MÓDULO DE CADASTROS */}
        {mainSection === 'cadastros' && (
          <CadastrosModule
            db={db}
            onUpdateDb={handleUpdateDb}
            activeSubTab={cadastrosTab}
            setActiveSubTab={setCadastrosTab}
          />
        )}

        {/* MÓDULO DE GESTÃO DE PRODUÇÃO */}
        {mainSection === 'producao' && (
          <ProducaoModule
            db={db}
            onUpdateDb={handleUpdateDb}
            activeSubTab={producaoTab}
            setActiveSubTab={setProducaoTab}
            onPrintOP={handleOpenPrintOP}
          />
        )}

        {/* MÓDULO DE RELATÓRIOS E IMPRESSÃO */}
        {mainSection === 'relatorios' && (
          <RelatoriosModule
            db={db}
            selectedOPForPrint={selectedOPForPrint}
            setSelectedOPForPrint={setSelectedOPForPrint}
          />
        )}
      </main>

      {/* Footer Oficial com Responsável Técnico */}
      <footer className="no-print bg-white border-t border-slate-200 px-6 py-4 mt-12 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>{db.settings.companyName}</strong> — Sistema de Gestão e Planejamento da Produção
          </div>
          <div>
            Responsável Técnico pelos Registros e Emissões:{' '}
            <strong className="text-slate-800">{db.settings.technicalResponsibleName}</strong> ·{' '}
            <span className="font-mono">{db.settings.technicalResponsibleRegistration}</span>
          </div>
        </div>
      </footer>

      {/* MODAL: Configurar Responsável Técnico e Empresa */}
      {showTechModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTechSettings}
            className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Identificação do Responsável Técnico
                </h3>
                <p className="text-xs text-slate-500">
                  Este nome e registro constarão nas telas, fichas técnicas, relatórios e ordens de produção impressas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTechModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome do Usuário / Responsável Técnico
                </label>
                <input
                  type="text"
                  required
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cargo / Função Técnica
                </label>
                <input
                  type="text"
                  required
                  value={techRole}
                  onChange={(e) => setTechRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Registro Profissional (CREA / CRT / Matrícula)
                </label>
                <input
                  type="text"
                  required
                  value={techReg}
                  onChange={(e) => setTechReg(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Razão Social da Empresa
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTechModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Check className="w-4 h-4" />
                Salvar Identificação
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

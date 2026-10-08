import React, { useState } from 'react';
import { DatabaseSchema, ProductionOrder } from '../types';
import {
  Printer,
  FileBarChart,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface RelatoriosModuleProps {
  db: DatabaseSchema;
  selectedOPForPrint: ProductionOrder | null;
  setSelectedOPForPrint: (op: ProductionOrder | null) => void;
}

export const RelatoriosModule: React.FC<RelatoriosModuleProps> = ({
  db,
  selectedOPForPrint,
  setSelectedOPForPrint,
}) => {
  const [reportFilterStatus, setReportFilterStatus] = useState<string>('TODAS');
  const [viewMode, setViewMode] = useState<'relatorio-geral' | 'ordem-impressao'>(
    selectedOPForPrint ? 'ordem-impressao' : 'relatorio-geral'
  );

  // Sync when selectedOPForPrint is passed from external module
  React.useEffect(() => {
    if (selectedOPForPrint) {
      setViewMode('ordem-impressao');
    }
  }, [selectedOPForPrint]);

  const activeOP = selectedOPForPrint || db.productionOrders[0] || null;

  const filteredOPs = db.productionOrders.filter((op) =>
    reportFilterStatus === 'TODAS' ? true : op.status === reportFilterStatus
  );

  // Aggregate KPIs for Production Report
  const totalPlannedMinutes = filteredOPs.reduce((acc, op) => acc + op.plannedTotalMinutes, 0);
  const totalActualMinutes = filteredOPs.reduce((acc, op) => acc + op.actualTotalMinutes, 0);
  const totalUnitsPlanned = filteredOPs.reduce((acc, op) => acc + op.quantityPlanned, 0);
  const totalUnitsProduced = filteredOPs.reduce((acc, op) => acc + op.quantityProduced, 0);
  const totalScrap = filteredOPs.reduce((acc, op) => acc + op.quantityScrap, 0);

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            onClick={() => setViewMode('relatorio-geral')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'relatorio-geral'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileBarChart className="w-3.5 h-3.5" />
            Relatório Técnico de Acompanhamento da Produção
          </button>
          <button
            onClick={() => {
              if (!selectedOPForPrint && db.productionOrders.length > 0) {
                setSelectedOPForPrint(db.productionOrders[0]);
              }
              setViewMode('ordem-impressao');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'ordem-impressao'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Folha de Ordem de Produção (Emissão / Impressão)
          </button>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'ordem-impressao' && (
            <select
              value={activeOP?.id || ''}
              onChange={(e) => {
                const found = db.productionOrders.find((x) => x.id === e.target.value) || null;
                setSelectedOPForPrint(found);
              }}
              className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
            >
              {db.productionOrders.map((op) => {
                const prod = db.products.find((p) => p.id === op.productId);
                return (
                  <option key={op.id} value={op.id}>
                    {op.opNumber} — {prod?.code} ({op.status})
                  </option>
                );
              })}
            </select>
          )}

          {viewMode === 'relatorio-geral' && (
            <select
              value={reportFilterStatus}
              onChange={(e) => setReportFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
            >
              <option value="TODAS">Todas as OPs ({db.productionOrders.length})</option>
              <option value="Em Produção">Em Produção</option>
              <option value="Emitida">Emitidas</option>
              <option value="Concluída">Concluídas (Baixadas)</option>
            </select>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            Imprimir Documento / Salvar PDF
          </button>
        </div>
      </div>

      {/* MODO 1: RELATÓRIO DE ACOMPANHAMENTO DA PRODUÇÃO */}
      {viewMode === 'relatorio-geral' && (
        <div className="print-container bg-white border border-slate-200 rounded-lg p-8 space-y-6">
          {/* Cabeçalho Oficial do Relatório */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
            <div>
              <div className="text-xs font-mono text-slate-500">
                DOCUMENTO TÉCNICO DE PLANEJamento E CONTROLE DA PRODUÇÃO (PCP)
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                RELATÓRIO DE ACOMPANHAMENTO DE PRODUÇÃO E TEMPOS DE PROCESSO
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {db.settings.companyName} · CNPJ: {db.settings.companyDocument}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-right text-xs space-y-1 shrink-0">
              <div className="text-slate-500">Responsável Técnico Oficial:</div>
              <div className="font-bold text-slate-900 text-sm">
                {db.settings.technicalResponsibleName}
              </div>
              <div className="text-slate-600">{db.settings.technicalResponsibleRole}</div>
              <div className="font-mono text-slate-500">
                Registro: {db.settings.technicalResponsibleRegistration}
              </div>
              <div className="font-mono text-[11px] text-slate-400 pt-1">
                Emissão: {new Date().toLocaleDateString('pt-BR')} às{' '}
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Indicadores Consolidados */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="text-xs text-slate-500">Ordens Analisadas</div>
              <div className="text-2xl font-mono font-bold text-slate-900 mt-1">
                {filteredOPs.length} OPs
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Filtro: {reportFilterStatus}
              </div>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="text-xs text-slate-500">Volume Produzido / Planejado</div>
              <div className="text-2xl font-mono font-bold text-slate-900 mt-1">
                {totalUnitsProduced} / {totalUnitsPlanned} un
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Refugo acumulado: {totalScrap} un
              </div>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="text-xs text-slate-500">Tempo Padrão Planejado</div>
              <div className="text-2xl font-mono font-bold text-slate-900 mt-1">
                {totalPlannedMinutes} min
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Equivalente a {(totalPlannedMinutes / 60).toFixed(1)} horas
              </div>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="text-xs text-slate-500">Tempo Real Apontado</div>
              <div className="text-2xl font-mono font-bold text-blue-700 mt-1">
                {totalActualMinutes} min
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Equivalente a {(totalActualMinutes / 60).toFixed(1)} horas
              </div>
            </div>
          </div>

          {/* Tabela Analítica de Ordens de Produção e Tempos */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900">
              1. Demonstrativo Analítico de Ordens de Produção e Tempos por Produto
            </h3>
            <div className="border border-slate-300 rounded-md overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-700">
                    <th className="py-2.5 px-3">OP</th>
                    <th className="py-2.5 px-3">Produto (Ficha Técnica)</th>
                    <th className="py-2.5 px-3">Pedido / Cliente</th>
                    <th className="py-2.5 px-3 text-right">Qtd. Plan./Real</th>
                    <th className="py-2.5 px-3 text-right">Ciclo Ficha (un)</th>
                    <th className="py-2.5 px-3 text-right">Tempo Previsto</th>
                    <th className="py-2.5 px-3 text-right">Tempo Realizado</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Resp. Técnico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredOPs.map((op) => {
                    const prod = db.products.find((p) => p.id === op.productId);
                    const ord = db.orders.find((o) => o.id === op.orderId);
                    const cli = ord ? db.customers.find((c) => c.id === ord.customerId) : null;
                    return (
                      <tr key={op.id}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {op.opNumber}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono text-slate-500 mr-1">{prod?.code}</span>
                          <span className="font-medium text-slate-900">{prod?.name}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {ord ? `${ord.orderNumber} (${cli?.name.slice(0, 20)})` : 'Estoque Interno'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {op.quantityProduced} / {op.quantityPlanned} {prod?.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {prod?.totalUnitCycleMinutes.toFixed(1)} min
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {op.plannedTotalMinutes} min
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                          {op.actualTotalMinutes} min
                        </td>
                        <td className="py-2 px-3 font-semibold">{op.status}</td>
                        <td className="py-2 px-3 text-slate-700">{op.technicalResponsible}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ocupação da Capacidade Produtiva */}
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-bold text-slate-900">
              2. Balanço de Capacidade Produtiva por Centro de Trabalho
            </h3>
            <div className="border border-slate-300 rounded-md overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-700">
                    <th className="py-2 px-3">Código</th>
                    <th className="py-2 px-3">Centro de Trabalho</th>
                    <th className="py-2 px-3">Setor</th>
                    <th className="py-2 px-3 text-right">Capacidade Diária Líquida</th>
                    <th className="py-2 px-3 text-right">Carga Programada (OPs em Aberto)</th>
                    <th className="py-2 px-3 text-right">Taxa de Ocupação Diária</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {db.capacities.map((cap) => {
                    const load = db.productionOrders
                      .filter((o) => o.status !== 'Concluída' && o.status !== 'Cancelada')
                      .reduce((acc, op) => {
                        const stLoad = op.stageLogs
                          .filter((s) => s.workCenterId === cap.id && s.status !== 'Concluída')
                          .reduce((sa, s) => sa + Math.max(0, s.plannedMinutes - s.actualMinutes), 0);
                        return acc + stLoad;
                      }, 0);
                    const pct = Math.round((load / Math.max(1, cap.availableMinutesPerDay)) * 100);
                    return (
                      <tr key={cap.id}>
                        <td className="py-2 px-3 font-mono font-semibold">{cap.code}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{cap.name}</td>
                        <td className="py-2 px-3 text-slate-600">{cap.sector}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {cap.availableMinutesPerDay} min/dia
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">
                          {load} min
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloco de Assinatura Técnica */}
          <div className="pt-10 grid grid-cols-1 sm:grid-cols-2 gap-12 text-xs text-slate-700">
            <div className="border-t border-slate-400 pt-2 text-center">
              <div className="font-bold text-slate-900">
                {db.settings.technicalResponsibleName}
              </div>
              <div>{db.settings.technicalResponsibleRole}</div>
              <div className="font-mono text-slate-500">
                {db.settings.technicalResponsibleRegistration} — Responsável Técnico
              </div>
            </div>
            <div className="border-t border-slate-400 pt-2 text-center">
              <div className="font-bold text-slate-900">Coordenação de Chão de Fábrica / Qualidade</div>
              <div>Conferência de Apontamentos e Baixas de Produção</div>
              <div className="font-mono text-slate-500">{db.settings.companyName}</div>
            </div>
          </div>
        </div>
      )}

      {/* MODO 2: FOLHA DE ORDEM DE PRODUÇÃO PARA IMPRESSÃO */}
      {viewMode === 'ordem-impressao' && activeOP && (
        <div className="print-container bg-white border border-slate-300 rounded-lg p-8 space-y-6">
          {(() => {
            const product = db.products.find((p) => p.id === activeOP.productId);
            const order = db.orders.find((o) => o.id === activeOP.orderId);
            const customer = order ? db.customers.find((c) => c.id === order.customerId) : null;

            return (
              <>
                {/* Cabeçalho da Ordem de Produção */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
                  <div>
                    <div className="text-xs font-mono font-semibold text-slate-500">
                      ORDEM DE PRODUÇÃO INDUSTRIAL — DOCUMENTO DE ACOMPANHAMENTO DE LOTE
                    </div>
                    <h2 className="text-2xl font-mono font-bold text-slate-900 mt-1">
                      {activeOP.opNumber}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      {db.settings.companyName} · CNPJ: {db.settings.companyDocument}
                    </p>
                  </div>

                  <div className="border border-slate-300 rounded p-3 text-xs space-y-1 bg-slate-50">
                    <div>
                      <span className="text-slate-500">Status da OP: </span>
                      <strong className="font-mono text-slate-900">{activeOP.status}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Data de Emissão: </span>
                      <span className="font-mono">{activeOP.issuedDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Prazo Limite: </span>
                      <strong className="font-mono">{activeOP.dueDate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Responsável Técnico: </span>
                      <strong className="text-slate-900">{activeOP.technicalResponsible}</strong>
                    </div>
                  </div>
                </div>

                {/* Dados do Produto e Pedido */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200 text-xs">
                  <div>
                    <div className="text-slate-500">Produto / Ficha Técnica</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {product?.code} — {product?.name}
                    </div>
                    <div className="text-slate-600 mt-0.5">Categoria: {product?.category}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Cliente / Pedido Vinculado</div>
                    <div className="text-sm font-semibold text-slate-900 mt-0.5">
                      {order ? `${order.orderNumber} — ${customer?.name}` : 'Reposição de Estoque Interno'}
                    </div>
                    <div className="text-slate-600 mt-0.5">Prioridade: {activeOP.priority}</div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-slate-500">Quantidade Planejada do Lote</div>
                    <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                      {activeOP.quantityPlanned} {product?.unit}
                    </div>
                    <div className="font-mono text-slate-600">
                      Tempo Total Previsto: {activeOP.plannedTotalMinutes} min (
                      {(activeOP.plannedTotalMinutes / 60).toFixed(1)}h)
                    </div>
                  </div>
                </div>

                {/* 1. Requisição de Matéria-Prima do Almoxarifado */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    1. Lista de Separação de Matéria-Prima (Almoxarifado)
                  </h3>
                  <div className="border border-slate-300 rounded overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-700">
                          <th className="py-2 px-3">Código MP</th>
                          <th className="py-2 px-3">Descrição do Material</th>
                          <th className="py-2 px-3">Localização</th>
                          <th className="py-2 px-3 text-right">Consumo Unit.</th>
                          <th className="py-2 px-3 text-right">Perda (%)</th>
                          <th className="py-2 px-3 text-right">Qtd. Total p/ Lote</th>
                          <th className="py-2 px-3 w-28 text-center">Conferência</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {product?.materials.map((m, idx) => {
                          const rm = db.rawMaterials.find((r) => r.id === m.rawMaterialId);
                          const totalReq =
                            m.quantityRequired *
                            (1 + m.wastePercent / 100) *
                            activeOP.quantityPlanned;
                          return (
                            <tr key={idx}>
                              <td className="py-2 px-3 font-mono font-semibold">{rm?.code}</td>
                              <td className="py-2 px-3 font-medium text-slate-900">{rm?.name}</td>
                              <td className="py-2 px-3 text-slate-600">{rm?.location}</td>
                              <td className="py-2 px-3 text-right font-mono">
                                {m.quantityRequired} {rm?.unit}
                              </td>
                              <td className="py-2 px-3 text-right font-mono">{m.wastePercent}%</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {totalReq.toFixed(2)} {rm?.unit}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-slate-400">
                                [ &nbsp; ] OK
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Roteiro de Operações e Registro de Tempos de Processo */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    2. Roteiro de Fabricação e Apontamento de Tempo de Processo
                  </h3>
                  <div className="border border-slate-300 rounded overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-700">
                          <th className="py-2 px-3 w-12">Seq.</th>
                          <th className="py-2 px-3">Operação / Etapa</th>
                          <th className="py-2 px-3">Centro de Trabalho</th>
                          <th className="py-2 px-3 text-right">Tempo Previsto</th>
                          <th className="py-2 px-3 text-right">Tempo Realizado</th>
                          <th className="py-2 px-3">Operador / Visto</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {activeOP.stageLogs.map((st, idx) => {
                          const wc = db.capacities.find((c) => c.id === st.workCenterId);
                          const specStage = product?.stages[idx];
                          return (
                            <tr key={st.stageId}>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                                #{idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">{st.stageName}</div>
                                {specStage?.instructions && (
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Instrução: {specStage.instructions}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {wc?.code} - {wc?.name}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                {st.plannedMinutes} min
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                                {st.actualMinutes > 0 ? `${st.actualMinutes} min` : '____ min'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700">
                                {st.operatorName || '__________________'}
                              </td>
                              <td className="py-2.5 px-3 font-semibold">{st.status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Normas de Qualidade e Notas de Baixa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="border border-slate-300 rounded p-3">
                    <div className="font-bold text-slate-900 mb-1">
                      Parâmetros de Inspeção da Ficha Técnica:
                    </div>
                    <p className="text-slate-700">
                      {product?.technicalNotes || 'Inspeção visual e dimensional padrão conforme desenho.'}
                    </p>
                  </div>
                  <div className="border border-slate-300 rounded p-3">
                    <div className="font-bold text-slate-900 mb-1">
                      Registro de Baixa / Encerramento da OP:
                    </div>
                    <p className="text-slate-700">
                      {activeOP.completionNotes ||
                        `Qtd. Aprovada: ${activeOP.quantityProduced} ${product?.unit} | Refugo: ${activeOP.quantityScrap} ${product?.unit}`}
                    </p>
                  </div>
                </div>

                {/* Assinaturas do Documento */}
                <div className="pt-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-xs text-slate-700">
                  <div className="border-t border-slate-400 pt-2 text-center">
                    <div className="font-bold text-slate-900">
                      {db.settings.technicalResponsibleName}
                    </div>
                    <div>Responsável Técnico Emissor</div>
                    <div className="font-mono text-slate-500">
                      {db.settings.technicalResponsibleRegistration}
                    </div>
                  </div>
                  <div className="border-t border-slate-400 pt-2 text-center">
                    <div className="font-bold text-slate-900">Operador / Líder de Produção</div>
                    <div>Início e Término de Processo</div>
                  </div>
                  <div className="border-t border-slate-400 pt-2 text-center">
                    <div className="font-bold text-slate-900">Inspeção de Qualidade Final</div>
                    <div>Liberação de Lote / Baixa de OP</div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

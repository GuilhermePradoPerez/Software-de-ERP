import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'erp_database.json');

const initialDatabase = {
  settings: {
    technicalResponsibleName: 'Eng. Guilherme Perez',
    technicalResponsibleRole: 'Engenheiro de Produção / Responsável Técnico PCP',
    technicalResponsibleRegistration: 'CREA-SP 5069841230',
    companyName: 'Metalúrgica & Manufatura Precisão Ltda.',
    companyDocument: '18.492.301/0001-54',
    shiftHoursPerDay: 8
  },
  suppliers: [
    {
      id: 'sup-1',
      code: 'FOR-001',
      name: 'Aços Villares Industrial S.A.',
      cnpj: '60.894.730/0001-90',
      contactName: 'Roberto Almeida',
      phone: '(11) 3482-9011',
      email: 'vendas@acosvillares.com.br',
      leadTimeDays: 5,
      category: 'Siderurgia e Metais',
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'sup-2',
      code: 'FOR-002',
      name: 'Polímeros & Elastômeros Sul Ltda.',
      cnpj: '42.118.902/0001-12',
      contactName: 'Fernanda Costa',
      phone: '(19) 3291-4400',
      email: 'comercial@polimerossul.com.br',
      leadTimeDays: 3,
      category: 'Plásticos e Vedação',
      createdAt: '2026-09-02T09:30:00.000Z'
    },
    {
      id: 'sup-3',
      code: 'FOR-003',
      name: 'Fixadores Ciser Parafusos e Porcas',
      cnpj: '84.683.408/0001-03',
      contactName: 'Marcos Oliveira',
      phone: '(47) 3441-3000',
      email: 'pedidos@ciserfixadores.com.br',
      leadTimeDays: 4,
      category: 'Elementos de Fixação',
      createdAt: '2026-09-05T14:15:00.000Z'
    }
  ],
  rawMaterials: [
    {
      id: 'rm-1',
      code: 'MP-101',
      name: 'Chapa de Aço Carbono SAE 1020 #3,00mm',
      unit: 'kg',
      unitCost: 8.5,
      currentStock: 1240,
      minStock: 300,
      supplierId: 'sup-1',
      location: 'Almoxarifado A - Corredor 01',
      createdAt: '2026-09-05T10:00:00.000Z'
    },
    {
      id: 'rm-2',
      code: 'MP-102',
      name: 'Barra Redonda Trefilada SAE 1045 Ø 25,4mm',
      unit: 'm',
      unitCost: 34.2,
      currentStock: 185,
      minStock: 60,
      supplierId: 'sup-1',
      location: 'Almoxarifado A - Rack Barras',
      createdAt: '2026-09-05T10:15:00.000Z'
    },
    {
      id: 'rm-3',
      code: 'MP-204',
      name: 'Anel O-Ring Borracha Nitrílica NBR 70 Shore',
      unit: 'un',
      unitCost: 1.45,
      currentStock: 850,
      minStock: 200,
      supplierId: 'sup-2',
      location: 'Almoxarifado B - Gaveta 14',
      createdAt: '2026-09-06T11:00:00.000Z'
    },
    {
      id: 'rm-4',
      code: 'MP-309',
      name: 'Kit Fixação Sextavado M10 x 35 Aço Inox 304',
      unit: 'un',
      unitCost: 2.9,
      currentStock: 1420,
      minStock: 400,
      supplierId: 'sup-3',
      location: 'Almoxarifado B - Gaveta 02',
      createdAt: '2026-09-06T11:20:00.000Z'
    },
    {
      id: 'rm-5',
      code: 'MP-405',
      name: 'Tinta Epóxi Eletrostática Cinza Munsell N6.5',
      unit: 'kg',
      unitCost: 48.0,
      currentStock: 64,
      minStock: 25,
      supplierId: 'sup-2',
      location: 'Químicos - Armário Corta-Fogo 01',
      createdAt: '2026-09-07T08:40:00.000Z'
    }
  ],
  customers: [
    {
      id: 'cust-1',
      code: 'CLI-001',
      name: 'Agrícola Horizonte Máquinas e Implementos S.A.',
      document: '14.502.889/0001-41',
      contactName: 'Eng. Carlos Eduardo Mendes',
      phone: '(16) 3361-8800',
      email: 'suprimentos@agricolahorizonte.com.br',
      cityState: 'Sertãozinho / SP',
      paymentTerms: '28 / 56 DDL',
      createdAt: '2026-09-08T09:00:00.000Z'
    },
    {
      id: 'cust-2',
      code: 'CLI-002',
      name: 'Construtora & Hidráulica Vale do Paraíba Ltda.',
      document: '29.841.105/0001-77',
      contactName: 'Patrícia Vasconcelos',
      phone: '(12) 3922-5100',
      email: 'compras@valedoparaiba.eng.br',
      cityState: 'São José dos Campos / SP',
      paymentTerms: '30 DDL',
      createdAt: '2026-09-09T11:30:00.000Z'
    },
    {
      id: 'cust-3',
      code: 'CLI-003',
      name: 'Automação Industrial Krones Brasil',
      document: '05.712.633/0001-09',
      contactName: 'Henrique Schultz',
      phone: '(11) 4055-9200',
      email: 'procurement@krones-automacao.com.br',
      cityState: 'Diadema / SP',
      paymentTerms: '45 DDL',
      createdAt: '2026-09-10T15:00:00.000Z'
    }
  ],
  capacities: [
    {
      id: 'cap-1',
      code: 'CT-01',
      name: 'Corte Laser CNC & Dobradeira Hidráulica',
      sector: 'Estamparia e Corte',
      machinesCount: 2,
      operatorsCount: 2,
      hoursPerShift: 8,
      shiftsPerDay: 2,
      efficiencyPercent: 88,
      availableMinutesPerDay: 1690,
      maintenanceStatus: 'Operacional',
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'cap-2',
      code: 'CT-02',
      name: 'Centro de Usinagem CNC & Tornos',
      sector: 'Usinagem de Precisão',
      machinesCount: 3,
      operatorsCount: 3,
      hoursPerShift: 8,
      shiftsPerDay: 2,
      efficiencyPercent: 85,
      availableMinutesPerDay: 2448,
      maintenanceStatus: 'Operacional',
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'cap-3',
      code: 'CT-03',
      name: 'Célula de Solda MIG/MAG & Acabamento',
      sector: 'Caldeiraria e Solda',
      machinesCount: 2,
      operatorsCount: 3,
      hoursPerShift: 8,
      shiftsPerDay: 1,
      efficiencyPercent: 90,
      availableMinutesPerDay: 864,
      maintenanceStatus: 'Operacional',
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'cap-4',
      code: 'CT-04',
      name: 'Linha de Pintura Eletrostática e Montagem Final',
      sector: 'Acabamento e Montagem',
      machinesCount: 1,
      operatorsCount: 4,
      hoursPerShift: 8,
      shiftsPerDay: 1,
      efficiencyPercent: 92,
      availableMinutesPerDay: 442,
      maintenanceStatus: 'Operacional',
      createdAt: '2026-09-01T08:00:00.000Z'
    }
  ],
  products: [
    {
      id: 'prod-1',
      code: 'PRD-1001',
      name: 'Conjunto Mancal Flangeado Reforçado Ø 25,4mm',
      category: 'Transmissão Mecânica',
      unit: 'conj',
      batchSizeStandard: 50,
      materials: [
        { rawMaterialId: 'rm-1', quantityRequired: 2.4, wastePercent: 5 },
        { rawMaterialId: 'rm-2', quantityRequired: 0.35, wastePercent: 3 },
        { rawMaterialId: 'rm-3', quantityRequired: 2, wastePercent: 0 },
        { rawMaterialId: 'rm-4', quantityRequired: 4, wastePercent: 0 },
        { rawMaterialId: 'rm-5', quantityRequired: 0.08, wastePercent: 5 }
      ],
      stages: [
        {
          id: 'st-101',
          sequence: 1,
          stageName: 'Corte a Laser e Dobra da Base Flangeada',
          workCenterId: 'cap-1',
          setupTimeMinutes: 20,
          unitCycleTimeMinutes: 3.5,
          instructions: 'Cortar chapa #3,00mm conforme desenho técnico DT-1001-A e dobrar abas laterais a 90°.'
        },
        {
          id: 'st-102',
          sequence: 2,
          stageName: 'Usinagem CNC do Eixo e Alojamento',
          workCenterId: 'cap-2',
          setupTimeMinutes: 35,
          unitCycleTimeMinutes: 6.0,
          instructions: 'Tornear barra SAE 1045 com tolerância H7 no assento de vedação e abrir canal para anel O-Ring.'
        },
        {
          id: 'st-103',
          sequence: 3,
          stageName: 'Solda MIG Estrutural de Reforço',
          workCenterId: 'cap-3',
          setupTimeMinutes: 15,
          unitCycleTimeMinutes: 4.0,
          instructions: 'Soldar nervuras de reforço com cordão contínuo 4mm sem porosidade.'
        },
        {
          id: 'st-104',
          sequence: 4,
          stageName: 'Pintura Epóxi e Montagem com Vedação',
          workCenterId: 'cap-4',
          setupTimeMinutes: 15,
          unitCycleTimeMinutes: 2.5,
          instructions: 'Aplicar camada 80 micra, curar a 200°C, montar anéis O-Ring e kit de parafusos M10.'
        }
      ],
      totalSetupMinutes: 85,
      totalUnitCycleMinutes: 16.0,
      estimatedUnitMaterialCost: 52.84,
      sellingPrice: 148.0,
      technicalNotes: 'Inspecionar 100% do diâmetro interno com calibrador passa/não-passa antes da expedição.',
      updatedBy: 'Eng. Guilherme Perez',
      createdAt: '2026-09-10T10:00:00.000Z'
    },
    {
      id: 'prod-2',
      code: 'PRD-2004',
      name: 'Suporte Articulado Hidráulico Carga Pesada',
      category: 'Implementos Agrícolas',
      unit: 'un',
      batchSizeStandard: 30,
      materials: [
        { rawMaterialId: 'rm-1', quantityRequired: 4.8, wastePercent: 6 },
        { rawMaterialId: 'rm-2', quantityRequired: 0.5, wastePercent: 4 },
        { rawMaterialId: 'rm-4', quantityRequired: 6, wastePercent: 0 },
        { rawMaterialId: 'rm-5', quantityRequired: 0.15, wastePercent: 5 }
      ],
      stages: [
        {
          id: 'st-201',
          sequence: 1,
          stageName: 'Corte CNC de Chapas e Chanfro',
          workCenterId: 'cap-1',
          setupTimeMinutes: 25,
          unitCycleTimeMinutes: 5.0,
          instructions: 'Corte das placas laterais e execução de chanfro 45° para penetração de solda.'
        },
        {
          id: 'st-202',
          sequence: 2,
          stageName: 'Usinagem dos Pinos de Articulação',
          workCenterId: 'cap-2',
          setupTimeMinutes: 30,
          unitCycleTimeMinutes: 5.5,
          instructions: 'Usinar pinos em SAE 1045 com furo de lubrificação central M6.'
        },
        {
          id: 'st-203',
          sequence: 3,
          stageName: 'Soldagem em Gabarito e Pintura Final',
          workCenterId: 'cap-3',
          setupTimeMinutes: 20,
          unitCycleTimeMinutes: 7.5,
          instructions: 'Fixar conjunto no gabarito GB-204, soldar e enviar para acabamento.'
        }
      ],
      totalSetupMinutes: 75,
      totalUnitCycleMinutes: 18.0,
      estimatedUnitMaterialCost: 86.1,
      sellingPrice: 235.0,
      technicalNotes: 'Teste de ultrassom por amostragem (1 a cada 15 peças) no cordão principal.',
      updatedBy: 'Eng. Guilherme Perez',
      createdAt: '2026-09-12T14:20:00.000Z'
    },
    {
      id: 'prod-3',
      code: 'PRD-3010',
      name: 'Válvula Direcional de Bloqueio Inox/Carbono',
      category: 'Controle de Fluidos',
      unit: 'un',
      batchSizeStandard: 40,
      materials: [
        { rawMaterialId: 'rm-2', quantityRequired: 0.65, wastePercent: 5 },
        { rawMaterialId: 'rm-3', quantityRequired: 4, wastePercent: 0 },
        { rawMaterialId: 'rm-4', quantityRequired: 4, wastePercent: 0 }
      ],
      stages: [
        {
          id: 'st-301',
          sequence: 1,
          stageName: 'Usinagem Completa do Corpo e Êmbolo',
          workCenterId: 'cap-2',
          setupTimeMinutes: 45,
          unitCycleTimeMinutes: 9.5,
          instructions: 'Operação em torno CNC e fresadora indexada. Rugosidade máxima Ra 0.8 na sede.'
        },
        {
          id: 'st-302',
          sequence: 2,
          stageName: 'Montagem Estanque e Teste Hidrostático',
          workCenterId: 'cap-4',
          setupTimeMinutes: 15,
          unitCycleTimeMinutes: 4.5,
          instructions: 'Montar vedações NBR e testar estanqueidade sob pressão de 120 bar por 60 segundos.'
        }
      ],
      totalSetupMinutes: 60,
      totalUnitCycleMinutes: 14.0,
      estimatedUnitMaterialCost: 40.74,
      sellingPrice: 165.0,
      technicalNotes: 'Gravar número de lote a laser no corpo da válvula após aprovação no teste.',
      updatedBy: 'Eng. Guilherme Perez',
      createdAt: '2026-09-15T09:10:00.000Z'
    }
  ],
  orders: [
    {
      id: 'ord-1',
      orderNumber: 'PV-2026-089',
      customerId: 'cust-1',
      orderDate: '2026-10-02',
      deliveryDate: '2026-10-14',
      priority: 'Alta',
      status: 'Em Produção',
      items: [
        { productId: 'prod-1', quantity: 40, unitPrice: 148.0 },
        { productId: 'prod-2', quantity: 20, unitPrice: 235.0 }
      ],
      totalValue: 10620.0,
      notes: 'Entrega programada no portão 3 da planta de Sertãozinho.',
      createdBy: 'Eng. Guilherme Perez',
      createdAt: '2026-10-02T10:30:00.000Z'
    },
    {
      id: 'ord-2',
      orderNumber: 'PV-2026-090',
      customerId: 'cust-3',
      orderDate: '2026-10-05',
      deliveryDate: '2026-10-18',
      priority: 'Normal',
      status: 'Planejado',
      items: [
        { productId: 'prod-3', quantity: 35, unitPrice: 165.0 }
      ],
      totalValue: 5775.0,
      notes: 'Enviar certificado de qualidade junto com a Nota Fiscal.',
      createdBy: 'Eng. Guilherme Perez',
      createdAt: '2026-10-05T14:00:00.000Z'
    },
    {
      id: 'ord-3',
      orderNumber: 'PV-2026-085',
      customerId: 'cust-2',
      orderDate: '2026-09-25',
      deliveryDate: '2026-10-06',
      priority: 'Normal',
      status: 'Concluído',
      items: [
        { productId: 'prod-1', quantity: 25, unitPrice: 148.0 }
      ],
      totalValue: 3700.0,
      notes: 'Lote concluído dentro do prazo padrão.',
      createdBy: 'Eng. Guilherme Perez',
      createdAt: '2026-09-25T09:15:00.000Z'
    }
  ],
  productionOrders: [
    {
      id: 'op-1',
      opNumber: 'OP-2026-101',
      orderId: 'ord-3',
      productId: 'prod-1',
      quantityPlanned: 25,
      quantityProduced: 25,
      quantityScrap: 1,
      priority: 'Normal',
      status: 'Concluída',
      workCenterId: 'cap-4',
      currentStageIndex: 3,
      stageLogs: [
        {
          stageId: 'st-101',
          stageName: 'Corte a Laser e Dobra da Base Flangeada',
          workCenterId: 'cap-1',
          plannedMinutes: 108,
          actualMinutes: 104,
          status: 'Concluída',
          completedAt: '2026-10-03T11:30:00.000Z',
          operatorName: 'João Batista'
        },
        {
          stageId: 'st-102',
          stageName: 'Usinagem CNC do Eixo e Alojamento',
          workCenterId: 'cap-2',
          plannedMinutes: 185,
          actualMinutes: 192,
          status: 'Concluída',
          completedAt: '2026-10-04T15:20:00.000Z',
          operatorName: 'Ricardo Lima'
        },
        {
          stageId: 'st-103',
          stageName: 'Solda MIG Estrutural de Reforço',
          workCenterId: 'cap-3',
          plannedMinutes: 115,
          actualMinutes: 110,
          status: 'Concluída',
          completedAt: '2026-10-05T10:40:00.000Z',
          operatorName: 'Cláudio Santos'
        },
        {
          stageId: 'st-104',
          stageName: 'Pintura Epóxi e Montagem com Vedação',
          workCenterId: 'cap-4',
          plannedMinutes: 78,
          actualMinutes: 75,
          status: 'Concluída',
          completedAt: '2026-10-05T16:10:00.000Z',
          operatorName: 'André Silva'
        }
      ],
      plannedTotalMinutes: 485,
      actualTotalMinutes: 481,
      timerRunning: false,
      issuedDate: '2026-10-01',
      dueDate: '2026-10-06',
      completedAt: '2026-10-05T16:15:00.000Z',
      technicalResponsible: 'Eng. Guilherme Perez',
      materialsDeducted: true,
      completionNotes: 'Lote aprovado 100% pelo controle dimensional. 1 peça descartada no setup de usinagem.'
    },
    {
      id: 'op-2',
      opNumber: 'OP-2026-102',
      orderId: 'ord-1',
      productId: 'prod-1',
      quantityPlanned: 40,
      quantityProduced: 18,
      quantityScrap: 0,
      priority: 'Alta',
      status: 'Em Produção',
      workCenterId: 'cap-2',
      currentStageIndex: 1,
      stageLogs: [
        {
          stageId: 'st-101',
          stageName: 'Corte a Laser e Dobra da Base Flangeada',
          workCenterId: 'cap-1',
          plannedMinutes: 160,
          actualMinutes: 155,
          status: 'Concluída',
          completedAt: '2026-10-07T16:00:00.000Z',
          operatorName: 'João Batista'
        },
        {
          stageId: 'st-102',
          stageName: 'Usinagem CNC do Eixo e Alojamento',
          workCenterId: 'cap-2',
          plannedMinutes: 275,
          actualMinutes: 140,
          status: 'Em Execução',
          startedAt: '2026-10-08T08:00:00.000Z',
          operatorName: 'Ricardo Lima'
        },
        {
          stageId: 'st-103',
          stageName: 'Solda MIG Estrutural de Reforço',
          workCenterId: 'cap-3',
          plannedMinutes: 175,
          actualMinutes: 0,
          status: 'Pendente'
        },
        {
          stageId: 'st-104',
          stageName: 'Pintura Epóxi e Montagem com Vedação',
          workCenterId: 'cap-4',
          plannedMinutes: 115,
          actualMinutes: 0,
          status: 'Pendente'
        }
      ],
      plannedTotalMinutes: 725,
      actualTotalMinutes: 295,
      timerRunning: true,
      timerStartedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      issuedDate: '2026-10-06',
      dueDate: '2026-10-13',
      technicalResponsible: 'Eng. Guilherme Perez',
      materialsDeducted: true
    },
    {
      id: 'op-3',
      opNumber: 'OP-2026-103',
      orderId: 'ord-1',
      productId: 'prod-2',
      quantityPlanned: 20,
      quantityProduced: 0,
      quantityScrap: 0,
      priority: 'Alta',
      status: 'Emitida',
      workCenterId: 'cap-1',
      currentStageIndex: 0,
      stageLogs: [
        {
          stageId: 'st-201',
          stageName: 'Corte CNC de Chapas e Chanfro',
          workCenterId: 'cap-1',
          plannedMinutes: 125,
          actualMinutes: 0,
          status: 'Pendente'
        },
        {
          stageId: 'st-202',
          stageName: 'Usinagem dos Pinos de Articulação',
          workCenterId: 'cap-2',
          plannedMinutes: 140,
          actualMinutes: 0,
          status: 'Pendente'
        },
        {
          stageId: 'st-203',
          stageName: 'Soldagem em Gabarito e Pintura Final',
          workCenterId: 'cap-3',
          plannedMinutes: 170,
          actualMinutes: 0,
          status: 'Pendente'
        }
      ],
      plannedTotalMinutes: 435,
      actualTotalMinutes: 0,
      timerRunning: false,
      issuedDate: '2026-10-07',
      dueDate: '2026-10-14',
      technicalResponsible: 'Eng. Guilherme Perez',
      materialsDeducted: false
    },
    {
      id: 'op-4',
      opNumber: 'OP-2026-104',
      orderId: 'ord-2',
      productId: 'prod-3',
      quantityPlanned: 35,
      quantityProduced: 0,
      quantityScrap: 0,
      priority: 'Normal',
      status: 'Emitida',
      workCenterId: 'cap-2',
      currentStageIndex: 0,
      stageLogs: [
        {
          stageId: 'st-301',
          stageName: 'Usinagem Completa do Corpo e Êmbolo',
          workCenterId: 'cap-2',
          plannedMinutes: 378,
          actualMinutes: 0,
          status: 'Pendente'
        },
        {
          stageId: 'st-302',
          stageName: 'Montagem Estanque e Teste Hidrostático',
          workCenterId: 'cap-4',
          plannedMinutes: 173,
          actualMinutes: 0,
          status: 'Pendente'
        }
      ],
      plannedTotalMinutes: 551,
      actualTotalMinutes: 0,
      timerRunning: false,
      issuedDate: '2026-10-08',
      dueDate: '2026-10-17',
      technicalResponsible: 'Eng. Guilherme Perez',
      materialsDeducted: false
    }
  ]
};

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDatabase, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB, resetting to initial:', err);
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDatabase, null, 2), 'utf-8');
    return initialDatabase;
  }
}

function writeDb(data: unknown) {
  ensureDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // API routes
  app.get('/api/state', (_req, res) => {
    const db = readDb();
    res.json(db);
  });

  app.put('/api/state', (req, res) => {
    const newState = req.body;
    if (!newState || typeof newState !== 'object') {
      res.status(400).json({ error: 'Invalid state payload' });
      return;
    }
    writeDb(newState);
    res.json({ ok: true, state: newState });
  });

  app.post('/api/reset', (_req, res) => {
    writeDb(initialDatabase);
    res.json(initialDatabase);
  });

  // Vite middleware in development or static in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ManufaturaPro ERP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

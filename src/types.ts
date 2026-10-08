export interface Settings {
  technicalResponsibleName: string;
  technicalResponsibleRole: string;
  technicalResponsibleRegistration: string;
  companyName: string;
  companyDocument: string;
  shiftHoursPerDay: number;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  cnpj: string;
  contactName: string;
  phone: string;
  email: string;
  leadTimeDays: number;
  category: string;
  createdAt: string;
}

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  unit: 'kg' | 'm' | 'un' | 'L' | 'm²' | 'barra';
  unitCost: number;
  currentStock: number;
  minStock: number;
  supplierId: string;
  location: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  document: string;
  contactName: string;
  phone: string;
  email: string;
  cityState: string;
  paymentTerms: string;
  createdAt: string;
}

export interface ProductiveCapacity {
  id: string;
  code: string;
  name: string;
  sector: string;
  machinesCount: number;
  operatorsCount: number;
  hoursPerShift: number;
  shiftsPerDay: number;
  efficiencyPercent: number;
  availableMinutesPerDay: number; // Computed: machinesCount * hoursPerShift * shiftsPerDay * 60 * (efficiencyPercent / 100)
  maintenanceStatus: 'Operacional' | 'Manutenção Preventiva' | 'Parada';
  createdAt: string;
}

export interface BOMMaterialItem {
  rawMaterialId: string;
  quantityRequired: number;
  wastePercent: number;
}

export interface ProcessStage {
  id: string;
  sequence: number;
  stageName: string;
  workCenterId: string;
  setupTimeMinutes: number;
  unitCycleTimeMinutes: number;
  instructions: string;
}

export interface ProductSpec {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: 'un' | 'conj' | 'par' | 'cx' | 'kg';
  batchSizeStandard: number;
  materials: BOMMaterialItem[];
  stages: ProcessStage[];
  totalSetupMinutes: number;
  totalUnitCycleMinutes: number;
  estimatedUnitMaterialCost: number;
  sellingPrice: number;
  technicalNotes: string;
  updatedBy: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  orderDate: string;
  deliveryDate: string;
  priority: 'Baixa' | 'Normal' | 'Alta' | 'Urgente';
  status: 'Pendente' | 'Planejado' | 'Em Produção' | 'Concluído' | 'Entregue';
  items: OrderItem[];
  totalValue: number;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface ProductionStageLog {
  stageId: string;
  stageName: string;
  workCenterId: string;
  plannedMinutes: number;
  actualMinutes: number;
  status: 'Pendente' | 'Em Execução' | 'Concluída';
  startedAt?: string;
  completedAt?: string;
  operatorName?: string;
}

export interface ProductionOrder {
  id: string;
  opNumber: string;
  orderId: string; // Optional link to CustomerOrder or 'ESTOQUE'
  productId: string;
  quantityPlanned: number;
  quantityProduced: number;
  quantityScrap: number;
  priority: 'Baixa' | 'Normal' | 'Alta' | 'Urgente';
  status: 'Emitida' | 'Em Produção' | 'Pausada' | 'Concluída' | 'Cancelada';
  workCenterId: string; // Primary bottleneck or current work center
  currentStageIndex: number;
  stageLogs: ProductionStageLog[];
  plannedTotalMinutes: number;
  actualTotalMinutes: number;
  timerRunning: boolean;
  timerStartedAt?: string; // ISO timestamp when current active session started
  issuedDate: string;
  dueDate: string;
  completedAt?: string;
  technicalResponsible: string;
  materialsDeducted: boolean;
  completionNotes?: string;
}

export interface DatabaseSchema {
  settings: Settings;
  suppliers: Supplier[];
  rawMaterials: RawMaterial[];
  customers: Customer[];
  capacities: ProductiveCapacity[];
  products: ProductSpec[];
  orders: CustomerOrder[];
  productionOrders: ProductionOrder[];
}

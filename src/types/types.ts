import { NavigatorScreenParams } from '@react-navigation/native';

// Tipos para a navegação do aplicativo

export type UserType = 'client' | 'owner';

// NEW: Define the param list for the stack navigator in the Home tab
export type HomeStackParamList = {
  Home: undefined;
  BusinessDetails: { businessId: string };
  AllBusinesses: {
    listType: 'recent' | 'topRated' | 'promotions' | 'all';
    userCity?: string;
  };
};

export type ClientTabParamList = {
  HomeStack: NavigatorScreenParams<HomeStackParamList>; // Changed from Home: undefined
  Appointments: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  // Telas de autenticação
  Welcome: undefined;
  Login: { userType: UserType };
  Register: { userType: UserType };
  ForgotPassword: undefined;
  EmailVerification: undefined;

  // Navegação principal
  ClientTabs: NavigatorScreenParams<ClientTabParamList>;
  OwnerTabs: NavigatorScreenParams<OwnerTabParamList>;

  // Telas compartilhadas
  BusinessDetails: { businessId: string };

  // Telas do cliente
  // BusinessDetails moved to HomeStackParamList
  Chat: {
    chatId?: string;
    businessId?: string;
    businessName?: string;
    otherUserId: string;
    otherUserName: string;
    professionalId?: string;
    professionalName?: string;
    initialConversationId?: string; // Added
    chatWithUserName?: string; // Added
  };
  AppointmentDateTime: {
    businessId: string;
    serviceId: string;
    professionalId: string;
    serviceName: string;
    professionalName: string;
  }; BookingConfirmation: {
    businessId: string;
    serviceId: string;
    professionalId: string;
    date?: string;
    time?: string;
    sessions?: { date: string; time: string }[]; // Para pacotes com múltiplas sessÃµes
  };
  Review: {
    businessId: string;
    businessName: string;
    serviceId: string | null; // Allow null for general business reviews
    professionalId?: string;
    professionalName?: string;
    appointmentId?: string; // Tornar opcional para permitir avaliaçÃµes gerais
  };
  Favorites: undefined; // Adicionar tela de Favoritos
  EditProfile: undefined; // Adicionar tela de Edição de Perfil
  PaymentMethods: undefined; // Tela de métodos de pagamento
  AddPaymentMethod: undefined; // Tela para adicionar cartão
  EditPaymentMethod: { paymentMethodId: string }; // Tela para editar cartão
  Support: undefined; // Tela de suporte
  ChatList: undefined; // Tela de lista de conversas

  // Telas do proprietário
  BusinessManagement: undefined; // Genérico, pode ser usado ou removido se não for o caso
  ServiceManagement: undefined; // Já existe, acessado via Hub
  AppointmentManagement: undefined; // Já existe, é uma aba e também pode ser acessado via Stack se necessário
  DashboardScreen: undefined; // Adicionando para navegação via Hub
  ProfessionalManagementScreen: undefined; // Adicionando para navegação via Hub
  ProfessionalAppointmentsScreen: undefined; // Nova tela para gerenciar agendamentos por profissional
  FinancialReportsScreen: undefined; // Adicionando para navegação via Hub
  ReviewsManagementScreen: undefined; // Adicionando para navegação via Hub
  BusinessSettingsScreen: undefined; // Adicionando para navegação via Hub
  ChatManagementScreen: undefined; // Adicionando para navegação via Hub
  PromotionManagement: undefined;
  BusinessHub: undefined; // A tela do Hub em si, caso precise ser navegada como Stack screen

  // Tela de Pagamento
  Payment: {
    appointmentId: string;
    amount: number; // Valor em unidade principal (ex: 10.50 para R$10,50)
    currency?: string; // ex: 'BRL', 'USD'
    description?: string; // Descrição do que está sendo pago
    businessName?: string; // Nome do estabelecimento para exibição
  };
};

// Tipos para navegação das abas do proprietário
export type OwnerTabParamList = {
  OwnerHome: undefined; // Nova aba inicial idÃªntica ao CLIENT
  AppointmentManagement: undefined; // Mantida
  BusinessHub: undefined; // Nova aba agregadora
  // As telas abaixo agora são acessadas via Stack a partir do BusinessHub,
  // então elas devem estar no AppStackParamList se forem navegadas diretamente
  // ou serem parte de um Stack aninhado dentro do BusinessHub.
  // Dashboard: undefined;
  // ServiceManagement: undefined;
  // ProfessionalManagement: undefined;
  // FinancialReports: undefined;
  // ReviewsManagement: undefined;
  // BusinessSettings: undefined;
};
;
  category: string; // UMA categoria só, não array
  rating: number;
  reviewCount: number;
  workingHours: {
    [day: string]: {
      open: boolean;
      start: string;
      end: string;
    };
  };
  policies: {
    cancellationTimeLimit: number;
    cancellationFee: number;
    noShowFee: number;
    advanceBookingLimit: number;
  }; notifications: {
    confirmationEnabled: boolean;
    reminderEnabled: boolean;
    reminderTime: number;
  };
  paymentMethods: {
    cash: boolean;
    creditCard: boolean;
    debitCard: boolean;
    pix: boolean;
    transfer: boolean;
    inApp: boolean;
  };
  defaultCommissionRate: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  nameLowercase?: string;
  hasActivePromotions?: boolean;
}

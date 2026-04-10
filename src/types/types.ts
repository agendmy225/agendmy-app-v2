import { NavigatorScreenParams } from '@react-navigation/native';

// Tipos para a navegaÃ§Ã£o do aplicativo

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
  // Telas de autenticaÃ§Ã£o
  Welcome: undefined;
  Login: { userType: UserType };
  Register: { userType: UserType };
  ForgotPassword: undefined;
  EmailVerification: undefined;

  // NavegaÃ§Ã£o principal
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
    sessions?: { date: string; time: string }[]; // Para pacotes com mÃºltiplas sessÃµes
  };
  Review: {
    businessId: string;
    businessName: string;
    serviceId: string | null; // Allow null for general business reviews
    professionalId?: string;
    professionalName?: string;
    appointmentId?: string; // Tornar opcional para permitir avaliaÃ§Ãµes gerais
  };
  Favorites: undefined; // Adicionar tela de Favoritos
  EditProfile: undefined; // Adicionar tela de EdiÃ§Ã£o de Perfil
  PaymentMethods: undefined; // Tela de mÃ©todos de pagamento
  AddPaymentMethod: undefined; // Tela para adicionar cartÃ£o
  EditPaymentMethod: { paymentMethodId: string }; // Tela para editar cartÃ£o
  Support: undefined; // Tela de suporte
  ChatList: undefined; // Tela de lista de conversas

  // Telas do proprietÃ¡rio
  BusinessManagement: undefined; // GenÃ©rico, pode ser usado ou removido se nÃ£o for o caso
  ServiceManagement: undefined; // JÃ¡ existe, acessado via Hub
  AppointmentManagement: undefined; // JÃ¡ existe, Ã© uma aba e tambÃ©m pode ser acessado via Stack se necessÃ¡rio
  DashboardScreen: undefined; // Adicionando para navegaÃ§Ã£o via Hub
  ProfessionalManagementScreen: undefined; // Adicionando para navegaÃ§Ã£o via Hub
  ProfessionalAppointmentsScreen: undefined; // Nova tela para gerenciar agendamentos por profissional
  FinancialReportsScreen: undefined; // Adicionando para navegaÃ§Ã£o via Hub
  ReviewsManagementScreen: undefined; // Adicionando para navegaÃ§Ã£o via Hub
  BusinessSettingsScreen: undefined; // Adicionando para navegaÃ§Ã£o via Hub
  ChatManagementScreen: undefined; // Adicionando para navegaÃ§Ã£o via Hub
  PromotionManagement: undefined;
  BusinessHub: undefined; // A tela do Hub em si, caso precise ser navegada como Stack screen

  // Tela de Pagamento
  Payment: {
    appointmentId: string;
    amount: number; // Valor em unidade principal (ex: 10.50 para R$10,50)
    currency?: string; // ex: 'BRL', 'USD'
    description?: string; // DescriÃ§Ã£o do que estÃ¡ sendo pago
    businessName?: string; // Nome do estabelecimento para exibiÃ§Ã£o
  };
};

// Tipos para navegaÃ§Ã£o das abas do proprietÃ¡rio
export type OwnerTabParamList = {
  OwnerHome: undefined; // Nova aba inicial idÃªntica ao CLIENT
  AppointmentManagement: undefined; // Mantida
  BusinessHub: undefined; // Nova aba agregadora
  // As telas abaixo agora sÃ£o acessadas via Stack a partir do BusinessHub,
  // entÃ£o elas devem estar no AppStackParamList se forem navegadas diretamente
  // ou serem parte de um Stack aninhado dentro do BusinessHub.
  // Dashboard: undefined;
  // ServiceManagement: undefined;
  // ProfessionalManagement: undefined;
  // FinancialReports: undefined;
  // ReviewsManagement: undefined;
  // BusinessSettings: undefined;
};
;
  category: string; // UMA categoria sÃ³, nÃ£o array
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

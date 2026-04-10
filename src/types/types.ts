import { NavigatorScreenParams } from '@react-navigation/native';

// Tipos para a navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do aplicativo

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
  // Telas de autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  Welcome: undefined;
  Login: { userType: UserType };
  Register: { userType: UserType };
  ForgotPassword: undefined;
  EmailVerification: undefined;

  // NavegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o principal
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
    sessions?: { date: string; time: string }[]; // Para pacotes com mÃƒÆ’Ã‚Âºltiplas sessÃƒÆ’Ã‚Âµes
  };
  Review: {
    businessId: string;
    businessName: string;
    serviceId: string | null; // Allow null for general business reviews
    professionalId?: string;
    professionalName?: string;
    appointmentId?: string; // Tornar opcional para permitir avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes gerais
  };
  Favorites: undefined; // Adicionar tela de Favoritos
  EditProfile: undefined; // Adicionar tela de EdiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Perfil
  PaymentMethods: undefined; // Tela de mÃƒÆ’Ã‚Â©todos de pagamento
  AddPaymentMethod: undefined; // Tela para adicionar cartÃƒÆ’Ã‚Â£o
  EditPaymentMethod: { paymentMethodId: string }; // Tela para editar cartÃƒÆ’Ã‚Â£o
  Support: undefined; // Tela de suporte
  ChatList: undefined; // Tela de lista de conversas

  // Telas do proprietÃƒÆ’Ã‚Â¡rio
  BusinessManagement: undefined; // GenÃƒÆ’Ã‚Â©rico, pode ser usado ou removido se nÃƒÆ’Ã‚Â£o for o caso
  ServiceManagement: undefined; // JÃƒÆ’Ã‚Â¡ existe, acessado via Hub
  AppointmentManagement: undefined; // JÃƒÆ’Ã‚Â¡ existe, ÃƒÆ’Ã‚Â© uma aba e tambÃƒÆ’Ã‚Â©m pode ser acessado via Stack se necessÃƒÆ’Ã‚Â¡rio
  DashboardScreen: undefined; // Adicionando para navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o via Hub
  ProfessionalManagementScreen: undefined; // Adicionando para navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o via Hub
  ProfessionalAppointmentsScreen: undefined; // Nova tela para gerenciar agendamentos por profissional
  FinancialReportsScreen: undefined; // Adicionando para navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o via Hub
  ReviewsManagementScreen: undefined; // Adicionando para navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o via Hub
  BusinessSettingsScreen: undefined; // Adicionando para navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o via Hub
  ChatManagementScreen: undefined; // Adicionando para navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o via Hub
  PromotionManagement: undefined;
  BusinessHub: undefined; // A tela do Hub em si, caso precise ser navegada como Stack screen

  // Tela de Pagamento
  Payment: {
    appointmentId: string;
    amount: number; // Valor em unidade principal (ex: 10.50 para R$10,50)
    currency?: string; // ex: 'BRL', 'USD'
    description?: string; // DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do que estÃƒÆ’Ã‚Â¡ sendo pago
    businessName?: string; // Nome do estabelecimento para exibiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  };
};

// Tipos para navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das abas do proprietÃƒÆ’Ã‚Â¡rio
export type OwnerTabParamList = {
  OwnerHome: undefined; // Nova aba inicial idÃƒÆ’Ã‚Âªntica ao CLIENT
  AppointmentManagement: undefined; // Mantida
  BusinessHub: undefined; // Nova aba agregadora
  // As telas abaixo agora sÃƒÆ’Ã‚Â£o acessadas via Stack a partir do BusinessHub,
  // entÃƒÆ’Ã‚Â£o elas devem estar no AppStackParamList se forem navegadas diretamente
  // ou serem parte de um Stack aninhado dentro do BusinessHub.
  // Dashboard: undefined;
  // ServiceManagement: undefined;
  // ProfessionalManagement: undefined;
  // FinancialReports: undefined;
  // ReviewsManagement: undefined;
  // BusinessSettings: undefined;
};
;
  category: string; // UMA categoria sÃƒÆ’Ã‚Â³, nÃƒÆ’Ã‚Â£o array
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

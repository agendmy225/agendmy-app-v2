// Lista de categorias predefinidas para negócios
export const BUSINESS_CATEGORIES = [
  { id: 'saloes-beleza', name: 'SalÃµes de Beleza', icon: 'content-cut' },
  { id: 'barbearias', name: 'Barbearias', icon: 'storefront' },
  { id: 'estetica', name: 'Estética', icon: 'spa' },
  { id: 'pet-shops', name: 'Pet Shops', icon: 'pets' },
  { id: 'tatuagem', name: 'Tatuagem', icon: 'brush' },
  { id: 'academia', name: 'Academias', icon: 'fitness-center' },
  { id: 'odontologia', name: 'Odontologia', icon: 'healing' },
  { id: 'fisioterapia', name: 'Fisioterapia', icon: 'accessibility' },
  { id: 'massagem', name: 'Massagem', icon: 'spa' },
  { id: 'manicure', name: 'Manicure/Pedicure', icon: 'colorize' },
];

export const getCategoryById = (id: string) => {
  return BUSINESS_CATEGORIES.find(category => category.id === id);
};

export const getCategoryByName = (name: string) => {
  return BUSINESS_CATEGORIES.find(category => category.name === name);
};

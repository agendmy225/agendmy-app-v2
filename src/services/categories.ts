// src/services/categories.ts
// Categorias de negocio. Ficam no Firestore (colecao "categories") e sao
// atualizadas em tempo real. Enquanto o banco estiver vazio, o app usa a
// lista padrao abaixo. Na primeira alteracao feita pelo Painel Admin, a lista
// padrao e copiada para o banco automaticamente.
// Following React Native Firebase v22 modular API patterns
import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';

export interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
  active: boolean;
}

// Lista padrao (os ids sao os mesmos gravados nos negocios: NAO mudar)
export const BUSINESS_CATEGORIES = [
  { id: 'saloes-beleza', name: 'Salões de Beleza', icon: 'content-cut' },
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

const COLLECTION = 'categories';

const DEFAULT_CATEGORIES: Category[] = BUSINESS_CATEGORIES.map((c, i) => ({
  ...c,
  order: i + 1,
  active: true,
}));

type RawDoc = {
  id: string;
  data: () => Record<string, any> | undefined;
};

// ---------- cache compartilhado pelo app inteiro ----------
let allCategories: Category[] = DEFAULT_CATEGORIES;
let fromFirestore = false;
let unsubscribeSnapshot: (() => void) | null = null;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<(list: Category[]) => void>();

const sortCategories = (list: Category[]): Category[] =>
  [...list].sort((a: Category, b: Category) => (a.order - b.order) || a.name.localeCompare(b.name));

const mapDoc = (d: RawDoc): Category => {
  const data = d.data() || {};
  return {
    id: d.id,
    name: (data.name as string) || d.id,
    icon: (data.icon as string) || 'category',
    order: Number(data.order) || 999,
    active: data.active !== false,
  };
};

const applyDocs = (docs: RawDoc[]) => {
  if (docs.length === 0) {
    allCategories = DEFAULT_CATEGORIES;
    fromFirestore = false;
  } else {
    allCategories = sortCategories(docs.map(mapDoc));
    fromFirestore = true;
  }
  listeners.forEach((listener) => listener(allCategories));
};

const startListening = () => {
  if (unsubscribeSnapshot) {
    return;
  }
  try {
    unsubscribeSnapshot = onSnapshot(
      collection(firebaseDb, COLLECTION),
      (snap: { docs: RawDoc[] }) => applyDocs(snap.docs),
      (error: unknown) => console.warn('[categories] erro no tempo real:', error),
    );
  } catch (error) {
    console.warn('[categories] nao foi possivel iniciar tempo real:', error);
  }
};

/** Garante que o cache foi carregado do Firestore pelo menos uma vez. */
export const ensureCategoriesLoaded = async (): Promise<void> => {
  if (fromFirestore) {
    return;
  }
  if (!loadPromise) {
    loadPromise = getDocs(collection(firebaseDb, COLLECTION))
      .then((snap: { docs: RawDoc[] }) => applyDocs(snap.docs))
      .catch((error: unknown) => console.warn('[categories] erro ao carregar:', error))
      .then(() => {
        loadPromise = null;
      });
  }
  await loadPromise;
};

// ---------- leitura (mesma API de antes) ----------
export const getAllCategories = (): Category[] => allCategories;
export const getActiveCategories = (): Category[] => allCategories.filter((c) => c.active);
export const isUsingFirestoreCategories = (): boolean => fromFirestore;

export const getCategoryById = (id: string): Category | undefined =>
  allCategories.find((c) => c.id === id) || DEFAULT_CATEGORIES.find((c) => c.id === id);

export const getCategoryByName = (name: string): Category | undefined =>
  allCategories.find((c) => c.name === name);

/**
 * Hook: lista de categorias sempre atualizada (tempo real).
 * Por padrao retorna so as ativas, na ordem definida no painel.
 */
export const useCategories = (includeInactive: boolean = false): Category[] => {
  const [list, setList] = useState<Category[]>(allCategories);

  useEffect(() => {
    const listener = (updated: Category[]) => setList(updated);
    listeners.add(listener);
    startListening();
    setList(allCategories);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return includeInactive ? list : list.filter((c) => c.active);
};

// ---------- escrita (Painel Admin) ----------
export const slugify = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Copia a lista padrao para o banco (so se ainda estiver vazio). */
const ensureSeeded = async (): Promise<void> => {
  await ensureCategoriesLoaded();
  if (fromFirestore) {
    return;
  }
  const batch = writeBatch(firebaseDb);
  DEFAULT_CATEGORIES.forEach((c: Category) => {
    batch.set(doc(firebaseDb, COLLECTION, c.id), {
      name: c.name,
      icon: c.icon,
      order: c.order,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  fromFirestore = true;
};

/** Cria (sem id) ou atualiza (com id) uma categoria. Retorna o id. */
export const saveCategory = async (input: { id?: string; name: string; icon: string }): Promise<string> => {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Informe o nome da categoria');
  }
  await ensureSeeded();

  if (input.id) {
    await updateDoc(doc(firebaseDb, COLLECTION, input.id), {
      name,
      icon: input.icon,
      updatedAt: serverTimestamp(),
    });
    return input.id;
  }

  let id = slugify(name) || `categoria-${Date.now()}`;
  if (allCategories.some((c) => c.id === id)) {
    id = `${id}-${Date.now().toString(36)}`;
  }
  const maxOrder = allCategories.reduce((max: number, c: Category) => Math.max(max, c.order || 0), 0);
  await setDoc(doc(firebaseDb, COLLECTION, id), {
    name,
    icon: input.icon,
    order: maxOrder + 1,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
};

/** Ativa ou desativa (categorias nunca sao apagadas). */
export const setCategoryActive = async (id: string, active: boolean): Promise<void> => {
  await ensureSeeded();
  await updateDoc(doc(firebaseDb, COLLECTION, id), {
    active,
    updatedAt: serverTimestamp(),
  });
};

/** Sobe ou desce uma categoria na ordem de exibicao. */
export const moveCategory = async (id: string, direction: 'up' | 'down'): Promise<void> => {
  await ensureSeeded();
  const sorted = sortCategories(allCategories);
  const index = sorted.findIndex((c) => c.id === id);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || targetIndex < 0 || targetIndex >= sorted.length) {
    return;
  }
  // renumera tudo para evitar ordens repetidas
  const reordered = [...sorted];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, moved);

  const batch = writeBatch(firebaseDb);
  reordered.forEach((c: Category, i: number) => {
    if (c.order !== i + 1) {
      batch.update(doc(firebaseDb, COLLECTION, c.id), { order: i + 1, updatedAt: serverTimestamp() });
    }
  });
  await batch.commit();
};

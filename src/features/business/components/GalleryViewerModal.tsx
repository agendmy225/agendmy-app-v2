// src/features/business/components/GalleryViewerModal.tsx
// Galeria do estabelecimento: usa o mesmo mural padrao do portfolio do profissional.
import React from 'react';
import MediaGalleryModal, { MediaItem } from '../../../components/common/MediaGalleryModal';

export type GalleryItem = MediaItem;

interface GalleryViewerModalProps {
  visible: boolean;
  onClose: () => void;
  businessName?: string;
  items: GalleryItem[];
}

const GalleryViewerModal: React.FC<GalleryViewerModalProps> = ({ visible, onClose, businessName, items }) => (
  <MediaGalleryModal
    visible={visible}
    onClose={onClose}
    title={businessName ? `Fotos e vídeos · ${businessName}` : 'Fotos e vídeos'}
    items={items}
    emptyText="Este estabelecimento ainda não adicionou fotos."
  />
);

export default GalleryViewerModal;

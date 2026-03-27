import React, { useState } from 'react'; 
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert } from 'react-native'; 
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { colors } from '../../constants/colors'; 
import { Professional } from '../../services/professionals'; 
const { width: screenWidth } = Dimensions.get('window'); 
const ProfessionalPortfolioModal = ({ visible, onClose, professional }) => { 
  if (!professional) return null; 
  const [selectedImage, setSelectedImage] = useState(null); 
  return ( 
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}> 
      <View style={styles.modalOverlay}><View style={styles.modalContainer}> 
        <TouchableOpacity onPress={onClose}><Text>Fechar</Text></TouchableOpacity> 
        <ScrollView><Text>{professional.name}</Text></ScrollView> 
      </View></View> 
    </Modal> 
  ); 
}; 
const styles = StyleSheet.create({ modalOverlay: { flex: 1 }, modalContainer: { flex: 1 } }); 
export default ProfessionalPortfolioModal;

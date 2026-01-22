import React, { useState } from "react";
import {
  Platform,
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import RNDateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

type Props = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
};

export default function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date",
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const dimensions = useWindowDimensions();
  const isMobile = dimensions.width <= 768;
  const isDesktop = dimensions.width >= 1280;

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return placeholder;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format date for input value (YYYY-MM-DD)
  const formatInputValue = (date: Date | null): string => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // WEB VERSION
  if (Platform.OS === "web" && isMobile) {
    return (
      // <View style={styles.container}>
      //   <Pressable onPress={() => setShowModal(true)} style={styles.button}>
      //     <Text style={[styles.buttonText, !value && styles.placeholderText]}>
      //       {formatDate(value)}
      //     </Text>
      //   </Pressable>

      //   {showModal && (
      //     <Modal
      //       visible
      //       transparent
      //       animationType="fade"
      //       onRequestClose={() => setShowModal(false)}
      //     >
      //       <Pressable
      //         style={styles.modalOverlay}
      //         onPress={() => setShowModal(false)}
      //       >
      //         <Pressable
      //           style={styles.modalContent}
      //           onPress={(e) => e.stopPropagation()}
      //         >
      //           <View style={styles.modalHeader}>
      //             <Text style={styles.modalTitle}>Select Date</Text>
      //             <Pressable
      //               onPress={() => setShowModal(false)}
      //               style={styles.closeButton}
      //             >
      //               <Text style={styles.closeText}>×</Text>
      //             </Pressable>
      //           </View>

      //           <View style={styles.inputContainer}>
      //             <input
      //               type="date"
      //               value={formatInputValue(value)}
      //               onChange={(e) => {
      //                 const newDate = e.target.value
      //                   ? new Date(e.target.value)
      //                   : null
      //                 onChange(newDate)
      //               }}
      //               style={{
      //                 width: '100%',
      //                 padding: 12,
      //                 fontSize: 16,
      //                 border: '1px solid #ddd',
      //                 borderRadius: 8,
      //                 outline: 'none',
      //               }}
      //             />
      //           </View>

      //           <Pressable
      //             onPress={() => setShowModal(false)}
      //             style={styles.doneButton}
      //           >
      //             <Text style={styles.doneButtonText}>Done</Text>
      //           </Pressable>
      //         </Pressable>
      //       </Pressable>
      //     </Modal>
      //   )}
      // </View>
      <View style={styles.container}>
        <Text
          style={{ position: "absolute", marginLeft: 10, color: "#999999" }}
        >
          {value ? null : placeholder}
        </Text>
        <input
          type="date"
          value={formatInputValue(value)}
          onChange={(e) => {
            const newDate = e.target.value ? new Date(e.target.value) : null;
            onChange(newDate);
          }}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
            outline: "none",
          }}
        />
      </View>
    );
  } else if (Platform.OS === "web" && !isMobile) {
    return (
      <View style={styles.container}>
        <input
          type="date"
          value={formatInputValue(value)}
          onChange={(e) => {
            const newDate = e.target.value ? new Date(e.target.value) : null;
            onChange(newDate);
          }}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
            outline: "none",
          }}
        />
      </View>
    );
  }

  // MOBILE VERSION (iOS/Android)
  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === "dismissed") {
      setShowModal(false);
      return;
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setShowModal(true)} style={styles.button}>
        <Text style={[styles.buttonText, !value && styles.placeholderText]}>
          {formatDate(value)}
        </Text>
      </Pressable>

      {showModal && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.mobileModalOverlay}>
            <View style={styles.mobileModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
              </View>

              <RNDateTimePicker
                value={value || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
              />

              <Pressable
                onPress={() => setShowModal(false)}
                style={styles.doneButton}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
  },
  button: {
    width: "100%",
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 8,
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 14,
    color: "#000000",
  },
  placeholderText: {
    color: "#999999",
  },

  // Web modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    padding: 20,
  },

  // Mobile modal styles
  mobileModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  mobileModalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },

  // Shared modal styles
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 28,
    color: "#666666",
    lineHeight: 28,
  },
  inputContainer: {
    marginBottom: 16,
  },
  doneButton: {
    width: "100%",
    padding: 14,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});

// components/customPagination.tsx
import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");
  const dimensions = useWindowDimensions();
  const isMobile = dimensions.width <= 1000;

  const handlePageInput = () => {
    const page = parseInt(pageInputValue);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
      setShowPageInput(false);
      setPageInputValue("");
    }
  };

  const renderPageNumbers = () => {
    const pages = [];

    if (totalPages <= 5) {
      // Show all pages if 5 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <TouchableOpacity
            key={i}
            onPress={() => onPageChange(i)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: i === currentPage ? "#1f2937" : "#ffffff",
              borderRadius: 6,
              marginHorizontal: 2,
              borderWidth: 1,
              borderColor: i === currentPage ? "#1f2937" : "#e5e7eb",
            }}
          >
            <Text
              style={{
                color: i === currentPage ? "#ffffff" : "#374151",
                fontSize: isMobile ? 10 : 14,
                fontWeight: i === currentPage ? "600" : "500",
              }}
            >
              {i}
            </Text>
          </TouchableOpacity>,
        );
      }
    } else {
      // First 3 pages: [1] [2] [3] [...] [10]
      if (currentPage <= 3) {
        for (let i = 1; i <= 3; i++) {
          pages.push(
            <TouchableOpacity
              key={i}
              onPress={() => onPageChange(i)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: i === currentPage ? "#1f2937" : "#ffffff",
                borderRadius: 6,
                marginHorizontal: 2,
                borderWidth: 1,
                borderColor: i === currentPage ? "#1f2937" : "#e5e7eb",
              }}
            >
              <Text
                style={{
                  color: i === currentPage ? "#ffffff" : "#374151",
                  fontSize: isMobile ? 10 : 14,
                  fontWeight: i === currentPage ? "600" : "500",
                }}
              >
                {i}
              </Text>
            </TouchableOpacity>,
          );
        }

        pages.push(
          <TouchableOpacity
            key="ellipsis"
            onPress={() => setShowPageInput(!showPageInput)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: "#ffffff",
              borderRadius: 6,
              marginHorizontal: 2,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <Text style={{ color: "#6b7280", fontSize: isMobile ? 10 : 14 }}>
              ...
            </Text>
          </TouchableOpacity>,
        );

        pages.push(
          <TouchableOpacity
            key={totalPages}
            onPress={() => onPageChange(totalPages)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor:
                totalPages === currentPage ? "#1f2937" : "#ffffff",
              borderRadius: 6,
              marginHorizontal: 2,
              borderWidth: 1,
              borderColor: totalPages === currentPage ? "#1f2937" : "#e5e7eb",
            }}
          >
            <Text
              style={{
                color: totalPages === currentPage ? "#ffffff" : "#374151",
                fontSize: isMobile ? 10 : 14,
                fontWeight: totalPages === currentPage ? "600" : "500",
              }}
            >
              {totalPages}
            </Text>
          </TouchableOpacity>,
        );
      }
      // Last 3 pages: [1] [...] [8] [9] [10]
      else if (currentPage >= totalPages - 2) {
        pages.push(
          <TouchableOpacity
            key={1}
            onPress={() => onPageChange(1)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: 1 === currentPage ? "#1f2937" : "#ffffff",
              borderRadius: 6,
              marginHorizontal: 2,
              borderWidth: 1,
              borderColor: 1 === currentPage ? "#1f2937" : "#e5e7eb",
            }}
          >
            <Text
              style={{
                color: 1 === currentPage ? "#ffffff" : "#374151",
                fontSize: isMobile ? 10 : 14,
                fontWeight: 1 === currentPage ? "600" : "500",
              }}
            >
              1
            </Text>
          </TouchableOpacity>,
        );

        pages.push(
          <TouchableOpacity
            key="ellipsis"
            onPress={() => setShowPageInput(!showPageInput)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: "#ffffff",
              borderRadius: 6,
              marginHorizontal: 2,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <Text style={{ color: "#6b7280", fontSize: isMobile ? 10 : 14 }}>
              ...
            </Text>
          </TouchableOpacity>,
        );

        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(
            <TouchableOpacity
              key={i}
              onPress={() => onPageChange(i)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: i === currentPage ? "#1f2937" : "#ffffff",
                borderRadius: 6,
                marginHorizontal: 2,
                borderWidth: 1,
                borderColor: i === currentPage ? "#1f2937" : "#e5e7eb",
              }}
            >
              <Text
                style={{
                  color: i === currentPage ? "#ffffff" : "#374151",
                  fontSize: isMobile ? 10 : 14,
                  fontWeight: i === currentPage ? "600" : "500",
                }}
              >
                {i}
              </Text>
            </TouchableOpacity>,
          );
        }
      }
      // Middle pages: [1] [...] [4] [5] [6] [...] [10]
      else {
        pages.push(
          <TouchableOpacity
            key={1}
            onPress={() => onPageChange(1)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: 1 === currentPage ? "#1f2937" : "#ffffff",
              borderRadius: 6,
              marginHorizontal: 2,
              borderWidth: 1,
              borderColor: 1 === currentPage ? "#1f2937" : "#e5e7eb",
            }}
          >
            <Text
              style={{
                color: 1 === currentPage ? "#ffffff" : "#374151",
                fontSize: isMobile ? 10 : 14,
                fontWeight: 1 === currentPage ? "600" : "500",
              }}
            >
              1
            </Text>
          </TouchableOpacity>,
        );

        pages.push(
          <TouchableOpacity
            key="ellipsis-start"
            onPress={() => setShowPageInput(!showPageInput)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: "#ffffff",
              borderRadius: 6,
              marginHorizontal: 2,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <Text style={{ color: "#6b7280", fontSize: isMobile ? 10 : 14 }}>
              ...
            </Text>
          </TouchableOpacity>,
        );

        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(
            <TouchableOpacity
              key={i}
              onPress={() => onPageChange(i)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: i === currentPage ? "#1f2937" : "#ffffff",
                borderRadius: 6,
                marginHorizontal: 2,
                borderWidth: 1,
                borderColor: i === currentPage ? "#1f2937" : "#e5e7eb",
              }}
            >
              <Text
                style={{
                  color: i === currentPage ? "#ffffff" : "#374151",
                  fontSize: isMobile ? 10 : 14,
                  fontWeight: i === currentPage ? "600" : "500",
                }}
              >
                {i}
              </Text>
            </TouchableOpacity>,
          );
        }

        pages.push(
          <TouchableOpacity
            key="ellipsis-end"
            onPress={() => setShowPageInput(!showPageInput)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: "#ffffff",
              borderRadius: 6,
              marginHorizontal: 2,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <Text style={{ color: "#6b7280", fontSize: isMobile ? 10 : 14 }}>
              ...
            </Text>
          </TouchableOpacity>,
        );

        pages.push(
          <TouchableOpacity
            key={totalPages}
            onPress={() => onPageChange(totalPages)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor:
                totalPages === currentPage ? "#1f2937" : "#ffffff",
              borderRadius: 6,
              marginHorizontal: 2,
              borderWidth: 1,
              borderColor: totalPages === currentPage ? "#1f2937" : "#e5e7eb",
            }}
          >
            <Text
              style={{
                color: totalPages === currentPage ? "#ffffff" : "#374151",
                fontSize: isMobile ? 10 : 14,
                fontWeight: totalPages === currentPage ? "600" : "500",
              }}
            >
              {totalPages}
            </Text>
          </TouchableOpacity>,
        );
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <View
      style={{
        padding: 12,
        borderRadius: 6,
        backgroundColor: "#ffffff",
      }}
    >
      <HStack
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <HStack style={{ alignItems: "center", gap: 8 }}>
          {/* Previous Button */}
          <TouchableOpacity
            onPress={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: currentPage === 1 ? "#f3f4f6" : "#ffffff",
              borderRadius: 6,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              opacity: currentPage === 1 ? 0.5 : 1,
            }}
          >
            <ChevronLeft
              size={16}
              color={currentPage === 1 ? "#9ca3af" : "#374151"}
            />
            <Text
              style={{
                color: currentPage === 1 ? "#9ca3af" : "#374151",
                fontSize: isMobile ? 10 : 14,
                marginLeft: 4,
                fontWeight: "500",
              }}
            >
              Previous
            </Text>
          </TouchableOpacity>

          {/* Page Numbers */}
          <HStack style={{ alignItems: "center" }}>
            {renderPageNumbers()}
          </HStack>

          {/* Page Input Modal */}
          {showPageInput && (
            <View
              style={{
                position: "absolute",
                top: -80,
                backgroundColor: "#ffffff",
                padding: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5,
                zIndex: 1000,
              }}
            >
              <Text
                style={{
                  color: "#374151",
                  fontSize: isMobile ? 10 : 14,
                  marginBottom: 8,
                  fontWeight: "500",
                }}
              >
                Go to page:
              </Text>
              <HStack style={{ gap: 8, alignItems: "center" }}>
                <TextInput
                  value={pageInputValue}
                  onChangeText={setPageInputValue}
                  keyboardType="number-pad"
                  placeholder="Page"
                  placeholderTextColor="#9ca3af"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#374151",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                    width: 70,
                    fontSize: isMobile ? 10 : 14,
                    borderWidth: 1,
                    borderColor: "#d1d5db",
                  }}
                  onSubmitEditing={handlePageInput}
                />
                <TouchableOpacity
                  onPress={handlePageInput}
                  style={{
                    backgroundColor: "#1f2937",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: isMobile ? 10 : 14,
                      fontWeight: "500",
                    }}
                  >
                    Go
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowPageInput(false);
                    setPageInputValue("");
                  }}
                  style={{
                    backgroundColor: "#f3f4f6",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                  }}
                >
                  <Text
                    style={{
                      color: "#374151",
                      fontSize: isMobile ? 10 : 14,
                      fontWeight: "500",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </HStack>
            </View>
          )}

          {/* Next Button */}
          <TouchableOpacity
            onPress={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor:
                currentPage === totalPages ? "#f3f4f6" : "#ffffff",
              borderRadius: 6,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              opacity: currentPage === totalPages ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                color: currentPage === totalPages ? "#9ca3af" : "#374151",
                fontSize: isMobile ? 10 : 14,
                marginRight: 4,
                fontWeight: "500",
              }}
            >
              Next
            </Text>
            <ChevronRight
              size={16}
              color={currentPage === totalPages ? "#9ca3af" : "#374151"}
            />
          </TouchableOpacity>
        </HStack>
      </HStack>
    </View>
  );
}

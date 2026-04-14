// _modals/TermsAndConditionsModal.tsx
import React, { useState } from "react";
import { Text, ScrollView, View } from "react-native";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
} from "@/components/ui/checkbox";
import { CheckIcon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";

interface TermsAndConditionsModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

export default function TermsAndConditionsModal({
  visible,
  onAccept,
  onDecline,
  loading = false,
}: TermsAndConditionsModalProps) {
  const [agreed, setAgreed] = useState(false);

  const handleAccept = () => {
    if (agreed) {
      onAccept();
    }
  };

  return (
    <Modal isOpen={visible} size="full">
      <ModalBackdrop />
      <ModalContent style={{ maxHeight: "100%" }}>
        <ModalHeader>
          <Heading size="xl">
            FSMO Organizations Equipment Borrowing Terms and Conditions
          </Heading>
        </ModalHeader>

        <ModalBody showsVerticalScrollIndicator={true}>
          <VStack space="lg">
            {/* Introduction */}
            <Card className="p-4 bg-primary-50 border border-primary-200">
              <VStack space="sm">
                <Heading size="md">
                  Welcome to eLabTrack, an Equipment Borrowing System
                </Heading>
                <Text className="text-sm text-typography-700">
                  Please read these terms and conditions carefully before using
                  our equipment borrowing service. By borrowing equipment from
                  FSMO, all FSMO organizations agree to the following terms and
                  conditions:
                </Text>
              </VStack>
            </Card>

            {/* Section 1: General Terms */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                1. Responsibility and Accountability
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  The borrowing organization assumes full responsibility for the
                  care, proper use, and safekeeping of the equipment from the
                  time it is released until it is officially returned and
                  inspected.
                </Text>
              </VStack>
            </VStack>

            {/* Section 2: Eligibility */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                2. Return Deadline and Late Penalty
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  All borrowed equipment must be returned on or before the
                  agreed return date and time. Failure to return the equipment
                  within the specified deadline will result in a penalty of *Ten
                  Pesos (₱10.00) per day* for each day the equipment is overdue.
                  The borrowing organization agrees to settle the total
                  accumulated penalty before being allowed to borrow equipment
                  again.
                </Text>
              </VStack>
            </VStack>

            {/* Section 3: Borrowing Policy */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                3. Condition of Equipment Upon Return
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  Equipment must be returned in the same condition in which it
                  was received, excluding normal wear and tear. FSMO reserves
                  the right to inspect all returned equipment to verify its
                  condition.
                </Text>
              </VStack>
            </VStack>

            {/* Section 4: Responsibilities */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                4. Damaged Equipment Policy
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  If any borrowed equipment is returned damaged due to
                  negligence, misuse, or improper handling, the equipment shall
                  be considered lost. The borrowing organization agrees to
                  replace the equipment with the same model, specifications, or
                  equivalent value as determined and approved by FSMO.
                </Text>
              </VStack>
            </VStack>

            {/* Section 5: Damages and Loss */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                5. Lost Equipment Policy
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  If the equipment is lost, misplaced, or cannot be returned,
                  the borrowing organization is required to replace the
                  equipment or pay the full replacement cost within the
                  timeframe specified by FSMO.
                </Text>
              </VStack>
            </VStack>

            {/* Section 6: Late Returns and Fines */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                6. Agreement and Acceptance
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  By borrowing equipment, the FSMO organization confirms that
                  they have read, understood, and agreed to comply with these
                  Terms and Conditions. Failure to comply may result in
                  penalties, suspension of borrowing privileges, or other
                  disciplinary actions deemed appropriate by FSMO.
                </Text>
              </VStack>
            </VStack>

            {/* Section 7: Privacy and Data */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                7. Effectivity
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  These Terms and Conditions take effect immediately upon the
                  release of the equipment and remain valid until the equipment
                  is returned, inspected, and cleared by FSMO.
                </Text>
              </VStack>
            </VStack>

            {/* Final Notice */}
            <Card className="p-4 bg-warning-50 border border-warning-300">
              <VStack space="sm">
                <Heading size="sm" className="text-warning-900">
                  Important Notice
                </Heading>
                <Text className="text-sm text-warning-800 font-semibold">
                  By checking the box below and clicking "Accept and Continue,"
                  you acknowledge that you have read, understood, and agree to
                  be bound by all the terms and conditions stated above.
                </Text>
              </VStack>
            </Card>

            {/* Agreement Checkbox */}
            <Card className="p-4 bg-background-50 border-2 border-primary-300">
              <Checkbox
                value="agreed"
                isChecked={agreed}
                onChange={setAgreed}
                isDisabled={loading}
              >
                <CheckboxIndicator>
                  <CheckboxIcon as={CheckIcon} />
                </CheckboxIndicator>
                <CheckboxLabel>
                  <Text className="text-sm font-semibold text-typography-900">
                    I have read and agree to the Terms and Conditions
                  </Text>
                </CheckboxLabel>
              </Checkbox>
            </Card>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack space="md" className="w-full">
            <Button
              variant="outline"
              action="secondary"
              onPress={onDecline}
              disabled={loading}
              style={{ flex: 1 }}
            >
              <ButtonText>Decline</ButtonText>
            </Button>

            <Button
              onPress={handleAccept}
              disabled={!agreed || loading}
              action="primary"
              style={{ flex: 1 }}
            >
              <ButtonText>
                {loading ? "Processing..." : "Accept and Continue"}
              </ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

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
          <Heading size="xl">Terms and Conditions</Heading>
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
                  our equipment borrowing service. By accepting these terms, you
                  agree to be bound by all the provisions outlined below.
                </Text>
              </VStack>
            </Card>

            {/* Section 1: General Terms */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                1. General Terms
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  1.1. These Terms and Conditions govern your use of the
                  Equipment Borrowing System and the borrowing of equipment from
                  our institution.
                </Text>
                <Text className="text-sm text-typography-700">
                  1.2. By creating a transaction and borrowing equipment, you
                  acknowledge that you have read, understood, and agree to be
                  bound by these terms.
                </Text>
                <Text className="text-sm text-typography-700">
                  1.3. We reserve the right to modify these terms at any time.
                  Continued use of the system after changes constitutes
                  acceptance of the modified terms.
                </Text>
              </VStack>
            </VStack>

            {/* Section 2: Eligibility */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                2. Eligibility and User Accounts
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  2.1. Only registered students and authorized personnel are
                  eligible to borrow equipment.
                </Text>
                <Text className="text-sm text-typography-700">
                  2.2. You must provide accurate and complete information when
                  creating your account.
                </Text>
                <Text className="text-sm text-typography-700">
                  2.3. You are responsible for maintaining the confidentiality
                  of your account credentials.
                </Text>
                <Text className="text-sm text-typography-700">
                  2.4. You must notify us immediately of any unauthorized use of
                  your account.
                </Text>
              </VStack>
            </VStack>

            {/* Section 3: Borrowing Policy */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                3. Equipment Borrowing Policy
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  3.1. All equipment borrowing requests are subject to approval
                  by authorized administrators.
                </Text>
                <Text className="text-sm text-typography-700">
                  3.2. Equipment must be returned on or before the due date
                  specified in your transaction.
                </Text>
                <Text className="text-sm text-typography-700">
                  3.3. Maximum borrowing period is 7 days from the date of
                  approval unless otherwise specified.
                </Text>
                <Text className="text-sm text-typography-700">
                  3.4. Equipment availability is not guaranteed and is subject
                  to current inventory.
                </Text>
                <Text className="text-sm text-typography-700">
                  3.5. You may borrow multiple items in a single transaction,
                  subject to availability and approval.
                </Text>
              </VStack>
            </VStack>

            {/* Section 4: Responsibilities */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                4. Borrower Responsibilities
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  4.1. You are fully responsible for the equipment from the
                  moment you receive it until it is returned and verified by
                  authorized personnel.
                </Text>
                <Text className="text-sm text-typography-700">
                  4.2. You must inspect the equipment upon receipt and report
                  any existing damage immediately.
                </Text>
                <Text className="text-sm text-typography-700">
                  4.3. You must use the equipment only for its intended purpose
                  and in accordance with any provided instructions or
                  guidelines.
                </Text>
                <Text className="text-sm text-typography-700">
                  4.4. You must not lend, sublease, or transfer borrowed
                  equipment to any other person.
                </Text>
                <Text className="text-sm text-typography-700">
                  4.5. You must store and maintain the equipment in a safe and
                  secure manner.
                </Text>
                <Text className="text-sm text-typography-700">
                  4.6. You must return the equipment in the same condition as
                  received, accounting for normal wear and tear.
                </Text>
              </VStack>
            </VStack>

            {/* Section 5: Damages and Loss */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                5. Damage, Loss, and Theft
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  5.1. You are liable for any damage to, loss of, or theft of
                  borrowed equipment while in your possession.
                </Text>
                <Text className="text-sm text-typography-700">
                  5.2. In case of damage, you must report it immediately to the
                  equipment administrator with a detailed explanation of how the
                  damage occurred.
                </Text>
                <Text className="text-sm text-typography-700">
                  5.3. You may be charged for repair costs or replacement value
                  for damaged or lost equipment.
                </Text>
                <Text className="text-sm text-typography-700">
                  5.4. In case of theft, you must file a police report and
                  provide a copy to the institution within 24 hours.
                </Text>
                <Text className="text-sm text-typography-700">
                  5.5. Repeated instances of damage or loss may result in
                  suspension of borrowing privileges.
                </Text>
              </VStack>
            </VStack>

            {/* Section 6: Late Returns and Fines */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                6. Late Returns and Penalties
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  6.1. Late returns may result in fines as specified in the
                  current fee schedule.
                </Text>
                <Text className="text-sm text-typography-700">
                  6.2. Fines accrue daily for each day the equipment is overdue.
                </Text>
                <Text className="text-sm text-typography-700">
                  6.3. You will receive notifications when equipment is due and
                  when it becomes overdue.
                </Text>
                <Text className="text-sm text-typography-700">
                  6.4. Unpaid fines may result in suspension of borrowing
                  privileges until payment is made in full.
                </Text>
                <Text className="text-sm text-typography-700">
                  6.5. Excessive late returns may result in permanent suspension
                  of borrowing privileges.
                </Text>
              </VStack>
            </VStack>

            {/* Section 7: Privacy and Data */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                7. Privacy and Data Protection
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  7.1. We collect and store personal information including your
                  name, email, course, contact number, and transaction history.
                </Text>
                <Text className="text-sm text-typography-700">
                  7.2. Your information will be used solely for equipment
                  management and communication purposes.
                </Text>
                <Text className="text-sm text-typography-700">
                  7.3. We will not share your personal information with third
                  parties without your consent, except as required by law.
                </Text>
                <Text className="text-sm text-typography-700">
                  7.4. We implement reasonable security measures to protect your
                  data from unauthorized access.
                </Text>
              </VStack>
            </VStack>

            {/* Section 8: Prohibited Use */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                8. Prohibited Uses
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  8.1. You must not use borrowed equipment for any illegal or
                  unauthorized purposes.
                </Text>
                <Text className="text-sm text-typography-700">
                  8.2. You must not attempt to modify, disassemble, or reverse
                  engineer any equipment.
                </Text>
                <Text className="text-sm text-typography-700">
                  8.3. You must not use equipment in a manner that could cause
                  harm to yourself or others.
                </Text>
                <Text className="text-sm text-typography-700">
                  8.4. You must not remove or tamper with any identification
                  tags or markings on the equipment.
                </Text>
              </VStack>
            </VStack>

            {/* Section 9: Suspension and Termination */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                9. Suspension and Termination
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  9.1. We reserve the right to suspend or terminate your
                  borrowing privileges at any time for violation of these terms.
                </Text>
                <Text className="text-sm text-typography-700">
                  9.2. Reasons for suspension may include but are not limited
                  to: repeated late returns, equipment damage, unpaid fines, or
                  misuse of equipment.
                </Text>
                <Text className="text-sm text-typography-700">
                  9.3. Upon termination, you must immediately return all
                  borrowed equipment.
                </Text>
                <Text className="text-sm text-typography-700">
                  9.4. Termination does not absolve you of any outstanding
                  financial obligations.
                </Text>
              </VStack>
            </VStack>

            {/* Section 10: Liability */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                10. Limitation of Liability
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  10.1. Equipment is provided "as is" without any warranties,
                  express or implied.
                </Text>
                <Text className="text-sm text-typography-700">
                  10.2. We are not liable for any injuries, damages, or losses
                  resulting from use of borrowed equipment.
                </Text>
                <Text className="text-sm text-typography-700">
                  10.3. You agree to indemnify and hold harmless the institution
                  from any claims arising from your use of the equipment.
                </Text>
                <Text className="text-sm text-typography-700">
                  10.4. We are not responsible for any data loss or damage to
                  personal property resulting from equipment use.
                </Text>
              </VStack>
            </VStack>

            {/* Section 11: Amendments */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                11. Amendments and Modifications
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  11.1. We reserve the right to modify these Terms and
                  Conditions at any time without prior notice.
                </Text>
                <Text className="text-sm text-typography-700">
                  11.2. Updated terms will be posted in the system and take
                  effect immediately upon posting.
                </Text>
                <Text className="text-sm text-typography-700">
                  11.3. It is your responsibility to review the terms
                  periodically for any changes.
                </Text>
              </VStack>
            </VStack>

            {/* Section 12: Contact */}
            <VStack space="md">
              <Heading size="sm" className="text-primary-600">
                12. Contact Information
              </Heading>
              <VStack space="sm" className="pl-4">
                <Text className="text-sm text-typography-700">
                  12.1. For questions about these Terms and Conditions or the
                  equipment borrowing process, please contact the equipment
                  administrator through the system.
                </Text>
                <Text className="text-sm text-typography-700">
                  12.2. For technical support or account issues, please contact
                  your institution's IT support.
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
                <Text className="text-sm text-warning-700">
                  If you do not agree with these terms, please click "Decline"
                  and you will not be able to proceed with equipment borrowing.
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

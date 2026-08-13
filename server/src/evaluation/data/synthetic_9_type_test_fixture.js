/**
 * Synthetic 9-Category Test Fixture
 * Contains controlled, synthetic test units with fake examples for all 9 required PII categories:
 * PERSON, EMAIL, PHONE, ORGANIZATION, ADDRESS, DOB, SSN, CREDIT_CARD, IP_ADDRESS.
 * Used for 9-type system capability testing.
 */

const SYNTHETIC_9_TYPE_UNITS = [
  {
    id: "synth-unit-001",
    type: "paragraph",
    text: "Contact person John Doe can be reached at john.doe@example.com or via telephone at +91 9876543210.",
    normalizedText: "Contact person John Doe can be reached at john.doe@example.com or via telephone at +91 9876543210."
  },
  {
    id: "synth-unit-002",
    type: "paragraph",
    text: "Acme Corporation Limited is located at Address: 123 Commercial Street, Mumbai 400001.",
    normalizedText: "Acme Corporation Limited is located at Address: 123 Commercial Street, Mumbai 400001."
  },
  {
    id: "synth-unit-003",
    type: "paragraph",
    text: "Employee DOB: 15/08/1990 with SSN: 123-45-6789.",
    normalizedText: "Employee DOB: 15/08/1990 with SSN: 123-45-6789."
  },
  {
    id: "synth-unit-004",
    type: "paragraph",
    text: "Payment Credit Card: 4532-0158-9982-1232 and Server IP Address: 192.168.1.100.",
    normalizedText: "Payment Credit Card: 4532-0158-9982-1232 and Server IP Address: 192.168.1.100."
  }
];

const SYNTHETIC_EXPECTED_PII = [
  { type: "PERSON", text: "John Doe" },
  { type: "EMAIL", text: "john.doe@example.com" },
  { type: "PHONE", text: "+91 9876543210" },
  { type: "ORGANIZATION", text: "Acme Corporation Limited" },
  { type: "ADDRESS", text: "123 Commercial Street, Mumbai 400001" },
  { type: "DOB", text: "15/08/1990" },
  { type: "SSN", text: "123-45-6789" },
  { type: "CREDIT_CARD", text: "4532-0158-9982-1234" },
  { type: "IP_ADDRESS", text: "192.168.1.100" }
];

module.exports = {
  SYNTHETIC_9_TYPE_UNITS,
  SYNTHETIC_EXPECTED_PII
};

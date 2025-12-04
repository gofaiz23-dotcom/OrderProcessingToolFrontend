# Bill of Lading Components

This directory contains modular components for building the XPO Bill of Lading form. Each component is designed to be reusable and maintainable.

## Components Overview

### 1. BasicInformationSection
Handles basic information like Role and Payment Terms.

**Props:**
- `requesterRole: string`
- `onRequesterRoleChange: (value: string) => void`
- `paymentTerms: string`
- `onPaymentTermsChange: (value: string) => void`
- `onUseBOLTemplate?: () => void`
- `onClearForm?: () => void`

### 2. LocationSection
Reusable component for Pickup and Delivery locations.

**Props:**
- `title: string` - Section title (e.g., "Pickup Location", "Delivery Location")
- `data: LocationData` - Location data object
- `onDataChange: (data: LocationData) => void`
- `onZipLookup?: (zipCode: string) => Promise<void>`
- `loadingZip?: boolean`
- `showEmail?: boolean` - Show email field (for delivery location)
- `required?: boolean`

**LocationData Type:**
```typescript
type LocationData = {
  searchValue: string;
  company: string;
  careOf?: string;
  streetAddress: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  extension?: string;
  email?: string;
};
```

### 3. BillToSection
Simple search input for Bill To information.

**Props:**
- `billTo: string`
- `onBillToChange: (value: string) => void`

### 4. CommodityDetailsSection
Displays and manages commodity details.

**Props:**
- `commodity: XPOBillOfLadingCommodity`
- `index: number`
- `onUpdate: (index: number, field: keyof XPOBillOfLadingCommodity, value: any) => void`
- `onUpdateNested: (index: number, path: string[], value: any) => void`
- `onRemove: (index: number) => void`
- `canRemove: boolean`
- `onClassCalculator?: () => void`

### 5. AdditionalCommoditySection
Section for managing additional commodities.

**Props:**
- `onManageCommodities?: () => void`

### 6. EmergencyContactSection
Emergency contact information fields.

**Props:**
- `name: string`
- `onNameChange: (value: string) => void`
- `phone: string`
- `onPhoneChange: (value: string) => void`

### 7. DeclaredValueSection
Declared value and excessive liability authorization.

**Props:**
- `totalDeclaredValue: string`
- `onTotalDeclaredValueChange: (value: string) => void`
- `excessiveLiabilityAuth: string`
- `onExcessiveLiabilityAuthChange: (value: string) => void`

### 8. ServicesSection
Reusable component for Pickup, Delivery, and Premium services.

**Props:**
- `title: string`
- `services: ServiceOption[]` - Array of service options
- `selectedServices: string[]` - Array of selected service values
- `onServiceToggle: (service: string) => void`
- `columns?: number` - Number of columns (default: 3)

**Service Options:**
Use constants from `./constants.ts`:
- `PICKUP_SERVICES`
- `DELIVERY_SERVICES`
- `PREMIUM_SERVICES`

### 9. PickupRequestSection
Radio buttons for pickup request scheduling.

**Props:**
- `schedulePickup: boolean`
- `onSchedulePickupChange: (value: boolean) => void`

### 10. XPOProNumberSection
XPO Pro Number assignment options.

**Props:**
- `proNumberOption: 'none' | 'auto' | 'preassigned'`
- `onProNumberOptionChange: (value: ProNumberOption) => void`
- `preAssignedProNumber?: string`
- `onPreAssignedProNumberChange?: (value: string) => void`

### 11. ReferenceNumbersSection
Manages multiple reference numbers.

**Props:**
- `references: XPOBillOfLadingReference[]`
- `onReferencesChange: (references: XPOBillOfLadingReference[]) => void`

### 12. AdditionalCommentsSection
Text area for additional comments/remarks.

**Props:**
- `comments: string`
- `onCommentsChange: (value: string) => void`

### 13. BOLFooterActions
Footer section with checkboxes and action buttons.

**Props:**
- `loading?: boolean`
- `onCancel?: () => void`
- `onCreateBOL?: () => void`
- `onCreateBOLTemplate?: () => void`
- `saveAsTemplate?: boolean`
- `onSaveAsTemplateChange?: (value: boolean) => void`
- `signBOLWithRequester?: boolean`
- `onSignBOLWithRequesterChange?: (value: boolean) => void`
- `agreeToTerms?: boolean`
- `onAgreeToTermsChange?: (value: boolean) => void`
- `onBack?: () => void`

## Usage Example

```tsx
import {
  BasicInformationSection,
  LocationSection,
  BillToSection,
  CommodityDetailsSection,
  EmergencyContactSection,
  DeclaredValueSection,
  ServicesSection,
  PickupRequestSection,
  XPOProNumberSection,
  ReferenceNumbersSection,
  AdditionalCommentsSection,
  BOLFooterActions,
} from './components/BOL';
import { PICKUP_SERVICES, DELIVERY_SERVICES, PREMIUM_SERVICES } from './components/BOL/constants';

// In your component:
const [requesterRole, setRequesterRole] = useState('S');
const [paymentTerms, setPaymentTerms] = useState('P');
const [pickupLocation, setPickupLocation] = useState({...});
const [deliveryLocation, setDeliveryLocation] = useState({...});
// ... other state

return (
  <form>
    <BasicInformationSection
      requesterRole={requesterRole}
      onRequesterRoleChange={setRequesterRole}
      paymentTerms={paymentTerms}
      onPaymentTermsChange={setPaymentTerms}
    />
    
    <LocationSection
      title="Pickup Location"
      data={pickupLocation}
      onDataChange={setPickupLocation}
      onZipLookup={handleZipLookup}
      loadingZip={loadingZip}
    />
    
    <LocationSection
      title="Delivery Location"
      data={deliveryLocation}
      onDataChange={setDeliveryLocation}
      onZipLookup={handleZipLookup}
      loadingZip={loadingZip}
      showEmail={true}
    />
    
    <ServicesSection
      title="Pickup Services"
      services={PICKUP_SERVICES}
      selectedServices={selectedPickupServices}
      onServiceToggle={handlePickupServiceToggle}
    />
    
    <BOLFooterActions
      loading={loading}
      onCreateBOL={handleCreateBOL}
      agreeToTerms={agreeToTerms}
      onAgreeToTermsChange={setAgreeToTerms}
    />
  </form>
);
```

## Constants

The `constants.ts` file exports:
- `PICKUP_SERVICES` - Array of pickup service options
- `DELIVERY_SERVICES` - Array of delivery service options
- `PREMIUM_SERVICES` - Array of premium service options
- `US_STATES` - Array of US states for dropdowns

## Styling

All components use Tailwind CSS classes and follow a consistent design system:
- White backgrounds for form sections
- Slate color palette for text and borders
- Blue accent color for interactive elements
- Red for required field indicators and primary actions
- Responsive grid layouts (1 column on mobile, 2-3 columns on desktop)


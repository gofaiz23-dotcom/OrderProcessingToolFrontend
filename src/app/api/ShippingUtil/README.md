# Shipping Utility Field Definitions

This folder contains field definitions for different shipping companies (Estes, XPO, etc.). These definitions are based on the backend `ShippingDB.js` configuration and provide TypeScript types, defaults, labels, and validation rules for form inputs.

## Structure

```
ShippingUtil/
├── estes/
│   ├── AuthFields.ts          # Authentication fields
│   ├── RateQuoteField.ts      # Rate Quote fields
│   ├── BillOfLandingField.ts  # Bill of Lading fields
│   └── index.ts               # Exports
└── xpo/
    ├── AuthFields.ts          # Authentication fields
    ├── RateQuoteField.ts      # Rate Quote fields
    ├── BillOfLandingField.ts  # Bill of Lading fields
    ├── PickupRequestField.ts  # Pickup Request fields
    └── index.ts               # Exports
```

## Usage

### Importing Field Definitions

```typescript
// Import Estes fields
import { 
  EstesRateQuoteFields, 
  ESTES_RATE_QUOTE_FIELD_DEFAULTS,
  ESTES_RATE_QUOTE_FIELD_LABELS 
} from '@/app/api/ShippingUtil/estes';

// Import XPO fields
import { 
  XPORateQuoteFields, 
  XPO_RATE_QUOTE_FIELD_DEFAULTS,
  XPO_RATE_QUOTE_FIELD_LABELS 
} from '@/app/api/ShippingUtil/xpo';
```

### Using in Components

```typescript
import { ESTES_RATE_QUOTE_FIELD_DEFAULTS } from '@/app/api/ShippingUtil/estes';

const [formData, setFormData] = useState(ESTES_RATE_QUOTE_FIELD_DEFAULTS);
```

## Field Definition Structure

Each field definition file contains:

1. **TypeScript Interfaces**: Type definitions for form data
2. **Default Values**: Initial values for form fields
3. **Field Labels**: Human-readable labels for UI
4. **Field Placeholders**: Placeholder text for inputs
5. **Field Types**: Input types (text, password, email, etc.)
6. **Options**: Dropdown/select options
7. **Required Fields**: List of required field names
8. **Validation Rules**: Field validation requirements

## Adding New Shipping Companies

To add a new shipping company:

1. Create a new folder in `ShippingUtil/` (e.g., `fedex/`)
2. Create field definition files following the same pattern:
   - `AuthFields.ts`
   - `RateQuoteField.ts`
   - `BillOfLadingField.ts`
   - `PickupRequestField.ts` (if applicable)
3. Create an `index.ts` to export all definitions
4. Update components to use the new field definitions

## Backend Alignment

All field definitions are based on the backend `ShippingDB.js` configuration. When the backend structure changes, update the corresponding field definition files to maintain consistency.


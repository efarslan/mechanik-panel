# Vehicle Management - Feature Specification

## EPIC Reference
EPIC-01: Vehicle Management

---

## Feature 1: Create Vehicle

### Description
This feature allows users to create and register a new vehicle under a business account. Vehicle creation is linked to Firestore-based reference data for brand and model selection.

### UI Fields
- Plate (Required)
- Brand (Required, dropdown populated from Firestore brands collection)
- Model (Required, dependent dropdown filtered by selected brand)
- Year (Required)
- Fuel Type (Required, dropdown: Benzin, Dizel, LPG, Hybrid, Elektrik)
- Engine Size
- Chassis No (Optional)
- Customer Name (Optional)
- Customer Phone Number (Optional)
- Notes (Optional)

### Business Rules
- Plate number must be unique within the business (tenant-level uniqueness)
- Brand selection is mandatory before model selection becomes active
- Model options must be dynamically filtered based on selected brand
- Vehicle must be associated with the authenticated user's business

### Validation Rules
- Plate is required and must not be empty
- Year is required and must be a valid year not greater than the current year
- Brand and Model selection is required before submission
- Fuel type must be selected from predefined options

### Data Dependencies
- Brands are fetched from Firestore brands collection
- Models are fetched from Firestore models collection filtered by selected brand

### Output
- A vehicle record is created and stored under the business scope
- Vehicle becomes immediately visible in Vehicle List

---

## Feature 2: Vehicle List & Search

### Description
This feature provides a complete list of all vehicles belonging to a business and allows users to search and filter vehicles using multiple criteria including plate, brand, model, and customer name.

### Search Capabilities
The system supports a single search input that performs text-based searching across the following fields:
- Plate (primary identifier)
- Brand
- Model
- Customer Name (vehicle owner field)

### Search Logic
- All search is performed through a single search bar
- System performs multi-field matching using OR logic across searchable fields
- Partial match is supported for all fields
- No separate filters or dropdown-based filtering exists in this feature

### UI Behavior
- Vehicle list is shown by default when Vehicle Module is opened
- A single search input is available at the top of the list
- Search results update dynamically as user types
- Clearing the search input resets the list to all vehicles
- If no results are found, an empty state is displayed (not an error state)

### Business Rules
- Only vehicles belonging to the authenticated user's business are visible
- Search is strictly scoped to tenant data (no cross-business data leakage)
- Results must reflect real-time database state

### Output
- Filtered vehicle list based on search criteria
- Each vehicle row displays:
  - Plate
  - Brand
  - Model
  - Customer Name
  
  ---

## Feature 3: Vehicle Detail View

### Description
This feature allows users to view detailed information of a selected vehicle, including its core attributes and associated service history. It acts as a master-detail view within the Vehicle module.

---

### Data Scope
Vehicle Detail page displays:

#### Vehicle Information
- Plate
- Brand
- Model
- Year
- Fuel Type
- Engine Size
- Chassis No (if exists)
- Customer Name
- Customer Phone Number (if exists)
- Notes (if exists)

#### Service History (Linked Data)
- Service records linked via Vehicle ID
- Each record includes:
  - Service date
  - Service type
  - Description
  - Cost (if available)

---

### Business Rules
- Vehicle detail is accessible only for vehicles belonging to the user's business (tenant isolation)
- Service history is read-only in this feature (managed in Service module)
- Vehicle must exist in system; otherwise system returns Not Found state
- User cannot access vehicle detail via manipulated or invalid IDs

---

### UI Behavior
- Page is opened by selecting a vehicle from Vehicle List
- Vehicle basic information is displayed at top section
- Service history is displayed below vehicle info
- If service history exists → list view is shown
- If no service history exists → empty state is shown
- Page must handle loading state before data is fetched

---

### Edge Cases
- Vehicle exists but has no service history
- Vehicle ID is invalid or deleted → Not Found state
- Unauthorized access attempt → Access denied
- Large service history dataset → pagination or lazy loading required (performance consideration)

---

### Data Flow
1. User selects vehicle from list
2. System fetches vehicle data by Vehicle ID
3. System fetches service history by Vehicle ID
4. Data is merged in UI layer
5. Page renders combined view

---

### Output
- Detailed vehicle profile view
- Associated service history timeline (if exists)
- Empty states for missing data scenarios
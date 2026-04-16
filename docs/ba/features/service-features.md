# Service Module - Feature Specification

## EPIC Reference
EPIC-02: Service Management

---

## Feature 1: Create Service Record

### Description
This feature allows users to create a service record for a selected vehicle. A service record represents a maintenance or repair operation performed on a vehicle, including optional itemized work and cost breakdown.

---

### Entry Point
- User selects a vehicle from Vehicle Detail page OR Service Module
- User clicks "New Job" action

---

### UI Fields

#### Required Fields
- Job Title
- Mileage

#### Optional Fields
- Labor Fee
- Notes
- Images

#### Itemized Work (Optional Structured Input)
User can either:

**A) Quick Selection Buttons**
- Predefined service actions (e.g. Oil Change, Brake Replacement, Tire Change)

OR

**B) Manual Entry Mode**
- Job Name (work description)
- Brand / Part (optional)
- Quantity
- Unit Price

---

### Business Rules
- Each service record must be linked to a valid Vehicle ID
- Service cannot exist without a vehicle (mandatory relation)
- Vehicle must belong to the same business (tenant isolation rule)
- Mileage must be a non-negative numeric value
- Service date cannot be in the future
- Itemized work entries (if used) must be valid numeric and text inputs

---

### Validation Rules
- Vehicle selection is required
- Job Title is required
- Mileage is required and must be numeric
- Service Date is required and cannot exceed current date
- If manual item entry is used, quantity and unit price must be valid numbers

---

### Data Model Logic
- Service records are stored as independent entities
- Each record contains a foreign key reference: VehicleID
- Vehicle → Service is a one-to-many relationship

---

### UI Behavior
- On successful creation:
  - Record is saved to database
  - User is redirected to Service Detail or Service List
  - Vehicle Detail service history is updated automatically

---

### Edge Cases
- Vehicle deleted while creating service → block save
- Duplicate submission (double click / retry) → prevent duplication
- Invalid vehicle ID → error state
- Missing required fields → inline validation errors
- Mixed quick selection + manual entry conflicts → system must normalize entries

---

### Output
- New service record created
- Record includes optional itemized work breakdown
- Record immediately appears in:
  - Vehicle Detail service history
  - Service List view

---

## Feature 2: Service List & Search

### Description
This feature provides a complete list of all service records belonging to a business. It allows users to search and review service jobs using basic service and vehicle attributes.

---

### Data Scope
Service list displays only records belonging to the authenticated user's business (tenant-based isolation).

Each service record is linked to:
- A Vehicle (mandatory relationship)

---

### Search Capabilities
The system supports a single global search input that performs text-based searching across:

- Job Title
- Vehicle Plate
- Vehicle Brand
- Vehicle Model
- Mileage

---

### Search Logic
- Single search bar (no advanced filter UI)
- OR-based multi-field search
- Partial matching supported for all fields
- Search is executed across service-level and vehicle-level fields
- Empty search returns full dataset

---

### UI Behavior
- Service list is the default view of Service Module
- Each row represents a service job
- Results update dynamically while typing
- If no results found → empty state (not error)
- Each row shows a summary view only

---

### Service List Row Representation
Each row must display:

- Vehicle Plate
- Vehicle Brand / Model
- Job Title
- Mileage
- Service Date

---

### Business Rules
- Only services belonging to the user's business are visible
- Vehicle relationship must always be resolved
- Deleted or missing vehicle references must not break list rendering
- Tenant isolation enforced at query level

---

### Performance Considerations
- Pagination required for large datasets
- Search must be optimized for multi-field queries
- Avoid loading heavy nested data in list view

---

### Future Enhancements (Out of Scope for MVP)
The following capabilities are intentionally excluded from MVP scope and may be added later:
- Itemized work search (job-level line items)
- Cost aggregation in service list
- Financial calculations (labor + parts total)
- Nested service breakdown rendering in list view

---

### Output
- Paginated service job list
- Real-time search results
- Lightweight service summary view

---

## Feature 3: Service Detail View

### Description
This feature provides a detailed view of a single service record (job card). It displays all service-related data including vehicle context, job information, and itemized work breakdown.

---

### Entry Point
Service Detail page can be accessed from:
- Service List (click on service row)
- Vehicle Detail (service history section)

---

### Data Scope
Service Detail includes:

#### Service Core Data
- Job Title
- Mileage
- Service Date
- Labor Fee
- Notes

#### Vehicle Context
- Vehicle Plate
- Brand
- Model
- Year
- Customer Name

#### Itemized Work Breakdown
- Job Name
- Brand / Part (if available)
- Quantity
- Unit Price
- Line total (Quantity × Unit Price)

---

### Business Rules
- Service record must belong to authenticated user's business
- Service must be linked to a valid Vehicle
- User cannot access service records from other businesses (tenant isolation)
- Deleted vehicle references must still allow service to be viewed (or fallback "Unknown Vehicle")

---

### UI Behavior
- Page loads full service detail by Service ID
- Vehicle information is displayed as contextual header section
- Itemized work is displayed in a structured list/table
- If no itemized work exists → show "No work items added" empty state
- Loading state must be shown while fetching data

---

### Cost Calculation Logic
Total Cost is calculated as:

- Labor Fee
+ Sum of (Quantity × Unit Price) for all itemized work entries

If no itemized work exists:
- Total Cost = Labor Fee only

---

### Edge Cases
- Invalid Service ID → Not Found state
- Service exists but vehicle deleted → show fallback vehicle info
- Service has no itemized work → empty breakdown state
- Corrupted or partial item data → ignore invalid entries but do not break page

---

### Data Integrity Rules
- Itemized work must always belong to its parent service
- Cost calculation must be consistent across list and detail view
- Vehicle snapshot data should be used for display consistency

---

### Output
- Full service job detail view
- Vehicle context + service data + item breakdown
- Accurate cost summary